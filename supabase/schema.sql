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

alter table public.articles
  add column if not exists affiliate_links jsonb not null default '[]'::jsonb;

create index if not exists articles_public_order_idx
  on public.articles (status, published_at desc);

create index if not exists articles_popular_idx
  on public.articles (status, view_count desc, published_at desc);

create index if not exists comments_article_order_idx
  on public.comments (article_id, created_at, id);

create index if not exists comments_rate_limit_idx
  on public.comments (article_id, visitor_id, created_at desc);

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
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

create or replace function public.increment_article_view(article_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.articles
  set view_count = view_count + 1
  where slug = article_slug
    and status = 'published'
    and published_at <= now();
$$;

alter table public.admin_users enable row level security;
alter table public.articles enable row level security;
alter table public.comments enable row level security;

drop policy if exists "Admins can read own membership" on public.admin_users;
create policy "Admins can read own membership"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
on public.articles for select
to anon, authenticated
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

drop policy if exists "Public can read comments" on public.comments;
create policy "Public can read comments"
on public.comments for select
to anon, authenticated
using (true);

drop policy if exists "Public can post comments" on public.comments;
create policy "Public can post comments"
on public.comments for insert
to anon, authenticated
with check (
  char_length(display_name) between 1 and 24
  and char_length(body) between 1 and 1000
  and visitor_id ~ '^[a-f0-9]{9}$'
  and exists (
    select 1
    from public.articles
    where articles.id = comments.article_id
      and articles.status = 'published'
      and articles.published_at is not null
      and articles.published_at <= now()
  )
);

drop policy if exists "Admins can delete comments" on public.comments;
create policy "Admins can delete comments"
on public.comments for delete
to authenticated
using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;
grant select, insert on public.comments to anon, authenticated;
grant delete on public.comments to authenticated;
grant usage, select on sequence public.comments_id_seq to anon, authenticated;
grant select on public.admin_users to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.increment_article_view(text) to anon, authenticated;

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
