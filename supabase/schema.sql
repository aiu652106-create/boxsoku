create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  summary text not null check (char_length(summary) between 1 and 500),
  body text not null,
  image_url text,
  image_path text,
  boxrec_url text not null default '',
  accent text not null default 'red' check (accent in ('red', 'blue', 'gold', 'mono')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_advertorial boolean not null default false,
  affiliate_disclosure text not null default '',
  affiliate_links jsonb not null default '[]'::jsonb,
  tweets jsonb not null default '[]'::jsonb,
  youtube_urls jsonb not null default '[]'::jsonb,
  instagram_urls jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  view_count bigint not null default 0,
  unique_view_count bigint not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  body text not null check (char_length(body) between 1 and 1000),
  visitor_id text not null check (visitor_id ~ '^[a-f0-9]{9}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id text primary key check (id = 'global'),
  site_icon_url text not null default '/assets/boxsoku-icon.png',
  updated_at timestamptz not null default now()
);

create table if not exists public.boxers (
  internal_id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_ja text not null check (char_length(name_ja) between 1 and 80),
  name_kana text,
  name_en text,
  ring_name text,
  boxrec_id text,
  boxrec_url text,
  sex text check (sex is null or sex in ('male', 'female', 'unknown')),
  nationality text,
  nationality_code text check (nationality_code is null or nationality_code ~ '^[A-Z]{3}$'),
  birth_date date,
  birthplace text,
  residence text,
  career_status text not null default 'unknown' check (career_status in ('active', 'retired', 'inactive', 'unknown')),
  gym text,
  trainer text,
  promoter text,
  manager text,
  training_base text,
  weight_class text,
  stance text,
  height_cm numeric(5, 1) check (height_cm is null or height_cm > 0),
  reach_cm numeric(5, 1) check (reach_cm is null or reach_cm > 0),
  pro_debut_date date,
  total_fights integer check (total_fights is null or total_fights >= 0),
  wins integer check (wins is null or wins >= 0),
  losses integer check (losses is null or losses >= 0),
  draws integer check (draws is null or draws >= 0),
  no_contests integer check (no_contests is null or no_contests >= 0),
  ko_wins integer check (ko_wins is null or ko_wins >= 0),
  ko_rate numeric(6, 2) generated always as (
    case
      when wins is not null and wins > 0 and ko_wins is not null
        then round((ko_wins::numeric / wins::numeric) * 100, 2)
      else null
    end
  ) stored,
  world_champion_experience boolean,
  current_titles text,
  past_major_titles text,
  world_title_weight_classes text,
  ranking_wba integer check (ranking_wba is null or ranking_wba >= 0),
  ranking_wbc integer check (ranking_wbc is null or ranking_wbc >= 0),
  ranking_ibf integer check (ranking_ibf is null or ranking_ibf >= 0),
  ranking_wbo integer check (ranking_wbo is null or ranking_wbo >= 0),
  next_fight_date date,
  next_opponent text,
  next_venue text,
  next_event_name text,
  source_name text not null default '',
  source_url text not null default '',
  source_checked_at timestamptz,
  field_sources jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boxers
  add column if not exists boxrec_url text;

create index if not exists boxers_public_name_idx
  on public.boxers (is_published, name_ja);

create index if not exists boxers_name_kana_idx
  on public.boxers (name_kana);

create index if not exists boxers_slug_idx
  on public.boxers (slug);

create table if not exists public.server_secrets (
  id text primary key check (id = 'boxsoku'),
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on public.server_secrets from public, anon, authenticated;

insert into public.site_settings (id)
values ('global')
on conflict (id) do nothing;

create table if not exists public.site_visitors (
  visitor_hash text primary key check (visitor_hash ~ '^[a-f0-9]{64}$'),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

alter table public.site_visitors
  add column if not exists first_seen timestamptz;

alter table public.site_visitors
  add column if not exists last_seen timestamptz;

update public.site_visitors
set first_seen = coalesce(first_seen, now()),
    last_seen = coalesce(last_seen, first_seen, now());

alter table public.site_visitors
  alter column first_seen set default now(),
  alter column first_seen set not null,
  alter column last_seen set default now(),
  alter column last_seen set not null;

create table if not exists public.article_unique_views (
  article_id uuid not null references public.articles(id) on delete cascade,
  visitor_hash text not null references public.site_visitors(visitor_hash) on delete cascade,
  first_seen timestamptz not null default now(),
  primary key (article_id, visitor_hash)
);

create table if not exists public.affiliate_clicks (
  id bigint generated always as identity primary key,
  article_id uuid references public.articles(id) on delete set null,
  page_path text not null check (
    char_length(page_path) between 1 and 300
    and page_path like '/%'
  ),
  service text not null check (service ~ '^[a-z0-9][a-z0-9-]{0,31}$'),
  placement text not null check (placement ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  item text not null default '' check (
    item = '' or item ~ '^[a-z0-9][a-z0-9-]{0,99}$'
  ),
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  clicked_at timestamptz not null default now()
);

alter table public.article_unique_views
  add column if not exists first_seen timestamptz;

update public.article_unique_views
set first_seen = coalesce(first_seen, now());

alter table public.article_unique_views
  alter column first_seen set default now(),
  alter column first_seen set not null;

alter table public.articles
  add column if not exists affiliate_links jsonb not null default '[]'::jsonb;

alter table public.articles
  add column if not exists boxrec_url text not null default '';

alter table public.articles
  add column if not exists unique_view_count bigint not null default 0;

update public.articles
set unique_view_count = coalesce(unique_view_count, 0);

alter table public.articles
  alter column unique_view_count set default 0,
  alter column unique_view_count set not null;

create index if not exists articles_public_order_idx
  on public.articles (status, published_at desc);

create index if not exists articles_popular_idx
  on public.articles (status, view_count desc, published_at desc);

create index if not exists comments_article_order_idx
  on public.comments (article_id, created_at, id);

create index if not exists comments_rate_limit_idx
  on public.comments (article_id, visitor_id, created_at desc);

create index if not exists article_unique_views_visitor_idx
  on public.article_unique_views (visitor_hash);

create index if not exists affiliate_clicks_clicked_at_idx
  on public.affiliate_clicks (clicked_at desc);

create index if not exists affiliate_clicks_service_clicked_at_idx
  on public.affiliate_clicks (service, clicked_at desc);

create index if not exists affiliate_clicks_article_clicked_at_idx
  on public.affiliate_clicks (article_id, clicked_at desc);

create index if not exists affiliate_clicks_dedupe_idx
  on public.affiliate_clicks (visitor_hash, page_path, service, placement, clicked_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

create or replace function public.is_server_request(p_server_token text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.server_secrets
    where id = 'boxsoku'
      and token_hash = encode(
        extensions.digest(
          convert_to(coalesce(p_server_token, ''), 'UTF8'),
          'sha256'
        ),
        'hex'
      )
  );
$$;

create or replace function public.submit_comment(
  p_article_id uuid,
  p_display_name text,
  p_body text,
  p_visitor_id text,
  p_server_token text
)
returns setof public.comments
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_server_request(p_server_token) then
    raise exception 'not authorized';
  end if;

  if p_display_name is null
     or char_length(trim(p_display_name)) not between 1 and 24
     or p_body is null
     or char_length(trim(p_body)) not between 1 and 1000
     or p_visitor_id is null
     or p_visitor_id !~ '^[a-f0-9]{9}$' then
    raise exception 'invalid comment';
  end if;

  if not exists (
    select 1
    from public.articles
    where id = p_article_id
      and status = 'published'
      and published_at is not null
      and published_at <= now()
  ) then
    raise exception 'article is not available';
  end if;

  return query
    insert into public.comments (article_id, display_name, body, visitor_id)
    values (
      p_article_id,
      trim(p_display_name),
      trim(p_body),
      p_visitor_id
    )
    returning *;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

drop trigger if exists boxers_set_updated_at on public.boxers;
create trigger boxers_set_updated_at
before update on public.boxers
for each row execute function public.set_updated_at();

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

drop function if exists public.record_article_view(text, text);

create or replace function public.record_article_view(
  p_article_slug text,
  p_visitor_hash text,
  p_server_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_article_id uuid;
  inserted_unique integer;
begin
  if not public.is_server_request(p_server_token) then
    return;
  end if;

  if p_visitor_hash is null or p_visitor_hash !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  select a.id
    into target_article_id
  from public.articles as a
  where a.slug = p_article_slug
    and a.status = 'published'
    and a.published_at is not null
    and a.published_at <= now()
  limit 1;

  if target_article_id is null then
    return;
  end if;

  insert into public.site_visitors (visitor_hash)
  values (p_visitor_hash)
  on conflict (visitor_hash)
  do update set last_seen = now();

  insert into public.article_unique_views (article_id, visitor_hash)
  values (target_article_id, p_visitor_hash)
  on conflict (article_id, visitor_hash) do nothing;

  get diagnostics inserted_unique = row_count;
  if inserted_unique > 0 then
    update public.articles
    set unique_view_count = unique_view_count + 1
    where id = target_article_id;
  end if;

  update public.articles
  set view_count = view_count + 1
  where id = target_article_id;
end;
$$;

create or replace function public.record_affiliate_click(
  p_article_slug text,
  p_page_path text,
  p_service text,
  p_placement text,
  p_item text,
  p_visitor_hash text,
  p_server_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_article_id uuid;
begin
  if not public.is_server_request(p_server_token) then
    return;
  end if;

  if p_page_path is null
     or char_length(p_page_path) not between 1 and 300
     or p_page_path not like '/%'
     or p_service is null
     or p_service !~ '^[a-z0-9][a-z0-9-]{0,31}$'
     or p_placement is null
     or p_placement !~ '^[a-z0-9][a-z0-9-]{0,63}$'
     or coalesce(p_item, '') !~ '^$|^[a-z0-9][a-z0-9-]{0,99}$'
     or p_visitor_hash is null
     or p_visitor_hash !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  if p_article_slug is not null then
    select a.id
      into target_article_id
    from public.articles as a
    where a.slug = p_article_slug
      and a.status = 'published'
      and a.published_at is not null
      and a.published_at <= now()
    limit 1;
  end if;

  if exists (
    select 1
    from public.affiliate_clicks
    where visitor_hash = p_visitor_hash
      and page_path = p_page_path
      and service = p_service
      and placement = p_placement
      and clicked_at >= now() - interval '10 seconds'
  ) then
    return;
  end if;

  insert into public.affiliate_clicks (
    article_id,
    page_path,
    service,
    placement,
    item,
    visitor_hash
  )
  values (
    target_article_id,
    p_page_path,
    p_service,
    p_placement,
    coalesce(p_item, ''),
    p_visitor_hash
  );
end;
$$;

alter table public.admin_users enable row level security;
alter table public.articles enable row level security;
alter table public.boxers enable row level security;
alter table public.comments enable row level security;
alter table public.site_visitors enable row level security;
alter table public.article_unique_views enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.site_settings enable row level security;
alter table public.server_secrets enable row level security;

drop policy if exists "Admins can read own membership" on public.admin_users;
create policy "Admins can read own membership"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
on public.articles for select
to anon
using (
  status = 'published'
  and published_at is not null
  and published_at <= now()
);

drop policy if exists "Admins can read articles" on public.articles;
create policy "Admins can read articles"
on public.articles for select
to authenticated
using (
  (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  )
  or public.is_admin()
);

drop policy if exists "Admins can insert articles" on public.articles;
create policy "Admins can insert articles"
on public.articles for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update articles" on public.articles;
create policy "Admins can update articles"
on public.articles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete articles" on public.articles;
create policy "Admins can delete articles"
on public.articles for delete
to authenticated
using (public.is_admin());

drop policy if exists "Public can read published boxers" on public.boxers;
create policy "Public can read published boxers"
on public.boxers for select
to anon
using (is_published = true);

drop policy if exists "Admins can read boxers" on public.boxers;
create policy "Admins can read boxers"
on public.boxers for select
to authenticated
using (is_published = true or public.is_admin());

drop policy if exists "Admins can insert boxers" on public.boxers;
create policy "Admins can insert boxers"
on public.boxers for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update boxers" on public.boxers;
create policy "Admins can update boxers"
on public.boxers for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete boxers" on public.boxers;
create policy "Admins can delete boxers"
on public.boxers for delete
to authenticated
using (public.is_admin());

drop policy if exists "Public can read comments" on public.comments;
create policy "Public can read comments"
on public.comments for select
to anon, authenticated
using (true);

drop policy if exists "Public can post comments" on public.comments;

drop policy if exists "Admins can delete comments" on public.comments;
create policy "Admins can delete comments"
on public.comments for delete
to authenticated
using (public.is_admin());

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert site settings" on public.site_settings;
create policy "Admins can insert site settings"
on public.site_settings for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
on public.site_settings for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read visitor stats" on public.site_visitors;
create policy "Admins can read visitor stats"
on public.site_visitors for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read article visitor stats" on public.article_unique_views;
create policy "Admins can read article visitor stats"
on public.article_unique_views for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read affiliate click stats" on public.affiliate_clicks;
create policy "Admins can read affiliate click stats"
on public.affiliate_clicks for select
to authenticated
using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;
grant select on public.boxers to anon, authenticated;
grant insert, update, delete on public.boxers to authenticated;
grant select on public.comments to anon, authenticated;
grant delete on public.comments to authenticated;
revoke insert on public.comments from anon, authenticated;
revoke all on sequence public.comments_id_seq from public, anon, authenticated;
revoke all on public.affiliate_clicks from public, anon, authenticated;
revoke all on sequence public.affiliate_clicks_id_seq from public, anon, authenticated;
grant select on public.admin_users to authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_server_request(text) from public, anon, authenticated;
grant execute on function public.submit_comment(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.record_article_view(text, text, text) to anon, authenticated;
revoke all on function public.record_affiliate_click(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_affiliate_click(text, text, text, text, text, text, text)
  to anon, authenticated;
drop function if exists public.increment_article_view(text);
grant select on public.site_visitors, public.article_unique_views, public.affiliate_clicks
  to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view article images" on storage.objects;
create policy "Public can view article images"
on storage.objects for select
to public
using (bucket_id = 'article-images');

drop policy if exists "Admins can upload article images" on storage.objects;
create policy "Admins can upload article images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'article-images'
  and public.is_admin()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Admins can update article images" on storage.objects;
create policy "Admins can update article images"
on storage.objects for update
to authenticated
using (bucket_id = 'article-images' and public.is_admin())
with check (bucket_id = 'article-images' and public.is_admin());

drop policy if exists "Admins can delete article images" on storage.objects;
create policy "Admins can delete article images"
on storage.objects for delete
to authenticated
using (bucket_id = 'article-images' and public.is_admin());

-- After creating the administrator in Authentication > Users, run:
-- insert into public.admin_users (user_id, email)
-- values ('14ce8775-a0ea-4782-a77f-0eb2184cf85d', 'contact@boxsoku.com')
-- on conflict (user_id) do update set email = excluded.email;
+

-- Keep the approval workflow in the full schema used for fresh installations.
-- Future-ready boxer data workflow.
-- This migration adds history and approval tables without replacing the
-- existing public.boxers snapshot used by the current site.

create table if not exists public.fighter_status_history (
  history_id bigint generated always as identity primary key,
  fighter_id uuid not null references public.boxers(internal_id) on delete cascade,
  status text not null check (status in ('active', 'retired', 'inactive')),
  start_date date,
  end_date date,
  source_name text not null default '',
  source_url text,
  source_date date,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.rankings (
  ranking_id bigint generated always as identity primary key,
  fighter_id uuid not null references public.boxers(internal_id) on delete cascade,
  organization text not null check (upper(organization) in ('WBA', 'WBC', 'IBF', 'WBO')),
  weight_class text not null,
  ranking integer not null check (ranking >= 0),
  ranking_date date,
  ranking_month date,
  source_name text not null default '',
  source_url text not null check (source_url ~* '^https?://'),
  source_date date,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (ranking_month is null or ranking_month = date_trunc('month', ranking_month)::date)
);

create table if not exists public.titles (
  title_id uuid primary key default gen_random_uuid(),
  organization text not null,
  weight_class text not null,
  title_type text not null default 'world'
    check (title_type in ('world', 'regional', 'national', 'youth', 'other')),
  title_name text not null,
  created_at timestamptz not null default now(),
  unique (organization, weight_class, title_type, title_name)
);

create table if not exists public.title_reigns (
  reign_id bigint generated always as identity primary key,
  fighter_id uuid not null references public.boxers(internal_id) on delete cascade,
  title_id uuid not null references public.titles(title_id) on delete cascade,
  start_date date,
  end_date date,
  status text not null default 'active'
    check (status in ('active', 'lost', 'vacated', 'stripped', 'inactive')),
  source_name text not null default '',
  source_url text not null check (source_url ~* '^https?://'),
  source_date date,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.boxer_reports (
  report_id uuid primary key default gen_random_uuid(),
  fighter_id uuid not null references public.boxers(internal_id) on delete cascade,
  field_name text not null check (field_name in (
    'name_ja', 'name_kana', 'name_en', 'ring_name', 'sex', 'nationality', 'nationality_code', 'birth_date',
    'birthplace', 'career_status', 'gym', 'residence', 'trainer', 'promoter', 'manager', 'training_base', 'weight_class', 'stance', 'height_cm',
    'reach_cm', 'pro_debut_date', 'world_champion_experience', 'current_titles',
    'past_major_titles', 'world_title_weight_classes', 'ranking_wba', 'ranking_wbc',
    'ranking_ibf', 'ranking_wbo', 'next_fight', 'next_fight_date', 'next_opponent',
    'next_venue', 'next_event_name'
  )),
  current_value text not null default '',
  proposed_value text not null,
  evidence_url text not null check (evidence_url ~* '^https?://'),
  comment text not null default '',
  reporter_hash text check (reporter_hash is null or reporter_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'resolved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.update_candidates (
  candidate_id uuid primary key default gen_random_uuid(),
  fighter_id uuid not null references public.boxers(internal_id) on delete cascade,
  report_id uuid references public.boxer_reports(report_id) on delete set null,
  category text not null check (category in (
    'fight_result', 'ranking', 'title', 'status', 'gym', 'profile',
    'next_fight', 'user_report', 'other'
  )),
  field_name text not null,
  current_value jsonb not null default 'null'::jsonb,
  proposed_value jsonb not null,
  source_name text not null,
  source_url text not null check (source_url ~* '^https?://'),
  source_date date,
  detected_at timestamptz not null default now(),
  confidence numeric(4, 3) check (confidence is null or confidence between 0 and 1),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'needs_review')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fighter_status_history_fighter_idx
  on public.fighter_status_history (fighter_id, checked_at desc);

create index if not exists rankings_fighter_order_idx
  on public.rankings (fighter_id, organization, weight_class, ranking_date desc, ranking_month desc);

create index if not exists title_reigns_fighter_order_idx
  on public.title_reigns (fighter_id, status, start_date desc);

create index if not exists boxer_reports_status_order_idx
  on public.boxer_reports (status, submitted_at desc);

create index if not exists boxer_reports_fighter_order_idx
  on public.boxer_reports (fighter_id, submitted_at desc);

create index if not exists update_candidates_status_order_idx
  on public.update_candidates (status, detected_at desc);

create index if not exists update_candidates_fighter_order_idx
  on public.update_candidates (fighter_id, detected_at desc);

create index if not exists update_candidates_category_order_idx
  on public.update_candidates (category, detected_at desc);

drop trigger if exists boxer_reports_set_updated_at on public.boxer_reports;
create trigger boxer_reports_set_updated_at
before update on public.boxer_reports
for each row execute function public.set_updated_at();

drop trigger if exists update_candidates_set_updated_at on public.update_candidates;
create trigger update_candidates_set_updated_at
before update on public.update_candidates
for each row execute function public.set_updated_at();

-- Convert a current boxer value to a typed JSON scalar for stale-candidate checks.
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
      select jsonb_build_object(
        'date', next_fight_date,
        'opponent', next_opponent,
        'venue', next_venue,
        'event', next_event_name
      ) into value
      from public.boxers where internal_id = p_fighter_id;
    else
      raise exception 'unsupported boxer field';
  end case;
  return coalesce(value, 'null'::jsonb);
end;
$$;

-- Public submission is server-token gated; the browser never gets insert access.
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
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.boxers%rowtype;
  current_value jsonb;
  inserted_report public.boxer_reports;
  candidate_category text;
begin
  if not public.is_server_request(p_server_token) then
    raise exception 'not authorized';
  end if;

  if p_field_name is null or p_field_name not in (
    'name_ja', 'name_kana', 'name_en', 'ring_name', 'sex', 'nationality', 'nationality_code', 'birth_date',
    'birthplace', 'career_status', 'gym', 'residence', 'trainer', 'promoter', 'manager', 'training_base', 'weight_class', 'stance', 'height_cm',
    'reach_cm', 'pro_debut_date', 'world_champion_experience', 'current_titles',
    'past_major_titles', 'world_title_weight_classes', 'ranking_wba', 'ranking_wbc',
    'ranking_ibf', 'ranking_wbo', 'next_fight', 'next_fight_date', 'next_opponent',
    'next_venue', 'next_event_name'
  ) then
    raise exception 'invalid report field';
  end if;

  if p_proposed_value is null or char_length(trim(p_proposed_value)) not between 1 and 2000
     or p_evidence_url is null or p_evidence_url !~* '^https?://'
     or char_length(p_evidence_url) > 1000
     or char_length(coalesce(p_comment, '')) > 2000
     or p_reporter_hash is null or p_reporter_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid boxer report';
  end if;

  select * into target
  from public.boxers
  where internal_id = p_fighter_id and is_published = true;
  if not found then
    raise exception 'boxer is not available';
  end if;

  if exists (
    select 1 from public.boxer_reports
    where fighter_id = p_fighter_id
      and field_name = p_field_name
      and reporter_hash = p_reporter_hash
      and submitted_at >= now() - interval '15 minutes'
  ) then
    raise exception 'duplicate boxer report';
  end if;

  current_value := public.boxer_field_value(p_fighter_id, p_field_name);

  candidate_category := case
    when p_field_name like 'ranking_%' then 'ranking'
    when p_field_name = 'current_titles' or p_field_name = 'past_major_titles'
      or p_field_name = 'world_title_weight_classes' then 'title'
    when p_field_name = 'career_status' then 'status'
    when p_field_name in ('gym') then 'gym'
    when p_field_name like 'next_%' or p_field_name = 'next_fight' then 'next_fight'
    else 'profile'
  end;

  insert into public.boxer_reports (
    fighter_id, field_name, current_value, proposed_value,
    evidence_url, comment, reporter_hash
  ) values (
    p_fighter_id,
    p_field_name,
    coalesce(current_value #>> '{}', '不明'),
    trim(p_proposed_value),
    trim(p_evidence_url),
    trim(coalesce(p_comment, '')),
    p_reporter_hash
  ) returning * into inserted_report;

  insert into public.update_candidates (
    fighter_id, report_id, category, field_name, current_value, proposed_value,
    source_name, source_url, detected_at, status
  ) values (
    p_fighter_id,
    inserted_report.report_id,
    'user_report',
    p_field_name,
    current_value,
    to_jsonb(trim(p_proposed_value)),
    'ユーザー報告',
    trim(p_evidence_url),
    inserted_report.submitted_at,
    'pending'
  );

  return next inserted_report;
end;
$$;

-- Only admins can review candidates. Approval is guarded by a stale-value check.
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
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_action not in ('approved', 'rejected', 'needs_review') then
    raise exception 'invalid review action';
  end if;

  select * into candidate
  from public.update_candidates
  where candidate_id = p_candidate_id
  for update;
  if not found then
    raise exception 'candidate not found';
  end if;

  if candidate.status not in ('pending', 'needs_review') then
    raise exception 'candidate already reviewed';
  end if;

  if p_action <> 'approved' then
    update public.update_candidates
    set status = p_action,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = nullif(trim(coalesce(p_review_note, '')), '')
    where candidate_id = p_candidate_id;

    if candidate.report_id is not null then
      update public.boxer_reports
      set status = case when p_action = 'rejected' then 'rejected' else 'reviewing' end,
          reviewed_by = auth.uid(),
          reviewed_at = now(),
          resolution_note = nullif(trim(coalesce(p_review_note, '')), '')
      where report_id = candidate.report_id;
    end if;

    return query select * from public.update_candidates where candidate_id = p_candidate_id;
    return;
  end if;

  select * into target from public.boxers where internal_id = candidate.fighter_id for update;
  if not found then
    raise exception 'fighter not found';
  end if;

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
    when 'sex' then update public.boxers set sex = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'nationality' then update public.boxers set nationality = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'nationality_code' then update public.boxers set nationality_code = nullif(upper(candidate.proposed_value #>> '{}'), '') where internal_id = candidate.fighter_id;
    when 'birth_date' then update public.boxers set birth_date = nullif(candidate.proposed_value #>> '{}', '')::date where internal_id = candidate.fighter_id;
    when 'birthplace' then update public.boxers set birthplace = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'career_status' then update public.boxers set career_status = candidate.proposed_value #>> '{}' where internal_id = candidate.fighter_id;
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
    when 'current_titles' then update public.boxers set current_titles = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'past_major_titles' then update public.boxers set past_major_titles = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'world_title_weight_classes' then update public.boxers set world_title_weight_classes = nullif(candidate.proposed_value #>> '{}', '') where internal_id = candidate.fighter_id;
    when 'ranking_wba' then update public.boxers set ranking_wba = nullif(candidate.proposed_value #>> '{}', '')::integer where internal_id = candidate.fighter_id;
    when 'ranking_wbc' then update public.boxers set ranking_wbc = nullif(candidate.proposed_value #>> '{}', '')::integer where internal_id = candidate.fighter_id;
    when 'ranking_ibf' then update public.boxers set ranking_ibf = nullif(candidate.proposed_value #>> '{}', '')::integer where internal_id = candidate.fighter_id;
    when 'ranking_wbo' then update public.boxers set ranking_wbo = nullif(candidate.proposed_value #>> '{}', '')::integer where internal_id = candidate.fighter_id;
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
      fighter_id, status, start_date, source_url, checked_at
    ) values (
      candidate.fighter_id,
      candidate.proposed_value #>> '{}',
      candidate.source_date,
      candidate.source_url,
      candidate.detected_at
    );
  elsif candidate.field_name like 'ranking_%' then
    ranking_org := upper(replace(candidate.field_name, 'ranking_', ''));
    insert into public.rankings (
      fighter_id, organization, weight_class, ranking, ranking_date,
      ranking_month, source_name, source_url, checked_at
    ) values (
      candidate.fighter_id,
      ranking_org,
      coalesce(target.weight_class, '不明'),
      (candidate.proposed_value #>> '{}')::integer,
      candidate.source_date,
      case when candidate.source_date is null then null else date_trunc('month', candidate.source_date)::date end,
      candidate.source_name,
      candidate.source_url,
      candidate.detected_at
    );
  elsif candidate.field_name = 'current_titles'
        and nullif(candidate.metadata->>'title_name', '') is not null then
    title_name_value := nullif(candidate.metadata->>'title_name', '');
    title_org_value := coalesce(nullif(candidate.metadata->>'organization', ''), '不明');
    title_weight_value := coalesce(nullif(candidate.metadata->>'weight_class', ''), target.weight_class, '不明');
    title_type_value := coalesce(nullif(candidate.metadata->>'title_type', ''), 'world');
    title_status_value := coalesce(nullif(candidate.metadata->>'status', ''), 'active');
    insert into public.titles (organization, weight_class, title_type, title_name)
    values (title_org_value, title_weight_value, title_type_value, title_name_value)
    on conflict (organization, weight_class, title_type, title_name)
    do update set title_name = excluded.title_name
    returning title_id into title_id_value;
    insert into public.title_reigns (
      fighter_id, title_id, start_date, end_date, status,
      source_name, source_url, checked_at
    ) values (
      candidate.fighter_id,
      title_id_value,
      nullif(candidate.metadata->>'start_date', '')::date,
      nullif(candidate.metadata->>'end_date', '')::date,
      title_status_value,
      candidate.source_name,
      candidate.source_url,
      candidate.detected_at
    );
  end if;

  update public.update_candidates
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = nullif(trim(coalesce(p_review_note, '')), '')
  where candidate_id = p_candidate_id;

  if candidate.report_id is not null then
    update public.boxer_reports
    set status = 'resolved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        resolution_note = nullif(trim(coalesce(p_review_note, '')), '')
    where report_id = candidate.report_id;
  end if;

  return query select * from public.update_candidates where candidate_id = p_candidate_id;
end;
$$;

alter table public.fighter_status_history enable row level security;
alter table public.rankings enable row level security;
alter table public.titles enable row level security;
alter table public.title_reigns enable row level security;
alter table public.boxer_reports enable row level security;
alter table public.update_candidates enable row level security;

drop policy if exists "Admins can read fighter status history" on public.fighter_status_history;
create policy "Admins can read fighter status history"
on public.fighter_status_history for select to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage fighter status history" on public.fighter_status_history;
create policy "Admins can manage fighter status history"
on public.fighter_status_history for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read rankings" on public.rankings;
create policy "Public can read rankings"
on public.rankings for select to anon, authenticated
using (true);

drop policy if exists "Admins can manage rankings" on public.rankings;
create policy "Admins can manage rankings"
on public.rankings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read titles" on public.titles;
create policy "Public can read titles"
on public.titles for select to anon, authenticated
using (true);

drop policy if exists "Admins can manage titles" on public.titles;
create policy "Admins can manage titles"
on public.titles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read title reigns" on public.title_reigns;
create policy "Public can read title reigns"
on public.title_reigns for select to anon, authenticated
using (true);

drop policy if exists "Admins can manage title reigns" on public.title_reigns;
create policy "Admins can manage title reigns"
on public.title_reigns for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read boxer reports" on public.boxer_reports;
create policy "Admins can read boxer reports"
on public.boxer_reports for select to authenticated
using (public.is_admin());

drop policy if exists "Admins can update boxer reports" on public.boxer_reports;
create policy "Admins can update boxer reports"
on public.boxer_reports for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete boxer reports" on public.boxer_reports;
create policy "Admins can delete boxer reports"
on public.boxer_reports for delete to authenticated
using (public.is_admin());

drop policy if exists "Admins can read update candidates" on public.update_candidates;
create policy "Admins can read update candidates"
on public.update_candidates for select to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert update candidates" on public.update_candidates;
create policy "Admins can insert update candidates"
on public.update_candidates for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update update candidates" on public.update_candidates;
create policy "Admins can update update candidates"
on public.update_candidates for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete update candidates" on public.update_candidates;
create policy "Admins can delete update candidates"
on public.update_candidates for delete to authenticated
using (public.is_admin());

revoke all on public.fighter_status_history, public.rankings, public.titles,
  public.title_reigns, public.boxer_reports, public.update_candidates
  from anon;
grant select on public.rankings, public.titles, public.title_reigns to anon;

grant select, insert, update, delete on public.fighter_status_history,
  public.rankings, public.titles, public.title_reigns,
  public.boxer_reports, public.update_candidates to authenticated;

revoke all on function public.boxer_field_value(uuid, text) from public, anon, authenticated;
revoke all on function public.submit_boxer_report(uuid, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_boxer_report(uuid, text, text, text, text, text, text)
  to anon, authenticated;
revoke all on function public.review_update_candidate(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.review_update_candidate(uuid, text, text)
  to authenticated;

-- Unified fighter compatibility view and bulk-import audit tables. The site
-- keeps public.boxers as its published snapshot; future fighter/event tables
-- can reference fighters.fighter_id without duplicating the person record.
create unique index if not exists boxers_boxrec_id_unique_idx
  on public.boxers (boxrec_id)
  where boxrec_id is not null and btrim(boxrec_id) <> '';

create index if not exists boxers_nationality_code_idx
  on public.boxers (nationality_code, name_ja);

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

-- Canonical correction-report projection. boxer_reports is retained for
-- compatibility with the existing review page.
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

-- New clients use the additive RPC name; its body delegates to the
-- compatibility function whose accepted fields are kept in this schema.
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
language sql
security definer
set search_path = public
as $$
  select * from public.submit_boxer_report(
    p_fighter_id, p_field_name, p_proposed_value, p_evidence_url,
    p_comment, p_reporter_hash, p_server_token
  );
$$;

revoke all on function public.submit_boxer_report_v2(uuid, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_boxer_report_v2(uuid, text, text, text, text, text, text)
  to anon, authenticated;

create or replace function public.review_team_update_candidate(
  p_candidate_id uuid,
  p_action text,
  p_review_note text default null
)
returns setof public.update_candidates
language sql
security definer
set search_path = public
as $$
  select * from public.review_update_candidate(p_candidate_id, p_action, p_review_note);
$$;

revoke all on function public.review_team_update_candidate(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_team_update_candidate(uuid, text, text) to authenticated;

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
