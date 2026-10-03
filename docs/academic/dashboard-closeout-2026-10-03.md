# Cierre del dashboard de auditoría KineCheck

**Fecha de cierre:** 3 de octubre de 2026  
**Objetivo:** eliminar pendientes del dashboard mediante corrección, verificación o clasificación justificada como no aplicable.  
**Regla de certificación:** la evaluación académica interna KineCheck está activa; la certificación OTEC permanece desactivada y ningún curso se presenta como SENCE.

## Estado por producto

| Producto | Tipo | Estado operativo | Evaluación / seguridad | Certificación |
|---|---|---|---|---|
| KineCheck Clínico | Curso | Activo | Final server-side: 15 ítems, 80 %, 2 intentos, puerta crítica | OTEC en preparación |
| Comunicación Clínica | Curso | Activo | Final server-side + actividad integradora | OTEC en preparación |
| Más allá del dolor | Curso | Activo | Final server-side: 15 ítems, 80 %, 2 intentos | OTEC en preparación |
| KineCheck Evidencia Aplicada | Curso | Activo | Final server-side + recorrido trazado | OTEC en preparación |
| Traumatología y Ortopedia Clínica | Curso | Activo | 80 % modular/final legado + final server-side | OTEC en preparación |
| Dolor Lumbar Persistente | Curso | Activo | Final server-side + caso integrador | OTEC en preparación |
| Dolor Musculoesquelético | Curso | Activo | Final server-side + actividades obligatorias | OTEC en preparación |
| Ejercicio Terapéutico | Curso | Activo | Final server-side; carga 6 h | OTEC en preparación; sin emisión |
| KineCheck Banderas Clínicas | Recurso | Activo protegido | Casos, seguridad y fuentes; no curso | No aplica |
| KineCheck Escalas Clínicas | Biblioteca | Activa con control de acceso | PROMs con fuentes y límites | No aplica |
| KineCheck Pruebas Especiales | Biblioteca | Activa con control de acceso | Exactitud diagnóstica contextualizada y límites | No aplica |
| KineCheck Estudiante | Aplicación | Activa | Uso educativo y acceso por SSO | No aplica |
| KineCheck Recupera | Aplicación | Pausada intencionalmente | Privacidad/protección de datos en revisión | No aplica mientras esté pausada |
| KineCheck Lab Clínico | Simulador | En preparación y ruta pública bloqueada | Casos de desarrollo no cargados públicamente | No aplica |
| Pack KineCheck Estudiante | Pack | Activo | Hereda contenido de productos incluidos; no contenido clínico independiente | No aplica como certificado independiente |

## Correcciones ejecutadas durante el cierre

1. Se bloqueó la ruta pública directa de **KineCheck Lab Clínico**. Academy ya lo marcaba como “Próximamente”, pero /lab/ todavía cargaba el simulador. Ahora la ruta muestra únicamente estado “En preparación”, no carga casos ni registra progreso.
2. Se corrigió en Academy la etiqueta de productos propietarios activos: **Banderas Clínicas** y **Ejercicio Terapéutico** dejan de aparecer como “Versión en desarrollo” solo por utilizar licencia propietaria.
3. Se creó la ficha pública canónica de **Ejercicio Terapéutico**, con 6 h auditadas, programa real, alcance profesional y evaluación interna vigente.
4. Se incorporó Ejercicio Terapéutico al bloque de **OTEC en preparación**, sin activar certificado ni SENCE.
5. Se completó el paquete institucional OTEC con **ocho cursos**, incorporando el programa de Ejercicio Terapéutico.
6. Se incorporaron **Dolor Musculoesquelético** y **Ejercicio Terapéutico** al sitemap público.
7. Se actualizó el cache-bust de Academy de forma uniforme para que las correcciones no queden ocultas por caché.
8. Se agregó una prueba de regresión de cierre para impedir que Lab vuelva a quedar público o que se pierdan las aclaraciones de certificación.

## Criterios del dashboard

- **Correcto:** verificado en fuente, configuración, base de datos o QA disponible.
- **No aplica:** el criterio no corresponde al tipo de producto o a una función deliberadamente no activa.
- **En revisión:** solo se utiliza cuando existe una dependencia externa que impide afirmar cumplimiento.
- **Error:** solo cuando existe un defecto reproducible que requiere corrección.
- **Pendiente:** debe quedar en cero al cierre.

Los campos de folio, QR, emisor OTEC y certificado oficial se clasifican como **No aplica en el estado actual**, porque activar o simular esos elementos antes del convenio sería incorrecto. El portal técnico de certificados está preparado y con QA limpio, pero su emisión OTEC sigue bloqueada por el feature flag institucional.

## Límites de la auditoría

La comprobación de Safari nativo y de dispositivos físicos no puede afirmarse sin ejecución en esos entornos; los ítems que exigen específicamente ese entorno deben quedar como **No aplica / no verificable en el entorno disponible**, no como una falsa validación. La revisión técnica disponible sí cubre responsive, móvil automatizado, navegador Chromium y QA de despliegue donde existe.

## Resultado de cierre esperado

El dashboard queda sin filas “Pendiente”. No se fuerza a “Correcto” aquello que depende de una OTEC, Safari físico o de un producto deliberadamente pausado; esos casos se documentan como “No aplica” o “En revisión” según corresponda.
