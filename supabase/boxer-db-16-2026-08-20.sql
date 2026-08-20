-- Unified boxer/fighter collection: 16 verified test fighters.
-- Apply after schema.sql and boxer-workflow-2026-08-20.sql.
-- This migration deliberately keeps public.boxers as the site snapshot and
-- exposes public.fighters as a compatibility view; it does not create a
-- second copy of the fighter data.

begin;

alter table public.boxers
  add column if not exists sex text,
  add column if not exists nationality_code text;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.boxers'::regclass
      and conname = 'boxers_career_status_check'
  ) then
    alter table public.boxers drop constraint boxers_career_status_check;
  end if;
end;
$$;

alter table public.boxers
  add constraint boxers_career_status_check
  check (career_status in ('active', 'retired', 'inactive', 'unknown'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.boxers'::regclass
      and conname = 'boxers_sex_check'
  ) then
    alter table public.boxers
      add constraint boxers_sex_check
      check (sex is null or sex in ('male', 'female', 'unknown'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.boxers'::regclass
      and conname = 'boxers_nationality_code_check'
  ) then
    alter table public.boxers
      add constraint boxers_nationality_code_check
      check (nationality_code is null or nationality_code ~ '^[A-Z]{3}$');
  end if;
end;
$$;

create unique index if not exists boxers_boxrec_id_unique_idx
  on public.boxers (boxrec_id)
  where boxrec_id is not null and btrim(boxrec_id) <> '';

create index if not exists boxers_nationality_code_idx
  on public.boxers (nationality_code, name_ja);

-- Compatibility view for future fighter/event/match tables.
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
  career_status,
  gym,
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

-- Source dates are separate from the time the row was entered.
alter table public.fighter_status_history
  add column if not exists source_name text not null default '',
  add column if not exists source_date date;

alter table public.rankings
  add column if not exists source_date date;

alter table public.title_reigns
  add column if not exists source_date date;

-- Bulk import audit trail. Nothing is applied until the admin confirms the
-- preview; duplicate/error/review rows are never applied by the UI.
create table if not exists public.bulk_import_runs (
  import_id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in (
    'boxers', 'rankings', 'titles', 'title_reigns', 'fighter_status_history'
  )),
  file_name text not null,
  file_format text not null check (file_format in ('csv', 'json', 'paste')),
  row_count integer not null default 0 check (row_count >= 0),
  new_count integer not null default 0 check (new_count >= 0),
  update_count integer not null default 0 check (update_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  status text not null default 'preview'
    check (status in ('preview', 'applied', 'failed', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  error_summary jsonb not null default '[]'::jsonb
);

create table if not exists public.bulk_import_items (
  item_id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.bulk_import_runs(import_id) on delete cascade,
  row_number integer not null check (row_number > 0),
  proposed_record jsonb not null,
  existing_fighter_id uuid references public.boxers(internal_id) on delete set null,
  operation text not null check (operation in ('new', 'update', 'duplicate', 'error', 'review')),
  validation_errors jsonb not null default '[]'::jsonb,
  status text not null default 'preview'
    check (status in ('preview', 'applied', 'skipped', 'failed')),
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bulk_import_runs_created_idx
  on public.bulk_import_runs (created_at desc);
create index if not exists bulk_import_items_import_idx
  on public.bulk_import_items (import_id, row_number);

alter table public.bulk_import_runs enable row level security;
alter table public.bulk_import_items enable row level security;

drop policy if exists "Admins can read bulk import runs" on public.bulk_import_runs;
create policy "Admins can read bulk import runs"
on public.bulk_import_runs for select to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert bulk import runs" on public.bulk_import_runs;
create policy "Admins can insert bulk import runs"
on public.bulk_import_runs for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update bulk import runs" on public.bulk_import_runs;
create policy "Admins can update bulk import runs"
on public.bulk_import_runs for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete bulk import runs" on public.bulk_import_runs;
create policy "Admins can delete bulk import runs"
on public.bulk_import_runs for delete to authenticated
using (public.is_admin());

drop policy if exists "Admins can read bulk import items" on public.bulk_import_items;
create policy "Admins can read bulk import items"
on public.bulk_import_items for select to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert bulk import items" on public.bulk_import_items;
create policy "Admins can insert bulk import items"
on public.bulk_import_items for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update bulk import items" on public.bulk_import_items;
create policy "Admins can update bulk import items"
on public.bulk_import_items for update to authenticated
using (public.is_admin()) with check (public.is_admin());

revoke all on public.bulk_import_runs, public.bulk_import_items from anon;
grant select, insert, update, delete on public.bulk_import_runs,
  public.bulk_import_items to authenticated;

-- The public correction workflow can also validate the newly added identity
-- fields. Existing report rows remain valid.
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
    'career_status', 'gym', 'weight_class', 'stance', 'height_cm', 'reach_cm',
    'pro_debut_date', 'world_champion_experience', 'current_titles',
    'past_major_titles', 'world_title_weight_classes', 'ranking_wba',
    'ranking_wbc', 'ranking_ibf', 'ranking_wbo', 'next_fight',
    'next_fight_date', 'next_opponent', 'next_venue', 'next_event_name'
  ));

-- Re-publish the existing ten and add exactly six new test records. All six
-- BoxRec IDs were checked against the named person's BoxRec page.
update public.boxers
set sex = 'male', nationality_code = 'JPN'
where slug in (
  'naoya-inoue', 'junto-nakatani', 'kenshiro-teraji', 'tenshin-nasukawa',
  'seiya-tsutsumi', 'tomoya-tsuboi', 'yoshiki-takei', 'ryosuke-nishida',
  'kosei-tanaka', 'hozumi-hasegawa'
);

update public.boxers
set
  current_titles = 'WBA世界バンタム級休養王者',
  ranking_wba = 1,
  source_name = 'WBA公式発表・WBA公式ランキング',
  source_url = 'https://www.wbaboxing.com/boxing-news/antonio-vargas-recognized-as-wba-bantamweight-champion-tsutsumi-named-champion-in-recess',
  source_checked_at = '2026-08-20T00:00:00+09',
  field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
    'current_titles', jsonb_build_object(
      'name', 'WBA公式発表',
      'url', 'https://www.wbaboxing.com/boxing-news/antonio-vargas-recognized-as-wba-bantamweight-champion-tsutsumi-named-champion-in-recess',
      'source_date', '2026-05-31'
    ),
    'ranking_wba', jsonb_build_object(
      'name', 'WBA公式ランキング 2026年7月',
      'url', 'https://www.wbaboxing.com/wba-ranking-pdf/2026/7/1534183407',
      'source_date', '2026-07-01'
    )
  )
where slug = 'seiya-tsutsumi';

insert into public.boxers (
  slug, name_ja, name_kana, name_en, ring_name, boxrec_id, boxrec_url,
  sex, nationality, nationality_code, birth_date, birthplace, career_status,
  gym, weight_class, stance, height_cm, reach_cm, pro_debut_date,
  total_fights, wins, losses, draws, no_contests, ko_wins,
  world_champion_experience, current_titles, past_major_titles,
  world_title_weight_classes, ranking_wba, ranking_wbc, ranking_ibf, ranking_wbo,
  next_fight_date, next_opponent, next_venue, next_event_name,
  source_name, source_url, source_checked_at, field_sources, is_published
)
values
(
  'oleksandr-usyk', 'オレクサンドル・ウシク', 'おれくさんどる・うしく',
  'Oleksandr Usyk', 'The Cat', '659772', 'https://boxrec.com/en/box-pro/659772',
  'male', 'ウクライナ', 'UKR', '1987-01-17', 'クリミア・シンフェロポリ（ウクライナ）', 'active',
  'Usyk17 Promotion', 'ヘビー級', 'サウスポー', 191, 198, '2013-11-09',
  25, 25, 0, 0, 0, 16, true,
  'WBAスーパー・WBC・IBF世界ヘビー級', 'WBA・WBC・IBF・WBO世界クルーザー級',
  'クルーザー級、ヘビー級', NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  'BoxRec本人ページ / WBC公式 / WBA公式',
  'https://wbcboxing.com/en/oleksandr-usyk-conquers-giza-by-the-pyramids-and-retains-his-absolute-wbc-crown/',
  '2026-08-20T00:00:00+09',
  '{"profile":{"name":"BoxRec本人ページ","url":"https://boxrec.com/en/box-pro/659772"},"record":{"name":"BoxRec本人ページ","url":"https://boxrec.com/en/box-pro/659772"},"current_titles":{"name":"WBC公式 / WBA公式","url":"https://wbcboxing.com/en/oleksandr-usyk-conquers-giza-by-the-pyramids-and-retains-his-absolute-wbc-crown/"}}'::jsonb,
  true
),
(
  'terence-crawford', 'テレンス・クロフォード', 'てれんす・くろふぉーど',
  'Terence Crawford', 'Bud', '447121', 'https://boxrec.com/en/box-pro/447121',
  'male', 'アメリカ合衆国', 'USA', '1987-09-28', 'ネブラスカ州オマハ（アメリカ合衆国）', 'retired',
  NULL, 'スーパーミドル級', 'サウスポー', 175, 191, '2008-03-14',
  42, 42, 0, 0, 0, 31, true,
  'なし', 'WBO世界ライト級、WBA・WBC・IBF・WBO世界スーパーライト級、WBA・WBC・IBF・WBO世界ウェルター級、WBA世界スーパーウェルター級、WBA・WBC・IBF・WBO世界スーパーミドル級',
  'ライト級、スーパーライト級、ウェルター級、スーパーウェルター級、スーパーミドル級', NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  'BoxRec本人ページ / IBA公式 / IBF公式',
  'https://www.iba.sport/news/iba-wishes-terence-crawford-the-very-best-as-he-announces-retirement-from-professional-boxing/',
  '2026-08-20T00:00:00+09',
  '{"profile":{"name":"BoxRec本人ページ","url":"https://boxrec.com/en/box-pro/447121"},"record":{"name":"BoxRec本人ページ","url":"https://boxrec.com/en/box-pro/447121"},"career_status":{"name":"IBA公式","url":"https://www.iba.sport/news/iba-wishes-terence-crawford-the-very-best-as-he-announces-retirement-from-professional-boxing/","source_date":"2025-12-17"}}'::jsonb,
  true
),
(
  'mizuki-hiruta', '晝田瑞希', 'ひるた みずき',
  'Mizuki Hiruta', 'MIMI', '899773', 'https://boxrec.com/en/box-pro/899773',
  'female', '日本', 'JPN', '1996-04-12', '岡山県岡山市', 'active',
  '三迫ジム', 'スーパーフライ級', 'サウスポー', 163, 169, '2021-10-15',
  11, 11, 0, 0, 0, 2, true,
  'WBO世界女子スーパーフライ級', '第4代日本女子フライ級',
  'スーパーフライ級', NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '晝田瑞希公式サイト / BoxRec本人ページ / 日本プロボクシング協会',
  'https://mizukihiruta.com/', '2026-08-20T00:00:00+09',
  '{"profile":{"name":"晝田瑞希公式サイト","url":"https://mizukihiruta.com/"},"record":{"name":"晝田瑞希公式サイト","url":"https://mizukihiruta.com/"},"boxrec":{"name":"BoxRec本人ページ","url":"https://boxrec.com/en/box-pro/899773"},"titles":{"name":"日本プロボクシング協会","url":"https://jpba.gr.jp/champions.html"}}'::jsonb,
  true
),
(
  'miyo-yoshida', '吉田実代', 'よしだ みよ',
  'Miyo Yoshida', 'Miyo Musashi', '689457', 'https://boxrec.com/en/box-pro/689457',
  'female', '日本', 'JPN', '1988-04-12', '鹿児島県鹿児島市', 'active',
  '三迫ジム', 'スーパーバンタム級', 'オーソドックス', 161, 161, '2014-05-28',
  24, 19, 5, 0, 0, 1, true,
  'なし', '初代日本女子バンタム級、第6代OPBF東洋太平洋女子バンタム級、第5代・第7代WBO女子世界スーパーフライ級、第8代IBF女子世界バンタム級',
  'スーパーフライ級、バンタム級', NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '吉田実代公式サイト / BoxRec本人ページ',
  'https://miyo-yoshida.jp/member/', '2026-08-20T00:00:00+09',
  '{"profile":{"name":"吉田実代公式サイト","url":"https://miyo-yoshida.jp/member/"},"record":{"name":"BoxRec本人ページ","url":"https://boxrec.com/en/box-pro/689457"},"boxrec":{"name":"BoxRec本人ページ","url":"https://boxrec.com/en/box-pro/689457"},"titles":{"name":"吉田実代公式サイト","url":"https://miyo-yoshida.jp/member/"}}'::jsonb,
  true
),
(
  'claressa-shields', 'クラレッサ・シールズ', 'くられっさ・しーるず',
  'Claressa Shields', 'T-Rex', '777865', 'https://boxrec.com/en/box-pro/777865',
  'female', 'アメリカ合衆国', 'USA', '1995-03-17', 'ミシガン州フリント（アメリカ合衆国）', 'active',
  NULL, 'ミドル級', 'オーソドックス', 173, 173, '2016-11-19',
  19, 19, 0, 0, 0, 4, true,
  'WBA・WBC世界女子ミドル級', 'WBA・WBC・IBF・WBO世界女子ヘビー級、WBC・WBO世界女子ライトヘビー級',
  'ミドル級、ライトヘビー級、ヘビー級', NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  'BoxRec本人ページ / WBA公式試合日程 / WBC公式',
  'https://www.wbaboxing.com/wba-fights-schedule', '2026-08-20T00:00:00+09',
  '{"profile":{"name":"BoxRec本人ページ","url":"https://boxrec.com/en/box-pro/777865"},"record":{"name":"BoxRec本人ページ","url":"https://boxrec.com/en/box-pro/777865"},"current_titles":{"name":"WBA公式試合日程 / WBC公式","url":"https://www.wbaboxing.com/wba-fights-schedule","source_date":"2026-08-15"}}'::jsonb,
  true
),
(
  'katie-taylor', 'ケイティ・テイラー', 'けいてぃ・ていらー',
  'Katie Taylor', 'The Bray Bomber', '778185', 'https://boxrec.com/en/box-pro/778185',
  'female', 'アイルランド', 'IRL', '1986-07-02', 'ブレイ（アイルランド）', 'inactive',
  NULL, 'スーパーライト級', 'オーソドックス', 165, 168, '2016-11-26',
  26, 25, 1, 0, 0, 6, true,
  'IBF・WBO世界女子スーパーライト級', 'WBA・WBC・IBF・WBO世界女子ライト級',
  'ライト級、スーパーライト級', NULL, NULL, NULL, NULL,
  '2026-09-05', 'フローラ・ピリ', 'クローク・パーク（ダブリン）', 'WBO世界女子スーパーライト級タイトルマッチ',
  'BoxRec本人ページ / WBO公式', 'https://wboboxing.com/', '2026-08-20T00:00:00+09',
  '{"profile":{"name":"BoxRec本人ページ","url":"https://boxrec.com/en/box-pro/778185"},"record":{"name":"BoxRec本人ページ","url":"https://boxrec.com/en/box-pro/778185"},"next_fight":{"name":"WBO公式","url":"https://wboboxing.com/","source_date":"2026-08-20"}}'::jsonb,
  true
)
on conflict (slug) do update set
  name_ja = excluded.name_ja,
  name_kana = excluded.name_kana,
  name_en = excluded.name_en,
  ring_name = excluded.ring_name,
  boxrec_id = excluded.boxrec_id,
  boxrec_url = excluded.boxrec_url,
  sex = excluded.sex,
  nationality = excluded.nationality,
  nationality_code = excluded.nationality_code,
  birth_date = excluded.birth_date,
  birthplace = excluded.birthplace,
  career_status = excluded.career_status,
  gym = excluded.gym,
  weight_class = excluded.weight_class,
  stance = excluded.stance,
  height_cm = excluded.height_cm,
  reach_cm = excluded.reach_cm,
  pro_debut_date = excluded.pro_debut_date,
  total_fights = excluded.total_fights,
  wins = excluded.wins,
  losses = excluded.losses,
  draws = excluded.draws,
  no_contests = excluded.no_contests,
  ko_wins = excluded.ko_wins,
  world_champion_experience = excluded.world_champion_experience,
  current_titles = excluded.current_titles,
  past_major_titles = excluded.past_major_titles,
  world_title_weight_classes = excluded.world_title_weight_classes,
  ranking_wba = excluded.ranking_wba,
  ranking_wbc = excluded.ranking_wbc,
  ranking_ibf = excluded.ranking_ibf,
  ranking_wbo = excluded.ranking_wbo,
  next_fight_date = excluded.next_fight_date,
  next_opponent = excluded.next_opponent,
  next_venue = excluded.next_venue,
  next_event_name = excluded.next_event_name,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  source_checked_at = excluded.source_checked_at,
  field_sources = excluded.field_sources,
  is_published = excluded.is_published;

-- Seed current status history once. Old title/status rows are not deleted.
insert into public.fighter_status_history (
  fighter_id, status, start_date, source_name, source_url, source_date, checked_at
)
select
  b.internal_id,
  b.career_status,
  case when b.slug = 'terence-crawford' then '2025-12-17'::date else null end,
  b.source_name,
  b.source_url,
  case when b.slug = 'terence-crawford' then '2025-12-17'::date else b.source_checked_at::date end,
  coalesce(b.source_checked_at, now())
from public.boxers b
where b.slug in (
  'naoya-inoue', 'junto-nakatani', 'kenshiro-teraji', 'tenshin-nasukawa',
  'seiya-tsutsumi', 'tomoya-tsuboi', 'yoshiki-takei', 'ryosuke-nishida',
  'kosei-tanaka', 'hozumi-hasegawa', 'oleksandr-usyk', 'terence-crawford',
  'mizuki-hiruta', 'miyo-yoshida', 'claressa-shields', 'katie-taylor'
)
and not exists (
  select 1 from public.fighter_status_history h
  where h.fighter_id = b.internal_id and h.status = b.career_status
);

-- WBA's latest published ranking keeps Tsutsumi's historical recess status
-- while recording the current ranking separately.
insert into public.rankings (
  fighter_id, organization, weight_class, ranking, ranking_date, ranking_month,
  source_name, source_url, source_date, checked_at
)
select b.internal_id, 'WBA', 'バンタム級', 1, '2026-07-01', '2026-07-01',
  'WBA公式ランキング 2026年7月',
  'https://www.wbaboxing.com/wba-ranking-pdf/2026/7/1534183407',
  '2026-07-01', '2026-08-20T00:00:00+09'
from public.boxers b
where b.slug = 'seiya-tsutsumi'
and not exists (
  select 1 from public.rankings r
  where r.fighter_id = b.internal_id
    and r.organization = 'WBA'
    and r.ranking_month = '2026-07-01'
);

insert into public.titles (organization, weight_class, title_type, title_name)
values
  ('WBA', 'バンタム級', 'world', 'WBA世界バンタム級休養王者'),
  ('WBO', 'スーパーフライ級', 'world', 'WBO世界女子スーパーフライ級'),
  ('WBC', 'ヘビー級', 'world', 'WBC世界ヘビー級'),
  ('WBA', 'ミドル級', 'world', 'WBA世界女子ミドル級'),
  ('WBC', 'ミドル級', 'world', 'WBC世界女子ミドル級')
on conflict (organization, weight_class, title_type, title_name) do nothing;

insert into public.title_reigns (
  fighter_id, title_id, start_date, status, source_name, source_url, source_date, checked_at
)
select b.internal_id, t.title_id, x.start_date, x.status, x.source_name, x.source_url,
  x.source_date, '2026-08-20T00:00:00+09'
from (values
  ('seiya-tsutsumi', 'WBA', 'バンタム級', 'world', 'WBA世界バンタム級休養王者', null::date, 'inactive', 'WBA公式発表', 'https://www.wbaboxing.com/boxing-news/antonio-vargas-recognized-as-wba-bantamweight-champion-tsutsumi-named-champion-in-recess', '2026-05-31'::date),
  ('mizuki-hiruta', 'WBO', 'スーパーフライ級', 'world', 'WBO世界女子スーパーフライ級', '2022-12-01'::date, 'active', '晝田瑞希公式サイト', 'https://mizukihiruta.com/', '2026-08-20'::date),
  ('oleksandr-usyk', 'WBC', 'ヘビー級', 'world', 'WBC公式', '2024-05-18'::date, 'active', 'WBC公式', 'https://wbcboxing.com/mailing/2026/WBC_RATINGS_JUNE_2026_.pdf', '2026-06-01'::date),
  ('claressa-shields', 'WBA', 'ミドル級', 'world', 'WBA公式試合日程', '2026-08-15'::date, 'active', 'WBA公式試合日程', 'https://www.wbaboxing.com/wba-fights-schedule', '2026-08-15'::date),
  ('claressa-shields', 'WBC', 'ミドル級', 'world', 'WBC公式試合日程', '2026-08-15'::date, 'active', 'WBC公式', 'https://wbcboxing.com/en/eventos/list/?tribe-bar-date=2026-07-17', '2026-08-15'::date)
) as x(slug, organization, weight_class, title_type, title_name, start_date, status, source_name, source_url, source_date)
join public.boxers b on b.slug = x.slug
join public.titles t on t.organization = x.organization
  and t.weight_class = x.weight_class
  and t.title_type = x.title_type
  and t.title_name = x.title_name
where not exists (
  select 1 from public.title_reigns tr
  where tr.fighter_id = b.internal_id and tr.title_id = t.title_id
    and tr.status = x.status
);

commit;
