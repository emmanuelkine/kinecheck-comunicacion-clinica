begin;

revoke execute on function public.platform_log_case_event() from public;
revoke execute on function public.platform_log_case_event() from anon;
revoke execute on function public.platform_log_case_event() from authenticated;

revoke execute on function public.platform_set_updated_at() from public;
revoke execute on function public.platform_set_updated_at() from anon;
revoke execute on function public.platform_set_updated_at() from authenticated;

commit;
