# KineCheck Campus

Campus amplía el portal del PR #287 con seis rutas de Kinesiología, desde primer año hasta internado, seis casos ficticios de tres decisiones y enlaces a diez recursos/productos originales. Cada pregunta entrega retroalimentación durante la actividad. Los resultados son formativos y no acreditan competencias ni equivalencia curricular.

## Cuenta y acceso

Registro individual gratuito por correo y contraseña, recuperación, cambio de contraseña y cierre de sesión. Se reutiliza Supabase Auth y su política existente de confirmación: producción tiene autoconfirmación activa, por lo que el registro actual habilita la cuenta inmediatamente, sin acreditar posesión del buzón. Campus admite también la confirmación por enlace/código si el proveedor la exige. No se modifica esa política compartida. Campus usa cookies propias HttpOnly, Secure y SameSite=Strict bajo `/api/campus`, sin escribir tokens en localStorage ni modificar sesiones de otros productos. Los enlaces por correo se vinculan a una solicitud iniciada en el mismo navegador mediante un valor aleatorio en cookie HttpOnly, para evitar fijación de sesión. El navegador se comunica únicamente con su propio origen. Los mensajes de correo dependen del proveedor de Auth existente; abrir los enlaces en otro navegador no inicia sesión automáticamente.

El estudiante completa un perfil y mantiene su historial por `auth.users.id`. Vincularse o desvincularse no cambia esa identidad ni borra el avance. La invitación es personal, se vincula al correo de la cuenta y al estado confirmado en Auth, se guarda mediante SHA-256, sirve una sola vez y vence en siete días. Debido a la autoconfirmación existente, el administrador debe verificar a la persona y entregar el enlace secreto por un canal autorizado; registrar un correo por sí solo no prueba su titularidad. La invitación no se envía automáticamente.

| Perfil | Permisos |
| --- | --- |
| Individual/estudiante | Recursos, casos, avance propio, exportación y eliminación de intentos; vinculación opcional |
| Docente | Actividades y métricas agregadas de sus instituciones activas; sin historial ni nómina individual |
| Administrador institucional | Lo anterior, invitaciones para estudiantes/docentes y revocación de esos accesos |
| Operador KineCheck | Habilitar espacios con nombre autorizado e invitar administradores; no es una opción de autorregistro |

Solo la cuenta propietaria ya existente y verificada (`emmanuelkine@gmail.com`) se incorpora a la lista privada de operadores. No se crea una cuenta ni se cambia ningún permiso global. Si esa cuenta no existiera, el arranque no asigna privilegios a nadie. Ningún rol proviene de `user_metadata` ni de controles de interfaz.

## Instituciones y privacidad

Los nueve objetos de datos `private.campus_*` tienen RLS forzada y ningún permiso de tabla para `anon` o `authenticated`. Las funciones de acceso están en el esquema separado `campus_internal`; se concede uso de ese esquema y ejecución del punto de entrada, sin conceder uso del esquema privado compartido. El único RPC expuesto es `public.campus_api`, SECURITY INVOKER, que llama un punto de entrada privado con privilegios limitados por la lógica de cada acción. La función privada necesita SECURITY DEFINER porque el cliente no tiene permisos directos de tabla. Verifica usuario, correo confirmado, bloqueo, sesión vigente, membresía activa y rol antes de ejecutar acciones. La revocación funciona sin esperar una actualización del JWT.

Los intentos personales no se atribuyen retroactivamente a una universidad. Solo los siguientes intentos, con institución seleccionada y consentimiento activo, participan en sus informes. Al retirar consentimiento o pertenencia se elimina su atribución institucional y se conserva el avance personal. Los informes abarcan una sola institución, sin filtros arbitrarios ni exportación de filas individuales; requieren cinco estudiantes autorizados y cinco participantes para mostrar resultados. Es una protección por umbral, no una garantía matemática de anonimato.

