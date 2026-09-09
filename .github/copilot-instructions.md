# KineCheck — instrucciones para GitHub Copilot

## Contexto del proyecto
KineCheck es un ecosistema web de educación y acompañamiento musculoesquelético con tres productos separados:

- `kinecheck-clinico`: profesionales.
- `kinecheck-estudiante`: estudiantes.
- `kinecheck-recupera`: personas en recuperación.

El repositorio se publica mediante Cloudflare Pages y utiliza Supabase/servicios de backend para autenticación, licencias y acceso.

## Reglas obligatorias de seguridad

1. Nunca incluir secretos, claves privadas, service-role keys, tokens, contraseñas, refresh tokens ni credenciales en HTML, JavaScript del navegador, commits, logs o mensajes de error.
2. No confiar en datos enviados por el cliente para autorizar acceso. La autorización debe validarse en el servidor.
3. La vigencia de acceso depende de usuario autenticado, `course_slug` correcto y `active = true`. `warranty_date` no debe controlar el acceso.
4. Mantener los bloqueos por cancelación, contracargo o reembolso.
5. No modificar usuarios, compras, productos, propietario, tester, activaciones manuales, webhooks ni secretos salvo que la tarea lo solicite explícitamente.
6. Mantener separados los tres productos. No conceder acceso a un producto usando la licencia de otro.
7. Para SSO, conservar el flujo seguro existente: `POST /api/license/sso`, redirección HTTP 303 y cookie segura, HttpOnly y con SameSite apropiado.
8. No almacenar `refresh_token`, correo personal ni información sensible en `localStorage`, `sessionStorage`, `window.name` o parámetros URL.
9. Limpiar datos temporales de autenticación después de usarlos.
10. No debilitar CSP, CORS, encabezados de seguridad ni validaciones para “hacer funcionar” una prueba.

## Forma de trabajar

- Explicar primero qué archivos se modificarán y por qué.
- Hacer cambios mínimos y focalizados.
- Trabajar en una rama; no modificar `main` directamente.
- No publicar ni desplegar automáticamente.
- No borrar versiones o respaldos existentes.
- Antes de finalizar, revisar errores, rutas afectadas y posibles regresiones.
- Cuando la tarea involucre autenticación, licencias o pagos, proponer pruebas positivas y negativas.
- No inventar nombres de tablas, columnas, variables de entorno o endpoints. Buscar su definición real en el repositorio.
- Si falta información crítica, dejar un marcador explícito y no reemplazarlo con una suposición insegura.

## Estándares de código

- JavaScript claro, legible y compatible con el entorno actual del proyecto.
- Validar entradas y manejar errores sin exponer información sensible.
- Evitar duplicación y funciones excesivamente largas.
- Mantener la interfaz en español claro, accesible y comprensible para personas no técnicas.
- No presentar contenido como diagnóstico médico ni sustituir atención profesional.

## Validación mínima antes de proponer un cambio

- Verificar que Clínico, Estudiante y Recupera continúen disponibles.
- Verificar que una licencia inactiva, reembolsada o de otro producto no autorice acceso.
- Verificar que el propietario y los accesos autorizados existentes sigan funcionando.
- Verificar navegación móvil y de escritorio.
- Indicar con precisión qué se probó y qué no se pudo probar.
