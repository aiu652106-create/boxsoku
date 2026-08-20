-- Accuracy and workflow follow-up for the 16-person boxer database.
-- Apply after boxer-db-16-2026-08-20.sql.
-- This migration does not alter articles, events, or the site header.

begin;

alter table public.boxers
  add column if not exists residence text,
  add column if not exists trainer text,
  add column if not exists promoter text,
  add column if not exists manager text,
  add column if not exists training_base text;

-- Team roles are deliberately separate. In particular, Usyk17 Promotion is
-- a promoter, not a gym.
update public.boxers
set
  gym = null,
  residence = 'キエフ（ウクライナ）',
  trainer = 'ユーリ・トカチェンコ',
  promoter = 'Usyk17 Promotion',
  manager = 'エギス・クリマス',
  training_base = null,
  source_name = 'WBC公式 / BoxRec本人ページ',
  source_url = 'https://wbcboxing.com/en/wbc-special-preview-oleksandr-usyk-vs-rico-verhoeven/',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
    'gym', jsonb_build_object('name', 'WBC公式プロフィールで現行ジムの記載を確認できず', 'url', 'https://wbcboxing.com/en/wbc-special-preview-oleksandr-usyk-vs-rico-verhoeven/'),
    'residence', jsonb_build_object('name', 'WBC公式プロフィール', 'url', 'https://wbcboxing.com/en/wbc-special-preview-oleksandr-usyk-vs-rico-verhoeven/', 'source_date', '2026-08-20'),
    'trainer', jsonb_build_object('name', 'WBC公式プロフィール', 'url', 'https://wbcboxing.com/en/wbc-special-preview-oleksandr-usyk-vs-rico-verhoeven/', 'source_date', '2026-08-20'),
    'promoter', jsonb_build_object('name', 'WBC公式プロフィール', 'url', 'https://wbcboxing.com/en/wbc-special-preview-oleksandr-usyk-vs-rico-verhoeven/', 'source_date', '2026-08-20'),
    'manager', jsonb_build_object('name', 'WBC公式プロフィール', 'url', 'https://wbcboxing.com/en/wbc-special-preview-oleksandr-usyk-vs-rico-verhoeven/', 'source_date', '2026-08-20')
  )
where slug = 'oleksandr-usyk';

update public.boxers
set
  gym = 'B&B Sports Academy',
  trainer = 'ブライアン・マッキンタイア',
  promoter = null,
  manager = '自己管理',
  training_base = null,
  source_name = 'IBF公式 / WBC公式 / B&B Sports Academy',
  source_url = 'https://www.ibf-usba-boxing.com/ibf-super-middleweight-title-status/',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
    'gym', jsonb_build_object('name', 'B&B Sports Academy公式', 'url', 'https://www.bandbsportsacademy.org/team'),
    'trainer', jsonb_build_object('name', 'WBC公式 / B&B Sports Academy公式', 'url', 'https://wbcboxing.com/en/from-boxer-to-mentor-the-story-of-bomc-and-terence-crawford/'),
    'manager', jsonb_build_object('name', 'WBC公式プロフィール', 'url', 'https://wbcboxing.com/en/wbc-special-preview-canelo-vs-crawford/'),
    'career_status', jsonb_build_object('name', 'IBF公式', 'url', 'https://www.ibf-usba-boxing.com/ibf-super-middleweight-title-status/', 'source_date', '2025-12-23')
  )
where slug = 'terence-crawford';

