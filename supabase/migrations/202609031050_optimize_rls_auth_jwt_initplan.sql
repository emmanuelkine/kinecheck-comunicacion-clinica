-- Performance-only RLS hardening from Supabase Advisor.
-- Preserve the existing authorization semantics while evaluating auth.jwt()
-- once per statement through an initplan instead of once per row.

alter policy course_access_select_own
on public.course_access
using (
  lower(trim(email)) = lower(trim(coalesce(((select auth.jwt()) ->> 'email'), '')))
);

alter policy course_content_select_entitled
on public.course_content
using (
  published = true
  and nullif(trim(coalesce(((select auth.jwt()) ->> 'email'), '')), '') is not null
  and public.has_course_access(course_slug, ((select auth.jwt()) ->> 'email'))
);

-- Do not grant EXECUTE on public.has_course_access to authenticated.
-- The function remains SECURITY DEFINER and callable only through the policy/service paths already authorized.
