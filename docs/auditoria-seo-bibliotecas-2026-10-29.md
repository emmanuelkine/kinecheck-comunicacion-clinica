# Auditoría SEO de bibliotecas — 2026-10-29

## Alcance y evidencia
Base documental: SEOJuice, análisis de 27 URL del 29/10/2026 (calidad B+, rendimiento 86, estructura 64%) y capturas SEOmator (SEO 88/100, social 33/100, E-E-A-T 67/100). Herramientas de auditoría externas no son equivalentes; sus puntajes no deben compararse directamente.

Se cotejaron archivos actuales en main de /, /gratis/, /gratis/profesionales/, /gratis/pacientes/, /campus/, /academy/ y /evidencia-msk/ y una lectura pública de páginas de bibliotecas.

## Hallazgos confirmados en el código
- La biblioteca profesional enlaza a múltiples recursos que SEOJuice había señalado como huérfanos. Repetir la auditoría de rastreo antes de tratarlos como huérfanos.
- La biblioteca general y pacientes tenían imágenes de marca sin dimensiones intrínsecas en algunas instancias; se agregaron width y height correctos.
- Se mejoró la navegación explícita, con enlaces HTML rastreables entre las bibliotecas, Campus y Evidencia MSK.
- En la portada se añadió prioridad de descarga a la imagen de marca visible. Esto no garantiza por sí solo mejoras de LCP.

## Hallazgos del informe externo pendientes de comprobación con laboratorio móvil
- 14 páginas con LCP mayor a 4 s (simulación 4G); algunas se aproximaron a 10.5 s.
- /gratis/ reportó CLS 0.217 en una medición externa.
- 6 páginas excedieron 3 s de tiempo de carga.
- 11 descripciones de longitud considerada mejorable y 2 títulos cortos.
- Algunos enlaces legales pasaban por redirección; confirmar destino final antes de sustituir URL.
- SEOJuice informó señales de indexación conflictivas en una ruta de producto; comprobar robots/canonical/sitemap antes de cambiar.

## Contenido y E-E-A-T
- No se agregaron artificialmente palabras para cumplir una cuota de 300 palabras.
- Conservar citas científicas verificables, autores reales, fechas de actualización explícitas y limitaciones clínicas.
- Las métricas de SEO no validan la calidad de la evidencia científica. Revisar bibliografía, fecha de actualización y revisión profesional para cada recurso antes de publicar nuevas afirmaciones.

## Verificación y resultados
- Inspección estática de HTML: ejecutada en bibliotecas general, profesional, pacientes, Academy, Campus y Evidencia MSK.
- Lectura pública del contenido de las tres bibliotecas: realizada.
- Pruebas Lighthouse móviles comparables pre/post: **no ejecutadas**.
- Core Web Vitals en usuarios reales (CrUX / Search Console): **no disponible**.
- Pruebas automáticas de regresión de repositorio: **no ejecutadas** en este flujo.
- Confirmación de despliegue en Cloudflare Pages: **no verificada**.
- No se puede afirmar una puntuación SEO nueva ni mejoras cuantitativas de velocidad.

## Pruebas de aceptación pendientes
1. Ejecutar Lighthouse móvil al menos 3 veces por URL y comparar medianas de LCP, CLS, INP cuando se disponga de datos de campo y TBT en laboratorio.
2. Verificar directamente canonical, meta robots, Open Graph y sitemap de cada ruta indexable.
3. Rastrear enlaces HTML internos con un crawler, identificar 404 y redirecciones y revisar enlaces a páginas que no deben indexarse.
4. Ejecutar npm test, test:feedback y pruebas de navegador que procedan en CI.
5. Validar el consentimiento, carga de recursos y acceso a biblioteca en móvil sin cuentas; Academy y Horas Disponibles no deben alterarse.