update public.boxers
set
  trainer = 'ジョン・デビッド・ジャクソン',
  promoter = 'Salita Promotions',
  manager = 'ピーター・カーン',
  training_base = 'フロリダ州（アメリカ合衆国）',
  source_name = 'WBC公式 / ESPN / BoxRec本人ページ',
  source_url = 'https://wbcboxing.com/en/wbc-congratulates-claressa-shields-on-historic-8-million-deal-with-wynn-records-and-salita-promotions/',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
    'trainer', jsonb_build_object('name', 'ESPN', 'url', 'https://score-origin.espn.com/boxing/story/_/id/47972021/boxing-champion-claressa-shields-social-media-fights-papoose-franchon-crews-dezurn'),
    'promoter', jsonb_build_object('name', 'WBC公式', 'url', 'https://wbcboxing.com/en/wbc-congratulates-claressa-shields-on-historic-8-million-deal-with-wynn-records-and-salita-promotions/'),
    'manager', jsonb_build_object('name', 'WBC公式', 'url', 'https://wbcboxing.com/en/claressa-shields-vs-franchon-crews-dezurn-ii-in-february-2026/'),
    'training_base', jsonb_build_object('name', 'ESPN', 'url', 'https://score-origin.espn.com/boxing/story/_/id/47972021/boxing-champion-claressa-shields-social-media-fights-papoose-franchon-crews-dezurn')
  )
where slug = 'claressa-shields';

update public.boxers
set
  trainer = '加藤健太',
  source_name = '晝田瑞希公式サイト / 三迫ジム / チーム公式情報',
  source_url = 'https://mizukihiruta.com/',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
    'trainer', jsonb_build_object('name', 'チーム公式情報', 'url', 'https://dianasoundentertainment.com/hirutanandesu'),
    'gym', jsonb_build_object('name', '三迫ジム公式 / 晝田瑞希公式サイト', 'url', 'https://mizukihiruta.com/')
  )
where slug = 'mizuki-hiruta';

update public.boxers
set
  manager = '柳佐知 / 塩飽けんじ',
  training_base = 'ニューヨーク（アメリカ合衆国）',
  source_name = '吉田実代公式サイト / BoxRec本人ページ',
  source_url = 'https://miyo-yoshida.jp/member/',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
    'manager', jsonb_build_object('name', '吉田実代公式サイト', 'url', 'https://miyo-yoshida.jp/member/'),
    'training_base', jsonb_build_object('name', '吉田実代公式サイト', 'url', 'https://miyo-yoshida.jp/activities/')
  )
where slug = 'miyo-yoshida';

update public.boxers
set
  trainer = null,
  promoter = 'Matchroom Boxing',
  manager = 'ブライアン・ピーターズ',
  source_name = 'Matchroom Boxing公式 / RTE / BoxRec本人ページ',
  source_url = 'https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
    'promoter', jsonb_build_object('name', 'Matchroom Boxing公式', 'url', 'https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/', 'source_date', '2026-06-05'),
    'manager', jsonb_build_object('name', 'RTE', 'url', 'https://www.rte.ie/sport/boxing/2026/0605/1577005-it-was-croke-park-or-nothing-taylors-dream-secured/', 'source_date', '2026-06-05'),
    'trainer', jsonb_build_object('name', '2026年の公式発表で現行トレーナーを確認できず', 'url', 'https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/')
  )
where slug = 'katie-taylor';

-- A formally scheduled final bout means Katie Taylor remains active. The old
-- inactive row is retained and closed instead of being deleted.
update public.boxers
set career_status = 'active'
where slug = 'katie-taylor';

update public.fighter_status_history h
set end_date = '2026-06-04'
from public.boxers b
where h.fighter_id = b.internal_id
  and b.slug = 'katie-taylor'
  and h.status = 'inactive'
  and h.end_date is null;

insert into public.fighter_status_history (
  fighter_id, status, start_date, source_name, source_url, source_date, checked_at
)
select b.internal_id, 'active', '2026-06-05', 'Matchroom Boxing公式',
  'https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/',
  '2026-06-05', '2026-08-20T00:00:00+09:00'
from public.boxers b
where b.slug = 'katie-taylor'
  and not exists (
    select 1 from public.fighter_status_history h
    where h.fighter_id = b.internal_id and h.status = 'active' and h.start_date = '2026-06-05'
  );

