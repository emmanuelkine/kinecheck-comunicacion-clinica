# Informe de conformidad — PR #252

**Registro histórico del 23 de octubre.** El estado posterior se documenta en el [informe del 26 de octubre](../pr252-2026-10-26/INFORME_CONFORMIDAD.md) y en el cierre del PR.

**Resultado: conformidad parcial. La reparación de activos aprueba; la fusión y la publicación quedan bloqueadas por pruebas fallidas.**

Fecha: 23 de octubre de 2026. Cierre documental: 2026-10-23T16:29:11-03:00 (America/Santiago). Repositorio: `emmanuelkine/kinecheck-comunicacion-clinica`. Código probado: `e7890dd9217125c576ef0cd0fbb4f8851eada133`. Base contrastada: `17d619eb120e004f0dfc23f97c1ff837d66a2c25`.

## Resultado verificable

| Comprobación | Resultado real |
| --- | --- |
| Auditoría de archivos | 27/27 procesados: 14 raster, 12 SVG y 1 PDF; sin hallazgos de marca externa, errores ni omisiones del escáner. Aprobada también en CI. |
| Revisión visual | 26/26 gráficos y 23/23 páginas del PDF examinados individualmente. Sin marca externa observada; observaciones editoriales registradas. |
| Regresión del WebP | 3/3 pruebas aprobadas: contenedor válido, rechazo de truncamiento y detección de marcas en texto extraído. |
| Suite Node completa | 131 pruebas: 119 aprobadas, 12 fallidas, 0 omitidas. Confirmado localmente y en CI. |
| Comparación con main | 128 pruebas: 115 aprobadas y 13 fallidas. Los 12 fallos actuales ya estaban en esa base; se corrigió el fallo de referencias inmutables de Actions. |
| Navegador en CI | 57 casos con Chromium real: 47 aprobados, 10 fallidos, 0 omitidos, 0 inestables. |
| Ocho programas independientes de navegador/endurecimiento | 3 aprobados y 5 fallidos en CI. Se ejecutaron todos aunque existieran fallos anteriores. |
| Sintaxis | 187 archivos JavaScript/MJS/CJS analizados con `node --check`; 0 errores. |
| Siete rutas del control principal | 7 respuestas HTTP 200; sin términos de marca externa detectados en su HTML. |
| Ampliación de páginas públicas | 129 rutas solicitadas: 128 respuestas finales HTTP 200; `/secure-index.html` devolvió 403, código 1010, al cliente utilizado. |
| Descargas de producción | Las 27 peticiones del cliente de descarga devolvieron 403. No se certifica igualdad de los binarios publicados con el repositorio. |
| Cloudflare Pages | Despliegue de vista previa exitoso. No es una publicación de este PR en producción. |
| Fusión / producción del PR | No realizadas: no se cumplió la condición solicitada de aprobar las pruebas. |

Los 46 archivos ejecutables de `tests/` fueron inventariados e invocados. El detalle está en [inventario-pruebas.json](inventario-pruebas.json). Los bloqueos locales de Chromium se resolvieron ejecutando la suite completa en GitHub Actions; las cifras finales de navegador proceden de esa ejecución, no de intentos locales sin navegador.

## Recuperación del WebP

El archivo `assets/evidence/kinecheck-mecanismos-tratamiento.webp` tenía 14.729 bytes y declaraba 48.830 en RIFF. Pillow y FFmpeg no lo decodificaban; modificar únicamente la longitud del contenedor tampoco lo reparaba. El commit que incorporó el archivo, `7ec0f8919210c8ff8cbc075c22586ddffea748e1`, identifica la URL del material original.

Se recuperó ese PNG histórico y se convirtió a WebP **sin pérdida, sin redimensionar, sin regenerar la imagen ni editar textos o diseño**. Se comprobó igualdad exacta de todos los bytes RGBA decodificados entre PNG y WebP. La imagen recuperada tiene 1024 × 1536 píxeles y el WebP mide 1.469.852 bytes.

