# Valoraciones: verificación y publicación

Este documento continúa el PR #231. No habilitar producción antes de superar
las pruebas reales de Preview. Las pruebas locales usan exclusivamente una KV
en memoria y autorización de propietario simulada; no equivalen a un E2E real
de Cloudflare/Supabase.

## Configuración aislada en Cloudflare

Proyecto existente: `kinecheck-comunicacion-clinica`.

1. Crear una KV exclusiva de Preview (para esta ejecución se usó
   `kinecheck-preview-library-feedback-pr231-20261015`). Confirmar que su ID es
   distinto de cualquier namespace de producción, certificación, compradores o
   licencias.
2. En Pages → Settings → Bindings, seleccionar **Preview** y vincular
   `CERT_REQUESTS` a esa KV aislada. El entorno **Production** debe permanecer
   sin cambios durante estas pruebas y nunca debe apuntar a la KV de Preview.
3. En las variables/secretos de **Preview**, guardar `FEEDBACK_RATE_LIMIT_SECRET`
   como secreto aleatorio de al menos 32 caracteres. No subir su valor al repo ni
   incluirlo en capturas o logs. Este secreto solo calcula una huella temporal
   para limitar envíos; no concede acceso a Cloudflare ni a Supabase.
4. Volver a desplegar la rama del PR. Una KV vinculada después del despliegue no
   se incorpora a las funciones hasta el siguiente despliegue.
5. Tras superar el gate de Preview, tratar cualquier configuración de Production
   como un cambio separado: usar almacenamiento propio, un secreto distinto y
   conservar todos los bindings y secretos preexistentes. Nunca copiar fixtures.

La API usa exclusivamente `CERT_REQUESTS`, que en Preview debe resolver al
namespace nuevo y aislado descrito arriba.
Si falta la KV o el secreto antispam, el envío falla con 503. La consulta pública
puede leer una KV vacía y devolver `average: null`, `count: 0`. No crear semillas.

Documentación oficial: <https://developers.cloudflare.com/pages/functions/bindings/>.

## Pruebas reproducibles locales

```sh
npm ci --ignore-scripts
npm run test:feedback
npx --no-install playwright install --with-deps chromium
FEEDBACK_QA_DIR=/tmp/feedback-qa npm run test:feedback:browser
```

La prueba de navegador solo escucha en loopback, bloquea peticiones externas,
simula la verificación de propietario y destruye todos los datos ficticios al
finalizar. Recorre las tres bibliotecas, selecciona 1–5 estrellas, envía, comprueba
la cookie en una segunda solicitud, revisa el estado pendiente, edita para
anonimizar, aprueba, rechaza y verifica promedio/distribución/comentarios. Revisa
anchos de 320, 390, 768 y 1365 píxeles y genera capturas de 320 y 1365 píxeles.

El workflow `Library feedback isolation and browser tests` repite esas pruebas
sin credenciales de producción. Las imágenes son pruebas sintéticas, no opiniones
reales ni material publicitario.

## Gate real de Preview

- Registrar SHA y URL del despliegue probado. Confirmar nuevamente los IDs KV
  distintos antes de realizar el primer envío.
- Comprobar GET público 200 con totales reales; GET admin sin token 403.
- Enviar cinco respuestas ficticias identificadas con un UUID de esta ejecución,
  usando cinco contextos de navegador limpios. Esperar al menos 1 segundo entre
  escrituras de la misma clave de rate limit, por el límite de Workers KV.
- Todas quedan pendientes y fuera de los agregados públicos. Nunca enviar pruebas
  a `kinecheck.cl` ni a la KV de producción.
- Iniciar sesión como propietario en el `/admin/` del mismo Preview y pestaña;
  comprobar carga en `/admin/feedback/`, redacción, confirmación de privacidad,
  aprobación y rechazo. Verificar también token inválido/no propietario.
- Consultar el resumen y las tres bibliotecas de nuevo; comprobar promedio,
  distribución y comentarios contra los registros aprobados de esta ejecución.
- Probar honeypot, duplicado, límite de red, formatos inválidos, más de 4096 bytes,
  inyección HTML, correo/teléfono/RUT y revelaciones personales/de salud.
- Moderación obligatoria: los filtros no identifican todas las formas de nombres,
  direcciones o información sensible. Revisar el texto completo antes de aprobar.
  Los rechazos descartan el texto. No alterar la puntuación al redactar.
- KV tiene consistencia eventual: esperar propagación entre consultas. No usar
  caches HTTP adicionales. La limitación de red es complementaria y de mejor
  esfuerzo, no un bloqueo distribuido atómico contra bots concurrentes.
- Limpiar únicamente las claves `feedback:*` cuyos UUID/textos correspondan a la
  ejecución y las claves `rate:*` creadas por ella. La KV Preview debe estar vacía
  y reservada para esta prueba para que la atribución sea inequívoca. Registrar
  las claves antes de borrar, no usar vaciado global. Cerrar contextos elimina
  cookies locales de prueba. Comprobar nuevamente que no queda ningún fixture.
- Solo con todos los puntos anteriores aprobados, fusionar el SHA probado,
  verificar despliegue de producción y hacer comprobaciones de lectura sin
  sembrar valoraciones ni testimonios ficticios.

## Correcciones añadidas al PR

- La variable usada en el JSON del formulario es ahora `page`, definida en el
  mismo ámbito. La prueba pulsa y envía realmente cada puntuación.
- La cookie ahora llega a `/api/library-feedback`, con `Secure`, `HttpOnly` y
  `SameSite=Strict`; la ruta anterior `/gratis/` no protegía la API.
- El CSP del panel permite consultar su API de mismo origen. La moderación usa
  CSS externo y un CSP que restringe scripts/conexiones al propio sitio.
- Se exige propietario antes de consultar pendientes o escribir decisiones.
  Una clave pública de Supabase o un JWT no propietario no autorizan moderación.
- Lectura de JSON acotada por bytes incluso sin `Content-Length`, tipos/rangos
  estrictos, origen exacto y honeypot. No se persisten campos de identidad.
- Límite de 5 envíos por hora/red con HMAC y TTL; no se guarda la IP ni se vincula
  su huella con la opinión. Cookie adicional: una respuesta por navegador/30 días.
- Aprobación con revisión de privacidad y edición para quitar datos; el texto se
  renderiza mediante `textContent`. No se asignan comentarios con `innerHTML`.
- Se eliminó el truncado silencioso a diez páginas KV. Agregados aprobados: últimos
  30 días; pendientes moderables: hasta 90 días. Moderar no reinicia la retención.
- Los registros históricos del formulario anterior sin `status` siguen contando como valoraciones reales; sus comentarios no se publican automáticamente.
- Logo y paleta originales conservados. No se cambian compras, cursos ni licencias.
