# Verificación de KineCheck Campus — PR #287

Fecha: 27 de octubre de 2026. Estado: **prepublicación; no integrado ni publicado**. Este informe distingue resultados ejecutados de controles pendientes.

## Evidencia ejecutada

Revisión comprobada: `15b8be9b0f873f7bdf489152382e75cfd52d3eb7`, sobre `main` `9e2adf5af9c95c3d2e50fe4a064e6f465240877c`. Sus 25 checks ejecutados de GitHub terminaron satisfactoriamente; el job HTTPS duplicado del evento pull request se omite deliberadamente, porque se ejecuta en el evento push. La revisión funcional anterior `de4d1f8b37c67d1d1caba8cbe715272b7a365561` tenía sus 22 checks aprobados.

| Control | Resultado verificable |
| --- | --- |
| Suite Node del repositorio | 166 pruebas aprobadas |
| Campus: generación, HTTP, permisos y PostgreSQL | 15 pruebas/subpruebas aprobadas |
| Campus: navegador | Chromium y WebKit, 360/390/768/1280 px; ocho combinaciones aprobadas, sin desbordamiento; cero infracciones detectadas por axe WCAG A/AA en inicio, caso y panel institucional |
| Campus: sesiones y RPC reales | Ocho escenarios aprobados en staging y mediante el BFF HTTPS de Pages; incluye roles, separación institucional, invitación de un uso, puntaje del servidor, progreso, consentimiento, revocación y cierre de sesión |
| Campus: HTTPS real en previsualización | Aprobado a las 20:55:33 UTC: cinco archivos exactos por SHA-256, caso de visitante completo y API real en ocho combinaciones Chromium/WebKit a 360/390/768/1280 px; cero infracciones axe, sin desbordamiento, acceso anónimo 401 y origen ajeno 403 |
| Exercise: lógica | Nueve pruebas aprobadas |
| Exercise: escritorio/móvil | Cinco combinaciones aprobadas: Chromium/WebKit a 1280 px, Chromium/WebKit iPhone 13 a 390 px y Chromium Pixel 7 a 412 px; ancho desplazable igual al viewport en todas |
| Exercise: HTTPS real en previsualización | Las mismas cinco combinaciones aprobadas contra Pages, incluida caché PWA activa y bloqueos Pro |
| Regresión general/Academy | 58 pruebas Playwright aprobadas y ocho scripts adicionales aprobados, incluidos roles, privacidad, biblioteca y desbordamiento |
| Contratos Academy, Hotmart, Horas y comercio | Checks específicos aprobados; no se modificó su código operativo |
| Dependencias | `npm ci`: cero vulnerabilidades informadas en la ejecución de CI |

Evidencia CI:

- [Campus, seguridad y navegador](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40578539948).
- [Exercise: lógica y cinco navegadores/dispositivos](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40578539676).
- [Regresiones generales y Academy](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40578539687).
- [Capturas y resultados de regresión](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40578539687/artifacts/12767884276).
- [Última revisión: Campus y comprobación HTTPS real](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40582161382).
- [Evidencia HTTPS: capturas, axe, hashes y resultados Exercise](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40582161382/artifacts/12769682774).

Los paneles del test visual usan fixtures solo en el servidor de pruebas. Las pruebas de permisos usan PostgreSQL y GoTrue reales de staging; no representan instituciones comerciales activas. Las cuentas e instituciones temporales de staging se eliminaron y se comprobó que no quedaban cuentas QA.

## Corrección autorizada de Exercise

La causa preexistente era `white-space: nowrap` del texto en negrita «Orientación general basada en evidencia», dentro de `.notice`. En un viewport de 390 px llegaba a 417 px. Una regla limitada a anchos de hasta 620 px permite envolver ese texto. Se incrementó únicamente el identificador de caché del service worker para distribuir la hoja corregida. No se alteraron contenido clínico, evidencia, cálculos, condiciones ni permisos Pro. La comprobación de desbordamiento conserva su exigencia original.

Comparación contra la base: sin cambios en `academy/`, Horas Disponibles, Hotmart ni funciones Supabase existentes. Los enlaces nuevos en portada y bibliotecas corresponden a Campus. `_headers` añade reglas limitadas a `/campus/*`. Las tablas y funciones nuevas llevan nombres de Campus; no se concede acceso al esquema privado compartido.

## Datos y autenticación

Se aplicaron y verificaron **solo en staging** las migraciones `20261027185042_campus_institutional_platform.sql` y `20261027194409_campus_isolated_function_namespace.sql`. Las nueve tablas tienen RLS forzada y denegación de acceso directo; los permisos institucionales se comprueban en el servidor y la sesión se revoca sin esperar el vencimiento del JWT. Se verificó que `authenticated` no recibe USAGE sobre el esquema `private` compartido.

Producción mantiene su política previa `mailer_autoconfirm=true`: el registro habilita la cuenta sin verificar posesión del buzón. No se cambió esa configuración global. Las invitaciones son secretas, personales, de un uso y ligadas a un correo; su entrega e identificación corresponden al administrador por un canal autorizado.

## Bloqueo de publicación comprobado

La recuperación enviada a un alias de prueba del correo del propietario **llega** y su enlace válido devuelve una sesión. Sin embargo, Supabase rechaza el retorno solicitado a `/campus/?campus_flow=…` y responde con una redirección 303 a `https://emmanuelkine.github.io/mas-alla-del-dolor/`, sin el identificador del flujo. Esto impide completar la recuperación en Campus.

Se debe añadir el retorno específico de Campus a la lista permitida en Authentication → URL Configuration del proyecto de producción, conservando el Site URL y todos los retornos existentes. El conector disponible no expone la edición de Auth; la consola requiere un inicio de sesión que todavía no está completado. No se guardan contraseñas ni tokens en este repositorio o informe.

## Condiciones que todavía faltan

1. Completar el acceso a la consola, permitir el retorno de Campus y repetir el correo de recuperación hasta verificar su destino y el flujo.
2. Aplicar ambas migraciones probadas en producción, verificar permisos y limpiar la cuenta temporal de comprobación.
3. Confirmar todos los checks del último commit e integrar el PR con su SHA esperado.
4. Esperar el despliegue y ejecutar `campus-public-https` contra **https://kinecheck.cl**. Exige archivos exactos de la revisión, caso real, API real, accesibilidad y móvil/escritorio; también repite Exercise en HTTPS.
5. Comprobar el ingreso real y la recuperación en producción, y actualizar este informe con commit, hora, ejecución y resultados reales.

No se habilitó ninguna universidad ni se usaron marcas ajenas. Las seis actividades iniciales no equivalen a una malla curricular completa, una certificación ni una validación de desempeño clínico. Las pruebas móviles usan emulación de viewport/dispositivo en motores Chromium/WebKit; no sustituyen pruebas en hardware físico.
