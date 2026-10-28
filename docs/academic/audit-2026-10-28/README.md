# Auditoría y preparación de Academy por competencias

Fecha: **28 de octubre de 2026**. Base de trabajo: `0c2fd083c6759ff8ba638298419a13c56bf9928a`.

La consulta de producción confirmó ocho configuraciones de evaluación interna activas, 120 preguntas activas en total, umbral de 80/100 y dos intentos. `academic_assessment_pilot=true` y `otec_certification_active=false`. Todos los registros de carga observados conservan `certificate_ready=false`. El nuevo encargo propone 70/100, tres intentos y 60 minutos, sujetos a validación; **no se reemplazaron los criterios vigentes**.

## Alcance comprobado

Se inspeccionaron el catálogo de Academy y sus extensiones, los programas y auditorías versionados, la estructura de tablas de producción, las ocho configuraciones y requisitos de finalización, los conteos del banco y las funciones desplegadas `academic-assessment-status` v3, `academic-assessment-start` v2 y `academic-assessment-submit` v3. Las lecturas de producción fueron de metadatos y código; no se descargaron respuestas ni identidades de estudiantes.

La auditoría curricular detallada previa está en [programas](../programas-validados-2026-10-01.json) y [revisión del catálogo](../course-programs-audit-2026-10-01.md). Sus afirmaciones de revisión completa corresponden a octubre de 2026 y no se presentan como una nueva revisión presencial de todas las pantallas. En esta ejecución no se recorrió de nuevo cada lección protegida de los ocho cursos ni se verificó cada referencia histórica. El archivo [snapshot.json](./snapshot.json) conserva la evidencia actual sin claves ni datos personales.

`course_content` contiene tres cursos publicados (Evidencia, Dolor MSK y Ejercicio); los otros cursos usan activos y funciones protegidos y/o otros repositorios. No se identificó un curso archivado adicional en las configuraciones y archivos revisados. Esto no demuestra que no existan archivos o contenidos externos aún no inventariados.

## Matriz por curso

Las estructuras siguientes proceden del inventario curricular versionado; el estado del examen y la trazabilidad proceden de la consulta actual. Las horas no se recalcularon ni se transformaron en horas OTEC.

| Curso | Programa inventariado | Examen actual | Recorrido registrado | Mejora preparada y brecha académica |
|---|---|---|---|---|
| Más allá del dolor | 8 módulos, 32 lecciones | 15 preguntas; 80%; 2 intentos | `routeComplete` sincronizado | Caso longitudinal de siete etapas, revisión de hipótesis, contexto, comunicación y cambio de riesgo. Prioridad como curso insignia. Falta revisión humana y forma alternativa. |
| Dolor Lumbar Persistente | 9 módulos, 54 microlecciones | Igual | Actividad final en servidor; recorrido completo pendiente | Caso de función, error de medición y evolución neurológica. La verificación de actividades v2 es explícita por registro académico, sin inferir aprobación de un porcentaje. |
| KineCheck Clínico | 10 módulos, 30 experiencias | Igual | Trazabilidad integral pendiente | Caso de rodilla caliente y priorización de derivación. No convertir la evaluación en comprobación de casillas. |
| Comunicación Clínica | 12 módulos, 154 diapositivas, 60 preguntas formativas | Igual, más actividad final | `routeComplete`; puntajes formativos originados en cliente | Caso de etiqueta diagnóstica, reparación comunicacional y teach-back. La longitud de un texto no se usa como calificación de calidad. |
| Evidencia Aplicada | 10 módulos, 35 experiencias | Igual | Experiencias y actividades en `learning_progress` | Caso original con datos explícitamente simulados, riesgo absoluto/relativo, precisión, daño y aplicabilidad. No se atribuyen las cifras a un estudio inexistente. |
| Traumatología y Ortopedia Clínica | 6 módulos, 24 lecciones | Examen interno más evaluación legada | `routeComplete`; puntajes legados requieren cautela | Caso de deterioro tras procedimiento, triage y límites profesionales. Conservar derechos y resultados legados. |
| Dolor Musculoesquelético | 6 módulos, 12 experiencias, 7 entregas | Igual | Actividades y entregas registradas | Caso de mecanismos como hipótesis y límites de cuestionarios. No diagnosticar por descarte o por un puntaje aislado. |
| Ejercicio Terapéutico | 5 módulos, 5 casos, 10 decisiones | Igual | `routeComplete` de cinco módulos | Caso FITT-VP, preferencias y síntomas nuevos al esfuerzo. No imponer dosis universal ni activar un curso o permiso antes de su estado autorizado. |

