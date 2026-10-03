# Matriz de preparación académica para convenio OTEC

**Fecha:** 1 de octubre de 2026  
**Objetivo:** separar la preparación académica interna de KineCheck de una futura aprobación/certificación privada por una OTEC.  
**Regla:** ningún estado de esta matriz equivale a curso SENCE, código SENCE, franquicia tributaria ni aprobación actual de una OTEC.

**Paquete formal de programas:** [programas-kinecheck-v1-2026-10-01.md](./programas-otec/programas-kinecheck-v1-2026-10-01.md). Este paquete consolida propósito, resultados de aprendizaje, estructura, evaluación, carga, trazabilidad y estado de aprobación de los ocho cursos propuestos para revisión inicial.

**Instrumentos y pilotaje:** [instrumentos-evaluacion-y-pilotaje-otec-v1.md](./programas-otec/instrumentos-evaluacion-y-pilotaje-otec-v1.md). Contiene el diseño sumativo de los ocho cursos, rúbrica, condiciones críticas, Forma B de Traumatología y protocolo para validar tiempos sin aumentar horas por inferencia.

**Implementación en plataforma actualizada al 2 de octubre de 2026:** los ocho cursos disponen de una evaluación final académica interna KineCheck activa y protegida: 15 ítems por curso, 80 % de aprobación, máximo de dos intentos, preguntas críticas de seguridad, corrección server-side y registro del resultado en Supabase. Las claves permanecen únicamente en servidor. `academic_assessment_pilot` está habilitado en modo `kinecheck_academic_only`; `otec_certification_active` permanece desactivado. En cursos con trazabilidad server-side disponible, el examen final se bloquea hasta completar el recorrido y `course_completions` solo se consolida con recorrido + evaluación final aprobada. Aprobar esta evaluación no emite ni promete un certificado OTEC.

## Criterio de salida para activar certificación OTEC

Un curso solo debería pasar de **“OTEC en preparación”** a **“certificación OTEC activa”** cuando exista, por escrito:

1. programa versionado aprobado por la OTEC;
2. carga horaria aceptada por la OTEC;
3. actividades/evaluación definidas;
4. criterio de aprobación explícito;
5. trazabilidad de finalización y resultado por participante;
6. plantilla de certificado autorizada;
7. convenio vigente que autorice nombre, marca, firma/validación y mecanismo de emisión.

## Estado por producto

| Producto | Carga validada | Evidencia de aprendizaje actual | Criterio global de aprobación | Trazabilidad actual | Estado para OTEC |
|---|---:|---|---|---|---|
| KineCheck Clínico | 18 h | 30 lecciones/casos con quiz por lección | Vigente internamente: 80 % + puerta de seguridad | Examen server-side activo; recorrido completo aún sin trazabilidad server-side | Puede enviarse a revisión; no activar emisión |
| Comunicación Clínica | 8 h 13 min auditadas; 8 h conservadoras | 12 prácticas + 60 preguntas + actividad integradora final | Vigente internamente: 80 % + puerta de comunicación segura | Recorrido server-side + evaluación final server-side; finalización = recorrido + examen | Puede enviarse a revisión; OTEC debe aprobar la propuesta |
| Más allá del dolor | 12 h 25 min auditadas; 12 h conservadoras | 32 checkpoints + 8 casos integradores | Vigente internamente: 80 % + puerta contra sobrediagnóstico | 32 lecciones sincronizadas + evaluación final server-side; finalización = recorrido + examen | Puede enviarse a revisión; no activar emisión |
| Evidencia Aplicada | 10 h 21 min auditadas; 10 h conservadoras | 35 recorridos con laboratorio, caso, reflexión y revisión | Vigente internamente: 80 % + puerta de inferencia válida | Recorrido completo + evaluación final server-side; finalización consolidada al cumplir ambos | Puede enviarse a revisión; OTEC debe aprobar la propuesta |
| Traumatología y Ortopedia Clínica | 10 h 40 min | 30 preguntas modulares + 6 casos + examen final de 12 preguntas | Vigente: 80 % modular/final + evaluación final KineCheck server-side 80 % | `routeComplete` sincronizado; evaluación final independiente server-side; finalización = recorrido + examen | Puede enviarse a revisión; OTEC debe aprobar el instrumento definitivo |
| Dolor Lumbar Persistente | 8 h 10 min auditadas; 8 h conservadoras | 54 microlecciones con comprobación + caso integrador final | Vigente internamente: 80 % + puerta de triage | Actividad final + examen server-side; recorrido completo aún sin trazabilidad server-side | Puede enviarse a revisión; OTEC debe aprobar la propuesta |
| Dolor Musculoesquelético | 8 h 08 min auditadas; 8 h conservadoras | 12 recorridos + 6 aplicaciones obligatorias + integración final | Vigente internamente: 80 % + puerta de interpretación clínica | Recorrido/actividades + evaluación final server-side; finalización consolidada al cumplir ambos | Puede enviarse a revisión; OTEC debe aprobar la propuesta |
| Ejercicio Terapéutico | **6 h** | 5 casos aplicados + 10 preguntas de comprobación + 15 referencias | Vigente internamente: 80 % + puerta de seguridad/dosis | 5 módulos sincronizados + evaluación final server-side; finalización = recorrido + examen; `certificate_ready = false` | Puede enviarse a revisión como octavo curso; no activar emisión |
| Banderas Clínicas | No corresponde | Biblioteca/casos/recurso interactivo | No aplica | No aplica | Recurso formativo; no curso certificable |