-- The WBA recess status remains historical, while the snapshot value is the
-- explicit current value shown to readers.
update public.boxers
set current_titles = 'なし',
    field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
      'current_titles', jsonb_build_object(
        'name', 'WBA公式発表（休養王者の履歴） / WBA公式ランキング',
        'url', 'https://www.wbaboxing.com/boxing-news/antonio-vargas-recognized-as-wba-bantamweight-champion-tsutsumi-named-champion-in-recess',
        'source_date', '2026-05-31'
      )
    )
where slug = 'seiya-tsutsumi';

-- Keep ranking snapshots as an append-only history. The old fixed columns
-- remain for backward compatibility, but public rendering reads the view.
insert into public.rankings (
  fighter_id, organization, weight_class, ranking, ranking_date, ranking_month,
  source_name, source_url, source_date, checked_at
)
select b.internal_id, x.organization, b.weight_class, x.ranking,
  coalesce(nullif(x.source->>'source_date', '')::date, b.source_checked_at::date),
  date_trunc('month', coalesce(nullif(x.source->>'source_date', '')::date, b.source_checked_at::date))::date,
  coalesce(nullif(x.source->>'name', ''), b.source_name),
  coalesce(nullif(x.source->>'url', ''), b.source_url),
  coalesce(nullif(x.source->>'source_date', '')::date, b.source_checked_at::date),
  coalesce(b.source_checked_at, now())
from public.boxers b
cross join lateral (values
  ('WBA', b.ranking_wba, b.field_sources->'ranking_wba'),
  ('WBC', b.ranking_wbc, b.field_sources->'ranking_wbc'),
  ('IBF', b.ranking_ibf, b.field_sources->'ranking_ibf'),
  ('WBO', b.ranking_wbo, b.field_sources->'ranking_wbo')
) as x(organization, ranking, source)
where x.ranking is not null
  and coalesce(nullif(x.source->>'url', ''), b.source_url) ~* '^https?://'
  and not exists (
    select 1 from public.rankings r
    where r.fighter_id = b.internal_id
      and r.organization = x.organization
      and r.ranking = x.ranking
      and r.ranking_month = date_trunc('month', coalesce(nullif(x.source->>'source_date', '')::date, b.source_checked_at::date))::date
  );

insert into public.titles (organization, weight_class, title_type, title_name)
values
  ('WBA', 'ヘビー級', 'world', 'WBA世界ヘビー級'),
  ('IBF', 'ヘビー級', 'world', 'IBF世界ヘビー級'),
  ('WBO', 'スーパーフライ級', 'world', 'WBO世界スーパーフライ級'),
  ('WBO', 'バンタム級', 'regional', 'WBOアジアパシフィック・バンタム級'),
  ('IBF', 'スーパーライト級', 'world', 'IBF世界女子スーパーライト級'),
  ('WBO', 'スーパーライト級', 'world', 'WBO世界女子スーパーライト級')
on conflict (organization, weight_class, title_type, title_name) do nothing;

insert into public.title_reigns (
  fighter_id, title_id, start_date, status, source_name, source_url, source_date, checked_at
)
select b.internal_id, t.title_id, x.start_date, 'active', x.source_name, x.source_url,
  x.source_date, '2026-08-20T00:00:00+09:00'
from (values
  ('oleksandr-usyk', 'WBA', 'ヘビー級', 'world', 'WBA世界ヘビー級', null::date, 'WBC公式', 'https://wbcboxing.com/en/wbc-special-preview-oleksandr-usyk-vs-rico-verhoeven/', '2026-08-20'::date),
  ('oleksandr-usyk', 'IBF', 'ヘビー級', 'world', 'IBF世界ヘビー級', null::date, 'WBC公式', 'https://wbcboxing.com/en/wbc-special-preview-oleksandr-usyk-vs-rico-verhoeven/', '2026-08-20'::date),
  ('kenshiro-teraji', 'WBO', 'スーパーフライ級', 'world', 'WBO公式', null::date, 'WBO公式', 'https://wboboxing.com/', '2026-08-20'::date),
  ('tomoya-tsuboi', 'WBO', 'バンタム級', 'regional', 'WBOアジアパシフィック・バンタム級', null::date, 'スポンサー公式発表', 'https://prtimes.jp/main/html/rd/p/000000011.000030348.html', '2026-08-20'::date),
  ('katie-taylor', 'IBF', 'スーパーライト級', 'world', 'IBF世界女子スーパーライト級', null::date, 'Matchroom Boxing公式', 'https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/', '2026-06-05'::date),
  ('katie-taylor', 'WBO', 'スーパーライト級', 'world', 'WBO世界女子スーパーライト級', null::date, 'Matchroom Boxing公式', 'https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/', '2026-06-05'::date)
) as x(slug, organization, weight_class, title_type, title_name, start_date, source_name, source_url, source_date)
join public.boxers b on b.slug = x.slug
join public.titles t on t.organization = x.organization
  and t.weight_class = x.weight_class
  and t.title_type = x.title_type
  and t.title_name = x.title_name
