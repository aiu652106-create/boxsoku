-- Enforce one current fighter-status row without deleting status history.
-- A current row is the single row whose end_date IS NULL.

begin;

-- Repair the only duplicate found in the existing 16 profiles. The older
-- Katie Taylor row remains in history but is closed at the date the newer
-- verified active record was appended.
do $$
declare
  katie_id uuid;
  current_history_id bigint;
begin
  select internal_id into katie_id
  from public.boxers
  where slug = 'katie-taylor';

  select h.history_id into current_history_id
  from public.fighter_status_history h
  where h.fighter_id = katie_id
    and h.status = 'active'
    and h.source_name = 'Matchroom Boxing公式（2026-08-20再確認）'
    and h.source_date = '2026-06-05'
    and h.end_date is null
  order by h.checked_at desc nulls last, h.history_id desc
  limit 1;

  if current_history_id is not null then
    update public.fighter_status_history
    set end_date = '2026-08-20'
    where fighter_id = katie_id
      and end_date is null
      and history_id <> current_history_id;
  end if;
end;
$$;

-- Prefer the open-ended row. If legacy data ever contains more than one,
-- checked_at/history_id provide the deterministic fallback requested by the
-- application contract.
create or replace view public.current_fighter_status
with (security_invoker = true)
as
select distinct on (h.fighter_id)
  h.fighter_id,
  h.status,
  h.start_date,
  h.end_date,
  h.source_name,
  h.source_url,
  h.source_date,
  h.checked_at
from public.fighter_status_history h
order by
  h.fighter_id,
  (h.end_date is null) desc,
  h.checked_at desc nulls last,
  h.history_id desc;

grant select on public.current_fighter_status to anon, authenticated;

-- Any insertion of a new current row first closes the previous current row
-- in the same transaction. This also protects existing review/import paths
-- that insert directly into fighter_status_history.
create or replace function public.close_previous_fighter_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  transition_date date;
begin
  if new.end_date is null then
    transition_date := coalesce(new.start_date, current_date);

    update public.fighter_status_history h
    set end_date = case
      when h.start_date is not null and h.start_date > transition_date
        then h.start_date
      else transition_date
    end
    where h.fighter_id = new.fighter_id
      and h.end_date is null
      and (tg_op = 'INSERT' or h.history_id <> new.history_id);
  end if;

  return new;
end;
$$;

drop trigger if exists fighter_status_history_close_previous_current
  on public.fighter_status_history;
create trigger fighter_status_history_close_previous_current
before insert or update of fighter_id, start_date, end_date
on public.fighter_status_history
for each row execute function public.close_previous_fighter_status();

-- The trigger supplies the same update-then-insert transaction to admin RPCs
-- and import paths. This explicit helper is the preferred admin API for a
-- status change and is intentionally not exposed to anonymous clients.
create or replace function public.record_fighter_status(
  p_fighter_id uuid,
  p_status text,
  p_effective_date date default current_date,
  p_source_name text default '',
  p_source_url text default null,
  p_source_date date default null,
  p_checked_at timestamptz default now()
)
returns public.fighter_status_history
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.fighter_status_history%rowtype;
  transition_date date := coalesce(p_effective_date, current_date);
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_fighter_id is null then
    raise exception 'fighter_id is required';
  end if;
  if p_status not in ('active', 'retired', 'inactive') then
    raise exception 'invalid fighter status';
  end if;
  if not exists (
    select 1 from public.boxers where internal_id = p_fighter_id
  ) then
    raise exception 'fighter not found';
  end if;

  -- Close the previous current row(s), then insert the new current row.
  -- Both statements run in this function's caller transaction.
  update public.fighter_status_history h
  set end_date = case
    when h.start_date is not null and h.start_date > transition_date
      then h.start_date
    else transition_date
  end
  where h.fighter_id = p_fighter_id
    and h.end_date is null;

  insert into public.fighter_status_history (
    fighter_id, status, start_date, end_date,
    source_name, source_url, source_date, checked_at
  ) values (
    p_fighter_id, p_status, transition_date, null,
    coalesce(p_source_name, ''), p_source_url, p_source_date,
    coalesce(p_checked_at, now())
  )
  returning * into result_row;

  return result_row;
end;
$$;

revoke all on function public.record_fighter_status(
  uuid, text, date, text, text, date, timestamptz
) from public, anon, authenticated;
grant execute on function public.record_fighter_status(
  uuid, text, date, text, text, date, timestamptz
) to authenticated;

-- Fail closed if any future path tries to leave two open rows for one fighter.
create unique index if not exists fighter_status_history_one_current_idx
on public.fighter_status_history (fighter_id)
where end_date is null;

commit;
