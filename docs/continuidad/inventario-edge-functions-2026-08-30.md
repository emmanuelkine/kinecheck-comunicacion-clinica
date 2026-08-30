# Inventario y regularización de Edge Functions — 30 de agosto de 2026

Proyecto observado en modo de solo lectura: `eqhcdclyeoapmqtlduwf`.

Producción informa 18 Edge Functions `ACTIVE`; ocho tienen fuente en `supabase/functions/` y diez no tienen fuente, referencia de consumidor ni historial Git local en este repositorio. No se descargó ni copió código desplegado, y no se leyeron valores de secretos.

La finalidad de este inventario es recuperar trazabilidad, no recrear comportamiento por inferencia. Los campos de uso y criticidad que no tienen fuente se basan únicamente en el slug, `verify_jwt` y metadatos de despliegue; deben confirmarse con el propietario y la fuente original.

## Funciones versionadas

| Función | Fuente local |
|---|---|
| `automation-status` | `supabase/functions/automation-status/` |
| `beta-apply` | `supabase/functions/beta-apply/` |
| `course-key` | `supabase/functions/course-key/` |
| `course-review` | `supabase/functions/course-review/` |
| `evidence-hotmart-webhook` | `supabase/functions/evidence-hotmart-webhook/` |
| `hotmart-webhook` | `supabase/functions/hotmart-webhook/` |
| `metric-event` | `supabase/functions/metric-event/` |
| `platform-context` | `supabase/functions/platform-context/` |

## Funciones activas sin fuente versionada

| Función | Versión observada | `verify_jwt` | Uso inferido; requiere confirmación | Criticidad provisional | Riesgo principal de recuperación |
|---|---:|:---:|---|---|---|
| `platform-login` | 1 | no | Entrada de autenticación de plataforma | Crítica | Pérdida de login o reconstrucción insegura de autenticación |
| `pain-hotmart-webhook` | 2 | no | Eventos comerciales y licencias del producto de dolor | Crítica | Acceso incorrecto, duplicados o revocaciones perdidas |
| `evidence-access` | 6 | sí | Resolución de acceso a Evidencia | Crítica | Denegación o concesión indebida de contenido licenciado |
| `dolor-lumbar-course-key` | 1 | sí | Resolución de clave/acceso de Dolor Lumbar | Crítica | Pérdida o bypass del control de acceso |
| `automation-control` | 1 | sí | Operaciones administrativas sobre automatizaciones | Alta | Acciones administrativas no recuperables o no autorizadas |
| `beta-password-once` | 6 | sí | Emisión o consumo de credencial beta de un solo uso | Alta | Exposición o reutilización de credenciales temporales |
| `student-semester-intake` | 1 | sí | Ingreso de datos del semestre de Estudiante | Alta | Pérdida de flujo y riesgo de privacidad/retención |
| `evidence-content` | 9 | no | Entrega de contenido de Evidencia | Alta | Exposición de contenido; `verify_jwt=false` exige comprobar autenticación interna |
| `pain-content` | 2 | no | Entrega de contenido del producto de dolor | Alta | Exposición de contenido; `verify_jwt=false` exige comprobar autenticación interna |
| `support-request` | 2 | no | Recepción de solicitudes de soporte | Media | Abuso, spam o exposición de datos de contacto |

`verify_jwt=false` no demuestra por sí solo una vulnerabilidad: webhooks y endpoints públicos pueden requerirlo. Sin fuente no se puede confirmar HOTTOK, firma, rate limit, autorización dentro del handler, minimización de datos, CORS ni redacción de logs; por eso estas funciones no deben reconstruirse o redesplegarse por semejanza con otros endpoints.

## Plan de regularización seguro

1. **Congelar sustituciones.** No sobrescribir, eliminar ni redesplegar estas diez funciones salvo una corrección P0/P1 con autorización y rollback preparado.
2. **Asignar propietario.** Registrar responsable funcional, consumidores conocidos, datos tratados, evento de entrada, dependencias y secretos solo por nombre.
3. **Localizar fuente autorizada.** Buscar en repositorios privados, proyectos locales del propietario, artifacts de CI y respaldos controlados. No copiar el cuerpo desde producción ni usar el editor desplegado como fuente.
4. **Probar procedencia.** Para cada candidato registrar repositorio, commit, fecha, autor y huella reproducible. Si no puede vincularse de forma verificable con la función activa, mantenerla como fuente no recuperada.
5. **Revisión de seguridad.** Antes de versionar comprobar autenticación interna, RLS, privilegios, idempotencia, rate limit, CORS, PII/logs, errores y manejo de secretos. Priorizar las cuatro funciones críticas y luego las que usan `verify_jwt=false`.
6. **Versionar sin desplegar.** Incorporar la fuente comprobada mediante PR pequeño, con `supabase/config.toml`, dependencias fijadas, inventario de secretos por nombre y pruebas. La aceptación del PR no autoriza despliegue.
7. **Validar sin recursos pagos.** Usar runtime local o un entorno existente expresamente autorizado. No crear branches/proyectos Supabase con costo.
8. **Comparar contrato.** Verificar rutas, métodos, autenticación, códigos de estado y efectos con datos ficticios. No invocar webhooks comerciales reales ni alterar licencias.
9. **Despliegue separado.** Solo con autorización explícita, fuente comprobada, backup, plan de rollback y smoke tests específicos. Conservar el `verify_jwt` observado hasta que una revisión funcional demuestre otro contrato.
10. **Fuente irrecuperable.** Si no aparece evidencia suficiente, mantener el gap abierto y diseñar un reemplazo desde especificación aprobada en una iniciativa separada; nunca reconstruirlo a partir del nombre o de respuestas de producción.

## Criterio de cierre de la brecha

La diferencia 18/8 se cierra únicamente cuando las diez funciones cuentan con fuente autorizada y trazable, configuración versionada, inventario de secretos por nombre, pruebas reproducibles y procedimiento de despliegue/rollback. Un listado de metadatos o el hecho de que la función responda en producción no equivale a un respaldo recuperable.
