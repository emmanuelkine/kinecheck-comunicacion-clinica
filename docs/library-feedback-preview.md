# Valoración simple: pruebas y publicación

Este documento continúa el PR #231. La función pública se limita a:
- permitir elegir de 1 a 5 estrellas;
- registrar cada puntuación sin nombre, correo ni texto libre;
- mostrar el promedio y la distribución de puntuaciones reales aprobadas de los últimos 30 días.

Las puntuaciones nuevas se publican inmediatamente en el promedio. No se muestran
comentarios, no se solicitan sugerencias y no se inventan datos para rellenar el
promedio. Una cookie y el límite temporal por red reducen envíos duplicados o
automatizados. La puntuación se guarda sin identificadores.

## Costo y almacenamiento

Se usa Cloudflare Pages/Workers KV en el plan gratuito. No se requiere proveedor
de pago ni plan de pago. Las cuotas gratuitas de Cloudflare aplican.

Proyecto Pages existente: `kinecheck-comunicacion-clinica`.

1. Crear dos KV distintas: `kinecheck-library-feedback-preview` y
   `kinecheck-library-feedback-production`. Sus IDs deben ser distintos entre
   sí y de los namespaces de certificación, compradores o licencias.
2. En el entorno Preview, vincular la primera como `LIBRARY_FEEDBACK` y crear
   `FEEDBACK_RATE_LIMIT_SECRET` aleatorio de al menos 32 caracteres.
3. Desplegar de nuevo la rama después de configurar los bindings.
4. Tras aprobar las pruebas, vincular la segunda KV vacía y un secreto distinto
   en Production. Conservar todos los demás bindings y secretos.

La API falla de forma cerrada para envíos si falta la KV o el secreto. No
reutilizar la KV de certificación o compradores.

## Pruebas locales y de navegador

```sh
npm ci --ignore-scripts
npm run test:feedback
npx --no-install playwright install --with-deps chromium
FEEDBACK_QA_DIR=/tmp/feedback-qa npm run test:feedback:browser
```

Estas pruebas usan una KV en memoria y solo el servidor local. No son una prueba
real de Cloudflare. Cubren las cinco puntuaciones, escritura y lectura,
promedio/distribución, limitación de envíos, ausencia de texto libre, y
visualización adaptable a 320, 390, 768 y 1365 px.

## Gate obligatorio en Preview

- Confirmar y registrar SHA, URL del despliegue e IDs de las dos KV; verificar
  que el Preview usa solo la KV aislada.
- Sin enviar datos a producción, publicar cinco puntuaciones sintéticas con
  identificador de ejecución y contextos de navegador separados.
- Comprobar que quedan guardadas y que el promedio/distribución coinciden.
  Esperar la propagación eventual de KV antes de comparar lecturas.
- Probar puntuaciones fuera de rango, honeypot, duplicado y límite de envíos.
- Revisar visualmente la selección de estrellas y el promedio en un iPhone y un
  computador. El Playwright de escritorio emulando anchuras no sustituye la
  comprobación en dispositivo.
- Limpiar exclusivamente las claves de prueba registradas y las claves de
  limitación creadas por la ejecución; no vaciar el namespace completo.
- Revisar las valoraciones auténticas históricas y compararlas con la fuente
  antes/después. No borrar, reescribir ni copiar registros auténticos a Preview.
  Si hay que incorporarlas al nuevo namespace productivo, documentar el conteo y
  verificar que cada puntuación mantiene su valor y fecha; no migrar pendientes.
- Solo después de superar todas las pruebas, fusionar el SHA probado y verificar
  el despliegue productivo con consultas de lectura. No sembrar datos en producción.

La KV tiene consistencia eventual; el límite por red es de mejor esfuerzo, no un
bloqueo atómico contra envíos concurrentes.

## Cambios del PR

- La variable `page` se define antes del envío del formulario.
- El formulario solo contiene estrellas; el servidor guarda puntuación, ruta y
  fecha, sin datos de identidad ni comentarios.
- Las puntuaciones válidas nuevas se suman al promedio público inmediatamente.
- Se conservan las valoraciones históricas aprobadas y sus registros originales;
  las pendientes y las de más de 30 días no se suman al promedio.
