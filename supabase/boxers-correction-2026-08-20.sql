-- Accuracy correction for the original 10-person boxer database.
-- This migration intentionally touches only public.boxers.

begin;

alter table public.boxers
  add column if not exists boxrec_url text;

update public.boxers
set
  boxrec_id = '628407',
  boxrec_url = 'https://boxrec.com/en/box-pro/628407',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = field_sources || jsonb_build_object(
    'boxrec_id', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/628407'),
    'boxrec_url', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/628407')
  )
where slug = 'naoya-inoue';

update public.boxers
set
  boxrec_id = '718508',
  boxrec_url = 'https://boxrec.com/en/box-pro/718508',
  stance = 'サウスポー',
  height_cm = 173,
  reach_cm = 174,
  current_titles = 'なし',
  past_major_titles = 'WBO世界フライ級、WBO世界スーパーフライ級、WBC・IBF世界バンタム級',
  ranking_wba = 5,
  ranking_wbc = 1,
  ranking_ibf = null,
  ranking_wbo = 2,
  source_name = '中谷潤人公式プロフィール / BoxRec / 世界団体公式',
  source_url = 'https://junto.jp/profile',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = field_sources || jsonb_build_object(
    'boxrec_id', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/718508'),
    'boxrec_url', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/718508'),
    'stance', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/718508'),
    'height_cm', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/718508'),
    'reach_cm', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/718508'),
    'current_titles', jsonb_build_object('name', 'BoxRec本人ページ / WBA・WBC・WBO公式ランキング', 'url', 'https://boxrec.com/en/box-pro/718508'),
    'past_major_titles', jsonb_build_object('name', 'WBC公式プロフィール', 'url', 'https://wbcboxing.com/en/getting-to-know-junto-nakatani-the-three-division-champion-shaking-up-the-boxing-world/'),
    'ranking_wba', jsonb_build_object('name', 'WBA公式ランキング（2026年7月31日）', 'url', 'https://www.wbaboxing.com/wba-ranking'),
    'ranking_wbc', jsonb_build_object('name', 'WBC公式ランキング（2026年8月）', 'url', 'https://wbcboxing.com/mailing/2026/WBC_RATINGS_AUGUST_2026.pdf'),
    'ranking_wbo', jsonb_build_object('name', 'WBO公式ランキング（2026年7月28日）', 'url', 'https://wboboxing.com/wborankings/report/cmFua2luZw%3D%3D/bWFsZQ%3D%3D/b368b21ba1cee99fd0a978f4ac74e866/RankingReportMale')
  )
where slug = 'junto-nakatani';

update public.boxers
set
  boxrec_id = '692967',
  boxrec_url = 'https://boxrec.com/en/box-pro/692967',
  pro_debut_date = '2014-08-03',
  current_titles = 'WBO世界スーパーフライ級',
  source_name = 'BMBボクシングジム公式プロフィール / BoxRec / ボクシングモバイル',
  source_url = 'https://bmbsportsgym.com/champ/',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = field_sources || jsonb_build_object(
    'boxrec_id', jsonb_build_object('name', 'BoxRec本人ページへのリンクを確認', 'url', 'https://boxrec.com/en/box-pro/692967'),
    'boxrec_url', jsonb_build_object('name', 'BoxRec本人ページへのリンクを確認', 'url', 'https://boxrec.com/en/box-pro/692967'),
    'pro_debut_date', jsonb_build_object('name', 'ボクシングモバイル選手名鑑', 'url', 'https://boxmob.jp/sp/boxer/boxer.html?boxer_id=4195'),
    'current_titles', jsonb_build_object('name', 'WBO公式ランキング（2026年7月28日）', 'url', 'https://wboboxing.com/wborankings/report/cmFua2luZw%3D%3D/bWFsZQ%3D%3D/b368b21ba1cee99fd0a978f4ac74e866/RankingReportMale')
  )
where slug = 'kenshiro-teraji';

update public.boxers
set
  boxrec_id = '853210',
  boxrec_url = 'https://boxrec.com/en/box-pro/853210',
  current_titles = 'なし',
  world_title_weight_classes = 'なし',
  ranking_wba = null,
  ranking_wbc = 1,
  ranking_ibf = null,
  ranking_wbo = 1,
  source_name = '帝拳公式プロフィール / BoxRec / WBC・WBO公式ランキング',
  source_url = 'https://www.teiken.com/profile/tenshin.html',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = field_sources || jsonb_build_object(
    'boxrec_id', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/853210'),
    'boxrec_url', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/853210'),
    'current_titles', jsonb_build_object('name', 'WBC・WBO公式ランキング（2026年8月）', 'url', 'https://wbcboxing.com/mailing/2026/WBC_RATINGS_AUGUST_2026.pdf'),
    'world_title_weight_classes', jsonb_build_object('name', 'WBC・WBO公式ランキング（2026年8月）', 'url', 'https://wboboxing.com/wborankings/report/cmFua2luZw%3D%3D/bWFsZQ%3D%3D/b368b21ba1cee99fd0a978f4ac74e866/RankingReportMale'),
    'ranking_wbc', jsonb_build_object('name', 'WBC公式ランキング（2026年8月）', 'url', 'https://wbcboxing.com/mailing/2026/WBC_RATINGS_AUGUST_2026.pdf'),
    'ranking_wbo', jsonb_build_object('name', 'WBO公式ランキング（2026年7月28日）', 'url', 'https://wboboxing.com/wborankings/report/cmFua2luZw%3D%3D/bWFsZQ%3D%3D/b368b21ba1cee99fd0a978f4ac74e866/RankingReportMale')
  )