| Evidencia | SHA-256 |
| --- | --- |
| PNG histórico recuperado | `f8ba1f6be70523d54006c595e7204bcf201d21a36a61405fd1a85195b92d7b8b` |
| WebP restaurado | `01eea820fe6448b7a1619074ceae2435bcd31a28f1b7e50dbaa50dbdaafdb089` |
| WebP dañado anterior | `5253d8b837a4019c01d3bd36ce1fdad0e5c8ba536e44b8a7548a74e8c9422436` |

La igualdad demostrada corresponde al PNG recuperado. No puede compararse el contenido de píxeles con el WebP anterior, porque no se decodifica. La procedencia se apoya en la URL de su commit de incorporación. [Prueba de recuperación](recuperacion-webp.json).

La página actual de mecanismos utiliza un resumen HTML. Se conservaron su contenido clínico, sus enlaces y su identidad visual; este PR no edita ese HTML.

## Reparación del procesamiento

El escáner valida firma, tamaño RIFF y límites de chunks WebP; decodifica los raster a resolución nativa en PNG temporales; inspecciona metadatos y texto OCR en español e inglés; renderiza todas las páginas del PDF y verifica el recuento. Cada archivo registra SHA-256, métodos realizados y errores. Una herramienta ausente, un archivo truncado o una extracción fallida hacen fallar la auditoría. Los temporales son únicos por ejecución y se eliminan al finalizar.

El control de SVG comprende su fuente; su aspecto se revisó mediante renderizado. El OCR de raster y PDF no sustituye esa revisión visual. Se fijaron las referencias de Actions y la versión de Pillow, se conservan los artefactos incluso ante fallos y se añadió la suite Node completa como control independiente.

Durante la validación se detectó que el log canalizado por `tee` podía devolver un estado verde aunque `npm test` fallara. Se corrigió con `pipefail` y se verificó en una nueva ejecución: `regressions` figura correctamente en **failure**. Los estados verdes anteriores de ese trabajo no se usan como evidencia de aprobación. También se amplió el límite de instalación de dependencias tras observar una descarga de APT agotada; la auditoría posterior terminó correctamente.

## Revisión visual de los 26 gráficos

Se verificaron letras, marca visible, renderizado y legibilidad. Ninguno de estos resultados equivale a certificar la corrección clínica de todas las afirmaciones.

