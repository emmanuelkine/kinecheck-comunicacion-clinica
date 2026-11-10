# Piloto Horas Disponibles — control de implementación

## Alcance verificado
- Publicación de disponibilidad por profesionales verificados; reserva y confirmación permanecen en agenda oficial del prestador.
- Compartir por WhatsApp horas activas con enlace HTTPS oficial desde resultados y Mis horas.
- Las horas vencidas se filtran en el navegador. No se atribuyen reservas ni ingresos a KineCheck sin confirmación.

## Bloqueadores pendientes
1. Publicación institucional: el registro institucional existente indica expresamente que la publicación está deshabilitada. No habilitarla alterando solo la interfaz. Requiere permisos delegados revocables, validación institucional y RLS en Supabase.
2. Métricas: actualmente no hay evidencia de eventos confiables de contacto, reserva y asistencia. Diseñar tabla de eventos con autorización y RLS, evitando datos clínicos personales.
3. Pruebas de extremo a extremo con cuentas verificadas y reserva oficial; no usar pacientes reales en pruebas.

## Registro manual de piloto (sin datos identificables)
Por cada hora: ID de hora, institución, fecha, hora, fecha de publicación, compartida sí/no, contacto recibido sí/no, confirmación externa sí/no, hora efectivamente ocupada sí/no, fecha de confirmación y responsable. El resultado 'recuperada' exige confirmación externa documentada; nunca inferirlo de clics o desactivaciones.

## Criterios de aceptación
- Hora publicada visible en buscador y enlace de WhatsApp abre mensaje correcto.
- Hora inactiva o vencida no se ofrece como disponible.
- Reserva sigue en sistema oficial; no se genera doble reserva.
- Roles no autorizados no pueden editar ni publicar por terceros.
- El panel futuro diferencia horas publicadas, compartidas, contactadas, confirmadas y recuperadas.

## Publicación
No fusionar ni desplegar automáticamente antes de QA, revisión de permisos y confirmación del responsable del proyecto.

## Auditoría técnica 10-11-2026 (lectura real de Supabase)
- Proyecto producción: `eqhcdclyeoapmqtlduwf`. Proyecto staging: `mhnqtyvwxytppekktvxb`.
- Staging tiene `kc_hours_private.api(action,payload)`, con acciones `invite`, `accept_invite`, `delegate`, `revoke_staff`, `revoke_membership`, `save_slot`, `deactivate_slot`, `metrics` y `start_pilot`. Usa autorizaciones de servidor y roles; no reemplazar con checks de frontend.
- Staging contiene 3 registros de pilotos, 1 de staff y 2 delegaciones (no implica actividad ni pruebas exitosas).
- Interruptor de lanzamiento staging: `enabled=false`, `legal_approved=false`. NO modificar estos valores sin aprobación jurídica y de producto.
- Producción no contiene la tabla `kc_hours_private.release`: hay divergencia de esquema. No aplicar migraciones de staging a producción a ciegas.
- El frontend `horas-disponibles/app.js` usa actualmente REST directo a tablas `kc_health_*`, y no invoca la API privada de staging. Una integración real requiere exponer un endpoint autenticado y revisado para `kc_hours_private.api`, comprobar grants y RLS, y adaptar el frontend.
- La función `deactivate_slot` distingue `booked=true` de cancelación, pero no demuestra asistencia ni atribución causal de recuperación; para el indicador “recuperadas” exigir confirmación externa y reglas de auditoría.

## Pruebas de aceptación pendientes (no afirmar superadas)
1. Cuenta de institución verificada invita a secretaria; token caduca y está asociado al correo correcto.
2. Profesional acepta pertenencia y concede delegación explícita; secretaria solo puede gestionar su agenda autorizada.
3. Revocación inmediata bloquea nuevas operaciones y no afecta otras instituciones.
4. Usuario anónimo y usuario de otra institución no pueden escribir ni leer datos privados.
5. Publicación, desactivación y reserva confirmada generan métricas consistentes; doble clic no duplica conteos.
6. Horas vencidas y enlaces no aprobados no aparecen en resultados.
7. Prueba de humo móvil/escritorio y rollback antes de fusionar PR.

**Estado:** revisión de estructura y controles existentes, sin pruebas autenticadas E2E ni despliegue de permisos. No habilitar piloto institucional comercial todavía.
