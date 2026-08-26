-- Add the professional/amateur distinction without changing existing records.
-- Existing rows remain nullable until their classification is audited.
begin;

alter table public.boxers
  add column if not exists boxer_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.boxers'::regclass
      and conname = 'boxers_boxer_type_check'
  ) then
    alter table public.boxers
      add constraint boxers_boxer_type_check
      check (boxer_type is null or boxer_type in ('professional', 'amateur'));
  end if;
end $$;

create index if not exists boxers_boxer_type_idx on public.boxers (boxer_type);

commit;
