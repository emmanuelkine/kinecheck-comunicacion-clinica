# Correo automático de certificación

La página `certificacion/index.html` envía la solicitud a `functions/api/certificacion.js`. La función llama al binding `CERT_EMAIL_SERVICE`; el Worker `workers/certificacion-mailer` envía el mensaje mediante Cloudflare Email Service. El remitente está fijado en `certificacion@kinecheck.cl`. La respuesta al usuario solo confirma el envío cuando el Worker devuelve éxito.

## Preparación en Cloudflare

1. Comprobar el plan de Workers. El envío a direcciones arbitrarias mediante Cloudflare Email Service requiere **Workers Paid**. No activar un plan ni aceptar un cargo sin autorización del propietario.
2. Antes de modificar DNS, inventariar los MX y SPF del dominio raíz, todos los selectores DKIM usados y el TXT de `_dmarc.kinecheck.cl`. Comprobar si el dominio ya está incorporado a Email Sending. No activar Email Routing ni cambiar los MX del dominio raíz o la cuenta de correo personal.
3. En **Compute → Email Service → Email Sending**, incorporar `kinecheck.cl` solo para **envío**. Revisar los cambios propuestos antes de confirmar. Los registros de envío se sitúan en `cf-bounce.kinecheck.cl` (MX y SPF) y `cf-bounce._domainkey.kinecheck.cl` (DKIM). El TXT de `_dmarc.kinecheck.cl` puede ser compartido con otros proveedores: conservar el existente si ya es válido; si no existe, acordar una política inicial de supervisión. Si el asistente intenta modificar MX/SPF de la raíz, sobrescribir DMARC o eliminar registros existentes, detener la incorporación y resolver el conflicto antes de continuar.
4. Verificar en Email Sending que los registros de envío figuran como configurados. Comprobar por DNS el MX/SPF de `cf-bounce`, la clave DKIM exacta que proporcione Cloudflare y un único registro DMARC válido. No inventar ni reutilizar claves DKIM de otros proveedores.
5. Desplegar el Worker con `npx wrangler deploy --config workers/certificacion-mailer/wrangler.jsonc` desde la raíz del repositorio y la cuenta correcta de Cloudflare. Este Worker no publica una URL `workers.dev` ni define rutas públicas; solo debe recibir llamadas desde un Service binding.
6. En **Workers & Pages → kinecheck-comunicacion-clinica → Settings → Bindings**, añadir un **Service binding** con nombre de variable `CERT_EMAIL_SERVICE` y servicio `kinecheck-certificacion-mailer` para producción. Revisar los bindings existentes y volver a desplegar Pages para que surta efecto. Conservar `CERT_REQUESTS` si ya está presente.
7. Publicar el cambio del endpoint solo después de comprobar que el Worker y el binding están operativos. Evaluar una regla de limitación de solicitudes o Turnstile antes de abrir el envío a público general: el formulario es público y el campo trampa no impide las solicitudes automatizadas directas al API.

## Prueba de extremo a extremo

Usar una casilla de prueba controlada por el propietario. Completar el formulario real en `https://kinecheck.cl/certificacion/` con consentimiento, verificar la respuesta del endpoint y el identificador del envío en los registros de Email Sending; confirmar la llegada a la casilla (incluida la carpeta de correo no deseado). Revisar en los encabezados del mensaje `Authentication-Results` para SPF, DKIM y DMARC, y que `From` sea `KineCheck <certificacion@kinecheck.cl>`. Un resultado de `send()` acredita aceptación por el servicio, no recepción final: la bandeja y los encabezados son la comprobación final.

Probar además que sin binding o ante un rechazo del Worker el formulario muestre error y no afirme que se envió el correo. La información enviada no contiene horas, nombre de la OTEC, costos ni condiciones específicas no definidas.

Documentación oficial: [Email Sending y DNS](https://developers.cloudflare.com/email-service/configuration/domains/), [API de Workers](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), [bindings de Pages](https://developers.cloudflare.com/pages/functions/bindings/) y [planes de Email Service](https://developers.cloudflare.com/email-service/platform/pricing/).