where slug = 'tenshin-nasukawa';

update public.boxers
set
  boxrec_id = '829718',
  boxrec_url = 'https://boxrec.com/en/box-pro/829718',
  gym = '角海老宝石ジム',
  stance = 'スイッチ',
  current_titles = 'WBA世界バンタム級休養王者',
  ranking_wba = 1,
  ranking_wbc = 27,
  ranking_ibf = null,
  ranking_wbo = null,
  source_name = 'BoxRec / WBA・WBC公式 / 角海老宝石ジム情報',
  source_url = 'https://www.wbaboxing.com/boxing-news/antonio-vargas-recognized-as-wba-bantamweight-champion-tsutsumi-named-champion-in-recess',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = field_sources || jsonb_build_object(
    'boxrec_id', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/829718'),
    'boxrec_url', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/829718'),
    'gym', jsonb_build_object('name', 'ボクシングモバイル選手名鑑', 'url', 'https://boxmob.jp/sp/boxer/boxer.html?boxer_id=7392'),
    'stance', jsonb_build_object('name', 'ボクシングモバイル選手名鑑', 'url', 'https://boxmob.jp/sp/boxer/boxer.html?boxer_id=7392'),
    'current_titles', jsonb_build_object('name', 'WBA公式発表', 'url', 'https://www.wbaboxing.com/boxing-news/antonio-vargas-recognized-as-wba-bantamweight-champion-tsutsumi-named-champion-in-recess'),
    'ranking_wba', jsonb_build_object('name', 'WBA公式ランキング（2026年7月31日）', 'url', 'https://www.wbaboxing.com/wba-ranking'),
    'ranking_wbc', jsonb_build_object('name', 'WBC公式ランキング（2026年8月）', 'url', 'https://wbcboxing.com/mailing/2026/WBC_RATINGS_AUGUST_2026.pdf')
  )
where slug = 'seiya-tsutsumi';

update public.boxers
set
  boxrec_id = '868148',
  boxrec_url = 'https://boxrec.com/en/box-pro/868148',
  height_cm = 160,
  reach_cm = 162,
  stance = 'オーソドックス',
  pro_debut_date = '2025-03-13',
  current_titles = 'WBOアジアパシフィック・バンタム級',
  past_major_titles = 'なし',
  world_title_weight_classes = 'なし',
  ranking_wba = 3,
  ranking_wbc = 1,
  ranking_ibf = null,
  ranking_wbo = 1,
  source_name = '帝拳公式プロフィール / BoxRec / WBA・WBC・WBO公式',
  source_url = 'https://www.teiken.com/profile/tsuboi.html',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = field_sources || jsonb_build_object(
    'boxrec_id', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/868148'),
    'boxrec_url', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/868148'),
    'height_cm', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/868148'),
    'reach_cm', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/868148'),
    'stance', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/868148'),
    'pro_debut_date', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/868148'),
    'current_titles', jsonb_build_object('name', 'スポンサー公式発表', 'url', 'https://prtimes.jp/main/html/rd/p/000000011.000030348.html'),
    'past_major_titles', jsonb_build_object('name', 'BoxRec本人ページ / 公式プロフィール', 'url', 'https://boxrec.com/en/box-pro/868148'),
    'world_title_weight_classes', jsonb_build_object('name', 'BoxRec本人ページ / 公式プロフィール', 'url', 'https://boxrec.com/en/box-pro/868148'),
    'ranking_wba', jsonb_build_object('name', 'WBA公式ランキング（2026年7月31日）', 'url', 'https://www.wbaboxing.com/wba-ranking'),
    'ranking_wbc', jsonb_build_object('name', 'WBC公式ランキング（2026年7月）', 'url', 'https://wbcboxing.com/en/superflyweight/'),
    'ranking_wbo', jsonb_build_object('name', 'WBO公式ランキング（2026年7月28日）', 'url', 'https://wboboxing.com/wborankings/report/cmFua2luZw%3D%3D/bWFsZQ%3D%3D/b368b21ba1cee99fd0a978f4ac74e866/RankingReportMale')
  )
where slug = 'tomoya-tsuboi';

