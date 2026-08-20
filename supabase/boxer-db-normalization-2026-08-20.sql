-- Normalize the fighter DB before the next bulk import.
-- Canonical sources:
--   rankings                  -> ranking history
--   titles + title_reigns     -> current and historical titles
--   fighter_status_history    -> current career status
-- boxers keeps generated compatibility snapshots only.
-- This migration intentionally does not touch articles, events, or the site header.

begin;

-- ---------------------------------------------------------------------------
-- 1. Move correction reports onto one physical table.
-- ---------------------------------------------------------------------------

alter table public.correction_reports
  add column if not exists reporter_hash text,
  add column if not exists resolution_note text;

-- Preserve any rows that may have arrived since the previous mirror migration.
insert into public.correction_reports (
  report_id, fighter_id, field_name, current_value, suggested_value,
  source_url, comment, submitted_at, status, reviewed_by, reviewed_at,
  reporter_hash, resolution_note, created_at, updated_at
)
select
  r.report_id,
  r.fighter_id,
  r.field_name,
  r.current_value,
  r.proposed_value,
  r.evidence_url,
  r.comment,
  r.submitted_at,
  case when r.status = 'resolved' then 'fixed' else r.status end,
  r.reviewed_by,
  r.reviewed_at,
  r.reporter_hash,
  r.resolution_note,
  r.created_at,
  r.updated_at
from public.boxer_reports r
on conflict (report_id) do update set
  fighter_id = excluded.fighter_id,
  field_name = excluded.field_name,
  current_value = excluded.current_value,
  suggested_value = excluded.suggested_value,
  source_url = excluded.source_url,
  comment = excluded.comment,
  submitted_at = excluded.submitted_at,
  status = excluded.status,
  reviewed_by = excluded.reviewed_by,
  reviewed_at = excluded.reviewed_at,
  reporter_hash = excluded.reporter_hash,
  resolution_note = excluded.resolution_note,
  updated_at = excluded.updated_at;

-- Functions returning boxer_reports and PL/pgSQL routines that update it must
-- be removed before the old physical table can become a compatibility view.
drop function if exists public.submit_boxer_report(uuid, text, text, text, text, text, text);
drop function if exists public.submit_boxer_report_v2(uuid, text, text, text, text, text, text);
drop function if exists public.review_update_candidate(uuid, text, text);
drop function if exists public.review_team_update_candidate(uuid, text, text);
drop trigger if exists boxer_reports_sync_correction_report on public.boxer_reports;
drop function if exists public.sync_correction_report();

do $$
declare
  item record;
begin
  for item in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where confrelid = 'public.boxer_reports'::regclass
  loop
    execute format(
      'alter table %s drop constraint %I',
      item.table_name,
      item.conname
    );
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'boxer_reports'
      and c.relkind in ('v', 'm')
  ) then
    execute 'drop view public.boxer_reports';
  end if;
end;
$$;
drop table if exists public.boxer_reports;

create view public.boxer_reports
with (security_invoker = true)
as
select
  report_id,
  fighter_id,
  field_name,
  current_value,
  suggested_value as proposed_value,
  source_url as evidence_url,
  comment,
  reporter_hash,
  case when status = 'fixed' then 'resolved' else status end as status,
  submitted_at,
  reviewed_by,
  reviewed_at,
  resolution_note,
  created_at,
  updated_at
from public.correction_reports;

comment on view public.boxer_reports is
  'Compatibility read view. correction_reports is the only physical report table.';

revoke all on public.boxer_reports from anon;
grant select on public.boxer_reports to authenticated;

alter table public.correction_reports enable row level security;
drop policy if exists "Admins can read correction reports" on public.correction_reports;
create policy "Admins can read correction reports"
on public.correction_reports for select to authenticated
using (public.is_admin());
drop policy if exists "Admins can update correction reports" on public.correction_reports;
create policy "Admins can update correction reports"
on public.correction_reports for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete correction reports" on public.correction_reports;
create policy "Admins can delete correction reports"
on public.correction_reports for delete to authenticated
using (public.is_admin());
revoke all on public.correction_reports from anon;
grant select, update, delete on public.correction_reports to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.update_candidates'::regclass
      and conname = 'update_candidates_report_id_fkey'
  ) then
    alter table public.update_candidates
      add constraint update_candidates_report_id_fkey
      foreign key (report_id)
      references public.correction_reports(report_id)
      on delete set null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Rebuild canonical projections and backfill all 16 existing profiles.
-- ---------------------------------------------------------------------------

drop view if exists public.current_fighter_titles;
create view public.current_fighter_titles
with (security_invoker = true)
as
select
  tr.fighter_id,
  string_agg(
    distinct t.title_name,
    '・' order by t.title_name
  ) as current_titles
from public.title_reigns tr
join public.titles t on t.title_id = tr.title_id
where tr.status = 'active'
  and (tr.end_date is null or tr.end_date >= current_date)
group by tr.fighter_id;

drop view if exists public.current_fighter_rankings;
create view public.current_fighter_rankings
with (security_invoker = true)
as
select distinct on (r.fighter_id, upper(r.organization))
  r.fighter_id,
  upper(r.organization) as organization,
  r.weight_class,
  r.ranking,
  r.ranking_date,
  r.ranking_month,
  r.source_name,
  r.source_url,
  r.source_date,
  r.checked_at
from public.rankings r
order by
  r.fighter_id,
  upper(r.organization),
  coalesce(r.ranking_date, r.ranking_month) desc nulls last,
  r.checked_at desc,
  r.ranking_id desc;

drop view if exists public.current_fighter_status;
create view public.current_fighter_status
with (security_invoker = true)
as
select distinct on (h.fighter_id)
  h.fighter_id,
  h.status,
  h.start_date,
  h.end_date,
  h.source_name,
  h.source_url,
  h.source_date,
  h.checked_at
from public.fighter_status_history h
order by
  h.fighter_id,
  (h.end_date is null) desc,
  h.checked_at desc nulls last,
  h.history_id desc;

grant select on public.current_fighter_titles,
  public.current_fighter_rankings,
  public.current_fighter_status
to anon, authenticated;