Las respuestas se corrigen en el servidor con la versión del banco de preguntas; el cliente no puede enviar un puntaje confiable. Hay bloqueo por cuenta y espera mínima entre intentos. No son evaluaciones de alta consecuencia ni se utilizan estos resultados para licencias o certificados.

Los administradores ven únicamente nombres elegidos y roles para gestionar integrantes. No se recaban datos de pacientes. Hay consentimiento explícito, exportación personal, borrado de intentos, retirada de métricas y desvinculación. La eliminación completa de la cuenta se atiende por soporte para evitar borrar accesos de otros productos.

## Integración y despliegue

Campus usa Pages Functions en `/api/campus/[[path]]` y archivos propios bajo `/campus/`. Las previsualizaciones del proyecto en `*.kinecheck-comunicacion-clinica.pages.dev` usan KineCheck Staging y muestran un aviso visible: sus cuentas y datos no se mezclan con producción. La navegación de portada, la biblioteca gratuita y la biblioteca profesional enlazan a Campus. Academy, Horas Disponibles, Hotmart, licencias y webhooks no se modifican. El ajuste autorizado de Exercise solo permite envolver el texto del aviso en móvil y actualiza la versión de su caché PWA. Campus requiere añadir su retorno de recuperación a las URL permitidas de Auth, conservando el Site URL y las rutas de los demás productos. Los recursos se enlazan, no se copian ni se desbloquean.

El catálogo público y la migración se generan desde `functions/_shared/campus-content.mjs` y `supabase/schema/campus.sql` con `node scripts/build-campus.mjs`. El catálogo no lleva claves de respuestas. No modificar el catálogo generado manualmente. La migración inicial fue nombrada con Supabase CLI. Aplicar primero en staging, validar y solo después aplicar en producción y fusionar el PR. La publicación usa el despliegue existente de Cloudflare Pages.

## Validación reproducible

- `npm run test:campus`: corrección, seguridad HTTP, cookies, migración PostgreSQL, roles, invitaciones, progreso, privacidad, revocación y sesiones.
- `npm test`: regresiones del repositorio completo, incluidos accesos comerciales existentes.
- `node tests/campus-browser.mjs`: Chromium y WebKit a 360, 390, 768 y 1280 píxeles; actividad completa, teclado, perfiles y axe WCAG A/AA. Los datos de los paneles son fixtures aislados de prueba, no datos operativos.
- `KINECHECK_PUBLIC_ORIGIN=https://kinecheck.cl node tests/campus-public-live.mjs`: exige coincidencia SHA-256 de cinco archivos del despliegue y prueba la actividad real como visitante, accesibilidad, diseño y rechazos de acceso en ocho combinaciones de motor/tamaño, sin respuestas simuladas. El workflow usa la previsualización en la rama y el dominio público después de integrar en `main`.
- `KINECHECK_PUBLIC_ORIGIN=https://kinecheck.cl node tests/exercise-app-browser.mjs`: repite las cinco regresiones de Exercise contra el sitio HTTPS real, incluyendo PWA y bloqueo Pro.
- `node scripts/test-campus-live.mjs /ruta/fixture.json`: cuentas temporales en staging, sesiones reales de GoTrue y RPCs reales. No envía correos. Eliminar los fixtures al terminar.
- `node scripts/audit-brand-integrity.mjs` y `git diff --check`.

Los resultados efectivamente ejecutados y sus límites deben registrarse en `docs/CAMPUS_VERIFICACION.md`. No considerar la mera existencia de una prueba como evidencia de que pasó.

## Alcance para 2027

La base permite varios espacios institucionales y mantiene cuentas individuales. No se anunciaron universidades, logotipos ni convenios. Esta primera biblioteca tiene seis casos: no se presenta como cobertura completa de una malla de cinco años. La adaptación curricular, acuerdos con cada institución, políticas de retención acordadas, SSO institucional, carga masiva, más casos, pruebas de carga con el volumen contratado y evaluación pedagógica del piloto deben resolverse para cada oferta de 2027. No se implementan pagos, nuevas licencias ni certificaciones en Campus.
