-- Keep fighter_status_history private while allowing the public current-state
-- view to expose only the selected current record and its source metadata.
begin;

alter view public.current_fighter_status
  set (security_invoker = false);

grant select on public.current_fighter_status to anon, authenticated;

commit;
