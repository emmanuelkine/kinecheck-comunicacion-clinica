# KineCheck Ortho · estado editorial 0.3

**Título:** Rehabilitación Musculoesquelética Avanzada: del razonamiento clínico a la intervención basada en evidencia.
**Estado:** contenido autoral completo en staging y en revisión editorial inicial; todavía no es un curso aprobado ni publicado.
**Público:** kinesiólogos, fisioterapeutas, profesionales MSK y estudiantes avanzados con actividades de nivelación.
**Modalidad propuesta:** asincrónica, en línea.
**Carga propuesta:** 50 horas; suma de módulos desarrollados, aún no validada mediante pilotaje de tiempo.

## Estado comprobable al 28-10-2026

- **Implementado:** 12 lecciones profundas, una por módulo; cada una tiene resultados observables, requisitos, explicación por secciones, ejemplo clínico, esquema conceptual original, recomendaciones enlazadas a afirmaciones con nivel de certeza, incertidumbre, algoritmo, actividad, tres preguntas formativas con retroalimentación por alternativa, síntesis y referencias.
- **Implementado:** 12 casos originales progresivos, de 5 etapas cada uno excepto el integrador final con 6; decisiones con opciones clínicamente plausibles, consecuencia educativa y rúbrica analítica de seis dominios, incluido un criterio crítico de seguridad.
- **Implementado:** examen integrador borrador con 12 preguntas vinculadas a los 12 casos, alternativas plausibles, retroalimentación, referencias y seis ítems críticos de seguridad. Permanece desactivado y requiere versionamiento con clave privada en Academy v2.
- **Implementado:** ocho rutas de especialización con módulos reutilizados, competencias y evaluación propia basada en un caso longitudinal específico. Su contenido es reutilizado y filtrado del núcleo; todavía no constituye ocho cursos autónomos con bancos independientes validados.
- **Implementado:** progreso de estudio local, módulos marcados, marcadores de lección, reanudación local, biblioteca de referencias y estados separados de finalización, aprobación y certificado. Estos datos aún no se sincronizan con Academy y no son registros académicos.
- **Implementado:** auditoría documental interna del Módulo 1 con 30 afirmaciones atómicas. Se revisaron CIF, dolor/nocicepción, ejercicio con dolor, pronóstico, práctica basada en evidencia, GRADE, metas y autogestión; se corrigieron cuatro secciones, dos preguntas y tres retroalimentaciones. La matriz está en `MODULE_01_CLAIM_AUDIT.md` y no se registró como revisión por pares.
- **Implementado:** migración de controles de publicación, activos protegidos y panel docente agregador aplicada sólo a Supabase staging. La edición activa de autoría es `2026.10-authoring-3`; los archivos de 162,118 y 13,280 bytes están en `academy_ortho.content_assets` y ambos SHA-256 se recalcularon en PostgreSQL con coincidencia exacta. `qa_access_enabled`, `learner_access_enabled`, `summative_assessment_enabled`, `commercial_enabled` y `otec_issuance_enabled` siguen falsos.
- **Implementado:** Edge Function `protected-course-key` desplegada en staging, versión 4, verificación JWT activa. Ortho se sirve desde el esquema privado sólo si hay acceso válido y el flag QA/publicación permite el entorno; los otros cursos conservan la descarga desde `course-assets`.
- **Implementado:** producto Hotmart y ocho ofertas se prepararon con estado `unconfigured`, sin ID, plazo de licencia, precio ni activación. No se creó producto ni se generó cobro.
- **Implementado:** requisitos, dominios, evidencia y protocolo de pilotaje se estructuraron en la migración; la revisión y el pilotaje siguen pendientes porque no se han recibido registros reales.
- **Bloqueado:** no existe en staging una licencia Ortho comercial real identificada para la prueba de acceso positiva. No se creó una licencia ficticia para sustituirla.
- **Bloqueado:** no hay confirmación documental de convenio ni autorización OTEC. No se puede habilitar solicitud/emisión real.
- **Implementado:** panel docente Ortho con métricas agregadas de eventos reales, distribución de calificaciones, resultados por competencia, proporción de error por ítem, versiones, revisiones, pilotajes, controles y configuración comercial; incluye descarga CSV sin identificadores. La consulta exige sesión Supabase confirmada y rol académico. La API Ortho exige variables explícitas de Supabase staging y no recurre al proyecto productivo.
- **Probado:** suite completa del repositorio: 207/207 pruebas aprobaron con concurrencia serial (45 s); la verificación enfocada de contenido y contrato Ortho aprobó 11/11. Migraciones staging aplicadas, RPC presente, `anon` sin permiso y `authenticated` con permiso sujeto a autorización interna; cero matrículas Ortho observadas y todos los gates siguen apagados. Hashes de ambos activos verificados en staging. El despliegue de Edge Function quedó `ACTIVE` con JWT obligatorio.
- **Pendiente:** el RPC no se ha ejercido con una sesión real de rol académico; no hay matrículas ni intentos con los que contrastar agregados y exportación en vivo. La visibilidad del panel depende de configurar `ORTHO_SUPABASE_URL` y `ORTHO_SUPABASE_PUBLISHABLE_KEY` como secretos/variables de staging.
- **Pendiente:** prueba de navegador completa: Playwright WebKit no inicia por librerías del sistema ausentes; la descarga de Chromium falló en este entorno. La auditoría automática aXe del alumno no se pudo ejecutar.
- **Pendiente:** auditoría equivalente de los módulos 2 a 12. En el Módulo 1 se revisaron textos completos de nueve fuentes principales y se conservaron guías previamente verificadas para imagen y seguridad; esto no equivale a revisión humana independiente ni valida los otros módulos.
- **Pendiente:** revisión humana clínica, científica, pedagógica y de accesibilidad; piloto de tiempo, evaluación e interpretación; activación de progreso académico remoto; configuración Hotmart y convenio OTEC.

