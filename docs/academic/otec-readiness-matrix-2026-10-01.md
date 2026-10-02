# Matriz de preparación académica para convenio OTEC

**Fecha:** 1 de octubre de 2026  
**Objetivo:** separar la preparación académica interna de KineCheck de una futura aprobación/certificación privada por una OTEC.  
**Regla:** ningún estado de esta matriz equivale a curso SENCE, código SENCE, franquicia tributaria ni aprobación actual de una OTEC.

**Paquete formal de programas:** [programas-kinecheck-v1-2026-10-01.md](./programas-otec/programas-kinecheck-v1-2026-10-01.md). Este paquete consolida propósito, resultados de aprendizaje, estructura, evaluación, carga, trazabilidad y estado de aprobación de los siete cursos propuestos para revisión inicial.

**Instrumentos y pilotaje:** [instrumentos-evaluacion-y-pilotaje-otec-v1.md](./programas-otec/instrumentos-evaluacion-y-pilotaje-otec-v1.md). Contiene el diseño sumativo de los ocho cursos, rúbrica, condiciones críticas, Forma B de Traumatología y protocolo para validar tiempos sin aumentar horas por inferencia.

**Implementación en plataforma:** los ocho instrumentos están registrados como `prepared_not_active`. Academy permite consultar su estado con sesión y licencia válidas. No hay intentos activos, claves públicas, finalizaciones automáticas ni emisión de certificados; `academic_assessment_pilot` y `otec_certification_active` permanecen desactivados.

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
| KineCheck Clínico | 18 h | 30 lecciones/casos con quiz por lección | Propuesta: 80/100 + puerta de seguridad | Configuración protegida en plataforma; no activa | Puede enviarse a revisión; no activar emisión |
| Comunicación Clínica | 8 h 13 min auditadas; 8 h conservadoras | 12 prácticas + 60 preguntas + actividad integradora final | Propuesta: 80/100 + puerta de comunicación segura | Snapshot autenticado; configuración evaluativa protegida y no activa | Puede enviarse a revisión; OTEC debe aprobar la propuesta |
| Más allá del dolor | 12 h 25 min auditadas; 12 h conservadoras | 32 checkpoints + 8 casos integradores | Propuesta: 80/100 + puerta contra sobrediagnóstico | 32 lecciones sincronizadas; configuración evaluativa no activa | Puede enviarse a revisión; no activar emisión |
| Evidencia Aplicada | 10 h 21 min auditadas; 10 h conservadoras | 35 recorridos con laboratorio, caso, reflexión y revisión | Propuesta: 80/100 + puerta de inferencia válida | Recorrido y configuración evaluativa protegidos; no activa | Puede enviarse a revisión; OTEC debe aprobar la propuesta |
| Traumatología y Ortopedia Clínica | 10 h 40 min | 30 preguntas modulares + 6 casos + examen final de 12 preguntas | Vigente: 80 % modular y final; Forma B propuesta: 12/15 | Snapshot sincronizado; Forma B configurada, no activa; validación manual | Académicamente cercano; Forma B requiere revisión antes de sustituir examen |
| Dolor Lumbar Persistente | 8 h 10 min auditadas; 8 h conservadoras | 54 microlecciones con comprobación + caso integrador final | Propuesta: 80/100 + puerta de triage | Entrega final y configuración evaluativa en servidor; no activa | Puede enviarse a revisión; OTEC debe aprobar la propuesta |
| Dolor Musculoesquelético | 8 h 08 min auditadas; 8 h conservadoras | 12 recorridos + 6 aplicaciones obligatorias + integración final | Propuesta: 80/100 + puerta de interpretación clínica | Recorrido y configuración evaluativa en servidor; no activa | Puede enviarse a revisión; OTEC debe aprobar la propuesta |
| Ejercicio Terapéutico | **6 h** | 5 casos aplicados + 10 preguntas de comprobación + 15 referencias | Propuesta: 80/100 + puerta de seguridad/dosis | Configuración protegida en plataforma; `certificate_ready = false` | Puede enviarse a revisión como octavo curso; no activar emisión |
| Banderas Clínicas | No corresponde | Biblioteca/casos/recurso interactivo | No aplica | No aplica | Recurso formativo; no curso certificable |

## Hallazgos ejecutados en esta validación

### KineCheck Clínico
Se inspeccionó el activo protegido real. Se confirmaron 10 módulos y 30 lecciones/casos. Cada lección incorpora pregunta, alternativas, respuesta y fundamento. La brecha principal ya no es el contenido: es la ausencia de un **criterio global de aprobación** y de trazabilidad de finalización suficiente para emitir un certificado bajo convenio.

### Comunicación Clínica
Se validó la fuente histórica inmediatamente anterior a la protección junto con el wrapper y la actividad académica actuales. Se confirmaron **154 diapositivas, 12 módulos, 12 prácticas, 60 preguntas formativas y 37 referencias**, además de la actividad integradora final de 30 minutos. La interfaz ya sincroniza un snapshot autenticado de diapositivas estudiadas, módulos, prácticas, intentos/puntajes formativos detectados y estado de la actividad final. La principal brecha restante es definir el umbral global de aprobación con la OTEC y mantener revisión manual mientras esos puntajes se originen en cliente.

### Más allá del dolor
Se auditó el bundle identificado como `index-nmhIRPii.js` mediante el respaldo conservado del mismo paquete. Se confirmaron **8 módulos, 32 lecciones, 32 checkpoints y 8 casos integradores**, con carga total de **745 min**. El contenido está estructuralmente apto para revisión y las 32 lecciones completadas ya se sincronizan a `learning_progress`. Falta definir un criterio global de aprobación/evaluación final antes de cualquier automatización de certificado.

### Traumatología y Ortopedia Clínica
Se auditó el archivo fuente del Curso 07 conservado en Library. Se confirmaron **6 módulos, 24 lecciones, 30 preguntas modulares, 6 casos y 12 preguntas finales**. El criterio vigente es **80 %** en los cuestionarios modulares y en el examen final. La carga real es **640 min**. El certificado interno legado permanece deshabilitado. La aplicación ahora sincroniza a `learning_progress` el avance, los puntajes modulares, casos y examen final cuando existe sesión activa. Como los puntajes se originan en el cliente, la validación final debe seguir siendo manual hasta implementar calificación server-side.

### Dolor Lumbar Persistente
Se inspeccionó el activo protegido real. Se confirmaron exactamente 9 módulos y 54 microlecciones. Las 54 incorporan comprobación de aprendizaje. Existe además un caso integrador obligatorio de 40 minutos con cuatro criterios. La entrega ya se registra en servidor; falta completar el seguimiento de toda la ruta para automatizar la verificación final.

### Ejercicio Terapéutico
Se verificaron cinco módulos de 70, 75, 95, 65 y 55 minutos, total **360 minutos = 6 h**. Cada módulo incluye tres objetivos, un caso y dos preguntas de comprobación; hay 15 lecturas/referencias registradas. La carga fue incorporada al registro interno con **certificate_ready = false** hasta que exista evaluación final, criterio de aprobación y trazabilidad.

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
