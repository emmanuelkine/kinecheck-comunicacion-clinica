# Instrumentos sumativos y protocolo de pilotaje KineCheck

**Versión:** 2026-10-02  
**Estado:** propuesta académica completa para revisión de una OTEC.  
**Alcance:** ocho cursos auditados. No activa certificación, no modifica por sí sola requisitos vigentes y no corresponde a cursos SENCE.

## 1. Propósito

Este documento convierte las brechas detectadas en diseños evaluativos aplicables y auditables. Define qué evaluar, cómo puntuar, qué errores impiden aprobar y cómo validar la carga temporal. La activación requiere aprobación escrita de la versión por la OTEC y despliegue del instrumento en un entorno protegido.

Los bancos de ítems, claves y casos equivalentes deben almacenarse en servidor y no en archivos públicos. Antes de utilizarlos se deben verificar uno a uno contra el contenido y las fuentes originales de la versión del curso.

### Implementación técnica actual

La plataforma contiene un banco protegido de **120 ítems**: 15 por cada uno de los ocho cursos. Las claves y fundamentos permanecen solo en servidor. Academy permite iniciar la evaluación a usuarios autenticados con licencia; Supabase registra curso, versión, intento, respuestas, puntaje, puerta crítica y fecha. El criterio académico interno vigente es **80 %**, con máximo de **dos intentos** y requisito de responder correctamente los ítems críticos de seguridad. Este cierre es de KineCheck: la certificación OTEC sigue desactivada y requiere aprobación escrita independiente.

## 2. Modelo evaluativo propuesto

Para los ocho cursos se implementó una evaluación final objetiva corregida en servidor:

- **15 ítems objetivos** por curso, con decisión clínica, interpretación y seguridad.
- **Aprobación interna KineCheck:** 80 % o más y todas las preguntas críticas de seguridad correctas.
- **No aprobación:** menos de 80 % o fallo de la puerta crítica de seguridad.
- **Intentos:** máximo de dos por versión del curso.
- **Retroalimentación:** posterior al envío, con fundamento por ítem; la clave no se expone antes de cerrar el intento.
- **Registro:** resultado y finalización académica se guardan en servidor.

Este umbral es un **requisito académico interno vigente de KineCheck**. No se presenta como criterio aprobado por una OTEC. Traumatología mantiene además su regla histórica de 80 % modular y final; para certificación externa prevalecerá lo que la OTEC apruebe por escrito.

### Rúbrica transversal del caso integrador

| Dimensión | 0 puntos | 7 puntos | 11 puntos | 14 puntos |
|---|---|---|---|---|
| Identificación del problema | No identifica el problema o responde otro caso. | Identificación parcial, sin jerarquización. | Problema pertinente con alguna omisión. | Problema central y prioridades claramente jerarquizados. |
| Uso de evidencia | Afirmaciones sin respaldo o fuente incompatible. | Menciona evidencia sin interpretar límites. | Usa evidencia pertinente y reconoce al menos un límite. | Integra fuente, magnitud/certeza y límites sin sobreinferir. |
| Decisión y justificación | Conducta incoherente o no justificada. | Conducta plausible con justificación incompleta. | Conducta coherente y reevaluable. | Decisión compartida, proporcional, trazable y con alternativas. |
| Seguridad y alcance | Incumple la condición crítica. | Reconoce riesgo de forma tardía o incompleta. | Conducta segura con límites explícitos. | Prioriza seguridad, derivación/coordinación y alcance profesional. |
| Comunicación y seguimiento | Lenguaje alarmista, determinista o sin seguimiento. | Explicación poco clara o genérica. | Comunicación comprensible y plan de control. | Comunicación no estigmatizante, verificación de comprensión y criterios de reevaluación. |

La dimensión de seguridad se califica, pero además funciona como puerta crítica: una respuesta incompatible con la condición descrita para cada curso no puede aprobar aunque el total matemático alcance 80 puntos.

## 3. Especificación por curso

