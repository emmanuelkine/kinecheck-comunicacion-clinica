# Evidencia de Supabase Advisors — 30 de agosto de 2026

Proyecto revisado: `eqhcdclyeoapmqtlduwf`.

Esta evidencia es de solo lectura. No se cambiaron Auth, RLS, grants, datos, secretos ni configuración del proyecto.

## Security Advisor

Resultado observado:

- 0 errores críticos;
- 1 advertencia: `Leaked Password Protection Disabled`;
- 16 avisos informativos: `RLS Enabled No Policy`.

La protección contra contraseñas filtradas debe habilitarse desde Supabase Auth por un administrador autorizado. No existe en este trabajo autorización para cambiar Auth y no se asumirá un endpoint administrativo no verificado. Referencia: <https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>.

## RLS Enabled No Policy

Las siguientes tablas tienen RLS habilitado, cero políticas y ningún grant directo para los roles `anon` o `authenticated`; su acceso está deliberadamente reservado a procesos de servidor con privilegios controlados:

- `beta_applications`
- `hotmart_events`
- `hotmart_product_grants`
- `hotmart_purchases`
- `hotmart_webhook_events`
- `kinecheck_access_policy`
- `kinecheck_automation_runs`
- `kinecheck_daily_metrics`
- `kinecheck_outbox`
- `kinecheck_public_events`
- `kinecheck_reconciliation_issues`
- `kinecheck_restore_drills`
- `kinecheck_support_requests`
- `platform_login_limits`
- `student_semester_responses`

`evidence_library` también tiene RLS habilitado y cero políticas. Conserva grants nominales para `anon` y `authenticated`, pero la ausencia de políticas deniega filas a esos roles. Antes de cambiar esos grants se debe revisar el consumidor y probarlo; no se agrega una política permisiva únicamente para eliminar el aviso.

Referencia del advisor: <https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy>.

## Performance Advisor

Se observaron dos advertencias `Auth RLS Initialization Plan` en políticas de `course_access` y `course_content`, además de índices informados como no usados. Son hallazgos de rendimiento separados del alcance de recuperación y no justifican una modificación sin medición y pruebas específicas.

No se eliminarán índices por una sola observación de “unused index” y no se reescribirán políticas de acceso dentro de este hardening de continuidad.

## Seguimiento

- Mantener `Leaked Password Protection Disabled` como pendiente administrativo.
- Volver a ejecutar Security y Performance Advisors después de cambios DDL o de Auth.
- Tratar un nuevo hallazgo `ERROR` o `WARN` de acceso como bloqueo hasta clasificar su impacto.
- No cerrar el pendiente de seguridad solo porque las tablas service-only no exponen filas al cliente.