where not exists (
  select 1 from public.title_reigns tr
  where tr.fighter_id = b.internal_id and tr.title_id = t.title_id and tr.status = 'active'
);

drop view if exists public.current_fighter_titles;
create view public.current_fighter_titles
with (security_invoker = true)
as
select tr.fighter_id,
  string_agg(t.title_name, '・' order by t.organization, t.weight_class, t.title_name) as current_titles
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
order by r.fighter_id, upper(r.organization),
  coalesce(r.ranking_date, r.ranking_month) desc nulls last,
  r.checked_at desc,
  r.ranking_id desc;

grant select on public.current_fighter_titles, public.current_fighter_rankings to anon, authenticated;

-- Keep the compatibility view in sync with the unified person record.
drop view if exists public.fighters;
create view public.fighters
with (security_invoker = true)
as
select
  internal_id as fighter_id,
  internal_id,
  slug,
  name_ja,
  name_kana,
  name_en,
  ring_name,
  boxrec_id,
  boxrec_url,
  sex,
  nationality,
  nationality_code,
  birth_date,
  birthplace,
  residence,
  career_status,
  gym,
  trainer,
  promoter,
  manager,
  training_base,
  weight_class,
  stance,
  height_cm,
  reach_cm,
  pro_debut_date,
  total_fights,
  wins,
  losses,
  draws,
  no_contests,
  ko_wins,
  ko_rate,
  world_champion_experience,
  current_titles,
  past_major_titles,
  world_title_weight_classes,
  ranking_wba,
  ranking_wbc,
  ranking_ibf,
  ranking_wbo,
  next_fight_date,
  next_opponent,
  next_venue,
  next_event_name,
  source_name,
  source_url,
  source_checked_at,
  field_sources,
  is_published,
  created_at,
  updated_at
from public.boxers
where is_published = true;

grant select on public.fighters to anon, authenticated;

-- correction_reports is the normalized public name. boxer_reports remains as
-- the compatibility/admin table used by the existing review page.
create table if not exists public.correction_reports (
  report_id uuid primary key references public.boxer_reports(report_id) on delete cascade,
  fighter_id uuid not null references public.boxers(internal_id) on delete cascade,
  field_name text not null,
  current_value text not null default '',
  suggested_value text not null,
  source_url text not null check (source_url ~* '^https?://'),
  comment text not null default '',
  submitted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'fixed', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists correction_reports_status_order_idx
  on public.correction_reports (status, submitted_at desc);

create or replace function public.sync_correction_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.correction_reports (
    report_id, fighter_id, field_name, current_value, suggested_value,
    source_url, comment, submitted_at, status, reviewed_by, reviewed_at
  ) values (
    new.report_id, new.fighter_id, new.field_name, new.current_value,
    new.proposed_value, new.evidence_url, new.comment, new.submitted_at,
    case when new.status = 'resolved' then 'fixed' else new.status end,
    new.reviewed_by, new.reviewed_at
  )
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
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists boxer_reports_sync_correction_report on public.boxer_reports;
create trigger boxer_reports_sync_correction_report
after insert or update on public.boxer_reports
for each row execute function public.sync_correction_report();

insert into public.correction_reports (
  report_id, fighter_id, field_name, current_value, suggested_value,
  source_url, comment, submitted_at, status, reviewed_by, reviewed_at
)
select report_id, fighter_id, field_name, current_value, proposed_value,
  evidence_url, comment, submitted_at,
  case when status = 'resolved' then 'fixed' else status end,
  reviewed_by, reviewed_at
from public.boxer_reports
on conflict (report_id) do nothing;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.boxer_reports'::regclass
      and conname = 'boxer_reports_field_name_check'
  ) then
    alter table public.boxer_reports drop constraint boxer_reports_field_name_check;
  end if;