-- The source values below are the existing 16 profile summaries. Dates are
-- intentionally left NULL when the profile did not establish a reign date.
-- "inactive" is used for historical summaries instead of guessing whether a
-- title was lost, vacated, or stripped.
with legacy_titles(slug, organization, weight_class, title_type, title_name, reign_status) as (
  values
    ('seiya-tsutsumi', 'JBC', 'バンタム級', 'national', '日本バンタム級', 'inactive'),

    ('jun-to-nakatani', 'WBO', 'フライ級', 'world', 'WBO世界フライ級', 'inactive'),
    ('jun-to-nakatani', 'WBO', 'スーパーフライ級', 'world', 'WBO世界スーパーフライ級', 'inactive'),
    ('jun-to-nakatani', 'WBC', 'バンタム級', 'world', 'WBC世界バンタム級', 'inactive'),
    ('jun-to-nakatani', 'IBF', 'バンタム級', 'world', 'IBF世界バンタム級', 'inactive'),

    ('tenshin-nasukawa', 'WBO', 'バンタム級', 'regional', 'WBOアジアパシフィック・バンタム級', 'inactive'),

    ('kenshiro-teraji', 'WBC', 'ライトフライ級', 'youth', 'WBCユース・ライトフライ級', 'inactive'),
    ('kenshiro-teraji', 'JBC', 'ライトフライ級', 'national', '日本ライトフライ級', 'inactive'),
    ('kenshiro-teraji', 'OPBF', 'ライトフライ級', 'regional', 'OPBF東洋太平洋ライトフライ級', 'inactive'),
    ('kenshiro-teraji', 'WBC', 'ライトフライ級', 'world', 'WBC世界ライトフライ級', 'inactive'),
    ('kenshiro-teraji', 'WBA', 'ライトフライ級', 'world', 'WBA世界ライトフライ級', 'inactive'),
    ('kenshiro-teraji', 'WBC', 'フライ級', 'world', 'WBC世界フライ級', 'inactive'),
    ('kenshiro-teraji', 'WBA', 'フライ級', 'world', 'WBA世界フライ級', 'inactive'),
    ('kenshiro-teraji', 'WBO', 'スーパーフライ級', 'world', 'WBO世界スーパーフライ級', 'active'),

    ('yuki-takei', 'WBO', 'バンタム級', 'world', 'WBO世界バンタム級', 'inactive'),
    ('yuki-takei', 'OPBF', 'スーパーバンタム級', 'regional', 'OPBF東洋太平洋スーパーバンタム級', 'inactive'),

    ('ryosuke-nishida', 'IBF', 'バンタム級', 'world', 'IBF世界バンタム級', 'inactive'),
    ('ryosuke-nishida', 'WBO', 'バンタム級', 'regional', 'WBOアジアパシフィック・バンタム級', 'inactive'),

    ('kosei-tanaka', 'WBO', 'ミニマム級', 'world', 'WBO世界ミニマム級', 'inactive'),
    ('kosei-tanaka', 'WBO', 'ライトフライ級', 'world', 'WBO世界ライトフライ級', 'inactive'),
    ('kosei-tanaka', 'WBO', 'フライ級', 'world', 'WBO世界フライ級', 'inactive'),
    ('kosei-tanaka', 'WBO', 'スーパーフライ級', 'world', 'WBO世界スーパーフライ級', 'inactive'),

    ('hozumi-hasegawa', 'WBC', 'バンタム級', 'world', 'WBC世界バンタム級', 'inactive'),
    ('hozumi-hasegawa', 'WBC', 'フェザー級', 'world', 'WBC世界フェザー級', 'inactive'),
    ('hozumi-hasegawa', 'WBC', 'スーパーバンタム級', 'world', 'WBC世界スーパーバンタム級', 'inactive'),

    ('naoya-inoue', 'WBC', 'ライトフライ級', 'world', 'WBC世界ライトフライ級', 'inactive'),
    ('naoya-inoue', 'WBO', 'スーパーフライ級', 'world', 'WBO世界スーパーフライ級', 'inactive'),
    ('naoya-inoue', 'WBA', 'バンタム級', 'world', 'WBA世界バンタム級', 'inactive'),
    ('naoya-inoue', 'IBF', 'バンタム級', 'world', 'IBF世界バンタム級', 'inactive'),
    ('naoya-inoue', 'WBC', 'バンタム級', 'world', 'WBC世界バンタム級', 'inactive'),
    ('naoya-inoue', 'WBO', 'バンタム級', 'world', 'WBO世界バンタム級', 'inactive'),
    ('naoya-inoue', 'WBA', 'スーパーバンタム級', 'world', 'WBA世界スーパーバンタム級', 'active'),
    ('naoya-inoue', 'WBC', 'スーパーバンタム級', 'world', 'WBC世界スーパーバンタム級', 'active'),
    ('naoya-inoue', 'IBF', 'スーパーバンタム級', 'world', 'IBF世界スーパーバンタム級', 'active'),
    ('naoya-inoue', 'WBO', 'スーパーバンタム級', 'world', 'WBO世界スーパーバンタム級', 'active'),

    ('mizuki-hiruta', 'JBC', 'フライ級', 'national', '第4代日本女子フライ級', 'inactive'),

    ('oleksandr-usyk', 'WBA', 'クルーザー級', 'world', 'WBA世界クルーザー級', 'inactive'),
    ('oleksandr-usyk', 'WBC', 'クルーザー級', 'world', 'WBC世界クルーザー級', 'inactive'),
    ('oleksandr-usyk', 'IBF', 'クルーザー級', 'world', 'IBF世界クルーザー級', 'inactive'),
    ('oleksandr-usyk', 'WBO', 'クルーザー級', 'world', 'WBO世界クルーザー級', 'inactive'),

    ('terence-crawford', 'WBO', 'ライト級', 'world', 'WBO世界ライト級', 'inactive'),
    ('terence-crawford', 'WBA', 'スーパーライト級', 'world', 'WBA世界スーパーライト級', 'inactive'),
    ('terence-crawford', 'WBC', 'スーパーライト級', 'world', 'WBC世界スーパーライト級', 'inactive'),
    ('terence-crawford', 'IBF', 'スーパーライト級', 'world', 'IBF世界スーパーライト級', 'inactive'),
    ('terence-crawford', 'WBO', 'スーパーライト級', 'world', 'WBO世界スーパーライト級', 'inactive'),
    ('terence-crawford', 'WBA', 'ウェルター級', 'world', 'WBA世界ウェルター級', 'inactive'),
    ('terence-crawford', 'WBC', 'ウェルター級', 'world', 'WBC世界ウェルター級', 'inactive'),
    ('terence-crawford', 'IBF', 'ウェルター級', 'world', 'IBF世界ウェルター級', 'inactive'),
    ('terence-crawford', 'WBO', 'ウェルター級', 'world', 'WBO世界ウェルター級', 'inactive'),
    ('terence-crawford', 'WBA', 'スーパーウェルター級', 'world', 'WBA世界スーパーウェルター級', 'inactive'),
    ('terence-crawford', 'WBA', 'スーパーミドル級', 'world', 'WBA世界スーパーミドル級', 'inactive'),
    ('terence-crawford', 'WBC', 'スーパーミドル級', 'world', 'WBC世界スーパーミドル級', 'inactive'),
    ('terence-crawford', 'IBF', 'スーパーミドル級', 'world', 'IBF世界スーパーミドル級', 'inactive'),
    ('terence-crawford', 'WBO', 'スーパーミドル級', 'world', 'WBO世界スーパーミドル級', 'inactive'),

    ('claressa-shields', 'WBA', 'ヘビー級', 'world', 'WBA世界女子ヘビー級', 'inactive'),
    ('claressa-shields', 'WBC', 'ヘビー級', 'world', 'WBC世界女子ヘビー級', 'inactive'),
    ('claressa-shields', 'IBF', 'ヘビー級', 'world', 'IBF世界女子ヘビー級', 'inactive'),
    ('claressa-shields', 'WBO', 'ヘビー級', 'world', 'WBO世界女子ヘビー級', 'inactive'),
    ('claressa-shields', 'WBC', 'ライトヘビー級', 'world', 'WBC世界女子ライトヘビー級', 'inactive'),
    ('claressa-shields', 'WBO', 'ライトヘビー級', 'world', 'WBO世界女子ライトヘビー級', 'inactive'),

    ('miyo-yoshida', 'JBC', 'バンタム級', 'national', '初代日本女子バンタム級', 'inactive'),
    ('miyo-yoshida', 'OPBF', 'バンタム級', 'regional', '第6代OPBF東洋太平洋女子バンタム級', 'inactive'),
    ('miyo-yoshida', 'WBO', 'スーパーフライ級', 'world', '第5代WBO女子世界スーパーフライ級', 'inactive'),
    ('miyo-yoshida', 'WBO', 'スーパーフライ級', 'world', '第7代WBO女子世界スーパーフライ級', 'inactive'),
    ('miyo-yoshida', 'IBF', 'バンタム級', 'world', '第8代IBF女子世界バンタム級', 'inactive'),

    ('katie-taylor', 'WBA', 'ライト級', 'world', 'WBA世界女子ライト級', 'inactive'),
    ('katie-taylor', 'WBC', 'ライト級', 'world', 'WBC世界女子ライト級', 'inactive'),
    ('katie-taylor', 'IBF', 'ライト級', 'world', 'IBF世界女子ライト級', 'inactive'),
    ('katie-taylor', 'WBO', 'ライト級', 'world', 'WBO世界女子ライト級', 'inactive')
),
resolved as (
  select
    b.internal_id as fighter_id,
    l.organization,
    l.weight_class,
    l.title_type,
    l.title_name,
    l.reign_status,
    coalesce(
      nullif(b.field_sources->'current_titles'->>'name', ''),
      nullif(b.field_sources->'past_major_titles'->>'name', ''),
      b.source_name
    ) as source_name,
    coalesce(
      nullif(b.field_sources->'current_titles'->>'url', ''),
      nullif(b.field_sources->'past_major_titles'->>'url', ''),
      b.source_url
    ) as source_url,
    b.source_checked_at::date as source_date,
    coalesce(b.source_checked_at, now()) as checked_at
  from legacy_titles l
  join public.boxers b on b.slug = l.slug
)
insert into public.titles (organization, weight_class, title_type, title_name)
select distinct organization, weight_class, title_type, title_name
from resolved
on conflict (organization, weight_class, title_type, title_name)
do update set title_name = excluded.title_name;

