# KineCheck: seguimiento de auditoría de seguridad y privacidad

**Fecha de verificación:** 2026-10-29 (UTC)  
**Estado:** seguimiento parcial; no constituye certificación legal ni autorización de despliegue.  
**Base:** informe inicial de auditoría de 2026-10-28.  
**Cambio propuesto:** documentación interna únicamente. Sin cambios a código, datos, políticas, migraciones o configuración de producción.

## Resultado de esta etapa

Se repitieron verificaciones de metadatos y se ejecutaron consultas de autorización de solo lectura usando los roles SQL `anon` y `authenticated`, UUID sintéticos y transacciones revertidas. No se consultaron filas con datos personales reales. No se creó una cuenta real ni se utilizó credencial de un usuario.

No se identificó una corrección de base de datos que pueda aplicarse con seguridad antes de observar y probar los flujos completos. En particular, no se deben añadir políticas RLS generales ni retirar permisos sin enlazar cada permiso con su consumidor activo.

## Evidencias nuevas

| Componente | Prueba | Resultado | Alcance |
|---|---|---|---|
| Supabase producción | Relectura de Security Advisor | Se mantiene alerta informativa de RLS habilitado sin políticas (37) y el aviso de protección contra contraseñas filtradas desactivada | No implica por sí sola exposición de filas; la configuración de Auth debe cambiarse y probarse en Dashboard |
| Supabase staging | Relectura de Security Advisor y catálogo | 61 tablas con RLS habilitado y sin política, distribuidas en `academy_core`, `academy_ortho`, `private` y `public` | Alertas informativas. No se cambiaron políticas |
| Academy / accesos | `SET ROLE anon` y `SET ROLE authenticated` con UUID sintético; conteo de filas de `public.course_access` | Ambos roles vieron 0 filas | Prueba SQL de rol en staging, no prueba completa vía REST/JWT ni flujo de curso |
| Campus / Academy privados | Consulta de staging como `authenticated` a `academy_core.certificates` | Denegada por falta de permiso al esquema | Denegación confirmada para ese esquema; roles docentes/institucionales reales de prueba pendientes |
| Horas Disponibles demo | UUID sintético autenticado no asociado a membresía; conteos de perfiles, horas, instituciones y membresías | 0 filas visibles en las cuatro tablas | Comprueba denegación para identidad no autorizada. No prueba acceso del miembro autorizado ni separación entre dos instituciones existentes |
| Certificados públicos | Llamada a `academy_certificate_verify` como `anon` con UUID v4 sintético desconocido | `{"found":false}` | Función `SECURITY DEFINER`, `search_path` vacío, SQL con referencias cualificadas. No devuelve nombre ni correo. No se alteró porque bloquearla podría romper verificación pública |
| Integración Hotmart, licencias, Exercise, biblioteca, métricas, automatizaciones, autenticación web, correo y experiencia móvil/escritorio | Sin cuentas sintéticas, checkout de prueba, clon local o secretos/configuración de proveedor en este entorno | Pendiente | No afirmar pruebas de regresión ni aislamiento funcional |

> Los resultados de SQL con `SET ROLE` validan comportamiento de base de datos en el rol indicado; no sustituyen pruebas de API REST con JWT emitidos por Auth, ni cubren Edge Functions, frontend o proveedores externos.

## Acciones seguras realizadas

- Volver a consultar los avisos actuales de seguridad en producción y staging.
- Verificar de nuevo el cuerpo y privilegios de la función pública de certificado sin modificarla.
- Ejecutar consultas SQL de solo lectura con roles de base y una identidad sintética desconocida.
- Confirmar que las comprobaciones SQL se limitaron a conteos y metadatos y revirtieron sus transacciones.
- Mantener intactos compras, licencias, datos reales, documentos legales públicos y configuración productiva.

No se ejecutó ningún cambio en bases de datos ni se publicó ningún documento jurídico.

## Bloqueos y corrección necesaria

### 1. Protección contra contraseñas filtradas (prioridad media)

No hay herramienta disponible en esta sesión para cambiar la opción de Auth.

1. En Supabase Dashboard, abrir el proyecto **staging**.
2. Ir a **Authentication → Settings** (la etiqueta exacta puede variar en la versión del Dashboard) → **Password Security**.
3. Activar **Leaked password protection** / protección contra contraseñas comprometidas.
4. Guardar. Revisar el Security Advisor.
5. Con una cuenta sintética nueva en staging, probar registro/cambio de contraseña con una contraseña de prueba no comprometida y una contraseña de prueba incluida en el mecanismo de prueba recomendado por Supabase; verificar que la segunda se rechace y que recuperación de acceso siga funcionando.
6. Registrar la evidencia y la versión/configuración. Repetir en producción solo con autorización explícita, plan de reversión y pruebas satisfactorias en staging.