### 3.1 KineCheck Clínico

**Caso integrador:** persona con dolor musculoesquelético, hallazgos funcionales, una señal de posible patología seria y factores contextuales. El estudiante debe priorizar triage, formular hipótesis, seleccionar medidas y proponer manejo/derivación.

| Resultado evaluado | Evidencia requerida | Ponderación |
|---|---|---:|
| Integrar evaluación clínica y CIF | Problemas, función, participación y contexto | 20 |
| Diferenciar screening de diagnóstico | Hipótesis y límites de pruebas | 20 |
| Seleccionar medidas y PROMs | Elección justificada y plan de reevaluación | 15 |
| Tomar decisiones seguras | Triage, alcance y coordinación | 25 |
| Comunicar plan y seguimiento | Lenguaje, metas y retorno funcional | 20 |

**Condición crítica:** no retrasar derivación cuando la combinación de historia y hallazgos exige evaluación urgente; una bandera aislada no se presenta como diagnóstico confirmado.

**Plan de ítems:** tres de seguridad, tres de interpretación de pruebas, tres de PROMs, tres de CIF/objetivos y tres de manejo/reevaluación. Se excluyen distractores absurdos o puramente formales.

### 3.2 Comunicación Clínica

**Caso integrador:** entrevista con una persona preocupada por una etiqueta diagnóstica y una imagen. Se solicita explorar preocupaciones, comunicar incertidumbre, comprobar comprensión y acordar un plan.

| Resultado evaluado | Evidencia requerida | Ponderación |
|---|---|---:|
| Escucha y agenda compartida | Preguntas abiertas, validación y prioridades | 20 |
| Explicación de hallazgos | Lenguaje comprensible y no determinista | 20 |
| Manejo de incertidumbre | Diferencia dato, hipótesis y límite | 20 |
| Decisión compartida | Opciones, preferencias y consentimiento | 20 |
| Cierre y continuidad | Teach-back, seguimiento y señales de reevaluación | 20 |

**Condición crítica:** no entregar falsa certeza, minimizar síntomas ni usar una imagen o etiqueta aislada como causa demostrada.

**Plan de ítems:** tres de escucha/alianza, tres de riesgo comunicacional, tres de imagen y etiquetas, tres de decisión compartida y tres de cierre/teach-back.

### 3.3 Más allá del dolor

**Caso integrador:** dolor persistente con información incompleta sobre mecanismos, sueño, actividad, expectativas y función. Se solicita construir una formulación provisional y un plan multimodal.

| Resultado evaluado | Evidencia requerida | Ponderación |
|---|---|---:|
| Diferenciar dolor y nocicepción | Conceptos aplicados sin dualismo | 20 |
| Formular mecanismos como hipótesis | Nociceptivo, neuropático y nociplástico con límites | 25 |
| Integrar factores contextuales | Sueño, creencias, función y entorno | 20 |
| Proponer manejo individualizado | Educación, actividad y coordinación | 20 |
| Reevaluar y comunicar | Medidas, plazos y lenguaje no estigmatizante | 15 |

**Condición crítica:** no diagnosticar dolor nociplástico por descarte ni equipararlo automáticamente con sensibilización central.

**Plan de ítems:** tres de terminología IASP, tres de mecanismos, tres de factores psicosociales, tres de educación y tres de planificación funcional.

### 3.4 KineCheck Evidencia Aplicada

**Caso integrador:** pregunta clínica con un estudio o guía resumida. Se solicita formular la pregunta, identificar diseño, interpretar efecto y certeza, y decidir aplicabilidad.

| Resultado evaluado | Evidencia requerida | Ponderación |
|---|---|---:|
| Formular pregunta clínica | Población, intervención/exposición y desenlace | 15 |
| Interpretar diseño y sesgo | Diseño, comparador y amenazas principales | 20 |
| Interpretar resultados | Efecto, precisión y relevancia clínica | 25 |
| Valorar aplicabilidad | Población, preferencias, recursos y daño | 20 |
| Comunicar conclusión calibrada | Asociación/causalidad y certeza explícitas | 20 |

