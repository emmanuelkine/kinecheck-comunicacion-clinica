# KineCheck Evalúa · KIN2002 — traslado controlado desde origen externo

**Fecha:** 2026-11-07  
**Estado:** Fase 1 (integración de acceso y control de notas) preparada en el repositorio KineCheck. **Migración de datos no ejecutada.**

## Rutas operativas de KineCheck

- Entrada oficial del ecosistema: `https://kinecheck.cl/evalua/`
- Revisión local de ZIP/PDF y Excel en navegador: `https://kinecheck.cl/evalua/kin2002/`
- Panel docente con nómina privada RLS: `https://kinecheck.cl/evalua/kin2002/panel/`

La entrada desde `/evalua/` no debe redirigir a un dominio ajeno. El inventario local de PDF no transmite archivos a la base KineCheck, no produce calificaciones y no constituye migración. El panel KIN2002 conserva el control de acceso a nómina mediante sesión docente KineCheck.

## El origen permanece separado

El origen externo conserva las entregas PDF, comprobantes y estados de corrección. No se eliminan, renuevan ni sobrescriben. La nómina privada de KineCheck ya está en Supabase con RLS, pero **no demuestra equivalencia ni sincronización** con las entregas del origen.

Está prohibido enlazar endpoints privados del origen usando tokens colocados en el HTML o `config.js` público. Está prohibido copiar PDF y datos de estudiantes al Git público, registrar datos personales en eventos públicos o trasladarlos sin comprobar finalidad, permisos y retención.

## Verificaciones requeridas antes de cambiar el origen de los PDF

1. Inventario de las entregas de ambas secciones con ID, estudiante, sección, comprobante, fecha y SHA-256 integral de cada PDF; los archivos de prueba se separan, las entregas repetidas se conservan en trazabilidad.
2. Exportación autorizada desde el sistema de origen y respaldo restaurable fuera del navegador.
3. Destino de almacenamiento **privado**, con políticas de lectura por sesión docente y auditoría de acceso. Un lector anónimo no debe obtener una URL de descarga ni enumerar alumnos.
4. Importación idempotente basada en ID de entrega del origen: sin sobreescrituras de notas, sin borrar versiones ni cambiar fechas/comprobantes.
5. Cotejo de conteos por sección, hashes, estados de informe (recibido / propuesta / confirmado), calificaciones confirmadas y retroalimentación frente al origen.
6. Pruebas reales con cuentas del profesor encargado, profesor colaborador y ayudante; aplicar mínimo privilegio por rol. No asumir que una cuenta AppDeploy equivale a una cuenta KineCheck.
7. Probar restauración y reversibilidad; mantener origen de solo lectura durante una ventana de aceptación.
8. **Solo después** de firma de recepción docente, cambiar la ruta de entrega futura y considerar la retirada del sistema anterior.

## Criterios de calificación

- Informe KIN2002: 8 criterios de 0–4, 100 puntos, umbral de aprobación 60 %.
- Simulación: 8 criterios de 0–4, 100 puntos, umbral 60 %.
- Nota Certamen 2 = 0,30 × nota informe + 0,70 × nota simulación.
- Sin 8 niveles y validación docente del informe, o si hay duplicados/conflictos, **no mostrar nota final**, ni asignar cero por defecto.
- El resultado calculado en un navegador es un **consolidado para revisión**, no publicación automática de nota oficial.

## Estado técnico comprobado al iniciar la fase

- KineCheck tiene `/evalua/`, `/evalua/kin2002/` y `/evalua/kin2002/panel/` en el repositorio.
- Supabase producción incluye `public.kc_kin2002_sim_roster`, con RLS habilitada y 67 registros.
- La revisión de ZIP/PDF local en `/evalua/kin2002/` no corrige por sí sola.
- El importador de CSV de informes confirmados desde el sistema externo está implementado en `/evalua/kin2002/panel/`, pero necesita exportación/importación manual y conciliación; no hay API de sincronización autorizada verificada.
- El cambio de esta fase incorpora un acceso desde la portada y evita mostrar notas finales frente a informes no confirmados.
