-- Boxing event source automation
-- Apply after supabase/schema.sql. This migration is additive and does not
-- scrape, publish, overwrite, or delete existing articles automatically.

create table if not exists public.boxing_events (
  event_id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique check (char_length(canonical_key) between 8 and 500),
  event_name text not null check (char_length(event_name) between 1 and 180),
  event_date date,
  venue text,
  location text,
  start_time time,
  broadcast_start_time time,
  distribution_services jsonb not null default '[]'::jsonb,
  organizer text,
  promoter text,
  normalized_data jsonb not null default '{}'::jsonb,
  source_name text not null default '',
  source_url text not null default '' check (source_url = '' or source_url ~* '^https://'),
  fetched_at timestamptz,
  last_verified_at timestamptz,
  article_id uuid references public.articles(id) on delete set null,
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published')),
  manual_lock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boxing_event_bouts (
  bout_id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.boxing_events(event_id) on delete cascade,
  bout_key text not null check (char_length(bout_key) between 3 and 300),
  bout_number integer check (bout_number is null or bout_number > 0),
  bout_label text not null default '',
  weight_class text,
  rounds integer check (rounds is null or rounds > 0),
  title_name text,
  fighter_a_name text not null default '',
  fighter_a_gym text,
  fighter_b_name text not null default '',
  fighter_b_gym text,
  is_main_event boolean not null default false,
  is_semifinal boolean not null default false,
  normalized_data jsonb not null default '{}'::jsonb,
  source_name text not null default '',
  source_url text not null default '' check (source_url = '' or source_url ~* '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, bout_key)
);

create table if not exists public.event_source_configs (
  source_key text primary key check (source_key ~ '^[a-z0-9][a-z0-9-]{1,31}$'),
  display_name text not null,
  source_kind text not null check (source_kind in ('streaming', 'promoter', 'organizer', 'official')),
  adapter_key text not null check (adapter_key ~ '^[a-z0-9][a-z0-9-]{1,31}$'),
  source_url text not null check (source_url ~* '^https://'),
  enabled boolean not null default true,
  cadence text not null default 'daily' check (cadence in ('daily', 'monthly')),
  cooldown_seconds integer not null default 1800 check (cooldown_seconds between 60 and 604800),
  max_retries integer not null default 1 check (max_retries between 0 and 2),
  timeout_ms integer not null default 10000 check (timeout_ms between 1000 and 30000),
  state text not null default 'healthy'
    check (state in ('healthy', 'running', 'cooldown', 'stopped', 'disabled')),
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  last_run_at timestamptz,
  last_success_at timestamptz,
  next_run_at timestamptz,
  lock_until timestamptz,
  last_http_status integer,
  last_etag text,
  last_modified text,
  last_extracted_count integer not null default 0 check (last_extracted_count >= 0),
  last_updated_count integer not null default 0 check (last_updated_count >= 0),
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_fetch_runs (
  run_id uuid primary key default gen_random_uuid(),
  source_key text not null references public.event_source_configs(source_key) on delete restrict,
  requested_url text not null check (requested_url ~* '^https://'),
  http_status integer,
  outcome text not null default 'running'
    check (outcome in ('running', 'success', 'not_modified', 'blocked', 'failed', 'needs_review')),
  fetched_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  extracted_count integer not null default 0 check (extracted_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  error_code text,
  error_message text,
  etag text,
  last_modified text
);

create table if not exists public.event_update_candidates (
  candidate_id uuid primary key default gen_random_uuid(),
  source_key text not null references public.event_source_configs(source_key) on delete restrict,
  source_name text not null default '',
  source_url text not null check (source_url ~* '^https://'),
  canonical_key text not null,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  normalized_data jsonb not null,
  diff jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  operation text not null check (operation in ('new', 'update', 'no_change', 'needs_review')),
  matched_event_id uuid references public.boxing_events(event_id) on delete set null,
  matched_article_id uuid references public.articles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'applied', 'needs_review', 'stale')),
  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, canonical_key, fingerprint)
);

alter table public.articles
  add column if not exists boxing_event_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'articles_boxing_event_id_fkey'
      and conrelid = 'public.articles'::regclass
  ) then
    alter table public.articles
      add constraint articles_boxing_event_id_fkey
      foreign key (boxing_event_id)
      references public.boxing_events(event_id)
      on delete set null;
  end if;