**Condición crítica:** no convertir asociación en causalidad, significación estadística en beneficio clínico ni ausencia de evidencia en evidencia de ausencia.

**Plan de ítems:** tres de pregunta/diseño, tres de sesgo, tres de estimación e intervalos, tres de relevancia/aplicabilidad y tres de comunicación de certeza.

### 3.5 Traumatología y Ortopedia Clínica

Se conserva el criterio activo comprobado: al menos 4/5 en cada módulo y 10/12 en el examen final. Para una futura versión certificable se prepara una **Forma B independiente**, sin reutilizar preguntas de los controles modulares.

**Forma B propuesta:** 15 ítems nuevos, distribuidos entre trauma, infección, tumores, columna, extremidad superior y extremidad inferior; al menos cinco ítems exigen priorización de seguridad. Umbral propuesto: 12/15, sujeto a aprobación OTEC.

**Caso de contraste:** escenario de fractura expuesta, articulación caliente o compromiso neurológico donde se diferencia prioridad de derivación, medidas iniciales y acciones reservadas a equipos habilitados.

**Condición crítica:** no retrasar atención urgente ni prescribir fármacos fuera del alcance profesional.

La Forma B debe aprobar revisión de contenido y análisis de ítems antes de reemplazar el examen actual. El certificado interno legado continúa deshabilitado.

### 3.6 Dolor Lumbar Persistente

**Caso integrador:** dolor lumbar persistente con PROMs, factores pronósticos y cambio clínico. Se solicita realizar triage, interpretar mediciones y diseñar una progresión funcional.

| Resultado evaluado | Evidencia requerida | Ponderación |
|---|---|---:|
| Triage contextual | Historia, combinación de hallazgos y conducta | 25 |
| Interpretar PROMs | Puntaje, cambio y límites de medición | 20 |
| Formular hipótesis | Mecanismos y factores contribuyentes | 20 |
| Planificar manejo | Educación, actividad y dosificación adaptable | 20 |
| Reevaluar retorno funcional | Metas, criterios y seguimiento | 15 |

**Condición crítica:** síntomas compatibles con cauda equina u otra patología seria requieren coordinación urgente; una red flag aislada no confirma diagnóstico.

**Plan de ítems:** cuatro de seguridad, tres de PROMs, tres de imagen, tres de manejo activo y dos de pronóstico/retorno funcional.

### 3.7 Dolor Musculoesquelético

**Caso integrador:** cuadro musculoesquelético con hallazgos ambiguos. Se solicita diferenciar constructos, formular hipótesis coexistentes y escoger una intervención reevaluable.

| Resultado evaluado | Evidencia requerida | Ponderación |
|---|---|---:|
| Diferenciar constructos | Dolor, nocicepción, mecanismo y diagnóstico | 20 |
| Interpretar pruebas | Probabilidad previa y límites del test | 20 |
| Integrar evidencia y contexto | Fuente, incertidumbre y preferencias | 20 |
| Diseñar intervención | Objetivo, dosis adaptable y seguimiento | 25 |
| Comunicar sin sobreprometer | Pronóstico calibrado y decisiones compartidas | 15 |

**Condición crítica:** no convertir una prueba aislada en diagnóstico ni presentar un mecanismo hipotético como demostrado.

**Plan de ítems:** tres de mecanismos, tres de pruebas, tres de imagen, tres de intervención y tres de comunicación/pronóstico.

### 3.8 Ejercicio Terapéutico

**Caso integrador:** persona con objetivo funcional, comorbilidades, respuesta previa y barreras. Se solicita elaborar una prescripción FITT-VP, condiciones de seguridad y regla de progresión.

