# KineCheck Campus — informe final de publicación y pruebas

Cierre: 27 de octubre de 2026, America/Santiago. **Publicado y verificado en https://kinecheck.cl/campus/**. La comprobación HTTPS final terminó el 28 de octubre a las 00:43:51 UTC (27 de octubre, 21:43:51 en Chile).

El [PR #287](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/pull/287) se integró en `e8cca4a8905f6e09dac70337f64da77f2fabfbe2`. El ajuste de integridad del [PR #288](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/pull/288) se integró en **`9d4d98a951391d2820a18fd2d5d80d5b10b763cb`**, revisión final comprobada en producción. Sus 20 controles ejecutados terminaron satisfactoriamente. Cloudflare Pages informó despliegue correcto y el dominio público sirvió los cinco archivos esperados, con coincidencia SHA-256 exacta.

## Ingreso y operación

| Perfil | Enlace | Habilitación |
| --- | --- | --- |
| Estudiante / cuenta individual | https://kinecheck.cl/campus/#cuenta | Registro gratuito o cuenta existente de KineCheck; perfil y avance propios |
| Docente | https://kinecheck.cl/campus/#institucion | Ingresar con la misma cuenta y aceptar una invitación docente de una institución habilitada |
| Administrador institucional | https://kinecheck.cl/campus/#institucion | Invitación personal de administrador emitida por el operador KineCheck |

Los tres perfiles utilizan el mismo sistema de ingreso. El servidor determina sus permisos a partir de la membresía vigente. La cuenta existente `emmanuelkine@gmail.com` conserva el permiso privado de operador para habilitar espacios con nombres autorizados e invitar administradores. No se creó ninguna universidad, convenio ni logotipo institucional.

Campus ofrece seis rutas, de primer año a internado, seis casos ficticios con tres decisiones y retroalimentación durante la actividad, diez enlaces a recursos/productos originales, progreso individual, actividades docentes e informes institucionales agregados. Los recursos gratuitos y de pago mantienen sus condiciones originales. El avance guardado antes de una vinculación se conserva al aceptar una invitación y al revocarse la membresía.

## Pruebas ejecutadas

| Control | Resultado |
| --- | --- |
| Suite Node del repositorio | 166 pruebas aprobadas |
| Campus: generación, HTTP y PostgreSQL | 15 pruebas/subpruebas aprobadas; incluye roles, separación institucional, puntaje del servidor, invitaciones, privacidad y revocación |
| Campus: UI institucional | Ocho combinaciones Chromium/WebKit a 360, 390, 768 y 1280 px; sin desbordamiento; cero infracciones axe WCAG A/AA detectadas en inicio, caso y paneles |
| Campus: HTTPS público real | Ocho combinaciones Chromium/WebKit a los mismos anchos; cinco archivos exactos; caso completo con 100% y sin guardar como visitante; acceso anónimo 401 y origen ajeno 403; cero infracciones axe detectadas en inicio y caso |
| Autenticación y permisos reales | Ocho escenarios aprobados en staging, previsualización y producción; en producción también mediante el BFF de https://kinecheck.cl |
| Registro gratuito público | Privacidad obligatoria, alta individual sin institución, perfil, intento guardado con 100%, exportación de un intento, borrado propio y cierre de sesión; un usuario individual no puede crear instituciones (403) |
| Recuperación pública por correo | Correo recibido en alias temporal del propietario; retorno 303 a Campus con flujo coincidente; flujo ajeno rechazado (403), callback válido (200), contexto autenticado (200), cookies HttpOnly |
| Recuperación y contraseña | Renovación de sesión, cambio de contraseña, rechazo de la clave anterior (400), ingreso con la nueva (200), contexto y cierre de sesión aprobados; solo cuenta temporal |
| Exercise: lógica | Nueve pruebas aprobadas; cálculos, evidencia, condiciones, PWA y permisos |
| Exercise: navegador local y HTTPS público | Cinco combinaciones aprobadas: escritorio Chromium/WebKit, iPhone 13 Chromium/WebKit y Pixel 7 Chromium; PWA activa y acotada, diez condiciones, ocho bloqueos Pro y ausencia de desbordamiento tras consultar evidencia |
| Academy y regresión general | 58 pruebas Playwright y ocho scripts adicionales aprobados; contratos de UI, roles, privacidad, biblioteca y preparación pública |
| Otros servicios | Controles de Hotmart, comercio y Horas aprobados en el despliegue inicial; regresiones pertinentes repetidas con el ajuste de cabecera |

Los ocho escenarios autenticados reales comprobaron: tres sesiones/perfiles; corrección que ignora puntaje e identidad suministrados por el cliente; invitación vinculada a correo y de un uso; conservación del progreso; denegaciones por rol y otra institución; actividad docente y umbral de privacidad; renovación/exportación; revocación inmediata y rechazo de un JWT anterior tras cerrar sesión.

Las pruebas móviles utilizan emulación de dispositivos/viewports en Chromium y WebKit, sin comprobación en hardware físico. Las auditorías automáticas de accesibilidad no sustituyen una evaluación manual completa con tecnologías de asistencia. Los paneles de las pruebas visuales locales usan fixtures aislados; las comprobaciones HTTPS y de permisos descritas usan servicios reales, sin interceptar respuestas. Los fixtures no se publican como datos operativos.

## Evidencia reproducible

- [Ejecución final de Campus, seguridad, UI y HTTPS público](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40610451632).
- [Capturas, axe, hashes y resultados HTTPS de Exercise](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40610451632/artifacts/12782347882).
- [Capturas de paneles institucionales de prueba](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40610451632/artifacts/12782288100).
- [Regresión general y Academy tras el ajuste final](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40610451477).
- [Regresión Exercise tras el ajuste final](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40610451663).
- [Despliegue Cloudflare final](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/runs/122560518451).
- [Resultados públicos permanentes: navegadores y hashes](audits/campus-20261027/production-public-browser.json).
- [Resultados de API, registro, recuperación y limpieza, sin credenciales](audits/campus-20261027/production-api-results.json).

Los artefactos de Actions se conservan 30 días. Los JSON de este directorio permanecen en el repositorio y no incluyen contraseñas, cookies, tokens ni identificadores de las cuentas temporales. Para repetir las comprobaciones públicas: `KINECHECK_PUBLIC_ORIGIN=https://kinecheck.cl node tests/campus-public-live.mjs` y `KINECHECK_PUBLIC_ORIGIN=https://kinecheck.cl node tests/exercise-app-browser.mjs`. La prueba de permisos reproducible de staging sigue en `scripts/test-campus-live.mjs`, con su restricción a cuentas y entorno de prueba intacta.

## Seguridad, datos y limpieza

Las dos migraciones probadas en staging se aplicaron en producción con estos registros:

| Archivo versionado | Registro de producción |
| --- | --- |
| `20261027185042_campus_institutional_platform.sql` | `20261027213229`, `campus_institutional_platform` |
| `20261027194409_campus_isolated_function_namespace.sql` | `20261027213233`, `campus_isolated_function_namespace` |

La consulta final comprobó nueve tablas con RLS forzada, ausencia de permisos directos SELECT/INSERT/UPDATE/DELETE para anon/authenticated, ausencia de USAGE sobre el esquema compartido `private` y ausencia de EXECUTE anónimo del RPC. La función pública es SECURITY INVOKER; el despacho privilegiado está aislado en `campus_internal` y valida usuario, sesión vigente, rol e institución.

Las cookies de Campus son HttpOnly, Secure y SameSite=Strict, limitadas a `/api/campus`. Los tokens no se guardan en localStorage. Las métricas requieren consentimiento y el umbral mínimo de cinco estudiantes/participantes. La revocación y la retirada de consentimiento conservan el historial personal y eliminan su participación institucional correspondiente.

Se eliminaron las **cinco cuentas y dos espacios institucionales temporales** de producción, sus sesiones y datos Campus. La consulta posterior devolvió cero cuentas QA, cero instituciones QA y un operador propietario conservado. Staging también quedó sin sus cuentas temporales. No se modificaron contraseñas de cuentas reales.

Los asesores de Supabase no mostraron nuevos WARN/ERROR de seguridad atribuibles a Campus. Las nueve INFO de RLS sin políticas corresponden a la denegación deliberada de acceso directo. Hay INFO de rendimiento sobre dos claves foráneas al banco estático de seis casos; no se realizaron pruebas de carga a escala contratada. La protección de contraseñas filtradas y la autoconfirmación conservan la configuración compartida anterior: producción habilita el registro sin probar posesión del buzón. Las invitaciones secretas deben entregarse a la persona verificada por un canal autorizado. La recuperación por correo sí se comprobó de extremo a extremo.

## Incidencias resueltas y alcance de los cambios

1. **Exercise móvil:** `white-space: nowrap` del texto «Orientación general basada en evidencia» producía un ancho desplazable de 417 px en un viewport de 390 px. La regla nueva, limitada a hasta 620 px, permite envolverlo. Solo se incrementó además el identificador de caché PWA para distribuir la hoja corregida. Contenido clínico, evidencia, cálculos, condiciones y permisos Pro permanecen iguales.
2. **Retorno de recuperación:** Supabase devolvía la sesión a GitHub Pages porque Campus no figuraba entre los retornos permitidos. Se añadió únicamente `https://kinecheck.cl/campus/?campus_flow=*`. El Site URL y los retornos previos de GitHub Pages y Horas Disponibles se conservaron. El correo posterior, el callback y el ingreso con nueva contraseña aprobaron.
3. **Integridad HTML de producción:** la primera comprobación HTTPS posterior a integrar detectó la reescritura del correo de soporte y la inserción de `email-decode.min.js` por Cloudflare. El PR #288 añadió `no-transform` exclusivamente a `/campus/*`, según la [documentación oficial](https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/). La prueba de hashes no se modificó y la ejecución posterior aprobó los cinco archivos exactos.

La comparación del código contra la base no contiene cambios operativos en Academy, Horas Disponibles, Hotmart ni funciones Supabase existentes. La integración de portada y bibliotecas añade enlaces a Campus. Los cambios de Exercise corresponden exclusivamente a la corrección móvil autorizada. No se cambiaron licencias, webhooks ni la configuración global de Cloudflare. Las políticas compartidas de autenticación se conservaron; su única adición fue el retorno específico de Campus ya documentado.

**Sin bloqueos técnicos pendientes para el alcance publicado.** Las seis actividades iniciales no equivalen a una malla curricular completa ni a certificación o acreditación de competencias clínicas. La incorporación comercial de cada universidad requiere su autorización, adaptación curricular y acuerdos operativos; no se presentan SSO institucional, carga masiva ni capacidad bajo carga contratada como prestaciones ya verificadas.