| N.º | Archivo | Observación visual |
| --- | --- | --- |
| 1 | `agentes-fisicos/anatomy-clinical-plate.webp` | Lámina anatómica sin texto externo visible. |
| 2 | `assets/brand/kinecheck-3d-compact.webp` | Nombre y check KineCheck legibles en formato compacto. |
| 3 | `assets/brand/kinecheck-3d-favicon.png` | Favicon de 32 px: símbolo de KineCheck. |
| 4 | `assets/brand/kinecheck-3d-header.webp` | Logotipo y descriptor de salud musculoesquelética legibles. |
| 5 | `assets/brand/kinecheck-3d-horizontal.png` | Logotipo horizontal y descriptor conservados. |
| 6 | `assets/brand/kinecheck-3d-social.png` | Composición social con identidad KineCheck. |
| 7 | `assets/brand/kinecheck-3d-symbol-192.png` | Símbolo de marca de 192 px. |
| 8 | `assets/brand/kinecheck-3d-symbol-512.png` | Símbolo de marca de 512 px. |
| 9 | `assets/brand/kinecheck-3d-symbol-64.png` | Símbolo de marca de 64 px. |
| 10 | `assets/clinical-room-no-people-20260924.png` | Sala clínica ilustrada, sin texto externo visible. |
| 11 | `assets/evidence/kinecheck-mecanismos-tratamiento.webp` | Infografía recuperada: título, cuatro bloques, aplicación y referencia legibles. |
| 12 | `assets/kinecheck-mark.svg` | Check vectorial de marca. |
| 13 | `assets/qr/kinecheck-gratis-qr.png` | QR PNG con margen blanco; revisión visual realizada. |
| 14 | `assets/qr/kinecheck-gratis-qr.svg` | QR SVG renderizado sobre blanco; revisión visual realizada. |
| 15 | `assets/visuals/comunicacion-clinica-intervencion-hero.webp` | Ilustración conceptual de comunicación clínica, sin texto externo visible. |
| 16 | `gratis/ejercicio-dolor-lumbar/carga-progresiva.svg` | Gráfico de progresión: rótulos legibles; relleno triangular negro preexistente. |
| 17 | `gratis/ejercicio-dolor-lumbar/columna-lumbar.svg` | Esquema lumbar y rótulos educativos legibles. |
| 18 | `gratis/ejercicio-dolor-lumbar/movimiento-funcional.svg` | Movimiento y función; firma KineCheck visible. |
| 19 | `gratis/neuromodulacion/neuromodulacion.svg` | Neuromodulación: rótulos legibles. |
| 20 | `gratis/rehabilitacion-personalizada/rehabilitacion.svg` | Rehabilitación: texto de Persona excede el círculo, pero se puede leer. |
| 21 | `gratis/tendinopatias/aquiles.svg` | Aquiles: rótulos y advertencia de esquema conceptual legibles. |
| 22 | `gratis/tendinopatias/gluteo.svg` | Glúteo medio: rótulos y advertencia conceptual legibles. |
| 23 | `gratis/tendinopatias/rotuliano.svg` | Tendón rotuliano: rótulos y advertencia conceptual legibles. |
| 24 | `recursos/banderas-clinicas.svg` | Banderas: tres columnas, ejemplo y referencias legibles. |
| 25 | `recursos/neuroimagen-fibromialgia/neuroimagen-redes-fibromialgia.webp` | Ilustración de redes cerebrales, sin texto externo visible. |
| 26 | `recursos/que-mide-una-escala-clinica/resumen-escalas.svg` | Escalas: instrumentos, persona/contexto e interpretación legibles. |

Los QR se revisaron visualmente y la ruta `/qr` se comprobó por HTTP. No se decodificó su matriz con un lector independiente; no se declara esa validación. [Registro visual completo](revision-visual.json).

## Revisión del PDF

Se examinaron las páginas 1 a 23, incluyendo cubierta, tablas, diagramas, casos, referencias, marcas de agua y cierre. No se observaron marcas externas. El PDF permaneció idéntico en bytes.

Observaciones de presentación: la página 11 está vacía salvo marca de agua y pie; un recuadro iniciado en la página 15 continúa en la 16. El resto del material se pudo leer en los renderizados examinados. Estas observaciones impiden describir la maquetación como impecable; no se alteró el material clínico.

## Fallos de la suite Node

Los siguientes 12 fallos se reprodujeron y se encuentran también en la base contrastada. No se desactivaron pruebas ni se modificaron sus aserciones para obtener estados verdes.

1. Academy exposes truthful assessment status without an attempt action.
2. every free-library card link has a stable tracking slug.
3. library loads consent metrics and emits generic and eBook events.
4. el visitante puede informarse y cambiar su elección.
5. the OTEC review package specifies all eight assessment designs.
6. el POST SSO productivo de Estudiante permanece intacto.
7. la portada agrupa el título móvil sin partir palabras clínicas.
8. la portada referencia assets críticos existentes y versionados.
9. la portada simplificada conserva soporte, tres perfiles y acceso canónico.
10. la arquitectura de marca queda distribuida por perfil sin duplicarse en portada.
11. los perfiles activos publican precios y Recupera permanece sin compra.
12. la política conserva la advertencia sin certificación completa de nueve garantías.