No compartir contraseñas reales con el equipo de auditoría.

### 2. Cuentas y datos de prueba para autorización

Crear en **staging**, con correo de prueba controlado y datos ficticios, identidades separadas para estudiante, docente, institución A, institución B y administrador. Asignar roles/membresías sin usar cuentas personales de producción. Probar lecturas y mutaciones permitidas y denegadas en REST/API, Storage y Edge Functions. Añadir fixtures reversibles y no usar compras reales. Confirmar como mínimo:

- estudiante A no consulta ni cambia progreso, resultados o intentos de estudiante B;
- docente/institución A no puede consultar ni cambiar recursos de institución B;
- administrador autorizado conserva su flujo de soporte;
- cambios de licencia solo provienen del webhook/operación autorizados;
- lecturas públicas de certificados revelan solo campos aprobados;
- la demo de Horas permite el acceso autorizado requerido y mantiene cerrado el acceso de identidades ajenas;
- enlaces WhatsApp/agendas siguen dirigiendo directamente al canal oficial y KineCheck no persiste identificadores de pacientes ni conversaciones.

No se probaron escrituras ni se insertaron fixtures durante esta etapa.

### 3. Documentación legal y comercial

Los términos públicos, la política de privacidad, el registro de tratamiento y el protocolo de incidentes fueron revisados en el informe inicial. No se modificaron porque siguen sin estar confirmados datos que no deben inventarse: identidad legal/tributaria y domicilio del proveedor, rol exacto de vendedor frente a Hotmart, encargados y subencargados actuales, países y garantías de transferencias, plazos reales de retención, mecanismos de borrado y contacto/procedimiento operativo de derechos.

Completar la ficha interna de identificación del proveedor con datos confirmados por su titular; conciliarla con Hotmart, checkout, comprobantes y sitio. Después, preparar cambios en borrador para revisión jurídica chilena y autorización del responsable antes de publicarlos. Verificar antes del cierre la fecha de entrada en vigencia de la Ley 21.719 y su normativa oficial aplicable.

### 4. Pruebas de regresión y publicación

No existe clon Git local en el entorno y no se ejecutaron scripts del repositorio. El `package.json` define pruebas Node para Academy/Campus, Exercise, feedback, Hotmart y recuperación ante desastres, además de pruebas de navegador. En esta etapa no se declara éxito de compilación, CI, regresión integral ni producción.

Una vez disponible entorno local y credenciales sintéticas de staging:

1. ejecutar pruebas automatizadas declaradas en el repositorio;
2. agregar/ejecutar pruebas por rol y aislamiento institucional;
3. validar cada servicio y su versión móvil/escritorio;
4. revisar los checks del PR;
5. probar despliegue en staging, comprobar rollback y verificar integraciones;
6. solicitar aprobación antes de toda modificación de datos, accesos o disponibilidad productiva.

## Estado de publicación

Este documento está propuesto como PR de seguimiento técnico/documental. No cambia los términos, la política ni el comportamiento del sitio. No se publica a usuarios finales. La producción de Supabase y el sitio público no fueron modificados.

## Decisión de cierre

**Auditoría técnica integral: abierta.**  
**Vulnerabilidades críticas/altas demostradas corregidas:** ninguna identificada en el alcance ejecutado; siguen abiertos los controles de autenticación y las pruebas de roles completas.  
**Cumplimiento legal certificado:** no afirmado.  
**Producción:** sin cambios.


## Actualización de ejecución y CI — 2026-10-29

Esta sección actualiza el estado de pruebas registrado arriba. Las pruebas automatizadas sí se ejecutaron en GitHub Actions sobre el commit del PR; la limitación de clon local impide ejecutarlas manualmente en esta sesión, pero no impidió el CI remoto.