| Resultado evaluado | Evidencia requerida | Ponderación |
|---|---|---:|
| Definir objetivo y outcome | Meta funcional y medida pertinente | 15 |
| Construir FITT-VP | Variables completas y coherentes | 25 |
| Individualizar según riesgo | Evaluación, contraindicaciones y coordinación | 25 |
| Progresar y adaptar | Regla basada en respuesta y tolerancia | 20 |
| Mantener y reevaluar | Adherencia, función y eventos adversos | 15 |

**Condición crítica:** no aplicar una dosis universal ni progresar ante inestabilidad o riesgo que requiere evaluación/derivación.

**Plan de ítems:** tres de seguridad, tres de FITT-VP, tres de interpretación de evidencia, tres de progresión y tres de mantenimiento/retorno funcional.

## 4. Matriz técnica del banco de ítems

Cada ítem deberá registrar:

- curso, versión y resultado de aprendizaje;
- módulo/fuente original que respalda la clave;
- nivel cognitivo esperado;
- enunciado, opciones, clave y justificación;
- razón por la que cada distractor es incorrecto;
- prioridad de seguridad, si corresponde;
- fecha, autor/revisor y estado de aprobación;
- métricas de pilotaje y cambios posteriores.

No se aceptan ítems cuya clave dependa de una afirmación clínica controvertida no comprobada, con más de una opción defendible, negaciones encadenadas o distractores obviamente absurdos.

## 5. Protocolo de validación temporal y psicométrica

### Fase 1. Prueba cognitiva

- Cinco participantes por curso con perfil del público objetivo.
- Registro de tiempo por pantalla, lectura, actividad, caso y evaluación.
- Entrevista breve sobre instrucciones, carga, ambigüedad y navegación.
- Corrección de errores antes del pilotaje ampliado.

### Fase 2. Pilotaje ampliado

- Meta operativa: al menos 30 finalizaciones por curso antes de confirmar horas externas.
- Informar mediana, rango intercuartílico, percentiles 10 y 90 y abandonos.
- No aumentar horas por la cola superior ni reducirlas solo por lectores rápidos.
- Documentar apoyos, pausas, dispositivo y experiencia previa.

### Fase 3. Análisis de evaluación

- Dificultad y discriminación de cada ítem, funcionamiento de distractores y omisiones.
- Revisión obligatoria de cualquier ítem con clave discutible o discriminación negativa.
- Consistencia interna solo como evidencia complementaria; no demuestra validez por sí sola.
- Concordancia entre evaluadores para los casos abiertos, con doble corrección inicial.
- Análisis separado de errores críticos de seguridad.

### Fase 4. Decisión de horas

La OTEC recibe minutos planificados, tiempos observados y método de cálculo. Las horas del certificado solo se fijan por escrito. Hasta entonces se mantienen las cargas verificadas existentes y `certificate_ready = false` donde corresponda.

## 6. Requisitos técnicos antes de activar

1. Banco y claves en almacenamiento protegido del servidor.
2. Identidad de cuenta, curso, versión, intento, respuestas, puntaje y fecha en servidor.
3. Forma equivalente para recuperación; no repetir exactamente el primer intento.
4. Bloqueo de envío vacío y validación de longitud/criterios para casos abiertos.
5. Revisión humana o procedimiento equivalente para la rúbrica del caso.
6. Registro del evaluador y fundamento de ajustes de nota.
7. Folio y certificado solo después de convenio y aprobación escrita del programa.
8. Prohibición de ingresar nombres, RUT, contactos o historias clínicas de pacientes en las respuestas.

## 7. Decisiones reservadas a la OTEC

La preparación académica anterior está ejecutada. Requieren decisión formal externa:

- aceptar, modificar o rechazar el umbral propuesto de 80/100;
- aprobar número de intentos y recuperación;
- decidir si el caso abierto será requisito y quién lo calificará;
- aprobar horas que figurarán en el certificado;
- aprobar plantilla, identidad institucional, folio, firma y vigencia;
- autorizar el paso de `certificate_ready = false` a un estado habilitado.

Ninguna de estas decisiones se presenta como ya adoptada.
