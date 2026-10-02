# Paquete académico para revisión OTEC · KineCheck

**Versión:** 2026-10-02  
**Estado:** preparado para revisión institucional; **no constituye aprobación OTEC ni curso SENCE**.  
**Uso:** documento maestro para presentar programas, cargas horarias y criterios propuestos a la OTEC antes de formalizar el convenio.

## Regla de activación

KineCheck no debe cambiar la leyenda pública **“Certificación OTEC en preparación”** hasta contar, para cada curso, con:
1. programa aprobado por escrito por la OTEC;
2. horas aceptadas;
3. evaluación y criterio de aprobación aceptados;
4. trazabilidad de finalización/resultados;
5. plantilla de certificado autorizada;
6. convenio vigente.

## Evaluación OTEC preparada en plataforma

Los **ocho cursos** cuentan con una configuración evaluativa protegida en Supabase con estado `prepared_not_active`. La propuesta común es **15 ítems objetivos**, **80/100** como umbral, **2 intentos** y una **puerta crítica de seguridad** específica por curso. En los cursos con caso abierto, el caso/rúbrica aporta la parte de desempeño aplicada.

Esta configuración **no está activa**: `academic_assessment_pilot = false` y `otec_certification_active = false`. La función de handoff de certificados bloquea explícitamente cualquier solicitud mientras la certificación OTEC permanezca en preparación. Por tanto, los instrumentos están listos para revisión/pilotaje, pero no modifican todavía las reglas vigentes ni habilitan certificados.

## 1. KineCheck Clínico
- **Versión:** 2026.08.06-profesional-1
- **Carga:** 18 h.
- **Estructura:** 10 módulos; 30 lecciones/casos; comprobación formativa en cada lección.
- **Propósito:** desarrollar evaluación musculoesquelética segura, medible y razonada, integrando historia, triage, examen, medición, hipótesis, pronóstico y reevaluación.
- **Evaluación actual:** comprobaciones por lección.
- **Evaluación OTEC preparada:** 15 ítems objetivos + caso/rúbrica; 80/100; 2 intentos; no activa.
- **Brecha:** pilotaje, revisión del banco/claves, trazabilidad final y aprobación escrita de la OTEC.

## 2. Comunicación Clínica
- **Versión:** 2026.09.30-academic-load-1
- **Carga auditada:** 493 min = 8 h 13 min; propuesta certificable conservadora: 8 h.
- **Estructura:** 12 módulos, 154 diapositivas, 12 prácticas, 60 preguntas formativas y actividad integradora final de 30 min.
- **Propósito:** desarrollar comunicación clínica centrada en la persona: escucha, validación, explicación de incertidumbre y decisiones compartidas.
- **Evaluación actual:** actividad final con mínimo 450 caracteres y cuatro criterios académicos.
- **Evaluación OTEC preparada:** 15 ítems objetivos + caso/rúbrica; 80/100; 2 intentos; no activa.
- **Brecha:** aprobación formal, pilotaje y cierre de trazabilidad autoritativa del recorrido.

## 3. Más allá del dolor
- **Versión:** 2026-08-current
- **Carga auditada:** 745 min = 12 h 25 min; propuesta certificable conservadora: 12 h.
- **Estructura:** 8 módulos, 32 lecciones, 32 checkpoints y 8 casos integradores.
- **Propósito:** integrar biología, experiencia, función y contexto en evaluación musculoesquelética sin reducir el dolor a una sola dimensión.
- **Evaluación actual:** checkpoints por lección y casos integradores.
- **Evaluación OTEC preparada:** 15 ítems objetivos + caso/rúbrica; 80/100; 2 intentos; no activa.
- **Brecha:** aprobación OTEC, pilotaje y validación autoritativa de finalización.

## 4. Evidencia Aplicada
- **Versión:** 2026.09.30-academic-load-1
- **Carga auditada:** 621 min = 10 h 21 min; propuesta certificable conservadora: 10 h.
- **Estructura:** 10 módulos y 35 recorridos con laboratorio, caso, reflexión y revisión.
- **Propósito:** buscar, interpretar y aplicar evidencia científica a decisiones clínicas contextualizadas.
- **Evaluación actual:** cumplimiento completo de componentes obligatorios del recorrido.
- **Evaluación OTEC preparada:** 15 ítems objetivos + caso/rúbrica; 80/100; 2 intentos; no activa.
- **Trazabilidad:** el recorrido se registra en servidor; la evaluación propuesta permanece desactivada hasta aprobación.