end;
$$;

create index if not exists boxing_events_public_date_idx
  on public.boxing_events (publication_status, event_date, updated_at desc);
create index if not exists boxing_events_article_idx
  on public.boxing_events (article_id);
create index if not exists boxing_event_bouts_event_order_idx
  on public.boxing_event_bouts (event_id, bout_number nulls last, bout_id);
create index if not exists event_fetch_runs_source_time_idx
  on public.event_fetch_runs (source_key, fetched_at desc);
create index if not exists event_update_candidates_status_time_idx
  on public.event_update_candidates (status, discovered_at desc);
create index if not exists event_update_candidates_event_idx
  on public.event_update_candidates (matched_event_id, discovered_at desc);

drop trigger if exists boxing_events_set_updated_at on public.boxing_events;
create trigger boxing_events_set_updated_at
before update on public.boxing_events
for each row execute function public.set_updated_at();

drop trigger if exists boxing_event_bouts_set_updated_at on public.boxing_event_bouts;
create trigger boxing_event_bouts_set_updated_at
before update on public.boxing_event_bouts
for each row execute function public.set_updated_at();

drop trigger if exists event_source_configs_set_updated_at on public.event_source_configs;
create trigger event_source_configs_set_updated_at
before update on public.event_source_configs
for each row execute function public.set_updated_at();

drop trigger if exists event_update_candidates_set_updated_at on public.event_update_candidates;
create trigger event_update_candidates_set_updated_at
before update on public.event_update_candidates
for each row execute function public.set_updated_at();

insert into public.event_source_configs (
  source_key, display_name, source_kind, adapter_key, source_url,
  cadence, cooldown_seconds, max_retries, timeout_ms
)
values
  (
    'lemino', 'Lemino BOXING公式', 'streaming', 'lemino',
    'https://lemino.docomo.ne.jp/ft/0000002/portal/',
    'daily', 1800, 1, 10000
  ),
  (
    'dangan', 'DANGAN公式', 'promoter', 'dangan',
    'https://danganboxing.com/',
    'daily', 1800, 1, 10000
  )
on conflict (source_key) do nothing;

alter table public.boxing_events enable row level security;
alter table public.boxing_event_bouts enable row level security;
alter table public.event_source_configs enable row level security;
alter table public.event_fetch_runs enable row level security;
alter table public.event_update_candidates enable row level security;

drop policy if exists "Public can view published boxing events" on public.boxing_events;
create policy "Public can view published boxing events"
on public.boxing_events for select to anon, authenticated
using (publication_status = 'published');

drop policy if exists "Admins can read boxing events" on public.boxing_events;
create policy "Admins can read boxing events"
on public.boxing_events for select to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can update boxing events" on public.boxing_events;
create policy "Admins can update boxing events"
on public.boxing_events for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can view published event bouts" on public.boxing_event_bouts;
create policy "Public can view published event bouts"
on public.boxing_event_bouts for select to anon, authenticated
using (
  exists (
    select 1 from public.boxing_events e
    where e.event_id = boxing_event_bouts.event_id
      and e.publication_status = 'published'
  )
);

drop policy if exists "Admins can read event bouts" on public.boxing_event_bouts;
create policy "Admins can read event bouts"
on public.boxing_event_bouts for select to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can update event bouts" on public.boxing_event_bouts;
create policy "Admins can update event bouts"
on public.boxing_event_bouts for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins can read event source configs" on public.event_source_configs;
create policy "Admins can read event source configs"
on public.event_source_configs for select to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read event fetch runs" on public.event_fetch_runs;
create policy "Admins can read event fetch runs"
on public.event_fetch_runs for select to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read event candidates" on public.event_update_candidates;
create policy "Admins can read event candidates"
on public.event_update_candidates for select to authenticated
using ((select public.is_admin()));

revoke all on public.boxing_events, public.boxing_event_bouts,
  public.event_source_configs, public.event_fetch_runs,
  public.event_update_candidates from anon;
