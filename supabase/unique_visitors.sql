-- Run this once in an existing Supabase project to enable unique visitor counts.

alter table public.articles
  add column if not exists unique_view_count bigint not null default 0;

create table if not exists public.site_visitors (
  visitor_hash text primary key check (visitor_hash ~ '^[a-f0-9]{64}$'),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists public.article_unique_views (
  article_id uuid not null references public.articles(id) on delete cascade,
  visitor_hash text not null references public.site_visitors(visitor_hash) on delete cascade,
  first_seen timestamptz not null default now(),
  primary key (article_id, visitor_hash)
);

create index if not exists article_unique_views_visitor_idx
  on public.article_unique_views (visitor_hash);

create or replace function public.record_article_view(
  p_article_slug text,
  p_visitor_hash text
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

alter table public.site_visitors enable row level security;
alter table public.article_unique_views enable row level security;

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

grant execute on function public.record_article_view(text, text) to anon, authenticated;
grant select on public.site_visitors, public.article_unique_views to authenticated;

-- Start the requested visitor dashboard from zero. Run this migration once.
truncate table public.article_unique_views, public.site_visitors;
update public.articles
set view_count = 0,
    unique_view_count = 0;
