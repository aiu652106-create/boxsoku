-- Additive migration for the first 10-person boxer database.
-- This file intentionally does not alter articles, comments, events, or site settings.

create extension if not exists pgcrypto;

create table if not exists public.boxers (
  internal_id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_ja text not null check (char_length(name_ja) between 1 and 80),
  name_kana text,
  name_en text,
  ring_name text,
  boxrec_id text,
  nationality text,
  birth_date date,
  birthplace text,
  career_status text not null default 'unknown' check (career_status in ('active', 'retired', 'unknown')),
  gym text,
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

create index if not exists boxers_public_name_idx on public.boxers (is_published, name_ja);
create index if not exists boxers_name_kana_idx on public.boxers (name_kana);
create index if not exists boxers_slug_idx on public.boxers (slug);

alter table public.boxers enable row level security;

drop policy if exists "Public can read published boxers" on public.boxers;
create policy "Public can read published boxers"
on public.boxers for select to anon
using (is_published = true);

drop policy if exists "Admins can read boxers" on public.boxers;
create policy "Admins can read boxers"
on public.boxers for select to authenticated
using (is_published = true or public.is_admin());

drop policy if exists "Admins can insert boxers" on public.boxers;
create policy "Admins can insert boxers"
on public.boxers for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update boxers" on public.boxers;
create policy "Admins can update boxers"
on public.boxers for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete boxers" on public.boxers;
create policy "Admins can delete boxers"
on public.boxers for delete to authenticated
using (public.is_admin());

drop trigger if exists boxers_set_updated_at on public.boxers;
create trigger boxers_set_updated_at
before update on public.boxers
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select on public.boxers to anon, authenticated;
grant insert, update, delete on public.boxers to authenticated;