## 5. Traumatología y Ortopedia Clínica
- **Versión:** 2026-07-course07
- **Carga auditada:** 640 min = 10 h 40 min.
- **Estructura:** 6 módulos, 24 lecciones, 30 preguntas modulares, 6 casos y examen final de 12 preguntas.
- **Propósito:** relacionar mecanismo, tejido, seguridad, examen y progresión funcional para decisiones clínicas prudentes.
- **Criterio actual:** mínimo 80 % en cada cuestionario modular y 80 % en examen final; en 12 preguntas se requieren al menos 10 correctas.
- **Evaluación OTEC preparada:** instrumento independiente propuesto, 15 ítems objetivos, 80/100 y 2 intentos; no activo y no sustituye todavía el examen vigente.
- **Brecha:** pilotaje y calificación/validación server-side antes de uso institucional.
- **Nota:** no usar el rótulo histórico “12–14 horas”; la suma verificable es 10 h 40 min.

## 6. Dolor Lumbar Persistente
- **Versión:** 2026.09.30-academic-load-1
- **Carga auditada:** 490 min = 8 h 10 min; propuesta certificable conservadora: 8 h.
- **Estructura:** 9 módulos, 54 microlecciones y caso integrador final.
- **Propósito:** integrar seguridad, pronóstico, PROMs, examen, comunicación, ejercicio y exposición progresiva.
- **Evaluación actual:** comprobación en las 54 microlecciones + actividad integradora final (mínimo 550 caracteres, cuatro criterios).
- **Evaluación OTEC preparada:** 15 ítems objetivos + caso/rúbrica; 80/100; 2 intentos; no activa.
- **Brecha:** trazabilidad integral, pilotaje y aprobación escrita de la OTEC.

## 7. Dolor Musculoesquelético
- **Versión:** 2026.09.30-academic-load-1
- **Carga auditada:** 488 min = 8 h 08 min; propuesta certificable conservadora: 8 h.
- **Estructura:** 6 módulos, 12 recorridos, 6 aplicaciones académicas obligatorias e integración final.
- **Propósito:** comprender mecanismos de dolor y traducirlos en evaluación, medición, comunicación e intervención sin convertir mecanismos o cuestionarios en diagnósticos automáticos.
- **Evaluación actual:** cumplimiento de recorridos, aplicaciones obligatorias e integración final.
- **Evaluación OTEC preparada:** 15 ítems objetivos + caso/rúbrica; 80/100; 2 intentos; no activa.
- **Trazabilidad:** recorrido y actividades en servidor; evaluación propuesta aún desactivada.

## Productos fuera de esta primera tanda

### Ejercicio Terapéutico
Carga auditada: **360 min = 6 h**. Cinco módulos, cinco casos aplicados y diez preguntas de comprobación. Tiene una evaluación OTEC propuesta y protegida de 15 ítems + caso/rúbrica, 80/100 y 2 intentos, pero permanece **no habilitada**: `certificate_ready = false` y los feature flags de evaluación/certificación siguen desactivados.

### KineCheck Banderas Clínicas
Se mantiene como **recurso/herramienta formativa**, no como curso certificable. No debe mostrar certificación OTEC.

## Modelo de certificación a proponer

La OTEC puede escoger o modificar uno de estos modelos por curso:

**Modelo A · desempeño**
- 100 % de actividades obligatorias;
- evaluación final;
- umbral sugerido 80 % cuando exista instrumento objetivo;
- recuperación según criterio OTEC.

**Modelo B · cumplimiento validado**
- 100 % de ruta obligatoria;
- actividades aplicadas;
- caso/integración final con rúbrica;
- sin nota numérica si la OTEC lo autoriza formalmente.

## Trazabilidad mínima a conservar por participante
- identidad/correo verificado;
- curso y versión;
- horas;
- componentes obligatorios completados;
- resultado/criterio de aprobación;
- fecha de finalización;
- método y nivel de verificación;
- folio y QR solo cuando la certificación OTEC esté formalmente activa.

## Declaración comercial permitida mientras no exista convenio

> Certificación OTEC en preparación. Formación privada KineCheck. No corresponde a curso SENCE, no posee código SENCE y no utiliza franquicia tributaria.

No afirmar que la OTEC certifica, avala o respalda actualmente el curso hasta contar con convenio y aprobación escrita del programa.
