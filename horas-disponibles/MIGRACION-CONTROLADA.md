# Migración controlada: Horas Disponibles (2026-11-10)

## Situación
- Staging: mhnqtyvwxytppekktvxb; gateway `public.kc_hours_pilot_api(text,jsonb)` creado, ejecución solo para rol authenticated.
- Producción: eqhcdclyeoapmqtlduwf; no aplicar migración todavía.
- El módulo público usa aún REST de producción; laboratorio aislado apunta a staging.
- Los indicadores de reserva actual en staging registran `deactivation_reason='booked'`; no prueban asistencia ni atribución de recuperación.

## Procedimiento previo a producción
1. Obtener y revisar migraciones originales versionadas de `kc_hours_private` (funciones, tablas, triggers, índices, permisos, RLS, audit y datos de configuración). Comparar schema staging vs producción sin copiar datos de prueba.
2. Generar migración idempotente en control de versiones, con revisión de privilegios `SECURITY DEFINER`, `search_path`, `GRANT`, `RLS`, funciones `can_manage` y revocación.
3. Probar en staging con cuentas reales de prueba separadas: propietario, profesional, secretaria delegada, secretaria no delegada, usuario de otra institución, anónimo; sin pacientes reales.
4. Verificar permisos negativos y revocación inmediata, además de concurrencia e idempotencia de reservas y métricas.
5. Definir evidencia externa de reserva efectiva y campo de auditoría de confirmación; no equiparar clic con hora recuperada.
6. Obtener aprobación de producto y legal antes de activar interruptor de lanzamiento. Mantener `release.enabled=false` y `legal_approved=false` mientras tanto.
7. Respaldar producción, planificar ventana de despliegue, aplicar migración, probar y recién entonces fusionar PR y habilitar piloto para institución verificada.
8. Reversión: desactivar release y retirar acceso de frontend; no borrar registros auditables ni ejecutar DROP improvisados.

## Pruebas ejecutadas 2026-11-10
- Se verificó por SQL que `anon` no puede ejecutar el gateway y `authenticated` sí tiene permiso de ejecución.
- La invocación del gateway sin sesión autenticada devolvió `42501 Autenticación requerida` (esperado).
- No se ha realizado prueba de acceso autenticado por cuenta de prueba, delegación real, revocación ni E2E del navegador.
