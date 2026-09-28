# Envío de certificación con Resend Free y Cloudflare Pages

La función `functions/api/certificacion.js` usa el secreto cifrado `RESEND_API_KEY` de Cloudflare Pages para enviar desde `KineCheck <certificacion@kinecheck.cl>`. Este camino no requiere Workers Paid ni un Worker adicional. Si también existe `CERT_EMAIL_SERVICE`, Resend tiene prioridad.

## Configuración aplicada el 28/09/2026

- Resend Free habilitado únicamente para envío; Receiving permanece desactivado.
- Dominio raíz `kinecheck.cl` verificado en Resend, región São Paulo.
- Registros creados por Domain Connect, todos en modo DNS only y TTL 1 hora:
  - CNAME `send` → `send.forge.rmta.net`
  - CNAME `rsend` → `rsend.forge.rmta.net`
  - TXT `resend._domainkey` con la clave DKIM única proporcionada por Resend
- DMARC publicado como un único TXT `_dmarc` con `v=DMARC1; p=none;`.
- Clave Resend con permiso **Sending access** almacenada en producción como secreto `RESEND_API_KEY`.
- PR #151 fusionada en `main`.

No se eliminaron ni modificaron registros DNS preexistentes. No se agregaron MX ni se alteró el correo personal, Academy, autenticación, Hotmart, precios, cursos u otras páginas.

## Verificación

`node --test tests/certificacion-mailer.test.mjs`: seis pruebas correctas con proveedor simulado.

La prueba real debe recorrer `https://kinecheck.cl/certificacion/` → `/api/certificacion` → Resend → recepción. Verificar en Resend el identificador y estado del envío; en la casilla receptora revisar el remitente exacto y los resultados SPF, DKIM y DMARC. El contenido no debe publicar horas, nombre de la OTEC, costos ni condiciones aún no definidos.

Antes de difusión amplia, añadir protección frente a solicitudes automatizadas directas al endpoint, por ejemplo limitación de tasa o Turnstile. El honeypot del formulario no impide por sí solo consumir la cuota diaria.

Referencias: [precios Resend](https://resend.com/pricing), [guía Cloudflare DNS de Resend](https://resend.com/docs/knowledge-base/cloudflare), [API de envío](https://resend.com/docs/api-reference/emails/send-email), [secretos de Pages](https://developers.cloudflare.com/pages/functions/bindings/).