[Log íntegro de la suite actual](npm-test.log) · [Log de main](npm-test-base-main.log).

## Fallos de los 57 casos de navegador

Los 10 casos fallidos corresponden a inicialización de Academy, acceso/curso Clínico y expectativas de portada o marca 3D de la biblioteca:

- tests/academy-initialization.spec.mjs:16:1 › Academy inicializa aplicaciones, cursos y relay Estudiante sin excepciones DOM.
- tests/clinico-buttons.spec.mjs:9:3 › KineCheck Clínico · controles móviles › acceso: no duplica correo y contraseña cuando falta sesión.
- tests/clinico-buttons.spec.mjs:22:3 › KineCheck Clínico · controles móviles › acceso: reutiliza automáticamente la sesión del ecosistema.
- tests/clinico-buttons.spec.mjs:60:3 › KineCheck Clínico · controles móviles › curso: temario, módulos, comprobación y progreso.
- tests/tester-visual-audit.spec.mjs:122:3 › public-mobile: portada, imágenes y controles están utilizables.
- tests/tester-visual-audit.spec.mjs:122:3 › public-tablet: portada, imágenes y controles están utilizables.
- tests/tester-visual-audit.spec.mjs:122:3 › public-desktop: portada, imágenes y controles están utilizables.
- tests/tester-visual-audit.spec.mjs:289:5 › identidad 3D biblioteca-gratuita mobile.
- tests/tester-visual-audit.spec.mjs:289:5 › identidad 3D biblioteca-gratuita tablet.
- tests/tester-visual-audit.spec.mjs:289:5 › identidad 3D biblioteca-gratuita desktop.

Se observaron, entre otras causas, un selector de Academy que coincide con dos elementos, un enlace de acceso con valor distinto al esperado, un payload privado ausente del checkout público y expectativas de títulos o selectores que no coinciden con la interfaz actual. La ausencia de un payload privado no autoriza publicarlo para satisfacer una prueba. Antes de una aprobación global se debe resolver cada discrepancia según el contrato funcional vigente. [Resultados de los 57 casos](casos-navegador.json).

Los ocho programas independientes de CI dieron: tres aprobados (`mi-kinecheck-roles`, `platform-hardening-post-privacy` y `product-overflow-diagnostic`) y cinco fallidos (`launch-readiness-post-privacy`, `launch-readiness-public`, `platform-hardening`, `public-canonical-readiness` y `library-feedback-browser`). Este último agotó la espera de una expectativa del widget. Sus logs completos se conservan en [logs-navegador-ci](logs-navegador-ci).

## Validaciones adicionales locales

La tabla conserva cada programa distinto; el alias `npm run test:disaster-recovery` también se ejecutó y corresponde al mismo validador DR listado. El validador de DR es estático: no se repitió recuperación de bases de datos.

| Programa | Resultado local |
| --- | --- |
| `node tests/launch-readiness-post-privacy.spec.mjs` | Fallida |
| `node tests/launch-readiness-public.spec.mjs` | Fallida |
| `node tests/mi-kinecheck-roles.spec.mjs` | Fallida |
| `node tests/platform-hardening-post-privacy.spec.mjs` | Aprobada |
| `node tests/platform-hardening.spec.mjs` | Fallida |
| `node tests/public-canonical-readiness.spec.mjs` | Fallida |
| `node tests/library-feedback-browser.mjs` | Fallida |
| `node tests/product-overflow-diagnostic.mjs` | Fallida |
| `node scripts/dashboard-closeout-check.mjs` | Aprobada |
| `node scripts/healthcheck.mjs` | Inconclusa: límite de 180 s |
| `node scripts/qa-commercial-post-privacy.mjs` | Aprobada |
| `node scripts/qa-commercial.mjs` | Fallida |
| `node scripts/qa-publication-readiness.mjs` | Fallida |
| `node scripts/security-baseline.mjs` | Aprobada |
| `node scripts/validate-academy-integrity.mjs` | Aprobada |
| `node scripts/validate-academy-ui-contracts.mjs` | Aprobada |
| `node scripts/validate-commercial-funnel-instrumentation.mjs` | Fallida |
| `node scripts/validate-disaster-recovery.mjs` | Aprobada |
| `node scripts/validate-ecosystem-access-v2.mjs` | Aprobada |
| `node scripts/validate-ecosystem-access.mjs` | Fallida |
| `node academy/verify-kinecheck-access.mjs` | Aprobada |

