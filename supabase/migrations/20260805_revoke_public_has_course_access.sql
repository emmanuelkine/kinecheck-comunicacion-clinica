-- Prevent anonymous or ordinary authenticated callers from probing course access
-- with arbitrary email addresses. Current Edge Functions use course_access directly
-- with the service role after validating the authenticated user.
revoke all on function public.has_course_access(text, text) from public;
revoke execute on function public.has_course_access(text, text) from anon, authenticated;
grant execute on function public.has_course_access(text, text) to service_role;
