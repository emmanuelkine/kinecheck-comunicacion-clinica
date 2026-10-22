# KineCheck Horas Disponibles — Guion de demostración Isamédica
**22 de octubre de 2026 | Material para reunión exploratoria — no es un convenio ni una integración existente**

## Propuesta en 30 segundos
KineCheck permite dar visibilidad a horas de atención liberadas por cancelaciones o reprogramaciones. El paciente descubre la disponibilidad gratis y finaliza la reserva en el sistema oficial de la clínica. No reemplazamos, consultamos ni modificamos su agenda.

## Demostración segura (5 minutos)
1. Abrir https://kinecheck.cl/horas-disponibles/ y mostrar filtros por profesión, comuna y modalidad.
2. Explicar el caso hipotético: un paciente cancela una consulta de kinesiología para mañana a las 16:00. **No afirmar que existe esa hora en producción**.
3. Mostrar el flujo de registro de profesional y establecimiento; indicar que el registro por sí solo NO autoriza publicación.
4. Explicar la delegación prevista: una secretaria puede gestionar varios profesionales, con autorización individual revocable, incluso a honorarios o arrendatarios.
5. Mostrar cómo el enlace externo llevaría al paciente al portal oficial para verificar y reservar; no ejecutar una reserva real durante la demo.
6. Aclarar que sin sincronización puede haber horas agotadas; se necesitan vencimiento corto, retiro oportuno y confirmación en el portal oficial.

## Propuesta de piloto
Duración sugerida: 90 días, sin cobro al paciente ni modificación de agenda clínica. Incorporación gradual de profesionales contratados, a honorarios y arrendatarios. Participación y uso de nombre institucional sujetos a aprobación del centro. La clínica define quiénes pueden actuar como secretarias; los profesionales independientes conservan control de sus permisos.

## Métricas
Horas liberadas publicadas; visualizaciones; clics de derivación; horas retiradas o expiradas; reservas efectivas **solo si la clínica comparte datos agregados de conversión**. Un clic no demuestra una reserva.

## Condiciones de seguridad
No ingresar datos de pacientes ni publicar horarios falsos como reales. No activar cuentas de profesionales con credenciales pendientes. No presentar una comprobación interna como certificación de la Superintendencia. La consulta automatizada al RNPI requiere integración oficialmente autorizada; sin ella, mantener bloqueada la publicación hasta verificación confiable.

## Preguntas para la jefa del centro clínico
- ¿Quién conoce primero las cancelaciones y cuánto tiempo tarda en liberar una hora?
- ¿Las secretarias administran agendas de varios profesionales y con qué autorización?
- ¿El portal actual permite enlaces directos a profesional o prestación?
- ¿Qué especialidades y sedes participarían voluntariamente?
- ¿Quién retiraría una hora que se ocupó por otro canal?
- ¿Podrían entregar estadísticas agregadas sin datos personales?

## Estado técnico confirmado el 22/10/2026
Página existente en repositorio con filtros, registro y enlaces externos. Supabase: cero horas publicadas, cero instituciones registradas y cero membresías institucionales. Panel multi-secretaria y flujo completo de demostración real pendientes de implementación y pruebas. No afirmar que el piloto está desplegado ni que existen reservas verificadas.
