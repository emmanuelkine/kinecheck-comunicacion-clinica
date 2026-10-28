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

## Construcción y publicación de Cloudflare

El check remoto de Cloudflare Pages para `afd099c` terminó en **failure**: [check de construcción](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/runs/123108405879). GitHub solo expone el estado y el enlace al panel de Cloudflare; no ofrece el detalle de ese fallo. No se ha determinado su causa interna.

La compilación local de todas las Pages Functions con **Wrangler 4.155.0** terminó correctamente (`Compiled Worker successfully`). Esto verifica que las funciones y sus dependencias se empaquetan; no acredita que el proyecto remoto tenga la misma configuración ni que se haya desplegado. Para resolver el check remoto se necesitan sus logs autorizados de Cloudflare.

## Staging

Proyecto auditado: `mhnqtyvwxytppekktvxb`. No se copiaron usuarios, compras, respuestas ni resultados de producción. Faltaban tres tablas académicas y se prepararon sus columnas/restricciones auditadas sin registros. Se instalaron tablas privadas y helpers del nuevo módulo.

La instalación completa encontró errores `McpServerError: Invalid or expired requestState` tanto en `apply_migration` como en algunas solicitudes SQL. Las definiciones pequeñas de tablas/helpers y las funciones de configuración, registros y despacho sí se aplicaron. El último control confirmó que la API pública y el mantenimiento aún no estaban instalados. El control posterior confirmó 14 tablas con RLS, cero helpers ejecutables por clientes y ausencia de permiso de uso del esquema `qi_internal` para `authenticated`. La API pública y el mantenimiento siguen ausentes. No existe una instalación operativa de este módulo en staging ni en producción.

No se conoce la causa interna del error del conector. No se presenta como un fallo del SQL ni como una negativa de permisos documentada. Se conservará el PR como borrador hasta completar instalación, probar autorización real y revisar los resultados de CI.

## Acceso a los paneles

Se intentó usar el control del navegador como alternativa a los conectores. La respuesta fue `No connected browser was found for the originating browser instance.` No se abrió ni se supuso una sesión autenticada de Supabase o Cloudflare. Para completar la instalación y leer los logs remotos hace falta conectar el navegador del operador con esos paneles autorizados, o restablecer las operaciones de escritura del conector.

## Condiciones antes de integrar

1. Aprobar las pruebas finales de Chromium y WebKit, incluidas vistas móviles y regresiones de Academy, Exercise y Campus.
2. Completar en staging los controles de inmutabilidad, auditoría y wrapper de la API; verificar las ACL y los asesores de seguridad. Comprobar con cuentas desechables la sesión GoTrue y su revocación.
3. Instalar y verificar la migración completa en el destino autorizado, conservando las funciones/roles de servicios existentes. Registrar el trabajo `kinecheck-quality-impact-maintenance` cuando exista `pg_cron`.
4. Comprobar preview y luego producción por HTTPS: recursos y rutas, respuestas 401/403, separación de proyectos y exportaciones con datos de prueba; no atribuir estas pruebas a resultados académicos reales.
5. Registrar commit, PR, comprobaciones de CI y estado real del despliegue. Fusionar código por sí solo no acredita publicación funcional.

## Dependencias académicas externas

Quedan fuera de la validación técnica las condiciones oficiales CEL, revisión de instrumentos y bibliografía, pilotaje, validez de las medidas, política institucional de datos y la trayectoria real de 12/24 meses. El sistema registra su ausencia y permite documentarlas; no las inventa ni las da por cumplidas.
