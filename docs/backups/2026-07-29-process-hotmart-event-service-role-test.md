# Prueba funcional de `process_hotmart_event` con `service_role`

Fecha: 2026-07-29

## Objetivo

Confirmar que, después del hardening de permisos, la función `public.process_hotmart_event` sigue siendo ejecutable por `service_role`, pero no por `anon` ni `authenticated`.

## Resultado confirmado

- `anon_can_execute = false`
- `authenticated_can_execute = false`
- `service_role_can_execute = true`
- La invocación transaccional bajo `service_role` devolvió `active`.
- La transacción terminó con `ROLLBACK`.
- La verificación posterior confirmó 0 registros residuales en:
  - `public.course_access`
  - `public.hotmart_purchases`
  - `public.hotmart_webhook_events`

## Conclusión

El hardening mantiene operativo el flujo legítimo del webhook y bloquea la ejecución directa desde roles de cliente. La prueba no dejó datos de prueba en producción.