end;
$$;

alter table public.boxer_reports
  add constraint boxer_reports_field_name_check
  check (field_name in (
    'name_ja', 'name_kana', 'name_en', 'ring_name', 'boxrec_id', 'boxrec_url',
    'sex', 'nationality', 'nationality_code', 'birth_date', 'birthplace',
    'career_status', 'gym', 'residence', 'trainer', 'promoter', 'manager',
    'training_base', 'weight_class', 'stance', 'height_cm', 'reach_cm',
    'pro_debut_date', 'world_champion_experience', 'current_titles',
    'past_major_titles', 'world_title_weight_classes', 'ranking_wba',
    'ranking_wbc', 'ranking_ibf', 'ranking_wbo', 'next_fight',
    'next_fight_date', 'next_opponent', 'next_venue', 'next_event_name'
  ));

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
    when 'career_status' then select to_jsonb(career_status) into value from public.boxers where internal_id = p_fighter_id;
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
    when 'current_titles' then select to_jsonb(current_titles) into value from public.boxers where internal_id = p_fighter_id;
    when 'past_major_titles' then select to_jsonb(past_major_titles) into value from public.boxers where internal_id = p_fighter_id;
    when 'world_title_weight_classes' then select to_jsonb(world_title_weight_classes) into value from public.boxers where internal_id = p_fighter_id;
    when 'ranking_wba' then select to_jsonb(ranking_wba) into value from public.boxers where internal_id = p_fighter_id;
    when 'ranking_wbc' then select to_jsonb(ranking_wbc) into value from public.boxers where internal_id = p_fighter_id;
    when 'ranking_ibf' then select to_jsonb(ranking_ibf) into value from public.boxers where internal_id = p_fighter_id;
    when 'ranking_wbo' then select to_jsonb(ranking_wbo) into value from public.boxers where internal_id = p_fighter_id;
    when 'next_fight_date' then select to_jsonb(next_fight_date) into value from public.boxers where internal_id = p_fighter_id;
    when 'next_opponent' then select to_jsonb(next_opponent) into value from public.boxers where internal_id = p_fighter_id;
    when 'next_venue' then select to_jsonb(next_venue) into value from public.boxers where internal_id = p_fighter_id;
    when 'next_event_name' then select to_jsonb(next_event_name) into value from public.boxers where internal_id = p_fighter_id;
    when 'next_fight' then
      select jsonb_build_object('date', next_fight_date, 'opponent', next_opponent, 'venue', next_venue, 'event', next_event_name)
      into value from public.boxers where internal_id = p_fighter_id;
    else
      raise exception 'unsupported boxer field';
  end case;
  return coalesce(value, 'null'::jsonb);
end;
$$;

-- The public route uses this additive RPC so the legacy report RPC remains
-- compatible with older clients while the new team fields are accepted.
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
  inserted_report public.boxer_reports;
