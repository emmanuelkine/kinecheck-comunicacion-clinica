# Validación y estado de despliegue

Estado de trabajo: **rama específica en validación; no integrado ni publicado en producción**.

## Evidencia obtenida

- Suite completa final: 182 pruebas aprobadas con concurrencia limitada a dos procesos. La primera ejecución paralela agotó recursos en el archivo Hotmart; sus 20 pruebas pasaron de forma aislada y la suite completa pasó al limitar la concurrencia. No se cambiaron sus aserciones ni la lógica comercial.
- Controles de integridad de Academy, contratos de interfaz y marca: aprobados.
- Módulo de calidad: 16 pruebas de PostgreSQL/HTTP/PDF/CSV aprobadas, incluyendo autorización, aislamiento, claves privadas, puntuación humana, datos faltantes, bases iguales a cero, consentimiento, revocación, versionado, inmutabilidad y generación periódica/aprobación de informes.
- Navegador Chromium: 360, 390, 768 y 1280 píxeles aprobados en la revisión inicial, con PostgreSQL real aislado y Auth sintético; cero infracciones de accesibilidad en los controles ejecutados. La repetición después de los últimos ajustes también aprobó los cuatro tamaños.
- WebKit: el desbordamiento detectado en filtros móviles se corrigió usando una cuadrícula adaptable. La repetición en 360, 390, 768 y 1280 píxeles aprobó las cuatro vistas, sin infracciones en los controles de accesibilidad ejecutados.
- PDF de ejemplo: generado con datos sintéticos, logo original y tipografías incrustadas. Se inspeccionaron las tres páginas y se comprobó la presencia de sus cabeceras, pies y paginación.

## Integración continua

Los 21 workflows de GitHub asociados a `afd099ca7179be0bd32f7c2f332cd9c521a3bde7` terminaron con éxito. Incluyen Hotmart, Academy, Exercise, Campus, SSO, seguridad, Horas Disponibles y el nuevo módulo. La ejecución específica es [Quality Impact QA](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40771148582). No representan pruebas de autorización de esta nueva API en producción.

También se comprobaron los 21 workflows del commit `21a8752b87aaf6eaa802e778ae181e92b1caad3b`: todos terminaron con éxito. La nueva ejecución específica es [Quality Impact QA](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40775635614). El check externo de Cloudflare Pages se registra por separado y falló por el motivo descrito a continuación.

## Construcción y publicación de Cloudflare

Los checks remotos de Cloudflare Pages para `afd099c` y `21a8752` terminaron en **failure**. El registro del segundo despliegue, facilitado por el operador el 28 de octubre de 2026, permite identificar la causa: Pages omitió el paso de construcción (`No build command specified. Skipping build step.`) y Wrangler **3.114.17** no pudo resolver `pdf-lib` ni `@pdf-lib/fontkit`. Ambas dependencias ya están fijadas en `package.json` y `package-lock.json`; faltaban en el entorno remoto de compilación.

Se comprobó una copia limpia del commit `21a8752`, sin `node_modules` previo: `npm ci --omit=dev --ignore-scripts` instaló las seis dependencias de ejecución del lockfile y la compilación de **todas** las Pages Functions con **Wrangler 3.114.17** terminó con `Compiled Worker successfully`. La compilación previa con Wrangler 4.155.0 también había aprobado, pero no reproducía el paso de instalación ausente en Pages.

El operador guardó en el entorno **Preview** del proyecto `kinecheck-comunicacion-clinica` el **Build command** `npm ci --omit=dev --ignore-scripts`. Se verificó su valor en la captura del panel facilitada el 28 de octubre de 2026, junto al control de ramas de preview. Este comando instala las dependencias antes de que Pages compile automáticamente las Functions. No se necesita excluirlas del bundle ni cambiar las importaciones del generador PDF. Queda por comprobar un nuevo despliegue con esa configuración. La configuración de **Production** se debe revisar separadamente antes de integrar el PR.

El workflow de Quality Impact incorpora el job `quality-pages-build` con esa instalación y la misma versión de Wrangler, para detectar este fallo de empaquetado en CI. Ese job aprobó también en GitHub para `abfca30`. La prueba local y el job verifican el empaquetado; **no acreditan un despliegue exitoso en Cloudflare**. Referencias: [configuración de construcción de Pages](https://developers.cloudflare.com/pages/configuration/build-configuration/), [dependencias e imagen de construcción](https://developers.cloudflare.com/pages/configuration/build-image/).

## Staging

Proyecto auditado: `mhnqtyvwxytppekktvxb`. No se copiaron usuarios, compras, respuestas ni resultados de producción. Faltaban tres tablas académicas y se prepararon sus columnas/restricciones auditadas sin registros. Se instalaron tablas privadas y helpers del nuevo módulo.

La instalación completa encontró errores `McpServerError: Invalid or expired requestState` tanto en `apply_migration` como en algunas solicitudes SQL. Las definiciones pequeñas de tablas/helpers y las funciones de configuración, registros y despacho sí se aplicaron. El último control confirmó que la API pública y el mantenimiento aún no estaban instalados. El control posterior confirmó 14 tablas con RLS, cero helpers ejecutables por clientes y ausencia de permiso de uso del esquema `qi_internal` para `authenticated`. Una nueva consulta de solo lectura confirmó además cero triggers propios del módulo: siguen pendientes los controles de auditoría e inmutabilidad de la migración. La API pública y el mantenimiento siguen ausentes. No existe una instalación operativa de este módulo en staging ni en producción.

No se conoce la causa interna del error del conector. No se presenta como un fallo del SQL ni como una negativa de permisos documentada. Se conservará el PR como borrador hasta completar instalación, probar autorización real y revisar los resultados de CI.

## Acceso a los paneles

Se intentó usar el control del navegador como alternativa a los conectores. La respuesta fue `No connected browser was found for the originating browser instance.` No se abrió ni se supuso una sesión autenticada de Supabase o Cloudflare. El operador facilitó el registro de Cloudflare, que permitió diagnosticar la dependencia faltante, y guardó el comando de instalación en Preview con asistencia mediante capturas. Para completar la instalación en Supabase y revisar la configuración de Production hace falta conectar el navegador del operador con esos paneles autorizados, restablecer las operaciones del conector o ejecutar las instrucciones revisadas desde el panel.

## Condiciones antes de integrar

1. Aprobar las pruebas finales de Chromium y WebKit, incluidas vistas móviles y regresiones de Academy, Exercise y Campus.
2. Completar en staging los controles de inmutabilidad, auditoría y wrapper de la API; verificar las ACL y los asesores de seguridad. Comprobar con cuentas desechables la sesión GoTrue y su revocación.
3. Instalar y verificar la migración completa en el destino autorizado, conservando las funciones/roles de servicios existentes. Registrar el trabajo `kinecheck-quality-impact-maintenance` cuando exista `pg_cron`.
4. Comprobar preview y luego producción por HTTPS: recursos y rutas, respuestas 401/403, separación de proyectos y exportaciones con datos de prueba; no atribuir estas pruebas a resultados académicos reales.
5. Registrar commit, PR, comprobaciones de CI y estado real del despliegue. Fusionar código por sí solo no acredita publicación funcional.

## Dependencias académicas externas

Quedan fuera de la validación técnica las condiciones oficiales CEL, revisión de instrumentos y bibliografía, pilotaje, validez de las medidas, política institucional de datos y la trayectoria real de 12/24 meses. El sistema registra su ausencia y permite documentarlas; no las inventa ni las da por cumplidas.