| Superficie | Resultado verificado | Límite |
|---|---|---|
| Suite Node `npm test` | 166 aprobadas; 0 fallidas, omitidas o inestables | Tests con fixtures/repositorio; no equivalen a sesiones autenticadas contra staging |
| Navegador Playwright | 58 esperadas; 0 fallidas, omitidas o inestables. Incluyó regresiones visuales y funcionales en móvil/tablet/escritorio y layout productivo | Casos instrumentados por el repo; no valida los roles Auth reales de staging |
| Validadores de fuente/arquitectura | Workflow completado con éxito | No sustituye prueba de integración con credenciales reales |
| Identidad de marca y activos binarios | Workflows completados con éxito | Sin cambios funcionales en este PR |
| Horas Disponibles | Pruebas automatizadas incluidas: enlaces HTTPS, WhatsApp con clic del paciente, horas, sesiones y denegación de lectura/escritura docente no autorizada | Se prueba el comportamiento de pruebas del repo, no la autorización real con dos cuentas institucionales en Supabase |
| Hotmart y licencias | Pruebas automatizadas de webhook, reembolso, duplicados, revocación, expiración, reintentos y conciliación aprobadas | Simulaciones del repo; no se hizo una compra real ni una prueba del checkout |
| Metrics y biblioteca | Pruebas automatizadas de consentimiento, rechazo de métricas, feedback sintético/anónimo, moderación, paginación y privacidad aprobadas | El envío del feedback se simuló con storage/KV de prueba; no se consultaron métricas personales de producción |
| Exercise | Pruebas del endpoint licenciado, entitlements, cálculos y contenido protegido aprobadas | Sin sesión de usuario real en staging |
| Campus | Pruebas automatizadas de migración/autorización multi-tenant aprobadas; consulta SQL con usuario sintético a `private.campus_profiles` fue denegada por permiso de esquema | No se crearon usuarios Auth ni se probaron dos membresías válidas en el Supabase de staging |
| Academy | Pruebas de estado académico, respuestas y claves aprobadas; `course_access` no devolvió filas a `anon` ni a una identidad SQL sintética | Sin inicio/recuperación de sesión por Auth ni flujo completo de licencia en staging |
| Storage | Bucket `course-assets` privado, límite de 100 KB y MIME `text/javascript`; `anon` y autenticado sintético vieron 0 metadatos de objetos | No se intentó cargar/bajar archivo de prueba vía sesión Auth válida |
| Edge Functions | 13 funciones activas reportan `verify_jwt=true`; las 13 rechazaron GET sin sesión con `UNAUTHORIZED_NO_AUTH_HEADER` | No se probó un token válido con licencia activa/inactiva ni los payloads POST autenticados |
| Certificado público | RPC anónimo con UUID sintético desconocido devolvió `found:false`, sin nombre ni correo | No se probó certificado válido de fixture por REST ni la página pública con certificado conocido |

El log de la suite Node emitió advertencias Node `MODULE_TYPELESS_PACKAGE_JSON` en ciertos módulos ES; no afectaron el resultado. Los logs de correo 502/503/403 corresponden a respuestas simuladas para comprobar que el sistema no afirme envíos fallidos como exitosos; las pruebas finalizaron aprobadas.

### Checks del PR

En la corrida del PR #294:

- `KineCheck Binary Asset Audit`: todos sus jobs terminaron exitosamente; incluyó regresiones Playwright, suite Node, análisis binario y validadores de fuente.
- `KineCheck Brand Integrity`: finalizó exitosamente.
- Suite completa: `166 pass / 0 fail`; Playwright: `58 expected / 0 unexpected / 0 flaky`.

Los reportes de Actions se conservaron como artefactos de CI. No se publicó el PR ni se desplegó su contenido.

### Estado de creación de cuentas de prueba

No se crearon cuentas nuevas durante esta etapa. La captura aportada por el titular y una consulta de staging limitada a dos identidades sintéticas confirman que ya existen las cuentas etiquetadas como “unlicensed” y “licensed”. No se incluyeron UID ni correos en el informe. En la cuenta etiquetada “licensed” se encontraron dos registros de acceso para cursos, ambos inactivos, vencidos y marcados `ISSUE213_SYNTHETIC_REVOKED`; la cuenta “unlicensed” no tiene registros de acceso. Son fixtures revocados, no una cuenta de licencia positiva; no se alteraron para respetar el historial de licencias. Usando cada UID como sujeto sintético SQL, ambas identidades obtuvieron cero filas en `course_access` y en las cuatro tablas demo de Horas. Esta simulación comprueba denegación RLS para el sujeto indicado; no es un inicio de sesión real ni una solicitud REST firmada. La captura muestra Dashboard abierto, pero el navegador conectado a esta ejecución no entregó una sesión interactiva, así que no fue posible operar Auth UI. No se insertaron filas manuales en `auth.users`, no se enviaron correos y no se almacenaron contraseñas. El paso pendiente es habilitar la interacción autenticada con Dashboard o un Auth Admin seguro para preparar las cuentas de docente, instituciones A/B, administrador y una cuenta sintética con licencia activa, sin desactivar globalmente la confirmación de correo ni cambiar licencias existentes.



### Actualización con cuentas sintéticas existentes

La evidencia aportada por el titular permitió identificar y comprobar dos cuentas sintéticas ya existentes en staging. El análisis usó solo sus identidades de prueba, sin extraer nombres, direcciones de correo, credenciales ni otros datos personales. La cuenta señalada como “licensed” conserva dos registros sintéticos, pero ambos fueron revocados y están vencidos; no sirve para validar el camino positivo de licencia activa. La cuenta “unlicensed” no tiene registros. Los registros no se modificaron.

