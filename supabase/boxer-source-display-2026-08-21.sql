-- Normalize legacy source metadata used by the boxer source audit.
-- This changes only field_sources.name values; boxer data and canonical
-- ranking/title/status tables are not modified.
begin;

update public.boxers b
set field_sources = jsonb_set(
  coalesce(b.field_sources, '{}'::jsonb),
  '{current_titles}',
  jsonb_build_object(
    'name', 'WBC公式',
    'url', b.field_sources->'current_titles'->>'url',
    'source_date', b.field_sources->'current_titles'->>'source_date',
    'checked_at', b.field_sources->'current_titles'->>'checked_at'
  ),
  true
)
where b.slug = 'oleksandr-usyk';

update public.boxers b
set field_sources = jsonb_set(
  coalesce(b.field_sources, '{}'::jsonb),
  '{current_titles}',
  jsonb_build_object(
    'name', 'WBA公式試合日程',
    'url', b.field_sources->'current_titles'->>'url',
    'source_date', b.field_sources->'current_titles'->>'source_date',
    'checked_at', b.field_sources->'current_titles'->>'checked_at'
  ),
  true
)
where b.slug = 'claressa-shields';

update public.boxers b
set field_sources = jsonb_set(
  coalesce(b.field_sources, '{}'::jsonb),
  '{current_titles}',
  jsonb_build_object(
    'name', 'BoxRec本人ページ',
    'url', b.field_sources->'current_titles'->>'url',
    'source_date', b.field_sources->'current_titles'->>'source_date',
    'checked_at', b.field_sources->'current_titles'->>'checked_at'
  ),
  true
)
where b.slug = 'junto-nakatani';

update public.boxers b
set field_sources = jsonb_set(
  jsonb_set(
    coalesce(b.field_sources, '{}'::jsonb),
    '{past_major_titles}',
    jsonb_build_object(
      'name', 'BoxRec本人ページ',
      'url', b.field_sources->'past_major_titles'->>'url',
      'source_date', b.field_sources->'past_major_titles'->>'source_date',
      'checked_at', b.field_sources->'past_major_titles'->>'checked_at'
    ),
    true
  ),
  '{world_title_weight_classes}',
  jsonb_build_object(
    'name', 'BoxRec本人ページ',
    'url', b.field_sources->'world_title_weight_classes'->>'url',
    'source_date', b.field_sources->'world_title_weight_classes'->>'source_date',
    'checked_at', b.field_sources->'world_title_weight_classes'->>'checked_at'
  ),
  true
)
where b.slug = 'tomoya-tsuboi';

update public.boxers b
set field_sources = jsonb_set(
  coalesce(b.field_sources, '{}'::jsonb),
  '{current_titles}',
  jsonb_build_object(
    'name', 'WBA公式発表（休養王者の履歴）',
    'url', b.field_sources->'current_titles'->>'url',
    'source_date', b.field_sources->'current_titles'->>'source_date',
    'checked_at', b.field_sources->'current_titles'->>'checked_at'
  ),
  true
)
where b.slug = 'seiya-tsutsumi';

update public.boxers b
set field_sources = jsonb_set(
  coalesce(b.field_sources, '{}'::jsonb),
  '{gym}',
  jsonb_build_object(
    'name', '晝田瑞希公式サイト',
    'url', 'https://mizukihiruta.com/',
    'source_date', b.field_sources->'gym'->>'source_date',
    'checked_at', b.field_sources->'gym'->>'checked_at'
  ),
  true
)
where b.slug = 'mizuki-hiruta';

update public.boxers b
set field_sources = jsonb_set(
  coalesce(b.field_sources, '{}'::jsonb),
  '{current_titles}',
  jsonb_build_object(
    'name', '北國新聞',
    'url', b.field_sources->'current_titles'->>'url',
    'source_date', b.field_sources->'current_titles'->>'source_date',
    'checked_at', b.field_sources->'current_titles'->>'checked_at'
  ),
  true
)
where b.slug = 'kosei-tanaka';

update public.boxers b
set field_sources = jsonb_set(
  coalesce(b.field_sources, '{}'::jsonb),
  '{current_titles}',
  jsonb_build_object(
    'name', 'BoxRec本人ページ',
    'url', b.field_sources->'current_titles'->>'url',
    'source_date', b.field_sources->'current_titles'->>'source_date',
    'checked_at', b.field_sources->'current_titles'->>'checked_at'
  ),
  true
)
where b.slug = 'hozumi-hasegawa';

commit;