Banderas Clínicas, Escalas, Pruebas Especiales, Lab, Estudiante, Recupera, la guía complementaria y Pack Estudiante conservan su clasificación de herramientas, aplicaciones o paquete. No se inventó Pack Profesional ni se convirtieron en cursos certificables. Exercise, Campus, Horas Disponibles y biblioteca gratuita están fuera de las modificaciones.

## Hallazgos y tratamiento

| ID | Prioridad | Evidencia | Tratamiento en esta rama | Estado real |
|---|---|---|---|---|
| A01 | P1 | El repositorio guarda una versión antigua de `academic-assessment-status`; faltan los start/submit actuales en la carpeta de funciones | Documentar divergencia y conservar el flujo actual; v2 es una función distinta | Despliegue reproducible legado pendiente; no sobrescribir producción desde archivos antiguos |
| A02 | P1 | `course_assessment_items` carece de columnas de módulo, RA, competencia, nivel cognitivo y validación individual | Esquema v2 con metadatos y revisión por ítem | Implementado y probado localmente; no instalado |
| A03 | P1 | El banco actual contiene 15 ítems por curso, sin campos de caso y etapa | Nueva estructura de casos secuenciales y respuestas justificadas | Ocho borradores; no banco validado |
| A04 | P1 | Funciones actuales leen/corrigen/actualizan en varias solicitudes; no se observó plazo de examen ni snapshot completo inmutable | RPC transaccional con bloqueo, snapshot, plazo, intentos e idempotencia | Probado en PostgreSQL local; carga concurrente real pendiente |
| A05 | P1 | Finalización y aprobación se consolidan en `course_completions` con distintos `verification_level` | Tablas v2 independientes de finalización, intentos, revisión, aprobación y certificados | Implementado localmente; sin reinterpretar historial |
| A06 | P1 | Clínico y Lumbar tienen trazabilidad integral pendiente | Verificación explícita por registrar con lista de actividades y evidencia; no aceptar autosolicitud | Integración automática de sus lecciones permanece pendiente |
| A07 | P1 | Texto/checkbox/longitud acredita entrega, no calidad | Rúbricas analíticas, feedback humano y puerta crítica independiente del puntaje | Motor probado; calibración de evaluadores pendiente |
| A08 | P1 | No existe convenio OTEC habilitado en el flag observado | Interruptor separado, emisor habilitado, referencias contractuales y documento real antes de registrar emisión | No activado ni certificado emitido por esta ejecución |
| A09 | P2 | Conciliación debe distinguir aprobación de emisión | Reporte de certificados emitidos, clave única y estado de anulación/crédito; moneda CLP | Lógica probada; Excel incluye plantilla sin datos reales |
| A10 | P2 | Reportes antiguos describen evaluaciones ausentes o pendientes que hoy están activas | Snapshot fechado y matriz separan legado vigente de propuesta v2 | Documentado; no reescribir la historia de auditoría |
| A11 | P2 | La calidad psicométrica no se infiere de que una pregunta esté activa | Conteos descriptivos con n real; sin discriminación, fiabilidad ni validez ficticias | Pilotaje y análisis psicométrico pendientes |
| A12 | P2 | Nuevos criterios no pueden aplicarse retroactivamente por inferencia | Matrícula v2 opt-in y evidencia de condiciones; misma licencia actual | Requiere política aprobada para cualquier migración de estudiantes |
| A13 | P2 | Una nueva UI requiere validación móvil/teclado | Página de piloto independiente, semántica de formularios, foco y estados distintos | Consultar evidencias de pruebas; no se afirma accesibilidad universal |

