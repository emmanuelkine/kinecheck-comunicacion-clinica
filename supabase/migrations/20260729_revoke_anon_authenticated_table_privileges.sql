-- KineCheck Academy
-- Hardening de privilegios de tablas críticas
-- Fecha: 2026-07-29
--
-- Revoca privilegios directos de anon y authenticated sobre tablas
-- administradas exclusivamente mediante Edge Functions y service_role.

begin;

revoke all privileges
on table public.course_access
from anon, authenticated;

revoke all privileges
on table public.hotmart_events
from anon, authenticated;

commit;
