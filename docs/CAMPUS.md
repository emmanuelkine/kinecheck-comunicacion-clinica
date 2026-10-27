# KineCheck Campus

Campus amplía el portal del PR #287 con seis rutas de Kinesiología, desde primer año hasta internado, seis casos ficticios de tres decisiones y enlaces a diez recursos/productos originales. Cada pregunta entrega retroalimentación durante la actividad. Los resultados son formativos y no acreditan competencias ni equivalencia curricular.

## Cuenta y acceso

Registro individual gratuito por correo y contraseña, confirmación de correo, recuperación, cambio de contraseña y cierre de sesión. Se reutiliza Supabase Auth; Campus usa cookies propias HttpOnly, Secure y SameSite=Strict bajo `/api/campus`, sin escribir tokens en localStorage ni modificar sesiones de otros productos. Los enlaces por correo se vinculan a una solicitud iniciada en el mismo navegador mediante un valor aleatorio en cookie HttpOnly, para evitar fijación de sesión. El navegador se comunica únicamente con su propio origen. Los mensajes de correo dependen del proveedor de Auth existente; abrir los enlaces en otro navegador no inicia sesión automáticamente, aunque tras confirmar el registro se puede ingresar por contraseña.

El estudiante completa un perfil y mantiene su historial por `auth.users.id`. Vincularse o desvincularse no cambia esa identidad ni borra el avance. La invitación es personal, corresponde a un correo verificado, se guarda mediante SHA-256, sirve una sola vez y vence en siete días. La invitación no se envía automáticamente: el administrador copia el enlace y lo entrega por un canal autorizado.

| Perfil | Permisos |
| --- | --- |
| Individual/estudiante | Recursos, casos, avance propio, exportación y eliminación de intentos; vinculación opcional |
| Docente | Actividades y métricas agregadas de sus instituciones activas; sin historial ni nómina individual |
| Administrador institucional | Lo anterior, invitaciones para estudiantes/docentes y revocación de esos accesos |
| Operador KineCheck | Habilitar espacios con nombre autorizado e invitar administradores; no es una opción de autorregistro |

Solo la cuenta propietaria ya existente y verificada (`emmanuelkine@gmail.com`) se incorpora a la lista privada de operadores. No se crea una cuenta ni se cambia ningún permiso global. Si esa cuenta no existiera, el arranque no asigna privilegios a nadie. Ningún rol proviene de `user_metadata` ni de controles de interfaz.

## Instituciones y privacidad

Los nueve objetos de datos `private.campus_*` tienen RLS forzada y ningún permiso de tabla para `anon` o `authenticated`. El único RPC expuesto es `public.campus_api`, SECURITY INVOKER, que llama un punto de entrada privado con privilegios limitados por la lógica de cada acción. La función privada necesita SECURITY DEFINER porque el cliente no tiene permisos directos de tabla. Verifica usuario, correo confirmado, bloqueo, sesión vigente, membresía activa y rol antes de ejecutar acciones. La revocación funciona sin esperar una actualización del JWT.

Los intentos personales no se atribuyen retroactivamente a una universidad. Solo los siguientes intentos, con institución seleccionada y consentimiento activo, participan en sus informes. Al retirar consentimiento o pertenencia se elimina su atribución institucional y se conserva el avance personal. Los informes abarcan una sola institución, sin filtros arbitrarios ni exportación de filas individuales; requieren cinco estudiantes autorizados y cinco participantes para mostrar resultados. Es una protección por umbral, no una garantía matemática de anonimato.

Las respuestas se corrigen en el servidor con la versión del banco de preguntas; el cliente no puede enviar un puntaje confiable. Hay bloqueo por cuenta y espera mínima entre intentos. No son evaluaciones de alta consecuencia ni se utilizan estos resultados para licencias o certificados.

Los administradores ven únicamente nombres elegidos y roles para gestionar integrantes. No se recaban datos de pacientes. Hay consentimiento explícito, exportación personal, borrado de intentos, retirada de métricas y desvinculación. La eliminación completa de la cuenta se atiende por soporte para evitar borrar accesos de otros productos.

## Integración y despliegue

Campus usa Pages Functions en `/api/campus/[[path]]` y archivos propios bajo `/campus/`. Las previsualizaciones del proyecto en `*.kinecheck-comunicacion-clinica.pages.dev` usan KineCheck Staging y muestran un aviso visible: sus cuentas y datos no se mezclan con producción. La navegación de portada, la biblioteca gratuita y la biblioteca profesional enlazan a Campus. Se mantienen sin cambios Academy, Exercise, Horas Disponibles, Hotmart, reglas de licencias, webhooks y configuración de Auth. Los recursos se enlazan, no se copian ni se desbloquean.

El catálogo público y la migración se generan desde `functions/_shared/campus-content.mjs` y `supabase/schema/campus.sql` con `node scripts/build-campus.mjs`. El catálogo no lleva claves de respuestas. No modificar el catálogo generado manualmente. La migración inicial fue nombrada con Supabase CLI. Aplicar primero en staging, validar y solo después aplicar en producción y fusionar el PR. La publicación usa el despliegue existente de Cloudflare Pages.

## Validación reproducible

- `npm run test:campus`: corrección, seguridad HTTP, cookies, migración PostgreSQL, roles, invitaciones, progreso, privacidad, revocación y sesiones.
- `npm test`: regresiones del repositorio completo, incluidos accesos comerciales existentes.
- `node tests/campus-browser.mjs`: Chromium y WebKit a 360, 390, 768 y 1280 píxeles; actividad completa, teclado, perfiles y axe WCAG A/AA. Los datos de los paneles son fixtures aislados de prueba, no datos operativos.
- `node scripts/test-campus-live.mjs /ruta/fixture.json`: cuentas temporales en staging, sesiones reales de GoTrue y RPCs reales. No envía correos. Eliminar los fixtures al terminar.
- `node scripts/audit-brand-integrity.mjs` y `git diff --check`.

Los resultados efectivamente ejecutados y sus límites deben registrarse en `docs/CAMPUS_VERIFICACION.md`. No considerar la mera existencia de una prueba como evidencia de que pasó.

## Alcance para 2027

La base permite varios espacios institucionales y mantiene cuentas individuales. No se anunciaron universidades, logotipos ni convenios. Esta primera biblioteca tiene seis casos: no se presenta como cobertura completa de una malla de cinco años. La adaptación curricular, acuerdos con cada institución, políticas de retención acordadas, SSO institucional, carga masiva, más casos, pruebas de carga con el volumen contratado y evaluación pedagógica del piloto deben resolverse para cada oferta de 2027. No se implementan pagos, nuevas licencias ni certificaciones en Campus.
