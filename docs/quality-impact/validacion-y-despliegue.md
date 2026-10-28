# Validación y estado de despliegue

Estado de trabajo: **rama específica en validación; no integrado ni publicado en producción**.

## Evidencia obtenida

- Suite completa: 181 pruebas aprobadas con concurrencia limitada a dos procesos. La primera ejecución paralela agotó recursos en el archivo Hotmart; sus 20 pruebas pasaron de forma aislada y la suite completa pasó al limitar la concurrencia. No se cambiaron sus aserciones ni la lógica comercial.
- Controles de integridad de Academy, contratos de interfaz y marca: aprobados.
- Módulo de calidad: 16 pruebas de PostgreSQL/HTTP/PDF/CSV aprobadas, incluyendo autorización, aislamiento, claves privadas, puntuación humana, datos faltantes, bases iguales a cero, consentimiento, revocación, versionado, inmutabilidad y generación periódica/aprobación de informes.
- Navegador Chromium: 360, 390, 768 y 1280 píxeles aprobados en la revisión inicial, con PostgreSQL real aislado y Auth sintético; cero infracciones de accesibilidad en los controles ejecutados. La repetición después de los últimos ajustes también aprobó los cuatro tamaños.
- WebKit: detectó un desbordamiento en los filtros móviles. Se cambió la distribución a una cuadrícula adaptable; la repetición completa está pendiente.
- PDF de ejemplo: generado con datos sintéticos, logo original y tipografías incrustadas. Se inspeccionaron las páginas; se continúa comprobando su paginación.

## Staging

Proyecto auditado: `mhnqtyvwxytppekktvxb`. No se copiaron usuarios, compras, respuestas ni resultados de producción. Faltaban tres tablas académicas y se prepararon sus columnas/restricciones auditadas sin registros. Se instalaron tablas privadas y helpers del nuevo módulo.

La instalación completa encontró errores `McpServerError: Invalid or expired requestState` tanto en `apply_migration` como en algunas solicitudes SQL. Las definiciones pequeñas de tablas/helpers y las funciones de configuración, registros y despacho sí se aplicaron. El último control confirmó que la API pública y el mantenimiento aún no estaban instalados. Las tablas permanecen con RLS y sin permisos de clientes.

No se conoce la causa interna del error del conector. No se presenta como un fallo del SQL ni como una negativa de permisos documentada. Se conservará el PR como borrador hasta completar instalación, probar autorización real y revisar los resultados de CI.

## Condiciones antes de integrar

1. Aprobar las pruebas finales de Chromium y WebKit, incluidas vistas móviles y regresiones de Academy, Exercise y Campus.
2. Completar en staging los controles de inmutabilidad, auditoría y wrapper de la API; verificar las ACL y los asesores de seguridad. Comprobar con cuentas desechables la sesión GoTrue y su revocación.
3. Instalar y verificar la migración completa en el destino autorizado, conservando las funciones/roles de servicios existentes. Registrar el trabajo `kinecheck-quality-impact-maintenance` cuando exista `pg_cron`.
4. Comprobar preview y luego producción por HTTPS: recursos y rutas, respuestas 401/403, separación de proyectos y exportaciones con datos de prueba; no atribuir estas pruebas a resultados académicos reales.
5. Registrar commit, PR, comprobaciones de CI y estado real del despliegue. Fusionar código por sí solo no acredita publicación funcional.

## Dependencias académicas externas

Quedan fuera de la validación técnica las condiciones oficiales CEL, revisión de instrumentos y bibliografía, pilotaje, validez de las medidas, política institucional de datos y la trayectoria real de 12/24 meses. El sistema registra su ausencia y permite documentarlas; no las inventa ni las da por cumplidas.
