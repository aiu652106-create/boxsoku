-- Run once in an existing Supabase project to enable anonymous affiliate click reporting.

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

create index if not exists affiliate_clicks_clicked_at_idx
  on public.affiliate_clicks (clicked_at desc);
create index if not exists affiliate_clicks_service_clicked_at_idx
  on public.affiliate_clicks (service, clicked_at desc);
create index if not exists affiliate_clicks_article_clicked_at_idx
  on public.affiliate_clicks (article_id, clicked_at desc);
create index if not exists affiliate_clicks_dedupe_idx
  on public.affiliate_clicks (visitor_hash, page_path, service, placement, clicked_at desc);

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

alter table public.affiliate_clicks enable row level security;

drop policy if exists "Admins can read affiliate click stats" on public.affiliate_clicks;
create policy "Admins can read affiliate click stats"
on public.affiliate_clicks for select
to authenticated
using (public.is_admin());

revoke all on public.affiliate_clicks from public, anon, authenticated;
revoke all on sequence public.affiliate_clicks_id_seq from public, anon, authenticated;
grant select on public.affiliate_clicks to authenticated;
revoke all on function public.record_affiliate_click(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_affiliate_click(text, text, text, text, text, text, text)
  to anon, authenticated;
