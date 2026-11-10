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
