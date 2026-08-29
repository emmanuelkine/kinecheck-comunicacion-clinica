revoke all on function public.kinecheck_status_center_snapshot() from public;
revoke execute on function public.kinecheck_status_center_snapshot() from anon, authenticated;
grant execute on function public.kinecheck_status_center_snapshot() to service_role;