grant select on public.boxing_events, public.boxing_event_bouts to anon;
grant select, update on public.boxing_events, public.boxing_event_bouts to authenticated;
grant select on public.event_source_configs, public.event_fetch_runs,
  public.event_update_candidates to authenticated;

create or replace function public.list_event_source_configs(p_server_token text)
returns setof public.event_source_configs
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_server_request(p_server_token) then
    raise exception 'not authorized';
  end if;

  return query
    select *
    from public.event_source_configs
    where enabled = true
    order by source_key;
end;
$$;

revoke all on function public.list_event_source_configs(text) from public, anon, authenticated;
grant execute on function public.list_event_source_configs(text) to anon, authenticated;

drop function if exists public.begin_event_source_run(text, timestamptz, text);
drop function if exists public.begin_event_source_run(text, timestamptz, text, boolean);

create or replace function public.begin_event_source_run(
  p_source_key text,
  p_now timestamptz default now(),
  p_server_token text default null,
  p_manual boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.event_source_configs;
  new_run_id uuid;
begin
  if not public.is_server_request(p_server_token) then
    raise exception 'not authorized';
  end if;

  select * into cfg
  from public.event_source_configs
  where source_key = lower(trim(p_source_key))
  for update;

  if not found then
    raise exception 'source not found';
  end if;

  if not cfg.enabled or cfg.state = 'disabled' then
    return jsonb_build_object('started', false, 'reason', cfg.state);
  end if;

  if cfg.state = 'stopped' then
    if cfg.next_run_at is null or cfg.next_run_at > p_now then
      return jsonb_build_object('started', false, 'reason', 'stopped');
    end if;
    cfg.state := 'healthy';
    cfg.consecutive_failures := 0;
    cfg.next_run_at := null;
    update public.event_source_configs
    set state = 'healthy', consecutive_failures = 0, next_run_at = null
    where source_key = cfg.source_key;
  end if;

  if cfg.lock_until is not null and cfg.lock_until > p_now then
    return jsonb_build_object('started', false, 'reason', 'locked');
  end if;

  if p_manual then
    if cfg.last_run_at is not null
       and cfg.last_run_at + (cfg.cooldown_seconds * interval '1 second') > p_now then
      return jsonb_build_object('started', false, 'reason', 'cooldown');
    end if;
  elsif cfg.next_run_at is not null and cfg.next_run_at > p_now then
    return jsonb_build_object('started', false, 'reason', 'not_due');
  end if;

  new_run_id := gen_random_uuid();
  insert into public.event_fetch_runs (run_id, source_key, requested_url, fetched_at)
  values (new_run_id, cfg.source_key, cfg.source_url, p_now);

  update public.event_source_configs
  set state = 'running',
      last_run_at = p_now,
      lock_until = p_now + interval '15 minutes'
  where source_key = cfg.source_key;

  return jsonb_build_object(
    'started', true,
    'run_id', new_run_id,
    'source_key', cfg.source_key,
    'source_name', cfg.display_name,
    'source_url', cfg.source_url,
    'adapter_key', cfg.adapter_key,
    'timeout_ms', cfg.timeout_ms,
    'max_retries', cfg.max_retries,
    'last_etag', cfg.last_etag,
    'last_modified', cfg.last_modified,
    'cooldown_seconds', cfg.cooldown_seconds
  );
end;
$$;

revoke all on function public.begin_event_source_run(text, timestamptz, text, boolean)
  from public, anon, authenticated;
grant execute on function public.begin_event_source_run(text, timestamptz, text, boolean)
  to anon, authenticated;

create or replace function public.save_event_update_candidate(
  p_source_key text,
  p_canonical_key text,
  p_normalized_data jsonb,
  p_diff jsonb default '{}'::jsonb,
  p_validation_errors jsonb default '[]'::jsonb,
  p_fetched_at timestamptz default now(),
  p_server_token text default null
)
returns setof public.event_update_candidates
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.event_source_configs;
  old_event public.boxing_events;
  candidate_operation text;
  candidate_status text;
  candidate_fingerprint text;
  candidate_id_value uuid;
  old_bout_count integer;
  new_bout_count integer;
  computed_diff jsonb;
begin
  if not public.is_server_request(p_server_token) then
    raise exception 'not authorized';
  end if;

  if p_normalized_data is null or jsonb_typeof(p_normalized_data) <> 'object' then
    raise exception 'normalized event must be an object';
  end if;

  if p_canonical_key is null or char_length(trim(p_canonical_key)) < 8 then
    raise exception 'invalid canonical key';
  end if;

  select * into cfg
  from public.event_source_configs
  where source_key = lower(trim(p_source_key));
  if not found then
    raise exception 'source not found';
  end if;

  select * into old_event
  from public.boxing_events
  where canonical_key = trim(p_canonical_key);

  new_bout_count := jsonb_array_length(coalesce(p_normalized_data->'bouts', '[]'::jsonb));
  old_bout_count := case
    when old_event.event_id is null then 0
    else jsonb_array_length(coalesce(old_event.normalized_data->'bouts', '[]'::jsonb))
  end;

  if jsonb_array_length(coalesce(p_validation_errors, '[]'::jsonb)) > 0
     or (old_bout_count >= 4 and new_bout_count * 2 < old_bout_count) then
    candidate_operation := 'needs_review';
    candidate_status := 'needs_review';
  elsif old_event.event_id is null then
    candidate_operation := 'new';
    candidate_status := 'pending';
  elsif old_event.normalized_data = p_normalized_data then
    candidate_operation := 'no_change';
    candidate_status := 'pending';
  else
    candidate_operation := 'update';
    candidate_status := 'pending';
  end if;

  if p_diff is not null and p_diff <> '{}'::jsonb then
    computed_diff := p_diff;
  elsif old_event.event_id is null then
    computed_diff := '{}'::jsonb;
  else
    select coalesce(
      jsonb_object_agg(
        changed.key,
        jsonb_build_object(
          'before', coalesce(old_event.normalized_data -> changed.key, 'null'::jsonb),
          'after', coalesce(p_normalized_data -> changed.key, 'null'::jsonb)
        )
      ),
      '{}'::jsonb
    )
    into computed_diff
    from (
      select key
      from jsonb_object_keys(coalesce(old_event.normalized_data, '{}'::jsonb)) as old_keys(key)
      union
      select key
      from jsonb_object_keys(p_normalized_data) as new_keys(key)
    ) as changed
    where coalesce(old_event.normalized_data -> changed.key, 'null'::jsonb)
      is distinct from coalesce(p_normalized_data -> changed.key, 'null'::jsonb);
  end if;

  candidate_fingerprint := encode(
    extensions.digest(convert_to(p_normalized_data::text, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.event_update_candidates (
    source_key, source_name, source_url, canonical_key, fingerprint,
    normalized_data, diff, validation_errors, operation,
    matched_event_id, matched_article_id, status,
    discovered_at, last_seen_at
  ) values (
    cfg.source_key, cfg.display_name, cfg.source_url, trim(p_canonical_key),
    candidate_fingerprint, p_normalized_data, coalesce(computed_diff, '{}'::jsonb),
    coalesce(p_validation_errors, '[]'::jsonb), candidate_operation,
    old_event.event_id, old_event.article_id, candidate_status,
    coalesce(p_fetched_at, now()), coalesce(p_fetched_at, now())
  )
  on conflict (source_key, canonical_key, fingerprint) do update set
    source_name = excluded.source_name,
    source_url = excluded.source_url,
    normalized_data = excluded.normalized_data,
    diff = excluded.diff,
    validation_errors = excluded.validation_errors,
    operation = excluded.operation,
    matched_event_id = excluded.matched_event_id,
    matched_article_id = excluded.matched_article_id,
    last_seen_at = excluded.last_seen_at,
    updated_at = now(),
    status = case
      when public.event_update_candidates.status in ('approved', 'applied')
        then public.event_update_candidates.status
      else excluded.status
    end
  returning candidate_id into candidate_id_value;

  return query
    select * from public.event_update_candidates
    where candidate_id = candidate_id_value;
end;
$$;

revoke all on function public.save_event_update_candidate(text, text, jsonb, jsonb, jsonb, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.save_event_update_candidate(text, text, jsonb, jsonb, jsonb, timestamptz, text)
  to anon, authenticated;

create or replace function public.finish_event_source_run(
  p_run_id uuid,
  p_http_status integer,
  p_outcome text,
  p_extracted_count integer default 0,
  p_updated_count integer default 0,
  p_retry_count integer default 0,
  p_error_code text default null,
  p_error_message text default null,
  p_etag text default null,
  p_last_modified text default null,
  p_now timestamptz default now(),
  p_server_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  run_row public.event_fetch_runs;
  cfg public.event_source_configs;
  next_failures integer;
  next_state text;
  next_run timestamptz;
begin
  if not public.is_server_request(p_server_token) then
    raise exception 'not authorized';
  end if;

  select * into run_row
  from public.event_fetch_runs
  where run_id = p_run_id
  for update;
  if not found then
    raise exception 'run not found';
  end if;

  select * into cfg
  from public.event_source_configs
  where source_key = run_row.source_key
  for update;

  if p_outcome not in ('success', 'not_modified', 'blocked', 'failed', 'needs_review') then
    raise exception 'invalid run outcome';
  end if;

  if p_outcome in ('success', 'not_modified') then
    next_failures := 0;
    next_state := 'healthy';
    next_run := p_now + case when cfg.cadence = 'monthly'
      then interval '30 days' else interval '1 day' end;
  elsif p_http_status in (403, 429) or p_outcome = 'blocked' then
    next_failures := cfg.consecutive_failures + 1;
    next_state := 'stopped';
    next_run := null;
  else
    next_failures := cfg.consecutive_failures + 1;
    if next_failures >= 3 then
      next_state := 'stopped';
      next_run := p_now + case when cfg.cadence = 'monthly'
        then interval '30 days' else interval '1 day' end;
    else
      next_state := 'cooldown';
      next_run := p_now + (cfg.cooldown_seconds * interval '1 second');
    end if;
  end if;

  update public.event_fetch_runs
  set http_status = p_http_status,
      outcome = p_outcome,
      finished_at = p_now,
      duration_ms = greatest(0, floor(extract(epoch from (p_now - fetched_at)) * 1000)::integer),
      extracted_count = greatest(0, coalesce(p_extracted_count, 0)),
      updated_count = greatest(0, coalesce(p_updated_count, 0)),
      retry_count = greatest(0, coalesce(p_retry_count, 0)),
      error_code = nullif(trim(coalesce(p_error_code, '')), ''),
      error_message = nullif(trim(coalesce(p_error_message, '')), ''),
      etag = nullif(trim(coalesce(p_etag, '')), ''),
      last_modified = nullif(trim(coalesce(p_last_modified, '')), '')
  where run_id = p_run_id;

  update public.event_source_configs
  set state = next_state,
      consecutive_failures = next_failures,
      next_run_at = next_run,
      lock_until = null,
      last_http_status = p_http_status,
      last_etag = coalesce(nullif(trim(coalesce(p_etag, '')), ''), last_etag),
      last_modified = coalesce(nullif(trim(coalesce(p_last_modified, '')), ''), last_modified),
      last_extracted_count = greatest(0, coalesce(p_extracted_count, 0)),
      last_updated_count = greatest(0, coalesce(p_updated_count, 0)),
      last_success_at = case when p_outcome in ('success', 'not_modified') then p_now else last_success_at end,
      last_error_code = case when p_outcome in ('success', 'not_modified') then null else nullif(trim(coalesce(p_error_code, '')), '') end,
      last_error_message = case when p_outcome in ('success', 'not_modified') then null else nullif(trim(coalesce(p_error_message, '')), '') end
  where source_key = run_row.source_key;

  return jsonb_build_object(
    'run_id', p_run_id,
    'source_key', run_row.source_key,
    'outcome', p_outcome,
    'state', next_state,
    'consecutive_failures', next_failures,
    'next_run_at', next_run
  );
end;
$$;

revoke all on function public.finish_event_source_run(uuid, integer, text, integer, integer, integer, text, text, text, text, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.finish_event_source_run(uuid, integer, text, integer, integer, integer, text, text, text, text, timestamptz, text)
  to anon, authenticated;

create or replace function public.review_event_update_candidate(
  p_candidate_id uuid,
  p_action text,
  p_article_id uuid default null,
  p_review_note text default null
)
returns setof public.event_update_candidates
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate public.event_update_candidates;
  event_row public.boxing_events;
  article_row public.articles;
  event_data jsonb;
  bout_data jsonb;
  event_id_value uuid;
  is_publish boolean;
  event_status text;
  event_article_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_action not in ('approved', 'published', 'rejected', 'needs_review') then
    raise exception 'invalid review action';
  end if;

  select * into candidate
  from public.event_update_candidates
  where candidate_id = p_candidate_id
  for update;
  if not found then
    raise exception 'candidate not found';
  end if;

  if candidate.status not in ('pending', 'needs_review') then
    raise exception 'candidate already reviewed';
  end if;

  if p_action in ('rejected', 'needs_review') then
    update public.event_update_candidates
    set status = p_action,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = nullif(trim(coalesce(p_review_note, '')), '')
    where candidate_id = p_candidate_id;

    return query select * from public.event_update_candidates
      where candidate_id = p_candidate_id;
    return;
  end if;

  if jsonb_array_length(coalesce(candidate.validation_errors, '[]'::jsonb)) > 0 then
    raise exception 'candidate has validation errors';
  end if;

  event_data := candidate.normalized_data;
  is_publish := p_action = 'published';

  if p_article_id is not null then
    select * into article_row
    from public.articles
    where id = p_article_id;
    if not found then
      raise exception 'article not found';
    end if;
    event_article_id := p_article_id;
  else
    event_article_id := candidate.matched_article_id;
  end if;

  if event_article_id is not null and is_publish then
    if not exists (
      select 1 from public.articles
      where id = event_article_id
        and status = 'published'
        and published_at is not null
        and published_at <= now()
    ) then
      raise exception 'published event requires a published article';
    end if;
  end if;

  select * into event_row
  from public.boxing_events
  where canonical_key = candidate.canonical_key
  for update;

  if found then
    if event_row.manual_lock then
      raise exception 'event is manually locked';
    end if;
    event_id_value := event_row.event_id;
    event_status := case when is_publish then 'published' else event_row.publication_status end;
    update public.boxing_events
    set event_name = coalesce(nullif(trim(event_data->>'event_name'), ''), event_name),
        event_date = coalesce(nullif(event_data->>'event_date', '')::date, event_date),
        venue = coalesce(nullif(trim(event_data->>'venue'), ''), venue),
        location = coalesce(nullif(trim(event_data->>'location'), ''), location),
        start_time = coalesce(nullif(event_data->>'start_time', '')::time, start_time),
        broadcast_start_time = coalesce(nullif(event_data->>'broadcast_start_time', '')::time, broadcast_start_time),
        distribution_services = case
          when jsonb_typeof(event_data->'distribution_services') = 'array'
            then event_data->'distribution_services'
          else distribution_services
        end,
        organizer = coalesce(nullif(trim(event_data->>'organizer'), ''), organizer),
        promoter = coalesce(nullif(trim(event_data->>'promoter'), ''), promoter),
        normalized_data = event_data,
        source_name = candidate.source_name,
        source_url = candidate.source_url,
        fetched_at = candidate.last_seen_at,
        last_verified_at = now(),
        article_id = coalesce(event_article_id, article_id),
        publication_status = event_status
    where event_id = event_id_value;
  else
    if is_publish and event_article_id is null then
      raise exception 'new published event requires an article';
    end if;
    insert into public.boxing_events (
      canonical_key, event_name, event_date, venue, location,
      start_time, broadcast_start_time, distribution_services,
      organizer, promoter, normalized_data, source_name, source_url,
      fetched_at, last_verified_at, article_id, publication_status
    ) values (
      candidate.canonical_key,
      coalesce(nullif(trim(event_data->>'event_name'), ''), '名称未確認'),
      nullif(event_data->>'event_date', '')::date,
      nullif(trim(event_data->>'venue'), ''),
      nullif(trim(event_data->>'location'), ''),
      nullif(event_data->>'start_time', '')::time,
      nullif(event_data->>'broadcast_start_time', '')::time,
      case when jsonb_typeof(event_data->'distribution_services') = 'array'
        then event_data->'distribution_services' else '[]'::jsonb end,
      nullif(trim(event_data->>'organizer'), ''),
      nullif(trim(event_data->>'promoter'), ''),
      event_data, candidate.source_name, candidate.source_url,
      candidate.last_seen_at, now(), event_article_id,
      case when is_publish then 'published' else 'draft' end
    ) returning event_id into event_id_value;
  end if;

  for bout_data in select value from jsonb_array_elements(coalesce(event_data->'bouts', '[]'::jsonb))
  loop
    insert into public.boxing_event_bouts (
      event_id, bout_key, bout_number, bout_label, weight_class, rounds,
      title_name, fighter_a_name, fighter_a_gym, fighter_b_name,
      fighter_b_gym, is_main_event, is_semifinal, normalized_data,
      source_name, source_url
    ) values (
      event_id_value,
      trim(bout_data->>'bout_key'),
      nullif(bout_data->>'bout_number', '')::integer,
      coalesce(bout_data->>'bout_label', ''),
      nullif(trim(bout_data->>'weight_class'), ''),
      nullif(bout_data->>'rounds', '')::integer,
      nullif(trim(bout_data->>'title_name'), ''),
      coalesce(bout_data->>'fighter_a_name', ''),
      nullif(trim(bout_data->>'fighter_a_gym'), ''),
      coalesce(bout_data->>'fighter_b_name', ''),
      nullif(trim(bout_data->>'fighter_b_gym'), ''),
      coalesce((bout_data->>'is_main_event')::boolean, false),
      coalesce((bout_data->>'is_semifinal')::boolean, false),
      bout_data, candidate.source_name, candidate.source_url
    )
    on conflict (event_id, bout_key) do update set
      bout_number = coalesce(excluded.bout_number, public.boxing_event_bouts.bout_number),
      bout_label = case when excluded.bout_label <> '' then excluded.bout_label else public.boxing_event_bouts.bout_label end,
      weight_class = coalesce(excluded.weight_class, public.boxing_event_bouts.weight_class),
      rounds = coalesce(excluded.rounds, public.boxing_event_bouts.rounds),
      title_name = coalesce(excluded.title_name, public.boxing_event_bouts.title_name),
      fighter_a_name = case when excluded.fighter_a_name <> '' then excluded.fighter_a_name else public.boxing_event_bouts.fighter_a_name end,
      fighter_a_gym = coalesce(excluded.fighter_a_gym, public.boxing_event_bouts.fighter_a_gym),
      fighter_b_name = case when excluded.fighter_b_name <> '' then excluded.fighter_b_name else public.boxing_event_bouts.fighter_b_name end,
      fighter_b_gym = coalesce(excluded.fighter_b_gym, public.boxing_event_bouts.fighter_b_gym),
      is_main_event = excluded.is_main_event or public.boxing_event_bouts.is_main_event,
      is_semifinal = excluded.is_semifinal or public.boxing_event_bouts.is_semifinal,
      normalized_data = excluded.normalized_data,
      source_name = excluded.source_name,
      source_url = excluded.source_url;
  end loop;

  update public.articles
  set boxing_event_id = event_id_value
  where id = event_article_id;

  update public.event_update_candidates
  set status = 'applied',
      matched_event_id = event_id_value,
      matched_article_id = event_article_id,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = nullif(trim(coalesce(p_review_note, '')), '')
  where candidate_id = p_candidate_id;

  return query select * from public.event_update_candidates
    where candidate_id = p_candidate_id;
end;
$$;

revoke all on function public.review_event_update_candidate(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.review_event_update_candidate(uuid, text, uuid, text)
  to authenticated;

-- Explicitly keep the canonical source of truth separate from the old article
-- body/fight-card snapshot. No automatic article publication is performed.