## Diseño instruccional preparado

Se elaboraron **ocho casos originales y 56 respuestas justificadas**, siete por caso, con contexto progresivo, RA existentes como referencia, nivel cognitivo, puntaje, fuentes, rúbrica, error frecuente y feedback formativo. Son borradores privados de revisión, no se incluyen como claves en este repositorio público ni se cargan en producción.

Propuesta de distribución: 15% fundamentos, 25% interpretación, 30% razonamiento, 15% incertidumbre y evidencia, 15% seguridad/comunicación/seguimiento. Cada borrador suma 100. La propuesta de siete respuestas integradas evita aumentar artificialmente lecciones y debe pilotarse; no se declara equivalente a un examen validado de 30 preguntas. Falta una Forma B independiente antes de habilitar reintentos sumativos sobre este contenido.

Cada módulo debe revisarse con la secuencia: problema y objetivos observables; conceptos y fuentes; ejemplo aplicado; respuesta antes de la información nueva; contraste y feedback formativo; error frecuente; síntesis y transferencia. Este estándar es una guía de edición, **no una afirmación de que todas las lecciones actuales ya se reescribieron**. No se añadió publicidad de recursos aún no disponibles.

## Revisión científica focalizada

La fecha de revisión de los borradores es 2026-10-28. No equivale a una actualización exhaustiva de toda la bibliografía de los cursos. Se contrastaron las siguientes fuentes primarias/institucionales:

- [OMS, guía 2023 de dolor lumbar crónico primario](https://www.who.int/publications/i/item/9789240081789): alcance en atención primaria y comunitaria; no sustituye el triage de causas específicas.
- [NICE NG59](https://www.nice.org.uk/guidance/ng59/chapter/recommendations): alternativas diagnósticas ante cambios y utilidad contextual de imagen. La descarga directa devolvió 403; se verificó el texto indexado del dominio oficial.
- [NICE NG197](https://www.nice.org.uk/guidance/ng197/chapter/Recommendations): decisiones compartidas y comunicación de riesgos e incertidumbre; misma limitación de descarga directa.
- [SANJO 2023](https://jbji.copernicus.org/articles/8/29/2023/), DOI 10.5194/jbji-8-29-2023: sospecha de infección articular y coordinación con equipo habilitado.
- [Cochrane Handbook, capítulo 15](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-15): interpretación de magnitud, precisión e importancia; las cifras del caso de Evidencia son simuladas.
- [IASP, registro de revisión conceptual de dolor nociplástico](https://www.iasp-pain.org/publications/pain-research-forum/papers-of-the-week/paper/the-concept-of-nociplastic-pain-where-to-from-here/): cautela ante signos no específicos. Se utilizó el resumen institucional; no se declara revisión completa del artículo a texto completo.

## Publicación y decisiones pendientes

Esta rama prepara infraestructura y materiales para revisión. No modifica flags, tablas, contenido, permisos ni funciones en producción. No despliega nuevos exámenes sumativos. No activa OTEC ni SENCE. El estado de implementación y pruebas está en [implementación](./IMPLEMENTATION.md) y [verificación](./VERIFICATION.md).

La validación académica, la aprobación de criterios, la cobertura curricular de cada instrumento, las adaptaciones de accesibilidad, el pilotaje y la calibración humana siguen abiertos. El convenio, la entidad emisora y la plantilla oficial requieren evidencia contractual. El informe de despliegue de esta ejecución es **no desplegado; pendiente de validación y revisión del PR**, no un cierre ficticio.
