# KineCheck Ortho · manifiesto de activos protegidos

Edición de autoría: `2026.10-authoring-2`
Fecha de carga verificada: 2026-10-28
Entorno: Supabase staging (`mhnqtyvwxytppekktvxb`)
Tabla privada: `academy_ortho.content_assets`
Estado: disponible sólo detrás de JWT, licencia del curso y flag de entorno; el flag QA y el acceso alumno permanecen apagados.

| Activo | Bytes UTF-8 | SHA-256 | Contenido |
|---|---:|---|---|
| `kinecheck-ortho/current/course-data.js` | 155,735 | `50b03333ae8ede9387d55e17bb6b6e66b9714c10b1820f8c325b7e9fa2f91815` | 12 lecciones, 12 casos y examen integrador borrador |
| `kinecheck-ortho/current/renderer.js` | 13,280 | `0ba54c4bd6f1b562f05d1e6bc07b20e8c2d55f4fd925c88b4a50c842b5e45c0b` | Reproductor y progreso local de estudio |

El material de autoría se mantiene fuera de Git y de la publicación estática. En staging se recalculó el SHA-256 desde PostgreSQL para cada fuente y ambos coincidieron. Esta tabla del manifiesto registra identidad e integridad, no sustituye una copia de respaldo autorizada del activo.

La función Edge `protected-course-key` está activa en staging, versión 3, con verificación JWT. La función compara slug, versión y SHA-256 antes de servir contenido. `qa_access_enabled`, `learner_access_enabled` y `summative_assessment_enabled` están desactivados; no hay una cuenta con licencia comercial de Ortho en staging para una prueba positiva.

La migración crea controles y metadatos, pero no copia automáticamente el contenido desde esta estación. Para una eventual promoción será necesario cargar los activos autorizados de forma explícita, comprobar sus hashes, completar revisión humana y pilotaje y después habilitar cada gate por separado. No cargar ni habilitar en producción antes de esas validaciones.