update public.boxers
set
  boxrec_id = '990774',
  boxrec_url = 'https://boxrec.com/en/box-pro/990774',
  reach_cm = 171,
  current_titles = 'なし',
  ranking_wba = 6,
  ranking_wbc = 23,
  ranking_ibf = null,
  ranking_wbo = 2,
  source_name = '武居由樹公式サイト / BoxRec / WBA・WBC・WBO公式',
  source_url = 'https://yoshikitakei.com/',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = field_sources || jsonb_build_object(
    'boxrec_id', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/990774'),
    'boxrec_url', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/990774'),
    'reach_cm', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/990774'),
    'current_titles', jsonb_build_object('name', 'WBA・WBO公式ランキング（2026年7月）', 'url', 'https://www.wbaboxing.com/wba-ranking'),
    'ranking_wba', jsonb_build_object('name', 'WBA公式ランキング（2026年7月31日）', 'url', 'https://www.wbaboxing.com/wba-ranking'),
    'ranking_wbc', jsonb_build_object('name', 'WBC公式ランキング（2026年7月）', 'url', 'https://wbcboxing.com/en/superbantamweight/'),
    'ranking_wbo', jsonb_build_object('name', 'WBO公式ランキング（2026年7月28日）', 'url', 'https://wboboxing.com/wborankings/report/cmFua2luZw%3D%3D/bWFsZQ%3D%3D/b368b21ba1cee99fd0a978f4ac74e866/RankingReportMale')
  )
where slug = 'yoshiki-takei';

update public.boxers
set
  boxrec_id = '898844',
  boxrec_url = 'https://boxrec.com/en/box-pro/898844',
  weight_class = 'スーパーバンタム級',
  current_titles = 'なし',
  ranking_wba = null,
  ranking_wbc = 29,
  ranking_ibf = 1,
  ranking_wbo = null,
  source_name = '3150FIGHT公式 / 帝拳公式 / BoxRec / WBC公式',
  source_url = 'https://www.3150fight.com/profile/143/',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = field_sources || jsonb_build_object(
    'boxrec_id', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/898844'),
    'boxrec_url', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/898844'),
    'weight_class', jsonb_build_object('name', '帝拳公式発表', 'url', 'https://teiken.com/info/index_2.html'),
    'current_titles', jsonb_build_object('name', '帝拳公式発表（2026年9月27日カード）', 'url', 'https://teiken.com/info/index_2.html'),
    'ranking_wbc', jsonb_build_object('name', 'WBC公式ランキング（2026年8月）', 'url', 'https://wbcboxing.com/mailing/2026/WBC_RATINGS_AUGUST_2026.pdf'),
    'ranking_ibf', jsonb_build_object('name', '帝拳公式発表（IBF世界スーパーバンタム級1位）', 'url', 'https://teiken.com/info/index_2.html')
  )
where slug = 'ryosuke-nishida';

update public.boxers
set
  boxrec_id = '666339',
  boxrec_url = 'https://boxrec.com/en/box-pro/666339',
  height_cm = 164,
  reach_cm = 164,
  current_titles = 'なし',
  source_name = '北國新聞 / BoxRec / ボクシングモバイル',
  source_url = 'https://www.hokkoku.co.jp/articles/-/1765634',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = field_sources || jsonb_build_object(
    'boxrec_id', jsonb_build_object('name', 'BoxRec本人ページへのリンクを確認', 'url', 'https://boxrec.com/en/box-pro/666339'),
    'boxrec_url', jsonb_build_object('name', 'BoxRec本人ページへのリンクを確認', 'url', 'https://boxrec.com/en/box-pro/666339'),
    'height_cm', jsonb_build_object('name', 'BoxRec本人ページへのリンクを確認', 'url', 'https://boxrec.com/en/box-pro/666339'),
    'reach_cm', jsonb_build_object('name', 'BoxRec本人ページへのリンクを確認', 'url', 'https://boxrec.com/en/box-pro/666339'),
    'current_titles', jsonb_build_object('name', '北國新聞の引退報道 / BoxRec本人ページ', 'url', 'https://www.hokkoku.co.jp/articles/-/1765634')
  )
where slug = 'kosei-tanaka';

update public.boxers
set
  boxrec_id = '105935',
  boxrec_url = 'https://boxrec.com/en/box-pro/105935',
  current_titles = 'なし',
  source_checked_at = '2026-08-20T00:00:00+09:00',
  field_sources = field_sources || jsonb_build_object(
    'boxrec_id', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/105935'),
    'boxrec_url', jsonb_build_object('name', 'BoxRec本人ページ', 'url', 'https://boxrec.com/en/box-pro/105935'),
    'current_titles', jsonb_build_object('name', 'BoxRec本人ページ / 引退選手記録', 'url', 'https://boxrec.com/en/box-pro/105935')
  )
where slug = 'hozumi-hasegawa';

commit;