## Hallazgos ejecutados en esta validación

### KineCheck Clínico
Se inspeccionó el activo protegido real. Se confirmaron 10 módulos y 30 lecciones/casos. Cada lección incorpora pregunta, alternativas, respuesta y fundamento. La brecha interna de evaluación quedó cerrada con una evaluación final server-side de 15 ítems, 80 % de aprobación, dos intentos y puerta crítica de seguridad. La emisión OTEC sigue bloqueada hasta aprobación externa del programa, horas y mecanismo de certificación.

### Comunicación Clínica
Se validó la fuente histórica inmediatamente anterior a la protección junto con el wrapper y la actividad académica actuales. Se confirmaron **154 diapositivas, 12 módulos, 12 prácticas, 60 preguntas formativas y 37 referencias**, además de la actividad integradora final de 30 minutos. La interfaz ya sincroniza un snapshot autenticado de diapositivas estudiadas, módulos, prácticas, intentos/puntajes formativos detectados y estado de la actividad final. La principal brecha restante es definir el umbral global de aprobación con la OTEC y mantener revisión manual mientras esos puntajes se originen en cliente.

### Más allá del dolor
Se auditó el bundle identificado como `index-nmhIRPii.js` mediante el respaldo conservado del mismo paquete. Se confirmaron **8 módulos, 32 lecciones, 32 checkpoints y 8 casos integradores**, con carga total de **745 min**. El contenido está estructuralmente apto para revisión y las 32 lecciones completadas ya se sincronizan a `learning_progress`. El criterio interno quedó implementado mediante evaluación final server-side (80 %, dos intentos y puerta crítica). La automatización de certificado continúa bloqueada hasta la aprobación formal de la OTEC.

### Traumatología y Ortopedia Clínica
Se auditó el archivo fuente del Curso 07 conservado en Library. Se confirmaron **6 módulos, 24 lecciones, 30 preguntas modulares, 6 casos y 12 preguntas finales**. El criterio vigente es **80 %** en los cuestionarios modulares y en el examen final. La carga real es **640 min**. El certificado interno legado permanece deshabilitado. La aplicación ahora sincroniza a `learning_progress` el avance, los puntajes modulares, casos y examen final cuando existe sesión activa. El examen legado conserva su regla de 80 %, pero KineCheck añadió además una evaluación final independiente corregida server-side. La certificación OTEC continúa desactivada hasta aprobación formal.

### Dolor Lumbar Persistente
Se inspeccionó el activo protegido real. Se confirmaron exactamente 9 módulos y 54 microlecciones. Las 54 incorporan comprobación de aprendizaje. Existe además un caso integrador obligatorio de 40 minutos con cuatro criterios. La entrega ya se registra en servidor; falta completar el seguimiento de toda la ruta para automatizar la verificación final.

### Ejercicio Terapéutico
Se verificaron cinco módulos de 70, 75, 95, 65 y 55 minutos, total **360 minutos = 6 h**. Cada módulo incluye tres objetivos, un caso y dos preguntas de comprobación; hay 15 lecturas/referencias registradas. La carga fue incorporada al registro interno. Los cinco módulos completados se sincronizan a `learning_progress`; la evaluación final server-side se habilita con el recorrido completo y utiliza criterio interno de 80 %, dos intentos y puerta crítica. `certificate_ready` permanece en `false` porque la certificación OTEC no ha sido formalizada.

## Propuesta para presentar a la OTEC

Para no imponer criterios antes de que la OTEC los acepte, KineCheck debería presentar dos alternativas:

**Modelo A · aprobación por desempeño**
- completar 100 % de las actividades obligatorias;
- evaluación final objetiva con umbral sugerido de 80 %;
- en casos abiertos, rúbrica explícita y revisión manual o validación equivalente;
- posibilidad de un intento de recuperación definido.

**Modelo B · aprobación por cumplimiento validado**
- completar 100 % del recorrido;
- completar actividades aplicadas obligatorias;
- caso integrador final con todos los criterios mínimos;
- sin nota numérica, si la OTEC acepta formalmente este mecanismo.

La OTEC debe escoger o modificar el modelo antes de activar certificados con su respaldo.

## Decisiones institucionales antes de activar certificados OTEC

1. Formalizar el convenio.
2. Recibir aprobación escrita de cada programa.
3. Definir el criterio de aprobación de cada curso.
4. Terminar la trazabilidad en los cursos que aún dependen de verificación manual.
5. Configurar la plantilla oficial entregada o aprobada por la OTEC.
6. Ejecutar una prueba de punta a punta con un participante de prueba.
7. Solo después cambiar la web desde **“OTEC en preparación”** a la redacción definitiva autorizada.