`healthcheck` no produjo un resultado final dentro de 180 segundos; no se contabiliza como aprobado. Algunas pruebas locales de navegador fallaron por falta del ejecutable; los resultados funcionales posteriores están en CI. [Detalle y tiempos](validaciones-adicionales.json) · [Logs locales](logs-adicionales).

## Páginas públicas y límites

Se solicitaron todos los HTML versionados salvo directorios de documentación, scripts, tests y workflows, además del acceso QR. Se registraron URL final, estado, título, tamaño y hash cuando hubo respuesta. Las 128 respuestas 200 no mostraron términos de marca externa en su HTML. La ruta `secure-index.html` devolvió 403 al cliente usado. Un error inicial de mapeo de ese nombre se corrigió y se sustituyó por la solicitud de su ruta real; el control no cuenta la ruta errónea como página del producto. [Evidencia HTTP](paginas-publicas.json).

La portada se inspeccionó en el navegador conectado: marca, título y navegación visibles, sin errores de consola observados en esa lectura. Las navegaciones posteriores no terminaron; la sesión alternativa también agotó su tiempo. Por tanto, no se declara una revisión visual completa en navegador de las 129 páginas ni una validación en Safari/iPhone físico.

Las descargas de los 27 binarios de producción y del WebP de vista previa fueron rechazadas con HTTP 403 para el cliente empleado. El estado de despliegue de Cloudflare sí se verificó mediante su check de commit, pero no se convierte esa señal en una comprobación visual o de igualdad binaria del servidor público. [Descargas de producción](descargas-produccion.json).

No se ejecutó el workflow manual de SSO autenticado con credenciales de producción ni se verificaron compras reales. Los tests de navegador de esta auditoría usan contexto local y datos sintéticos. La revisión no evalúa exhaustivamente la exactitud clínica, accesibilidad, seguridad global ni todas las referencias bibliográficas.

## Evidencia de CI y decisión de publicación

Código de referencia probado: `e7890dd9217125c576ef0cd0fbb4f8851eada133`. El informe se añade después sin modificar los archivos de aplicación ni la imagen ya probada.

| Control | Conclusión del servidor | Evidencia |
| --- | --- | --- |
| Cloudflare Pages | success | [Registro](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/runs/120609766353) |
| validate-publication | success | [Registro](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40010591083/job/120609646579) |
| regressions | failure | [Registro](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40010590952/job/120609646407) |
| browser-regressions | failure | [Registro](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40010590952/job/120609646327) |
| binary-audit | success | [Registro](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40010590952/job/120609646167) |
| scan | success | [Registro](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40010590945/job/120609645593) |

Artefactos: [auditoría de activos](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40010590952/artifacts/12526655808) y [navegador](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40010590952/artifacts/12526546147). La retención configurada en Actions es de 14 días; los resúmenes, hashes y logs principales de este directorio quedan versionados.

**Decisión: mantener el PR abierto, sin fusionar y sin desplegar la reparación en producción.** La auditoría de marca de los activos tiene conformidad dentro del alcance documentado. La conformidad global y la publicación no se aprueban con 12 fallos de Node, 10 casos fallidos de navegador y cinco programas independientes fallidos. El siguiente paso técnico es conciliar esas pruebas y contratos funcionales, volver a ejecutar la suite y comprobar producción después de una fusión que cumpla la condición solicitada.
