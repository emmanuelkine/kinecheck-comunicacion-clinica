# Recuperación de servicios administrados de KineCheck

Última verificación de inventario: 30 de agosto de 2026

Este documento complementa el respaldo PostgreSQL del esquema `public`. Registra procedimientos y evidencia esperada; no contiene valores de secretos, tokens, contraseñas, datos de usuarios ni cadenas de conexión.

## Reglas de seguridad

- Trabajar primero en un entorno temporal autorizado. No crear ramas de base de datos, proyectos u otros recursos pagos sin autorización explícita.
- Usar datos ficticios y el mínimo privilegio necesario.
- Registrar nombres de secretos, versiones, huellas y conteos; nunca sus valores.
- No restaurar producción sin respaldo previo, ventana aprobada y plan de reversión.
- El dump de `public` no respalda binarios de Storage ni usuarios/configuración de Auth.

## Storage

Inventario leído de producción:

- bucket privado `course-assets`;
- 3 objetos registrados al momento de la revisión;
- acceso público deshabilitado.

Checklist de respaldo:

1. Exportar el inventario con bucket, ruta, tamaño, tipo MIME, fecha y ETag o huella cuando esté disponible, sin publicar enlaces firmados.
2. Copiar los objetos a almacenamiento cifrado, privado y separado de la cuenta productiva.
3. Generar un manifiesto firmado o con SHA-256 por objeto y un conteo total.
4. Confirmar que ningún objeto privado se vuelva público durante la copia.
5. Conservar políticas, límites de tamaño y tipos MIME permitidos como configuración separada.

Checklist de restauración:

1. Crear un bucket privado temporal con la configuración documentada.
2. Restaurar los objetos y comparar conteo, tamaño y huellas con el manifiesto.
3. Probar acceso autorizado y denegación anónima con datos ficticios.
4. Borrar el entorno temporal al terminar.

Estado: inventario confirmado; copia binaria externa y restauración de integridad pendientes.

## Auth

No exportar contraseñas, tokens activos, sesiones ni metadatos innecesarios. La migración de usuarios de Auth es un procedimiento distinto del dump del esquema `public` y debe seguir la guía vigente de Supabase, considerando proveedores y claves JWT.

Inventario manual requerido, sin valores sensibles:

- proveedores habilitados y su modo de configuración;
- Site URL y lista de Redirect URLs;
- plantillas de correo y configuración SMTP;
- política de contraseña, MFA, CAPTCHA y protección contra contraseñas filtradas;
- dominios permitidos, tiempos de sesión y controles de registro;
- hooks o integraciones de Auth;
- conteos agregados mínimos para reconciliación, sin exportar credenciales.

Prueba de recuperación:

1. Reconstruir la configuración en un entorno temporal autorizado.
2. Usar una cuenta ficticia nueva; no reutilizar contraseñas reales.
3. Verificar alta, confirmación, login, renovación, logout y redirects.
4. Confirmar que roles/licencias se resuelven desde las fuentes autorizadas y no desde datos inventados.

Estado: inventario y simulacro manual pendientes. El advisor de seguridad mantiene la advertencia `Leaked Password Protection Disabled`; su activación requiere revisión y cambio explícito en Dashboard.

## Edge Functions

Producción informa 18 funciones activas. Ocho tienen fuente versionada en este repositorio:

- `automation-status`
- `beta-apply`
- `course-key`
- `course-review`
- `evidence-hotmart-webhook`
- `hotmart-webhook`
- `metric-event`
- `platform-context`

Diez funciones activas no tienen directorio fuente local verificado:

- `automation-control`
- `beta-password-once`
- `dolor-lumbar-course-key`
- `evidence-access`
- `evidence-content`
- `pain-content`
- `pain-hotmart-webhook`
- `platform-login`
- `student-semester-intake`
- `support-request`

Esta diferencia es una brecha de recuperación. Antes de declarar restaurabilidad integral se debe recuperar la fuente autorizada, revisarla para evitar secretos embebidos, versionarla y registrar la versión desplegada y su huella.

El inventario de metadatos, clasificación provisional por uso/criticidad y plan de regularización sin copiar código productivo está en [Inventario y regularización de Edge Functions — 30 de agosto de 2026](./inventario-edge-functions-2026-08-30.md).

Checklist:

1. Comparar inventario de producción con `supabase/functions/`.
2. Respaldar código fuente, configuración de verificación JWT y versión de runtime.
3. Mantener los nombres de secretos requeridos en el inventario, nunca sus valores.
4. Desplegar en entorno temporal y ejecutar pruebas de autorización, errores e idempotencia.
5. Verificar que logs y respuestas no expongan PII, tokens ni cadenas de conexión.

Los nombres observados en las ocho funciones versionadas son `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `HOTMART_HOTTOK`, `EVIDENCE_HOTMART_HOTTOK` y `EVIDENCE_HOTMART_PRODUCT_ID`. La lista completa de producción debe confirmarse desde el panel autorizado.

## Secretos y configuración

Mantener un inventario fuera del repositorio que contenga únicamente nombres de secretos, propietario, servicio consumidor, fecha de última rotación y procedimiento de recuperación. Los valores deben residir en un gestor seguro con acceso de emergencia auditado.

Para GitHub Actions, el workflow v2 requiere los nombres de secretos `SUPABASE_DB_URL` y `BACKUP_ENCRYPTION_PASSPHRASE`. Ambos estaban ausentes al 30 de agosto de 2026. No registrar sus valores en logs, artifacts, issues ni documentación.

## DNS y Cloudflare

Checklist de evidencia, sin realizar cambios:

1. Exportar o capturar el inventario de zonas, registros DNS, proxied/DNS-only, TTL y destino esperado.
2. Registrar reglas de redirects, cache, WAF, certificados, Pages/Workers y dominio personalizado.
3. Documentar registrador, contactos autorizados y procedimiento de acceso de emergencia.
4. Comparar el dominio restaurado con una línea base aprobada antes de cambiar nameservers o registros.
5. Verificar TLS, rutas públicas, SSO y ausencia de exposición del origen.

Estado: procedimiento documentado; exportación y simulacro pendientes. Este trabajo no autoriza cambios de DNS ni Cloudflare.

## Criterio de evidencia

Cada simulacro debe registrar fecha, responsable, alcance, commit, versiones de servicios, manifiestos, conteos, huellas, resultados y limpieza final. El resultado válido es reproducible, no expone secretos y no depende de recursos productivos modificados durante la prueba.
