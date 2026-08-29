# TF-008 — Auditoría de señales existentes antes de instrumentar

## Alcance

Esta auditoría revisa señales que KineCheck ya genera o conserva actualmente y las compara con el embudo definido para TF-008. **No agrega eventos, no modifica Supabase y no cambia producción.**

## Hallazgo principal

KineCheck ya dispone de infraestructura de métricas propia conectada a una Edge Function de Supabase (`metric-event`). Por lo tanto, TF-008 no parte desde cero. Sin embargo, las señales actuales no cubren de forma inequívoca las siete etapas del embudo beta y no deben reinterpretarse como equivalentes cuando no lo son.

## Infraestructura observada

`metrics-v1.js` ya:

- genera un `sessionId` aleatorio por sesión del navegador;
- puede adjuntar el token de la sesión autenticada en `Authorization`;
- envía eventos a `functions/v1/metric-event`;
- limita `productSlug` a un conjunto cerrado de productos;
- registra `page_view`, `product_view`, `beta_view`, `support_view` y `platform_login_view`;
- registra interacciones `academy_open`, `course_open` y `checkout_start`;
- expone `window.KINECHECK_METRIC(...)` para señales específicas.

`platform/platform-metrics-v1.js` registra `platform_login_success` cuando la vista autenticada de la plataforma se vuelve visible.

`beta/beta.js` reutiliza `metrics-v1.js` y registra `beta_submit_success` tras una postulación beta exitosa. Ese evento es una **postulación**, no una invitación ni una activación.

`academy/index.html` carga `metrics-v1.js` dentro de Academy. `academy/academy-v39.js` ya gestiona sesión autenticada, creación/validación de cuenta, estado beta, licencias, historial local de accesos y progreso local por producto.

`auth-gate.js` ya valida una sesión y solicita el contenido de un curso mediante una función protegida; una respuesta satisfactoria implica que el usuario autenticado obtuvo acceso autorizado a ese curso.

## Cobertura frente al embudo TF-008

| Etapa TF-008 | Señal actual relacionada | Cobertura | Decisión |
| --- | --- | --- | --- |
| `tester_invited` | No se encontró un evento equivalente | No cubierta | Debe originarse en el proceso que asigna/envía la invitación beta; no usar `beta_submit_success` |
| `account_created` | Academy permite crear cuenta y Supabase conserva `user.created_at` | Parcial | Puede derivarse del sistema de autenticación o emitirse tras signup exitoso, pero debe evitar duplicados |
| `license_activated` | Academy consulta licencias y `auth-gate.js` concede acceso cuando la licencia es válida | Parcial | Requiere definir qué condición representa activación beta: asignación de licencia, primer reconocimiento o primer acceso autorizado |
| `academy_opened` | `academy_open` existe, pero actualmente se genera al hacer clic hacia Academy | Parcial | No equivale necesariamente a Academy cargada/autenticada; conviene registrar éxito de entrada autenticada |
| `product_opened` | `course_open` y `product_view` existen | Parcial/alta | Debe normalizarse una sola definición para productos y cursos y evitar contar sólo el clic si la apertura falla |
| `first_activity` | Academy conserva progreso e historial local y existen clics de apertura | No inequívoca | Debe definirse una interacción funcional mínima real por tipo de producto |
| `return_session` | Existe `sessionId` efímero y Academy conserva historial local | No cubierta de forma agregable | Requiere una regla temporal y una identidad pseudónima estable autorizada para reconocer una sesión posterior |

## Señales que NO deben reutilizarse como equivalentes

- `beta_submit_success` no significa `tester_invited`.
- `platform_login_view` no significa autenticación exitosa.
- `academy_open` actualmente puede representar intención/clic, no necesariamente acceso exitoso.
- `course_open` no debe considerarse automáticamente `first_activity` si sólo representa apertura.
- un `sessionId` almacenado en `sessionStorage` sirve para agrupar una sesión, pero por sí solo no permite identificar retorno entre sesiones.

## Método recomendado para TF-008

La opción técnicamente más conservadora es **reutilizar la infraestructura propia `metric-event` ya existente**, en lugar de incorporar un proveedor analítico externo. Esto reduce superficie tecnológica, pero cualquier ampliación de eventos o almacenamiento en Supabase requiere autorización específica conforme al issue #89.

El diseño propuesto sería:

1. Mantener eventos estrictamente enumerados y sin texto libre.
2. Resolver en servidor la asociación con un identificador pseudónimo cuando exista sesión autenticada; no enviar correo, nombre ni RUT dentro del payload analítico.
3. Mantener `sessionId` para agrupar acciones de una misma sesión.
4. Crear sólo las señales del embudo que no pueden derivarse con certeza de datos ya existentes.
5. Construir el reporte a partir de estados observados, sin atribuir causas a la ausencia de etapas posteriores.

## Decisiones que requieren autorización antes de escribir código

### 1. Fuente de `tester_invited`

Debe definirse dónde se registra actualmente una invitación/asignación beta. El formulario de postulación no sirve para esta etapa. Si la asignación es manual, puede requerir un registro administrativo explícito.

### 2. Definición de `license_activated`

Recomendación: contabilizarla cuando el backend reconoce por primera vez una licencia beta vigente para el tester, no cuando simplemente abre una pantalla.

### 3. Definición de `academy_opened`

Recomendación: emitirla sólo cuando Academy ha validado la sesión y muestra el dashboard autenticado.

### 4. Definición de `product_opened`

Recomendación: emitirla cuando el producto/curso se abre con acceso autorizado, no sólo al hacer clic en una tarjeta.

### 5. Definición de `first_activity`

Recomendación: una primera acción funcional significativa, definida por producto. No utilizar campos de texto, contenido clínico ni valores introducidos por el usuario.

### 6. Ventana de `return_session`

Propuesta inicial para aprobación: considerar retorno cuando existe una nueva sesión en una fecha posterior a la sesión del primer uso. Para una beta corta, una regla simple de nueva sesión en otro día calendario es más interpretable que una ventana arbitraria de minutos.

### 7. Identificador pseudónimo

Se necesita un identificador estable para unir etapas del mismo tester sin usar correo como atributo analítico. La forma exacta debe resolverse del lado servidor y documentarse antes de implementación.

### 8. Retención y acceso

Deben fijarse explícitamente antes de instrumentar. Recomendación de minimización: conservar sólo el tiempo necesario para análisis de la beta y restringir el reporte a datos agregados y al equipo autorizado.

## Riesgo de privacidad detectado para revisión posterior

El sistema actual de métricas envía `path` incluyendo `location.search`. Aunque Academy elimina parámetros de tracking después, el evento inicial se construye antes de esa limpieza. Antes de ampliar TF-008 conviene verificar que ninguna ruta de autenticación o acceso pueda exponer parámetros sensibles en la query. Esta auditoría no modifica ese comportamiento.

## Estado de TF-008 tras esta auditoría

- Esquema del embudo: documentado.
- Infraestructura existente: identificada.
- Señales reutilizables: identificadas con sus límites.
- Brechas por etapa: identificadas.
- Método recomendado: reutilizar `metric-event`, sujeto a autorización.
- Instrumentación: **no iniciada**.
- Supabase: **sin cambios**.

El siguiente paso es aprobar explícitamente el método de recolección y las definiciones operacionales anteriores. Sólo después corresponde implementar los eventos faltantes y el reporte beta.