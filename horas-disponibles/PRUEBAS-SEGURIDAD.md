# Pruebas de seguridad del piloto — 10/11/2026

Entorno: Supabase staging `mhnqtyvwxytppekktvxb`. Producción sin cambios.

## Ejecutadas

| Prueba | Resultado | Alcance |
|---|---|---|
| Permiso EXECUTE para anon en `public.kc_hours_pilot_api` | PASS: false | Privilegio SQL |
| Permiso EXECUTE para authenticated | PASS: true | No demuestra sesión válida |
| Invocación del gateway sin sesión | PASS: error 42501 | Control del wrapper |
| `can_manage(NULL, profesional_A, usuario_B)` con UUID ajenos | PASS: false | Agenda personal |
| `can_manage(institución_inexistente, profesional_A, usuario_B)` | PASS: false | Control negativo básico |

## Pendientes obligatorias

No se ha comprobado acceso de cuentas reales de prueba ni roles con sesión válida. Para aprobar el piloto deben ejecutarse, con identidades aisladas y sin pacientes reales:

1. Propietario institucional verificado invita a secretaria y profesional; invitación para correo diferente debe fallar.
2. Profesional acepta vínculo y delega a secretaria A; secretaria B sin delegación no puede guardar/desactivar.
3. Secretaria A puede operar solo las horas del profesional delegado en esa institución.
4. Revocación de secretaria y de membresía bloquea inmediatamente nuevos cambios.
5. Confirmación de reserva externa, idempotencia de desactivación y consistencia de métricas.
6. Usuario de otra institución y anónimo no pueden leer horas privadas ni datos del equipo.
7. Prueba de navegación móvil/escritorio y restauración de sesión en laboratorio.
8. Revisión de migraciones versionadas y aprobación legal antes de activar `release`.

**Criterio de salida:** ningún cambio en producción ni fusión de PR mientras haya pruebas de seguridad pendientes.

## Ejecución adicional 10-11-2026
- PASS: `kc_hours_recovery_api` no concede EXECUTE a anon y sí a authenticated.
- PASS: una invocación sin sesión válida devuelve SQLSTATE `42501` desde `kc_hours_private.actor`.
- PASS: endurecimiento aplicado: solo administrador de institución verificada, activa y no suspendida puede confirmar atenciones.
- PASS (revisión de código y migración): inserción idempotente con `ON CONFLICT DO NOTHING RETURNING`; distingue `already_registered`.
- Observación: tabla nueva con 0 confirmaciones registradas al momento de comprobar.
- Migración SQL versionada: `horas-disponibles/sql/20261110_staging_rpc_and_recovery.sql`. **No es migración completa**; requiere previamente el esquema privado y sus dependencias.
- BLOCKED: pruebas E2E con identidades autenticadas y roles reales; no se han simulado ni afirmado.
- BLOCKED: despliegue a producción; pendiente aprobación legal y verificación de dependencias.