with legacy_titles(slug, organization, weight_class, title_type, title_name, reign_status) as (
  values
    ('seiya-tsutsumi', 'JBC', 'バンタム級', 'national', '日本バンタム級', 'inactive'),
    ('jun-to-nakatani', 'WBO', 'フライ級', 'world', 'WBO世界フライ級', 'inactive'),
    ('jun-to-nakatani', 'WBO', 'スーパーフライ級', 'world', 'WBO世界スーパーフライ級', 'inactive'),
    ('jun-to-nakatani', 'WBC', 'バンタム級', 'world', 'WBC世界バンタム級', 'inactive'),
    ('jun-to-nakatani', 'IBF', 'バンタム級', 'world', 'IBF世界バンタム級', 'inactive'),
    ('tenshin-nasukawa', 'WBO', 'バンタム級', 'regional', 'WBOアジアパシフィック・バンタム級', 'inactive'),
    ('kenshiro-teraji', 'WBC', 'ライトフライ級', 'youth', 'WBCユース・ライトフライ級', 'inactive'),
    ('kenshiro-teraji', 'JBC', 'ライトフライ級', 'national', '日本ライトフライ級', 'inactive'),
    ('kenshiro-teraji', 'OPBF', 'ライトフライ級', 'regional', 'OPBF東洋太平洋ライトフライ級', 'inactive'),
    ('kenshiro-teraji', 'WBC', 'ライトフライ級', 'world', 'WBC世界ライトフライ級', 'inactive'),
    ('kenshiro-teraji', 'WBA', 'ライトフライ級', 'world', 'WBA世界ライトフライ級', 'inactive'),
    ('kenshiro-teraji', 'WBC', 'フライ級', 'world', 'WBC世界フライ級', 'inactive'),
    ('kenshiro-teraji', 'WBA', 'フライ級', 'world', 'WBA世界フライ級', 'inactive'),
    ('kenshiro-teraji', 'WBO', 'スーパーフライ級', 'world', 'WBO世界スーパーフライ級', 'active'),
    ('yuki-takei', 'WBO', 'バンタム級', 'world', 'WBO世界バンタム級', 'inactive'),
    ('yuki-takei', 'OPBF', 'スーパーバンタム級', 'regional', 'OPBF東洋太平洋スーパーバンタム級', 'inactive'),
    ('ryosuke-nishida', 'IBF', 'バンタム級', 'world', 'IBF世界バンタム級', 'inactive'),
    ('ryosuke-nishida', 'WBO', 'バンタム級', 'regional', 'WBOアジアパシフィック・バンタム級', 'inactive'),
    ('kosei-tanaka', 'WBO', 'ミニマム級', 'world', 'WBO世界ミニマム級', 'inactive'),
    ('kosei-tanaka', 'WBO', 'ライトフライ級', 'world', 'WBO世界ライトフライ級', 'inactive'),
    ('kosei-tanaka', 'WBO', 'フライ級', 'world', 'WBO世界フライ級', 'inactive'),
    ('kosei-tanaka', 'WBO', 'スーパーフライ級', 'world', 'WBO世界スーパーフライ級', 'inactive'),
    ('hozumi-hasegawa', 'WBC', 'バンタム級', 'world', 'WBC世界バンタム級', 'inactive'),
    ('hozumi-hasegawa', 'WBC', 'フェザー級', 'world', 'WBC世界フェザー級', 'inactive'),
    ('hozumi-hasegawa', 'WBC', 'スーパーバンタム級', 'world', 'WBC世界スーパーバンタム級', 'inactive'),
    ('naoya-inoue', 'WBC', 'ライトフライ級', 'world', 'WBC世界ライトフライ級', 'inactive'),
    ('naoya-inoue', 'WBO', 'スーパーフライ級', 'world', 'WBO世界スーパーフライ級', 'inactive'),
    ('naoya-inoue', 'WBA', 'バンタム級', 'world', 'WBA世界バンタム級', 'inactive'),
    ('naoya-inoue', 'IBF', 'バンタム級', 'world', 'IBF世界バンタム級', 'inactive'),
    ('naoya-inoue', 'WBC', 'バンタム級', 'world', 'WBC世界バンタム級', 'inactive'),
    ('naoya-inoue', 'WBO', 'バンタム級', 'world', 'WBO世界バンタム級', 'inactive'),
    ('naoya-inoue', 'WBA', 'スーパーバンタム級', 'world', 'WBA世界スーパーバンタム級', 'active'),
    ('naoya-inoue', 'WBC', 'スーパーバンタム級', 'world', 'WBC世界スーパーバンタム級', 'active'),
    ('naoya-inoue', 'IBF', 'スーパーバンタム級', 'world', 'IBF世界スーパーバンタム級', 'active'),
    ('naoya-inoue', 'WBO', 'スーパーバンタム級', 'world', 'WBO世界スーパーバンタム級', 'active'),
    ('mizuki-hiruta', 'JBC', 'フライ級', 'national', '第4代日本女子フライ級', 'inactive'),
    ('oleksandr-usyk', 'WBA', 'クルーザー級', 'world', 'WBA世界クルーザー級', 'inactive'),
    ('oleksandr-usyk', 'WBC', 'クルーザー級', 'world', 'WBC世界クルーザー級', 'inactive'),
    ('oleksandr-usyk', 'IBF', 'クルーザー級', 'world', 'IBF世界クルーザー級', 'inactive'),
    ('oleksandr-usyk', 'WBO', 'クルーザー級', 'world', 'WBO世界クルーザー級', 'inactive'),
    ('terence-crawford', 'WBO', 'ライト級', 'world', 'WBO世界ライト級', 'inactive'),
    ('terence-crawford', 'WBA', 'スーパーライト級', 'world', 'WBA世界スーパーライト級', 'inactive'),
    ('terence-crawford', 'WBC', 'スーパーライト級', 'world', 'WBC世界スーパーライト級', 'inactive'),
    ('terence-crawford', 'IBF', 'スーパーライト級', 'world', 'IBF世界スーパーライト級', 'inactive'),
    ('terence-crawford', 'WBO', 'スーパーライト級', 'world', 'WBO世界スーパーライト級', 'inactive'),
    ('terence-crawford', 'WBA', 'ウェルター級', 'world', 'WBA世界ウェルター級', 'inactive'),
    ('terence-crawford', 'WBC', 'ウェルター級', 'world', 'WBC世界ウェルター級', 'inactive'),
    ('terence-crawford', 'IBF', 'ウェルター級', 'world', 'IBF世界ウェルター級', 'inactive'),
    ('terence-crawford', 'WBO', 'ウェルター級', 'world', 'WBO世界ウェルター級', 'inactive'),
    ('terence-crawford', 'WBA', 'スーパーウェルター級', 'world', 'WBA世界スーパーウェルター級', 'inactive'),
    ('terence-crawford', 'WBA', 'スーパーミドル級', 'world', 'WBA世界スーパーミドル級', 'inactive'),
    ('terence-crawford', 'WBC', 'スーパーミドル級', 'world', 'WBC世界スーパーミドル級', 'inactive'),
    ('terence-crawford', 'IBF', 'スーパーミドル級', 'world', 'IBF世界スーパーミドル級', 'inactive'),
    ('terence-crawford', 'WBO', 'スーパーミドル級', 'world', 'WBO世界スーパーミドル級', 'inactive'),
    ('claressa-shields', 'WBA', 'ヘビー級', 'world', 'WBA世界女子ヘビー級', 'inactive'),
    ('claressa-shields', 'WBC', 'ヘビー級', 'world', 'WBC世界女子ヘビー級', 'inactive'),
    ('claressa-shields', 'IBF', 'ヘビー級', 'world', 'IBF世界女子ヘビー級', 'inactive'),
    ('claressa-shields', 'WBO', 'ヘビー級', 'world', 'WBO世界女子ヘビー級', 'inactive'),
    ('claressa-shields', 'WBC', 'ライトヘビー級', 'world', 'WBC世界女子ライトヘビー級', 'inactive'),
    ('claressa-shields', 'WBO', 'ライトヘビー級', 'world', 'WBO世界女子ライトヘビー級', 'inactive'),
    ('miyo-yoshida', 'JBC', 'バンタム級', 'national', '初代日本女子バンタム級', 'inactive'),
    ('miyo-yoshida', 'OPBF', 'バンタム級', 'regional', '第6代OPBF東洋太平洋女子バンタム級', 'inactive'),
    ('miyo-yoshida', 'WBO', 'スーパーフライ級', 'world', '第5代WBO女子世界スーパーフライ級', 'inactive'),
    ('miyo-yoshida', 'WBO', 'スーパーフライ級', 'world', '第7代WBO女子世界スーパーフライ級', 'inactive'),
    ('miyo-yoshida', 'IBF', 'バンタム級', 'world', '第8代IBF女子世界バンタム級', 'inactive'),
    ('katie-taylor', 'WBA', 'ライト級', 'world', 'WBA世界女子ライト級', 'inactive'),
    ('katie-taylor', 'WBC', 'ライト級', 'world', 'WBC世界女子ライト級', 'inactive'),
    ('katie-taylor', 'IBF', 'ライト級', 'world', 'IBF世界女子ライト級', 'inactive'),
    ('katie-taylor', 'WBO', 'ライト級', 'world', 'WBO世界女子ライト級', 'inactive')
),
resolved as (
  select
    b.internal_id as fighter_id,
    l.organization,
    l.weight_class,
    l.title_type,
    l.title_name,
    l.reign_status,
    coalesce(nullif(b.field_sources->'past_major_titles'->>'name', ''), b.source_name) as source_name,
    coalesce(nullif(b.field_sources->'past_major_titles'->>'url', ''), b.source_url) as source_url,
    b.source_checked_at::date as source_date,
    coalesce(b.source_checked_at, now()) as checked_at
  from legacy_titles l
  join public.boxers b on b.slug = l.slug
)
insert into public.title_reigns (
  fighter_id, title_id, start_date, end_date, status,
  source_name, source_url, source_date, checked_at
)
select
  r.fighter_id,
  t.title_id,
  null::date,
  null::date,
  r.reign_status,
  r.source_name,
  r.source_url,
  r.source_date,
  r.checked_at
