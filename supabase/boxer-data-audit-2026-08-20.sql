-- 16-person data audit completed on 2026-08-20.
-- This migration keeps the existing canonical schema and only applies
-- evidence-backed data corrections plus source normalization.

begin;

-- Katie Taylor is defending the WBA, IBF and WBO titles on 2026-09-05.
-- The WBA title row already exists, so add only the missing female reign.
insert into public.titles (organization, weight_class, title_type, title_name)
values ('WBA', 'スーパーライト級', 'world', 'WBA世界女子スーパーライト級')
on conflict (organization, weight_class, title_type, title_name) do nothing;

insert into public.title_reigns (
  fighter_id, title_id, start_date, end_date, status,
  source_name, source_url, source_date, checked_at
)
select b.internal_id, t.title_id, null, null, 'active',
  'Matchroom Boxing公式',
  'https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/',
  '2026-06-05', '2026-08-20T00:00:00+09:00'
from public.boxers b
join public.titles t
  on t.organization = 'WBA'
 and t.weight_class = 'スーパーライト級'
 and t.title_type = 'world'
 and t.title_name = 'WBA世界女子スーパーライト級'
where b.slug = 'katie-taylor'
  and not exists (
    select 1
    from public.title_reigns tr
    where tr.fighter_id = b.internal_id
      and tr.title_id = t.title_id
      and tr.status = 'active'
      and tr.end_date is null
  );

-- The primary profile source is one URL per boxer. Field-specific current
-- title, ranking, status and next-fight sources remain in field_sources and
-- the canonical history tables.
update public.boxers
set
  source_name = 'BoxRec本人ページ',
  source_url = boxrec_url,
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = jsonb_set(
    coalesce(field_sources, '{}'::jsonb),
    '{profile}',
    jsonb_build_object(
      'name', 'BoxRec本人ページ',
      'url', boxrec_url,
      'source_date', '2026-08-20'
    ),
    true
  )
where is_published = true
  and boxrec_url is not null;

-- Keep the latest canonical status row traceable to one concrete source URL.
update public.fighter_status_history h
set
  source_name = x.source_name,
  source_url = x.source_url,
  source_date = x.source_date,
  checked_at = '2026-08-20T00:00:00+09:00'
from (values
  ('oleksandr-usyk', 'WBC公式', 'https://wbcboxing.com/en/oleksandr-usyk-conquers-giza-by-the-pyramids-and-retains-his-absolute-wbc-crown/', '2026-05-23'::date),
  ('claressa-shields', 'WBA公式試合日程', 'https://www.wbaboxing.com/wba-fights-schedule', '2026-08-15'::date),
  ('katie-taylor', 'Matchroom Boxing公式', 'https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/', '2026-06-05'::date),
  ('terence-crawford', 'IBA公式', 'https://www.iba.sport/news/iba-wishes-terence-crawford-the-very-best-as-he-announces-retirement-from-professional-boxing/', '2025-12-17'::date),
  ('junto-nakatani', '中谷潤人公式プロフィール', 'https://junto.jp/profile', null::date),
  ('naoya-inoue', '井上尚弥公式プロフィール', 'https://naoya-inoue.com/profile/', null::date),
  ('miyo-yoshida', '吉田実代公式サイト', 'https://miyo-yoshida.jp/member/', null::date),
  ('tomoya-tsuboi', '帝拳公式プロフィール', 'https://www.teiken.com/profile/tsuboi.html', null::date),
  ('seiya-tsutsumi', 'WBA公式', 'https://www.wbaboxing.com/boxing-news/antonio-vargas-recognized-as-wba-bantamweight-champion-tsutsumi-named-champion-in-recess', '2026-05-31'::date),
  ('kenshiro-teraji', 'BMBボクシングジム公式プロフィール', 'https://bmbsportsgym.com/champ/', null::date),
  ('mizuki-hiruta', '晝田瑞希公式サイト', 'https://mizukihiruta.com/', null::date),
  ('yoshiki-takei', '武居由樹公式サイト', 'https://yoshikitakei.com/', null::date),
  ('kosei-tanaka', '北國新聞', 'https://www.hokkoku.co.jp/articles/-/1765634', '2025-06-04'::date),
  ('ryosuke-nishida', '3150FIGHT公式プロフィール', 'https://www.3150fight.com/profile/143/', null::date),
  ('tenshin-nasukawa', '帝拳公式プロフィール', 'https://www.teiken.com/profile/tenshin.html', null::date),
  ('hozumi-hasegawa', 'BoxRec本人ページ', 'https://boxrec.com/en/box-pro/105935', null::date)
) as x(slug, source_name, source_url, source_date)
join public.boxers b on b.slug = x.slug
where h.fighter_id = b.internal_id
  and h.end_date is null;

-- Evidence from the WBC Canelo/Crawford profile explicitly says Crawford is
-- self-managed; retain that classification rather than replacing it with an
-- older manager listing.
update public.boxers
set field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
  'manager', jsonb_build_object(
    'name', 'WBC公式プロフィール',
    'url', 'https://wbcboxing.com/en/wbc-special-preview-canelo-vs-crawford/',
    'source_date', '2025-09-08'
  ),
  'gym', jsonb_build_object(
    'name', 'B&B Sports Academy公式',
    'url', 'https://www.bandbsportsacademy.org/team'
  ),
  'trainer', jsonb_build_object(
    'name', 'B&B Sports Academy公式',
    'url', 'https://www.bandbsportsacademy.org/team'
  )
)
where slug = 'terence-crawford';

update public.boxers
set field_sources = coalesce(field_sources, '{}'::jsonb) || jsonb_build_object(
  'current_titles', jsonb_build_object(
    'name', 'Matchroom Boxing公式',
    'url', 'https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/',
    'source_date', '2026-06-05'
  ),
  'next_fight', jsonb_build_object(
    'name', 'Matchroom Boxing公式',
    'url', 'https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/',
    'source_date', '2026-06-05'
  )
)
where slug = 'katie-taylor';

commit;
