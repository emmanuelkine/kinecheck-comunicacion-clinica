-- Operational rollback retains academic evidence and all legacy services.
begin;
update academy_core.settings set exams_enabled=false,otec_enabled=false;
revoke execute on function public.academy_workflow(text,jsonb) from authenticated,anon,public;
commit;
-- Also remove ACADEMY_COMPETENCY_PREVIEW from the preview environment.
-- Do not drop evidence tables or modify legacy course completions/certificates.