from resolved r
join public.titles t
  on t.organization = r.organization
 and t.weight_class = r.weight_class
 and t.title_type = r.title_type
 and t.title_name = r.title_name
where not exists (
  select 1
  from public.title_reigns existing
  where existing.fighter_id = r.fighter_id
    and existing.title_id = t.title_id
    and existing.status = r.reign_status
    and existing.start_date is null
);

-- Current-title additions are pinned to the latest official pages checked
-- before this migration. The reign dates are published dates, not estimates.
update public.title_reigns tr
set
  start_date = '2023-07-25',
  source_name = 'WBC公式（2026年7月ランキング）',
  source_url = 'https://wbcboxing.com/en/superbantamweight/',
  source_date = '2026-07-02',
  checked_at = '2026-08-20T00:00:00+09:00'
from public.boxers b, public.titles t
where tr.fighter_id = b.internal_id
  and t.title_id = tr.title_id
  and b.slug = 'naoya-inoue'
  and tr.status = 'active'
  and t.weight_class = 'スーパーバンタム級'
  and t.title_type = 'world';

update public.title_reigns tr
set
  start_date = '2026-07-20',
  source_name = 'WBO公式',
  source_url = 'https://wboboxing.com/male-champions/',
  source_date = '2026-07-20',
  checked_at = '2026-08-20T00:00:00+09:00'
from public.boxers b, public.titles t
where tr.fighter_id = b.internal_id
  and t.title_id = tr.title_id
  and b.slug = 'kenshiro-teraji'
  and tr.status = 'active'
  and t.organization = 'WBO'
  and t.weight_class = 'スーパーフライ級'
  and t.title_type = 'world';

-- Katie Taylor's September 5, 2026 bout is the latest verified status
-- evidence. Keep older history, close any previous current row, and append
-- exactly one newer active record. The block is rerunnable without closing
-- the already-current record a second time.
do $$
declare
  katie_id uuid;