## Estructura curricular propuesta

| Módulo | Horas | Competencia foco | Caso que se desarrollará |
|---|---:|---|---|
| 1. Fundamentos de rehabilitación musculoesquelética | 3 | Formular objetivos de función con modelo biopsicosocial, CIF, pronóstico y contexto | Dolor persistente con discordancia entre síntomas, función y hallazgos de imagen |
| 2. Razonamiento clínico avanzado | 5 | Construir hipótesis, estimar probabilidad y decidir examen, manejo o derivación | Dolor cervical con parestesias, evolución cambiante y señales neurológicas por aclarar |
| 3. Evaluación musculoesquelética | 4 | Seleccionar medidas fiables y relevantes; interpretar hallazgos sin sobrediagnosticar | Dolor de hombro con examen discordante y alta demanda laboral |
| 4. Prescripción del ejercicio terapéutico | 6 | Individualizar FITT-VP, RPE/RIR, progresión, autorregulación y adherencia | Tendinopatía con baja tolerancia a carga, barreras de tiempo y respuesta variable |
| 5. Rehabilitación del hombro | 4 | Diferenciar presentaciones clínicas y acordar un plan según objetivos y respuesta | Dolor relacionado con manguito, pérdida de función y expectativa de imagen |
| 6. Codo, muñeca y mano | 3 | Razonar carga, movilidad, fuerza y función de la extremidad superior | Dolor lateral de codo con alta exposición laboral y síntomas de cuello coexistentes |
| 7. Cadera y pelvis | 3 | Priorizar función, tolerancia y diagnósticos diferenciales de dolor de cadera | Dolor lateral de cadera y artrosis radiográfica incidental posible |
| 8. Rodilla | 5 | Progresar fuerza y tareas según déficit, objetivos, riesgo y desempeño | Rodilla post LCA con déficits de fuerza, temor al salto y metas deportivas |
| 9. Tobillo y pie | 3 | Integrar carga, equilibrio, función y criterios multidimensionales de retorno | Esguinces recurrentes con inestabilidad percibida y demanda de cambio de dirección |
| 10. Columna vertebral | 4 | Integrar evaluación neurológica, pronóstico, educación, ejercicio y derivación | Lumbalgia persistente con síntomas radiculares y cambios recientes |
| 11. Rehabilitación posoperatoria | 4 | Aplicar restricciones del procedimiento, comunicación interprofesional y progresión por criterios | Persona tras artroplastia con comorbilidad y discrepancia entre hoja quirúrgica y metas |
| 12. Integración clínica avanzada | 6 | Integrar evidencia, preferencias, incertidumbre, modificación y alta | Caso con comorbilidad, más de una fuente probable de síntomas y respuesta parcial |
| **Total** | **50** |  |  |