begin
  if not public.is_server_request(p_server_token) then raise exception 'not authorized'; end if;
  if p_field_name is null or p_field_name not in (
    'name_ja', 'name_kana', 'name_en', 'ring_name', 'boxrec_id', 'boxrec_url',
    'sex', 'nationality', 'nationality_code', 'birth_date', 'birthplace',
    'career_status', 'gym', 'residence', 'trainer', 'promoter', 'manager',
    'training_base', 'weight_class', 'stance', 'height_cm', 'reach_cm',
    'pro_debut_date', 'world_champion_experience', 'current_titles',
    'past_major_titles', 'world_title_weight_classes', 'ranking_wba',
    'ranking_wbc', 'ranking_ibf', 'ranking_wbo', 'next_fight',
    'next_fight_date', 'next_opponent', 'next_venue', 'next_event_name'
  ) then raise exception 'invalid report field'; end if;
  if p_proposed_value is null or char_length(trim(p_proposed_value)) not between 1 and 2000
     or p_evidence_url is null or p_evidence_url !~* '^https?://'
     or char_length(p_evidence_url) > 1000
     or char_length(coalesce(p_comment, '')) > 2000
     or p_reporter_hash is null or p_reporter_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid boxer report';
  end if;
  select * into target from public.boxers where internal_id = p_fighter_id and is_published = true;
  if not found then raise exception 'boxer is not available'; end if;
  if exists (select 1 from public.boxer_reports where fighter_id = p_fighter_id and field_name = p_field_name and reporter_hash = p_reporter_hash and submitted_at >= now() - interval '15 minutes') then
    raise exception 'duplicate boxer report';
  end if;
  current_value := public.boxer_field_value(p_fighter_id, p_field_name);
  insert into public.boxer_reports (fighter_id, field_name, current_value, proposed_value, evidence_url, comment, reporter_hash)
  values (p_fighter_id, p_field_name, coalesce(current_value #>> '{}', '不明'), trim(p_proposed_value), trim(p_evidence_url), trim(coalesce(p_comment, '')), p_reporter_hash)
  returning * into inserted_report;
  insert into public.update_candidates (fighter_id, report_id, category, field_name, current_value, proposed_value, source_name, source_url, detected_at, status)
  values (p_fighter_id, inserted_report.report_id, 'user_report', p_field_name, coalesce(current_value, 'null'::jsonb), to_jsonb(trim(p_proposed_value)), 'ユーザー報告', trim(p_evidence_url), inserted_report.submitted_at, 'pending');
  return next inserted_report;
end;
$$;

revoke all on function public.submit_boxer_report_v2(uuid, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_boxer_report_v2(uuid, text, text, text, text, text, text)
  to anon, authenticated;

-- Team-field candidates use the same approval rule without changing the
-- existing approval function used by the older fields.
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
    update public.update_candidates set status = p_action, reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(coalesce(p_review_note, '')), '') where candidate_id = p_candidate_id;
    if candidate.report_id is not null then
      update public.boxer_reports set status = case when p_action = 'rejected' then 'rejected' else 'reviewing' end, reviewed_by = auth.uid(), reviewed_at = now(), resolution_note = nullif(trim(coalesce(p_review_note, '')), '') where report_id = candidate.report_id;
    end if;
    return query select * from public.update_candidates where candidate_id = p_candidate_id;
    return;
  end if;
  current_value := public.boxer_field_value(candidate.fighter_id, candidate.field_name);
  if current_value is distinct from candidate.current_value then
    update public.update_candidates set status = 'needs_review', reviewed_by = auth.uid(), reviewed_at = now(), review_note = '現在値が候補作成時から変わっています。再確認してください。' where candidate_id = p_candidate_id;
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
  update public.boxers set field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(candidate.field_name, jsonb_build_object('name', candidate.source_name, 'url', candidate.source_url, 'source_date', candidate.source_date, 'checked_at', candidate.detected_at)) where internal_id = candidate.fighter_id;
  update public.update_candidates set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(coalesce(p_review_note, '')), '') where candidate_id = p_candidate_id;
  if candidate.report_id is not null then
    update public.boxer_reports set status = 'resolved', reviewed_by = auth.uid(), reviewed_at = now(), resolution_note = nullif(trim(coalesce(p_review_note, '')), '') where report_id = candidate.report_id;
  end if;
  return query select * from public.update_candidates where candidate_id = p_candidate_id;
end;
$$;

revoke all on function public.review_team_update_candidate(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_team_update_candidate(uuid, text, text) to authenticated;

commit;