begin
  select internal_id into katie_id
  from public.boxers
  where slug = 'katie-taylor';

  if katie_id is not null and not exists (
    select 1
    from public.fighter_status_history h
    where h.fighter_id = katie_id
      and h.status = 'active'
      and h.source_name = 'Matchroom Boxing公式（2026-08-20再確認）'
      and h.source_date = '2026-06-05'
      and h.end_date is null
  ) then
    update public.fighter_status_history
    set end_date = '2026-08-20'
    where fighter_id = katie_id
      and end_date is null;

    insert into public.fighter_status_history (
      fighter_id, status, start_date, end_date,
      source_name, source_url, source_date, checked_at
    ) values (
      katie_id, 'active', null, null,
      'Matchroom Boxing公式（2026-08-20再確認）',
      'https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/',
      '2026-06-05', now()
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Generate compatibility cache columns from the canonical tables.
-- ---------------------------------------------------------------------------

create or replace function public.sync_boxer_normalized_cache(p_fighter_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  status_value text;
  current_titles_value text;
  past_titles_value text;
  world_classes_value text;
  wba_value integer;
  wbc_value integer;
  ibf_value integer;
  wbo_value integer;
begin
  if p_fighter_id is null then return; end if;

  select status into status_value
  from public.current_fighter_status
  where fighter_id = p_fighter_id;

  select
    max(ranking) filter (where organization = 'WBA'),
    max(ranking) filter (where organization = 'WBC'),
    max(ranking) filter (where organization = 'IBF'),
    max(ranking) filter (where organization = 'WBO')
  into wba_value, wbc_value, ibf_value, wbo_value
  from public.current_fighter_rankings
  where fighter_id = p_fighter_id;

  select string_agg(distinct t.title_name, '・' order by t.title_name)
  into current_titles_value
  from public.title_reigns tr
  join public.titles t on t.title_id = tr.title_id
  where tr.fighter_id = p_fighter_id
    and tr.status = 'active'
    and (tr.end_date is null or tr.end_date >= current_date);

  select string_agg(distinct t.title_name, '・' order by t.title_name)
  into past_titles_value
  from public.title_reigns tr
  join public.titles t on t.title_id = tr.title_id
  where tr.fighter_id = p_fighter_id
    and (
      tr.status <> 'active'
      or (tr.end_date is not null and tr.end_date < current_date)
    );

  select string_agg(distinct t.weight_class, '・' order by t.weight_class)
  into world_classes_value
  from public.title_reigns tr
  join public.titles t on t.title_id = tr.title_id
  where tr.fighter_id = p_fighter_id
    and t.title_type = 'world';

  perform set_config('boxsoku.cache_sync', 'on', true);
  update public.boxers
  set
    career_status = coalesce(status_value, 'unknown'),
    current_titles = coalesce(current_titles_value, 'なし'),
    past_major_titles = coalesce(past_titles_value, 'なし'),
    world_title_weight_classes = coalesce(world_classes_value, 'なし'),
    ranking_wba = wba_value,
    ranking_wbc = wbc_value,
    ranking_ibf = ibf_value,
    ranking_wbo = wbo_value
  where internal_id = p_fighter_id
    and (
      career_status is distinct from coalesce(status_value, 'unknown')
      or current_titles is distinct from coalesce(current_titles_value, 'なし')
      or past_major_titles is distinct from coalesce(past_titles_value, 'なし')
      or world_title_weight_classes is distinct from coalesce(world_classes_value, 'なし')
      or ranking_wba is distinct from wba_value
      or ranking_wbc is distinct from wbc_value
      or ranking_ibf is distinct from ibf_value
      or ranking_wbo is distinct from wbo_value
    );
  perform set_config('boxsoku.cache_sync', 'off', true);
end;
$$;

create or replace function public.guard_boxer_normalized_cache()
returns trigger
language plpgsql
as $$
begin
  if current_setting('boxsoku.cache_sync', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if (new.career_status is not null and new.career_status <> 'unknown')
       or new.current_titles is not null
       or new.past_major_titles is not null
       or new.world_title_weight_classes is not null
       or new.ranking_wba is not null
       or new.ranking_wbc is not null
       or new.ranking_ibf is not null
       or new.ranking_wbo is not null then
      raise exception
        'Normalized fighter fields must be written to rankings, titles/title_reigns, or fighter_status_history';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and (
    new.career_status is distinct from old.career_status
    or new.current_titles is distinct from old.current_titles
    or new.past_major_titles is distinct from old.past_major_titles
    or new.world_title_weight_classes is distinct from old.world_title_weight_classes
    or new.ranking_wba is distinct from old.ranking_wba
    or new.ranking_wbc is distinct from old.ranking_wbc
    or new.ranking_ibf is distinct from old.ranking_ibf
    or new.ranking_wbo is distinct from old.ranking_wbo
  ) then
    raise exception
      'Normalized fighter fields are generated caches and cannot be updated directly';
  end if;

  return new;
end;
$$;

drop trigger if exists boxers_guard_normalized_cache on public.boxers;
create trigger boxers_guard_normalized_cache
before insert or update on public.boxers
for each row execute function public.guard_boxer_normalized_cache();

create or replace function public.sync_boxer_cache_from_normalized()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fighter_id_value uuid;
begin
  if tg_table_name = 'rankings' then
    if tg_op = 'DELETE' then
      perform public.sync_boxer_normalized_cache(old.fighter_id);
    else
      perform public.sync_boxer_normalized_cache(new.fighter_id);
      if tg_op = 'UPDATE' and old.fighter_id is distinct from new.fighter_id then
        perform public.sync_boxer_normalized_cache(old.fighter_id);
      end if;
    end if;
  elsif tg_table_name = 'fighter_status_history' then
    if tg_op = 'DELETE' then
      perform public.sync_boxer_normalized_cache(old.fighter_id);
    else
      perform public.sync_boxer_normalized_cache(new.fighter_id);
      if tg_op = 'UPDATE' and old.fighter_id is distinct from new.fighter_id then
        perform public.sync_boxer_normalized_cache(old.fighter_id);
      end if;
    end if;
  elsif tg_table_name = 'title_reigns' then
    if tg_op = 'DELETE' then
      perform public.sync_boxer_normalized_cache(old.fighter_id);
    else
      perform public.sync_boxer_normalized_cache(new.fighter_id);
      if tg_op = 'UPDATE' then
        if old.fighter_id is distinct from new.fighter_id then
          perform public.sync_boxer_normalized_cache(old.fighter_id);
        end if;
        if old.title_id is distinct from new.title_id
           or old.status is distinct from new.status
           or old.end_date is distinct from new.end_date then
          perform public.sync_boxer_normalized_cache(new.fighter_id);
        end if;
      end if;
    end if;
  elsif tg_table_name = 'titles' and tg_op = 'UPDATE' then
    for fighter_id_value in
      select distinct fighter_id
      from public.title_reigns
      where title_id = old.title_id or title_id = new.title_id
    loop
      perform public.sync_boxer_normalized_cache(fighter_id_value);
    end loop;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists rankings_sync_boxer_cache on public.rankings;
create trigger rankings_sync_boxer_cache
after insert or update or delete on public.rankings
for each row execute function public.sync_boxer_cache_from_normalized();

drop trigger if exists fighter_status_history_sync_boxer_cache on public.fighter_status_history;
create trigger fighter_status_history_sync_boxer_cache
after insert or update or delete on public.fighter_status_history
for each row execute function public.sync_boxer_cache_from_normalized();

drop trigger if exists title_reigns_sync_boxer_cache on public.title_reigns;
create trigger title_reigns_sync_boxer_cache
after insert or update or delete on public.title_reigns
for each row execute function public.sync_boxer_cache_from_normalized();

drop trigger if exists titles_sync_boxer_cache on public.titles;
create trigger titles_sync_boxer_cache
after update on public.titles
for each row execute function public.sync_boxer_cache_from_normalized();

-- Rebuild the compatibility fighters view from canonical projections instead
-- of reading any legacy snapshot value.
drop view if exists public.fighters;
create view public.fighters
with (security_invoker = true)
as
with ranking_cache as (
  select
    fighter_id,
    max(ranking) filter (where organization = 'WBA') as ranking_wba,
    max(ranking) filter (where organization = 'WBC') as ranking_wbc,
    max(ranking) filter (where organization = 'IBF') as ranking_ibf,
    max(ranking) filter (where organization = 'WBO') as ranking_wbo
  from public.current_fighter_rankings
  group by fighter_id
)
select
  b.internal_id as fighter_id,
  b.internal_id,
  b.slug,
  b.name_ja,
  b.name_kana,
  b.name_en,
  b.ring_name,
  b.boxrec_id,
  b.boxrec_url,
  b.sex,
  b.nationality,
  b.nationality_code,
  b.birth_date,
  b.birthplace,
  b.residence,
  coalesce(s.status, 'unknown') as career_status,
  b.gym,
  b.trainer,
  b.promoter,
  b.manager,
  b.training_base,
  b.weight_class,
  b.stance,
  b.height_cm,
  b.reach_cm,
  b.pro_debut_date,
  b.total_fights,
  b.wins,
  b.losses,
  b.draws,
  b.no_contests,
  b.ko_wins,
  b.ko_rate,
  b.world_champion_experience,
  coalesce(t.current_titles, 'なし') as current_titles,
  b.past_major_titles,
  b.world_title_weight_classes,
  r.ranking_wba,
  r.ranking_wbc,
  r.ranking_ibf,
  r.ranking_wbo,
  b.next_fight_date,
  b.next_opponent,
  b.next_venue,
  b.next_event_name,
  b.source_name,
  b.source_url,
  b.source_checked_at,
  b.field_sources,
  b.is_published,
  b.created_at,
  b.updated_at
from public.boxers b
left join public.current_fighter_status s on s.fighter_id = b.internal_id
left join public.current_fighter_titles t on t.fighter_id = b.internal_id
left join ranking_cache r on r.fighter_id = b.internal_id
where b.is_published = true;

grant select on public.fighters to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Canonical-only report RPCs and review paths.
-- ---------------------------------------------------------------------------

create or replace function public.boxer_field_value(
  p_fighter_id uuid,
  p_field_name text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  value jsonb;
begin
  case p_field_name
    when 'career_status' then
      select to_jsonb(coalesce(s.status, 'unknown'))
      into value
      from public.boxers b
      left join public.current_fighter_status s on s.fighter_id = b.internal_id
      where b.internal_id = p_fighter_id;
    when 'current_titles' then
      select to_jsonb(coalesce(t.current_titles, 'なし'))
      into value
      from public.boxers b
      left join public.current_fighter_titles t on t.fighter_id = b.internal_id
      where b.internal_id = p_fighter_id;
    when 'ranking_wba', 'ranking_wbc', 'ranking_ibf', 'ranking_wbo' then
      select to_jsonb(r.ranking)
      into value
      from public.current_fighter_rankings r
      where r.fighter_id = p_fighter_id
        and r.organization = upper(replace(p_field_name, 'ranking_', ''))
      limit 1;
    when 'name_ja' then select to_jsonb(name_ja) into value from public.boxers where internal_id = p_fighter_id;
    when 'name_kana' then select to_jsonb(name_kana) into value from public.boxers where internal_id = p_fighter_id;
    when 'name_en' then select to_jsonb(name_en) into value from public.boxers where internal_id = p_fighter_id;
    when 'ring_name' then select to_jsonb(ring_name) into value from public.boxers where internal_id = p_fighter_id;
    when 'boxrec_id' then select to_jsonb(boxrec_id) into value from public.boxers where internal_id = p_fighter_id;
    when 'boxrec_url' then select to_jsonb(boxrec_url) into value from public.boxers where internal_id = p_fighter_id;
    when 'sex' then select to_jsonb(sex) into value from public.boxers where internal_id = p_fighter_id;
    when 'nationality' then select to_jsonb(nationality) into value from public.boxers where internal_id = p_fighter_id;
    when 'nationality_code' then select to_jsonb(nationality_code) into value from public.boxers where internal_id = p_fighter_id;
    when 'birth_date' then select to_jsonb(birth_date) into value from public.boxers where internal_id = p_fighter_id;
    when 'birthplace' then select to_jsonb(birthplace) into value from public.boxers where internal_id = p_fighter_id;
    when 'gym' then select to_jsonb(gym) into value from public.boxers where internal_id = p_fighter_id;
    when 'residence' then select to_jsonb(residence) into value from public.boxers where internal_id = p_fighter_id;
    when 'trainer' then select to_jsonb(trainer) into value from public.boxers where internal_id = p_fighter_id;
    when 'promoter' then select to_jsonb(promoter) into value from public.boxers where internal_id = p_fighter_id;
    when 'manager' then select to_jsonb(manager) into value from public.boxers where internal_id = p_fighter_id;
    when 'training_base' then select to_jsonb(training_base) into value from public.boxers where internal_id = p_fighter_id;
    when 'weight_class' then select to_jsonb(weight_class) into value from public.boxers where internal_id = p_fighter_id;
    when 'stance' then select to_jsonb(stance) into value from public.boxers where internal_id = p_fighter_id;
    when 'height_cm' then select to_jsonb(height_cm) into value from public.boxers where internal_id = p_fighter_id;
    when 'reach_cm' then select to_jsonb(reach_cm) into value from public.boxers where internal_id = p_fighter_id;
    when 'pro_debut_date' then select to_jsonb(pro_debut_date) into value from public.boxers where internal_id = p_fighter_id;
    when 'world_champion_experience' then select to_jsonb(world_champion_experience) into value from public.boxers where internal_id = p_fighter_id;
    when 'past_major_titles' then select to_jsonb(past_major_titles) into value from public.boxers where internal_id = p_fighter_id;
    when 'world_title_weight_classes' then select to_jsonb(world_title_weight_classes) into value from public.boxers where internal_id = p_fighter_id;
    when 'next_fight_date' then select to_jsonb(next_fight_date) into value from public.boxers where internal_id = p_fighter_id;
    when 'next_opponent' then select to_jsonb(next_opponent) into value from public.boxers where internal_id = p_fighter_id;
    when 'next_venue' then select to_jsonb(next_venue) into value from public.boxers where internal_id = p_fighter_id;
    when 'next_event_name' then select to_jsonb(next_event_name) into value from public.boxers where internal_id = p_fighter_id;
    when 'next_fight' then
      select jsonb_build_object(
        'date', next_fight_date,
        'opponent', next_opponent,
        'venue', next_venue,
        'event', next_event_name
      )
      into value
      from public.boxers
      where internal_id = p_fighter_id;
    else
      raise exception 'unsupported boxer field';
  end case;
  return coalesce(value, 'null'::jsonb);
end;
$$;

create or replace function public.submit_boxer_report_v2(
  p_fighter_id uuid,
  p_field_name text,
  p_proposed_value text,
  p_evidence_url text,
  p_comment text,
  p_reporter_hash text,
  p_server_token text
)
returns setof public.boxer_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.boxers%rowtype;
  current_value jsonb;
  inserted_id uuid;
begin
  if not public.is_server_request(p_server_token) then
    raise exception 'not authorized';
  end if;
  if p_field_name is null or p_field_name not in (
    'name_ja', 'name_kana', 'name_en', 'ring_name', 'boxrec_id', 'boxrec_url',
    'sex', 'nationality', 'nationality_code', 'birth_date', 'birthplace',
    'career_status', 'gym', 'residence', 'trainer', 'promoter', 'manager',
    'training_base', 'weight_class', 'stance', 'height_cm', 'reach_cm',
    'pro_debut_date', 'world_champion_experience', 'current_titles',
    'past_major_titles', 'world_title_weight_classes', 'ranking_wba',
    'ranking_wbc', 'ranking_ibf', 'ranking_wbo', 'next_fight',
    'next_fight_date', 'next_opponent', 'next_venue', 'next_event_name'
  ) then
    raise exception 'invalid report field';
  end if;
  if p_proposed_value is null
     or char_length(trim(p_proposed_value)) not between 1 and 2000
     or p_evidence_url is null
     or p_evidence_url !~* '^https?://'
     or char_length(p_evidence_url) > 1000
     or char_length(coalesce(p_comment, '')) > 2000
     or p_reporter_hash is null
     or p_reporter_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid boxer report';
  end if;
  select * into target
  from public.boxers
  where internal_id = p_fighter_id and is_published = true;
  if not found then raise exception 'boxer is not available'; end if;
  if exists (
    select 1
    from public.correction_reports
    where fighter_id = p_fighter_id
      and field_name = p_field_name
      and reporter_hash = p_reporter_hash
      and submitted_at >= now() - interval '15 minutes'
  ) then
    raise exception 'duplicate boxer report';
  end if;

  current_value := public.boxer_field_value(p_fighter_id, p_field_name);

  insert into public.correction_reports (
    fighter_id, field_name, current_value, suggested_value,
    source_url, comment, reporter_hash
  ) values (
    p_fighter_id,
    p_field_name,
    coalesce(current_value #>> '{}', '不明'),
    trim(p_proposed_value),
    trim(p_evidence_url),
    trim(coalesce(p_comment, '')),
    p_reporter_hash
  )
  returning report_id into inserted_id;

  insert into public.update_candidates (
    fighter_id, report_id, category, field_name, current_value, proposed_value,
    source_name, source_url, detected_at, status
  ) values (
    p_fighter_id,
    inserted_id,
    'user_report',
    p_field_name,
    current_value,
    to_jsonb(trim(p_proposed_value)),
    'ユーザー報告',
    trim(p_evidence_url),
    now(),
    'pending'
  );

  return query select * from public.boxer_reports where report_id = inserted_id;
end;
$$;

create or replace function public.submit_boxer_report(
  p_fighter_id uuid,
  p_field_name text,
  p_proposed_value text,
  p_evidence_url text,
  p_comment text,
  p_reporter_hash text,
  p_server_token text
)
returns setof public.boxer_reports
language sql
security definer
set search_path = public
as $$
  select *
  from public.submit_boxer_report_v2(
    p_fighter_id,
    p_field_name,
    p_proposed_value,
    p_evidence_url,
    p_comment,
    p_reporter_hash,
    p_server_token
  );
$$;

revoke all on function public.submit_boxer_report(uuid, text, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.submit_boxer_report_v2(uuid, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_boxer_report(uuid, text, text, text, text, text, text)
  to anon, authenticated;
grant execute on function public.submit_boxer_report_v2(uuid, text, text, text, text, text, text)
  to anon, authenticated;

create or replace function public.review_update_candidate(
  p_candidate_id uuid,
  p_action text,
  p_review_note text default null
)
returns setof public.update_candidates
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate public.update_candidates;
  target public.boxers%rowtype;
  current_value jsonb;
  ranking_org text;
  title_id_value uuid;
  title_name_value text;
  title_org_value text;
  title_weight_value text;
  title_type_value text;
  title_status_value text;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_action not in ('approved', 'rejected', 'needs_review') then raise exception 'invalid review action'; end if;
  select * into candidate from public.update_candidates where candidate_id = p_candidate_id for update;
  if not found then raise exception 'candidate not found'; end if;
  if candidate.status not in ('pending', 'needs_review') then raise exception 'candidate already reviewed'; end if;

  if p_action <> 'approved' then
    update public.update_candidates
    set status = p_action,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = nullif(trim(coalesce(p_review_note, '')), '')
    where candidate_id = p_candidate_id;
    if candidate.report_id is not null then
      update public.correction_reports
      set status = case when p_action = 'rejected' then 'rejected' else 'reviewing' end,
          reviewed_by = auth.uid(),
          reviewed_at = now(),
          resolution_note = nullif(trim(coalesce(p_review_note, '')), ''),
          updated_at = now()
      where report_id = candidate.report_id;
    end if;
    return query select * from public.update_candidates where candidate_id = p_candidate_id;
    return;
  end if;

  select * into target from public.boxers where internal_id = candidate.fighter_id for update;
  if not found then raise exception 'fighter not found'; end if;
  current_value := public.boxer_field_value(candidate.fighter_id, candidate.field_name);
  if current_value is distinct from candidate.current_value then
    update public.update_candidates
    set status = 'needs_review',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = '現在値が候補作成時から変わっています。再確認してください。'
    where candidate_id = p_candidate_id;
    return query select * from public.update_candidates where candidate_id = p_candidate_id;
    return;
  end if;

  case candidate.field_name
    when 'name_ja' then update public.boxers set name_ja = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'name_kana' then update public.boxers set name_kana = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'name_en' then update public.boxers set name_en = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'ring_name' then update public.boxers set ring_name = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'boxrec_id' then update public.boxers set boxrec_id = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'boxrec_url' then update public.boxers set boxrec_url = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'sex' then update public.boxers set sex = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'nationality' then update public.boxers set nationality = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'nationality_code' then update public.boxers set nationality_code = nullif(upper(candidate.proposed_value #>> '{}'), '') where internal_id = candidate.fighter_id;
    when 'birth_date' then update public.boxers set birth_date = nullif(candidate.proposed_value #>> '{}', '')::date where internal_id = candidate.fighter_id;
    when 'birthplace' then update public.boxers set birthplace = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'career_status', 'current_titles', 'past_major_titles', 'world_title_weight_classes',
         'ranking_wba', 'ranking_wbc', 'ranking_ibf', 'ranking_wbo' then
      null;
    when 'gym' then update public.boxers set gym = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'residence' then update public.boxers set residence = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'trainer' then update public.boxers set trainer = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'promoter' then update public.boxers set promoter = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'manager' then update public.boxers set manager = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'training_base' then update public.boxers set training_base = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'weight_class' then update public.boxers set weight_class = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'stance' then update public.boxers set stance = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'height_cm' then update public.boxers set height_cm = nullif(candidate.proposed_value #>> '{}', '')::numeric where internal_id = candidate.fighter_id;
    when 'reach_cm' then update public.boxers set reach_cm = nullif(candidate.proposed_value #>> '{}', '')::numeric where internal_id = candidate.fighter_id;
    when 'pro_debut_date' then update public.boxers set pro_debut_date = nullif(candidate.proposed_value #>> '{}', '')::date where internal_id = candidate.fighter_id;
    when 'world_champion_experience' then update public.boxers set world_champion_experience = nullif(candidate.proposed_value #>> '{}', '')::boolean where internal_id = candidate.fighter_id;
    when 'next_fight_date' then update public.boxers set next_fight_date = nullif(candidate.proposed_value #>> '{}', '')::date where internal_id = candidate.fighter_id;
    when 'next_opponent' then update public.boxers set next_opponent = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'next_venue' then update public.boxers set next_venue = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'next_event_name' then update public.boxers set next_event_name = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'next_fight' then update public.boxers
      set next_fight_date = nullif(candidate.proposed_value->>'date', '')::date,
          next_opponent = nullif(candidate.proposed_value->>'opponent', ''),
          next_venue = nullif(candidate.proposed_value->>'venue', ''),
          next_event_name = nullif(candidate.proposed_value->>'event', '')
      where internal_id = candidate.fighter_id;
    else
      raise exception 'unsupported candidate field';
  end case;

  update public.boxers
  set field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
    candidate.field_name,
    jsonb_build_object(
      'name', candidate.source_name,
      'url', candidate.source_url,
      'source_date', candidate.source_date,
      'checked_at', candidate.detected_at
    )
  )
  where internal_id = candidate.fighter_id;

  if candidate.field_name = 'career_status' then
    if candidate.source_date is not null then
      update public.fighter_status_history
      set end_date = candidate.source_date - 1
      where fighter_id = candidate.fighter_id
        and end_date is null
        and status <> candidate.proposed_value #>> '{}';
    end if;
    insert into public.fighter_status_history (
      fighter_id, status, start_date, source_url, checked_at, source_name, source_date
    ) values (
      candidate.fighter_id,
      candidate.proposed_value #>> '{}',
      candidate.source_date,
      candidate.source_url,
      candidate.detected_at,
      candidate.source_name,
      candidate.source_date
    );
  elsif candidate.field_name like 'ranking_%' then
    ranking_org := upper(replace(candidate.field_name, 'ranking_', ''));
    insert into public.rankings (
      fighter_id, organization, weight_class, ranking, ranking_date,
      ranking_month, source_name, source_url, checked_at, source_date
    ) values (
      candidate.fighter_id,
      ranking_org,
      coalesce(target.weight_class, '不明'),
      (candidate.proposed_value #>> '{}')::integer,
      candidate.source_date,
      case when candidate.source_date is null then null else date_trunc('month', candidate.source_date)::date end,
      candidate.source_name,
      candidate.source_url,
      candidate.detected_at,
      candidate.source_date
    );
  elsif candidate.field_name in ('current_titles', 'past_major_titles')
        and nullif(trim(candidate.proposed_value #>> '{}'), '') not in ('なし', '不明') then
    title_name_value := coalesce(
      nullif(candidate.metadata->>'title_name', ''),
      nullif(trim(candidate.proposed_value #>> '{}'), '')
    );
    title_org_value := coalesce(nullif(candidate.metadata->>'organization', ''), '不明');
    title_weight_value := coalesce(nullif(candidate.metadata->>'weight_class', ''), target.weight_class, '不明');
    title_type_value := coalesce(nullif(candidate.metadata->>'title_type', ''), 'other');
    title_status_value := coalesce(
      nullif(candidate.metadata->>'status', ''),
      case when candidate.field_name = 'current_titles' then 'active' else 'inactive' end
    );
    insert into public.titles (organization, weight_class, title_type, title_name)
    values (title_org_value, title_weight_value, title_type_value, title_name_value)
    on conflict (organization, weight_class, title_type, title_name)
    do update set title_name = excluded.title_name
    returning title_id into title_id_value;
    insert into public.title_reigns (
      fighter_id, title_id, start_date, end_date, status,
      source_name, source_url, source_date, checked_at
    )
    select
      candidate.fighter_id,
      title_id_value,
      nullif(candidate.metadata->>'start_date', '')::date,
      nullif(candidate.metadata->>'end_date', '')::date,
      title_status_value,
      candidate.source_name,
      candidate.source_url,
      candidate.source_date,
      candidate.detected_at
    where not exists (
      select 1
      from public.title_reigns
      where fighter_id = candidate.fighter_id
        and title_id = title_id_value
        and status = title_status_value
        and start_date is not distinct from nullif(candidate.metadata->>'start_date', '')::date
    );
  elsif candidate.field_name = 'current_titles'
        and trim(candidate.proposed_value #>> '{}') in ('なし', '不明') then
    update public.title_reigns
    set status = 'vacated',
        end_date = coalesce(candidate.source_date, current_date)
    where fighter_id = candidate.fighter_id
      and status = 'active'
      and (end_date is null or end_date >= current_date);
  elsif candidate.field_name = 'world_title_weight_classes' then
    raise exception 'world_title_weight_classes is generated from title_reigns';
  end if;

  update public.update_candidates
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = nullif(trim(coalesce(p_review_note, '')), '')
  where candidate_id = p_candidate_id;

  if candidate.report_id is not null then
    update public.correction_reports
    set status = 'fixed',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        resolution_note = nullif(trim(coalesce(p_review_note, '')), ''),
        updated_at = now()
    where report_id = candidate.report_id;
  end if;

  return query select * from public.update_candidates where candidate_id = p_candidate_id;
end;
$$;

create or replace function public.review_team_update_candidate(
  p_candidate_id uuid,
  p_action text,
  p_review_note text default null
)
returns setof public.update_candidates
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate public.update_candidates;
  current_value jsonb;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_action not in ('approved', 'rejected', 'needs_review') then raise exception 'invalid review action'; end if;
  select * into candidate from public.update_candidates where candidate_id = p_candidate_id for update;
  if not found then raise exception 'candidate not found'; end if;
  if candidate.field_name not in ('residence', 'trainer', 'promoter', 'manager', 'training_base') then raise exception 'unsupported team field'; end if;
  if candidate.status not in ('pending', 'needs_review') then raise exception 'candidate already reviewed'; end if;
  if p_action <> 'approved' then
    update public.update_candidates
    set status = p_action, reviewed_by = auth.uid(), reviewed_at = now(),
        review_note = nullif(trim(coalesce(p_review_note, '')), '')
    where candidate_id = p_candidate_id;
    if candidate.report_id is not null then
      update public.correction_reports
      set status = case when p_action = 'rejected' then 'rejected' else 'reviewing' end,
          reviewed_by = auth.uid(), reviewed_at = now(),
          resolution_note = nullif(trim(coalesce(p_review_note, '')), ''),
          updated_at = now()
      where report_id = candidate.report_id;
    end if;
    return query select * from public.update_candidates where candidate_id = p_candidate_id;
    return;
  end if;

  current_value := public.boxer_field_value(candidate.fighter_id, candidate.field_name);
  if current_value is distinct from candidate.current_value then
    update public.update_candidates
    set status = 'needs_review', reviewed_by = auth.uid(), reviewed_at = now(),
        review_note = '現在値が候補作成時から変わっています。再確認してください。'
    where candidate_id = p_candidate_id;
    return query select * from public.update_candidates where candidate_id = p_candidate_id;
    return;
  end if;

  case candidate.field_name
    when 'residence' then update public.boxers set residence = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'trainer' then update public.boxers set trainer = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'promoter' then update public.boxers set promoter = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'manager' then update public.boxers set manager = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'training_base' then update public.boxers set training_base = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
  end case;
  update public.boxers
  set field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
    candidate.field_name,
    jsonb_build_object('name', candidate.source_name, 'url', candidate.source_url, 'source_date', candidate.source_date, 'checked_at', candidate.detected_at)
  )
  where internal_id = candidate.fighter_id;
  update public.update_candidates
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
      review_note = nullif(trim(coalesce(p_review_note, '')), '')
  where candidate_id = p_candidate_id;
  if candidate.report_id is not null then
    update public.correction_reports
    set status = 'fixed', reviewed_by = auth.uid(), reviewed_at = now(),
        resolution_note = nullif(trim(coalesce(p_review_note, '')), ''),
        updated_at = now()
    where report_id = candidate.report_id;
  end if;
  return query select * from public.update_candidates where candidate_id = p_candidate_id;
end;
$$;

revoke all on function public.review_update_candidate(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.review_team_update_candidate(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.review_update_candidate(uuid, text, text) to authenticated;
grant execute on function public.review_team_update_candidate(uuid, text, text) to authenticated;

-- Refresh all existing compatibility snapshots from the new canonical tables.
do $$
declare
  fighter_id_value uuid;
begin
  for fighter_id_value in select internal_id from public.boxers loop
    perform public.sync_boxer_normalized_cache(fighter_id_value);
  end loop;
end;
$$;

commit;