La suma de 50 horas está desglosada por módulo, no por tiempo observado. Aún debe medirse lectura, microlecciones, práctica, casos, retroalimentación y evaluación con estudiantes representativos y con accesibilidad revisada.

## Especificación pedagógica y evaluación

- Cada módulo incluye introducción, requisitos, resultados observables, explicación mecanística por secciones, aplicación clínica, esquema original, algoritmo de decisión, actividad, retroalimentación, evaluación formativa, resumen y bibliografía.
- El contenido incluye 12 casos progresivos; cada caso revela información tras una decisión razonada. Las consecuencias explican razonamiento educativo y no predicen desenlaces reales.
- Distribución propuesta del resultado: evaluación formativa por módulos 30%; casos integradores 30%; examen final 40%.
- Aprobación propuesta: ≥70/100 y cumplimiento separado de todos los criterios críticos de seguridad. Una buena puntuación no compensa una falla crítica.
- Propuesta de reevaluación: hasta tres intentos; entre intentos, revisión de retroalimentación y remediación de los dominios débiles. La parametrización queda pendiente de aprobación académica y pilotaje.
- Las respuestas abiertas requieren corrección humana con rúbrica y fundamento; una pregunta de selección múltiple no demuestra por sí sola razonamiento clínico.
- El flujo de finalización, aprobación y certificado se apoya en la base preparada por PR #290. El progreso local del reproductor no es una finalización oficial. El banco sumativo está en el activo protegido como borrador; todavía no se cargó en Academy v2 ni se activó porque falta revisión por pares.

## Rutas independientes preparadas

| Ruta | Contenido compartido | Requisito y competencia de egreso propuestos | Evaluación propia |
|---|---|---|---|
| Rehabilitación avanzada del hombro | M1–M4, M5 | Formular, medir y progresar un plan de hombro en función de síntomas, objetivos y respuesta | Caso longitudinal de hombro y justificación de medidas |
| Codo, muñeca y mano | M1–M4, M6 | Seleccionar medidas y progresar carga/movilidad respetando tejido, lesión y función de la mano | Caso de extremidad superior con diagnóstico diferencial |
| Rehabilitación de cadera | M1–M4, M7 | Diferenciar problemas de cadera y acordar ejercicio centrado en tareas | Caso de dolor de cadera con medidas funcionales |
| Rehabilitación de rodilla | M1–M4, M8 | Progresar fuerza y desempeño; justificar criterios de retorno sin umbral único | Caso de LCA o artrosis, con decisión de progresión |
| Tobillo y pie | M1–M4, M9 | Integrar fuerza, equilibrio, función y demanda específica | Caso de esguince recurrente con criterio de retorno |
| Rehabilitación posoperatoria | M1–M4, M11 | Traducir restricciones quirúrgicas verificadas en objetivos y carga funcional | Caso posoperatorio con discrepancia de indicaciones que exige coordinación |
| Evaluación y razonamiento MSK | M1–M3, M12 | Reducir incertidumbre mediante información útil, pruebas justificadas y actualización de hipótesis | Caso secuencial de diagnóstico diferencial y derivación |
| Prescripción avanzada del ejercicio | M1, M3–M4, M12 | Diseñar y ajustar una dosis individual, medible y segura | Caso de prescripción con comorbilidad, adherencia y autorregulación |

Todas las rutas permanecen en preparación: sus competencias y casos de evaluación propia están definidos y reutilizan lecciones del núcleo, pero faltan revisiones externas, pilotaje, equivalencias de tiempo y decisión comercial. No tienen precio ni producto Hotmart asignado.

## Fuentes rastreadas para comenzar la revisión

Las referencias están enlazadas a afirmaciones concretas del contenido y llevan nivel de evidencia, alcance y nota de verificación. Se revisaron registros/abstracts de PubMed y páginas oficiales, pero no se ha verificado el texto completo de todas las fuentes ni la aplicabilidad final de cada recomendación. Este trabajo es necesario antes de declarar validez científica.

