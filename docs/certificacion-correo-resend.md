# Envío de certificación con Resend Free y Cloudflare Pages

La función actual `functions/api/certificacion.js` puede usar `RESEND_API_KEY` como secreto de Cloudflare Pages para enviar desde `KineCheck <certificacion@kinecheck.cl>`. Este camino no requiere Workers Paid ni un Worker adicional. Si están configurados tanto `RESEND_API_KEY` como `CERT_EMAIL_SERVICE`, la función usa Resend. La PR debe permanecer sin fusionar hasta que el dominio y el secreto estén listos.

## Pasos que debe completar el propietario

1. Crear su propia cuenta en Resend Free, aceptar personalmente los términos y verificar su correo de acceso. Resend Free permite actualmente 100 mensajes diarios y 3.000 mensuales; revisar el plan vigente antes de activarlo. No compartir claves por chat ni agregarlas al repositorio.
2. En Resend → Domains → Add Domain, registrar `kinecheck.cl` **solo para envío**. No habilitar Receiving. Para mantener la dirección exacta `certificacion@kinecheck.cl`, verificar el dominio raíz como remitente. Elegir Manual setup y leer los valores completos del panel antes de crear registros; la configuración puede variar por región y por cuenta.
3. En Cloudflare → `kinecheck.cl` → DNS → Records, inventariar los registros existentes y agregar **solo** los que exige el panel de Resend para envío. Para esta cuenta y región São Paulo, las capturas del 28/09/2026 muestran TXT/DKIM en `resend._domainkey` y dos CNAME en `rsend` y `send` bajo la sección SPF. El objetivo de `rsend` y el valor DKIM aparecen cortados en las capturas: copiarlos completos desde Resend; no inferirlos ni usar ejemplos como valores reales. Los CNAME de correo deben estar en modo DNS only (sin proxy). No crear registros MX o TXT/SPF adicionales por una guía genérica si el panel actual no los pide. Mantener intactos los MX/SPF de la raíz y cualquier otro DKIM.
4. Revisar `_dmarc.kinecheck.cl`. Si no existe, crear **un único** TXT inicial `v=DMARC1; p=none;`, sujeto a las comprobaciones del panel y de DNS; si existe, conservarlo y verificar su alineación. No publicar dos políticas DMARC ni sustituir una política existente sin revisión.
5. Pulsar Verify DNS Records en Resend y esperar a que el dominio figure como Verified. Crear una API key con **Sending access**, restringida al dominio `kinecheck.cl` si la interfaz lo permite. Copiarla solo en la interfaz de Cloudflare: Workers & Pages → proyecto Pages `kinecheck-comunicacion-clinica` → Settings → Variables and Secrets → Add → nombre `RESEND_API_KEY` → Encrypt → Save, en **Production**. La clave no debe aparecer en código, captura ni conversación.
6. Fusionar la PR y permitir que Pages publique el nuevo commit; el secreto debe existir antes del despliegue que lo utiliza. Verificar que no se hayan modificado Academy, autenticación, Hotmart, precios, cursos ni páginas.

## Prueba

Desde `https://kinecheck.cl/certificacion/`, enviar una solicitud de prueba a una casilla controlada por el propietario. Verificar: el formulario anuncia el envío; `/api/certificacion` devuelve éxito; Resend muestra el ID y estado del mensaje; la casilla lo recibe. Abrir los encabezados del mensaje y revisar SPF, DKIM y DMARC, el `From` exacto y la ausencia de horas, OTEC, costos o condiciones no definidos. Si Resend rechaza el envío, la función devuelve error y no afirma que el mensaje llegó.

Antes de difusión amplia, añadir protección frente a solicitudes automatizadas directas al endpoint (por ejemplo, una limitación de tasa o Turnstile). El honeypot del formulario no impide por sí solo consumir la cuota diaria.

Referencias: [precios Resend](https://resend.com/pricing), [guía Cloudflare DNS de Resend](https://resend.com/docs/knowledge-base/cloudflare), [API de envío](https://resend.com/docs/api-reference/emails/send-email), [secretos de Pages](https://developers.cloudflare.com/pages/functions/bindings/).
