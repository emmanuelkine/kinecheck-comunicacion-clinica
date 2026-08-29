-- Go-live hardening: this SECURITY DEFINER RPC is server-side only.
-- Production migration applied 2026-08-29 before this repository backup.
revoke execute on function public.has_course_access(text,text) from authenticated;
grant execute on function public.has_course_access(text,text) to service_role;
