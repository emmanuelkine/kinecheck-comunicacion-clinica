-- KineCheck Academy
-- Hardening de ejecución para public.process_hotmart_event
-- Aplicado y verificado en producción: 2026-07-29

begin;

revoke execute
on function public.process_hotmart_event(
  text,
  text,
  text,
  bigint,
  text,
  text,
  text,
  timestamptz,
  timestamptz
)
from public, anon, authenticated;

grant execute
on function public.process_hotmart_event(
  text,
  text,
  text,
  bigint,
  text,
  text,
  text,
  timestamptz,
  timestamptz
)
to service_role;

commit;

-- Verificación esperada:
-- anon_can_execute = false
-- authenticated_can_execute = false
-- service_role_can_execute = true