| Tema | Fuente accesible | Uso previsto y límite |
|---|---|---|
| CIF | [OMS: International Classification of Functioning, Disability and Health](https://www.who.int/Standards/Classifications/International-Classification-of-Functioning-Disability-and-Health) | Marco para organizar funcionamiento, actividad, participación y factores contextuales; no es un diagnóstico etiológico |
| Decisión compartida | [NICE NG197: Shared decision making](https://www.nice.org.uk/guidance/ng197/chapter/Recommendations) | Comunicación de opciones, preferencias y decisiones; guía de salud británica que debe adaptarse al contexto local |
| Lumbalgia y ciática | [NICE NG59: recomendaciones](https://www.nice.org.uk/guidance/ng59/chapter/Recommendations) | Evaluación, imagen, autogestión y ejercicio; actualización principal 2020, requiere comprobación de alertas o guías más nuevas |
| Manguito rotador | [JOSPT 2025 CPG, PMID 40165544](https://pubmed.ncbi.nlm.nih.gov/40165544/) | Diagnóstico, manejo conservador, pronóstico y retorno; adultos con tendinopatía sospechada |
| Dolor patelofemoral | [BJSM 2024 best-practice guide, PMID 39401870](https://pubmed.ncbi.nlm.nih.gov/39401870/) | Síntesis de evidencia, voz de pacientes y juicio experto; considerar población y preferencias |
| Artrosis de cadera | [AAOS CPG summary 2024, PMID 38781351](https://pubmed.ncbi.nlm.nih.gov/38781351/) | Recomendaciones y vacíos de evidencia en OA de cadera |
| Tendinopatías y dosis | [BJSM systematic review/meta-analysis, PMID 37169370](https://pubmed.ncbi.nlm.nih.gov/37169370/) | Componentes de dosis de ejercicio resistido en tendinopatía; no convertir asociación de dosis en receta universal |
| Esguince e inestabilidad de tobillo | [JOSPT 2021 CPG, PMID 33789434](https://pubmed.ncbi.nlm.nih.gov/33789434/) | Esguince lateral e inestabilidad crónica; revisar actualización en curso antes de publicación |
| Retorno tras esguince de tobillo | [Consenso PAASS, PMID 34158354](https://pubmed.ncbi.nlm.nih.gov/34158354/) | Dominios de decisión para retorno deportivo; consenso, no regla validada ni puntos de corte |
| Dolor lateral de codo | [JOSPT 2022 CPG, PMID 36453071](https://pubmed.ncbi.nlm.nih.gov/36453071/) | Diagnóstico diferencial, curso clínico, pruebas y manejo no quirúrgico |
| Fractura distal del radio | [JOSPT 2024 CPG, PMID 39213418](https://pubmed.ncbi.nlm.nih.gov/39213418/) | Pronóstico, examen y rehabilitación; distinguir fijación, etapa y restricciones médicas |
| Rehabilitación de artroplastia total de rodilla | [APTA CPG revision 2026, PMID 42506877](https://pubmed.ncbi.nlm.nih.gov/42506877/) | Guía reciente con recomendaciones y brechas; cotejar procedimiento, comorbilidad y protocolo del equipo quirúrgico |

## Pendientes antes de activar o vender

1. Completar la revisión del texto completo de las fuentes y validar cada afirmación clínica con alcance y fecha.
2. Obtener revisión humana independiente clínica, científica y pedagógica; resolver hallazgos antes de aprobar contenido o banco.
3. Pilotear duración, comprensión, evaluación, navegación móvil y accesibilidad manual con tecnologías de asistencia.
4. Probar flujo de acceso positivo con cuenta y licencia real de Ortho en staging; hoy no existe esa licencia disponible. QA y acceso alumno siguen desactivados.
5. Habilitar persistencia oficial del progreso y las evaluaciones sólo al instalar/versionar el banco aprobado sobre Academy v2.
6. Validar producto Hotmart, identificador, términos de uso, plazo de acceso, precio y conciliación con responsables comerciales; no se asignaron valores por suposición.
7. Confirmar convenio y autorización OTEC documentados; mantener solicitud y emisión apagadas mientras falten.
8. Pilotear el panel docente con una cuenta académica de staging y matrículas autorizadas; contrastar agregados, duración, exportación y permisos cuando existan eventos reales. La implementación del panel está instalada, pero los datos son aún cero/no observados.
9. Completar las rutas como productos autónomos, con contenido filtrado, prerrequisitos y evaluaciones propias revisadas. La estructura y especificaciones están creadas; publicación comercial pendiente.
10. Terminar regresión de navegadores y QA real de producción antes de cualquier fusión/publicación pública.
