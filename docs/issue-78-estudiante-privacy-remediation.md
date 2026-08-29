# #78 — Remediación P0 de privacidad post-login de KineCheck Estudiante

## Objetivo
Cerrar #78 únicamente cuando la app productiva de Estudiante (`https://apps.kinecheck.cl/app`) deje explícitamente claro que es de uso educativo y no solicite ni incentive el ingreso de datos reales de pacientes.

## Evidencia actual
La auditoría autenticada estricta detectó:
- 64 campos potenciales de texto/archivo en `/app`.
- 7 campos potenciales de texto/archivo sin advertencia educativa cercana.
- La prohibición explícita de identificadores reales no está visible.
- 3 controles de exportación con disclaimer educativo correcto.
- 0 claves observadas en localStorage/sessionStorage durante la carga inicial.
- Sin navegación ni requests a `chatgpt.site` en la ejecución auditada.

## Cambios obligatorios en la app productiva de Estudiante

### 1. Aviso global visible
Agregar en una zona visible y persistente de la experiencia post-login, idealmente antes del primer bloque con campos editables:

> **Uso exclusivamente educativo.** No ingreses datos reales de pacientes. Está prohibido registrar nombre, RUT, teléfono, correo electrónico, fotografías identificables, número de ficha clínica u otros datos personales o sensibles. Utiliza siempre datos ficticios o anonimizados.

El texto debe estar presente en el DOM visible, no solo en términos legales externos ni en un tooltip oculto.

### 2. Advertencia contextual en entradas libres
En cada campo de texto libre, textarea, contenteditable o carga de archivos que pueda utilizarse para describir un caso, añadir inmediatamente al lado o debajo:

> Usa datos ficticios o anonimizados. No incluyas información que permita identificar a una persona real.

Como mínimo deben quedar cubiertos los 7 campos que el gate estricto detecta actualmente sin advertencia cercana.

### 3. Identificadores prohibidos
No crear ni mantener campos destinados a captar explícitamente:
- nombre o apellido de paciente real;
- RUT u otro identificador nacional;
- teléfono;
- correo electrónico;
- fotografía identificable;
- número de ficha clínica;
- dirección;
- otros identificadores directos.

Si algún campo actual utiliza una etiqueta equivalente, reemplazar su propósito por uno educativo/ficticio o eliminarlo.

### 4. Archivos e imágenes
Si existe carga de archivos o imágenes, mostrar antes de seleccionar el archivo:

> Solo material educativo sin datos identificables. No subas fotografías de pacientes reales, documentos clínicos ni archivos con datos personales.

### 5. Exportaciones
Mantener el disclaimer ya validado en toda exportación/descarga:

> Documento educativo — no corresponde a una ficha clínica.

No retirar ni debilitar esta advertencia.

### 6. Persistencia y telemetría
- No persistir texto libre clínico ni identificadores en localStorage/sessionStorage.
- No enviar valores de campos libres a métricas o endpoints de analítica.
- La telemetría debe limitarse a eventos técnicos mínimos y datos sanitizados.

## Criterio automatizado de aceptación
Después del despliegue productivo, ejecutar `Estudiante strict privacy audit` y exigir:
- `Explicit prohibition visible: true`.
- `Fields without nearby warning: 0`.
- Si existen controles de exportación: `export disclaimer: true`.
- Sin requests ni navegación a `chatgpt.site`.
- Sin valores de campos o identificadores personales en almacenamiento cliente ni telemetría.

Además, volver a ejecutar `Estudiante post-login privacy audit` y exigir estado verde.

## Regla comercial
No reactivar nuevas ventas de KineCheck Estudiante ni del Pack Estudiante hasta que ambos gates de privacidad estén verdes en producción y #78 se cierre como completado. El acceso de usuarios existentes no debe interrumpirse.

## Prompt listo para Codex

Usa este repositorio/servicio que realmente publica `https://apps.kinecheck.cl/app` y corrige #78. No modifiques autenticación, licencias, SSO ni acceso de usuarios existentes. Añade un aviso global visible con este contenido: “Uso exclusivamente educativo. No ingreses datos reales de pacientes. Está prohibido registrar nombre, RUT, teléfono, correo electrónico, fotografías identificables, número de ficha clínica u otros datos personales o sensibles. Utiliza siempre datos ficticios o anonimizados.” Añade además junto a cada campo libre, textarea, contenteditable o carga de archivo la advertencia “Usa datos ficticios o anonimizados. No incluyas información que permita identificar a una persona real.” Para cargas de archivos añade “Solo material educativo sin datos identificables. No subas fotografías de pacientes reales, documentos clínicos ni archivos con datos personales.” Mantén el disclaimer de exportación “Documento educativo — no corresponde a una ficha clínica.” No persistas texto libre o identificadores en localStorage/sessionStorage ni los envíes a analítica. Despliega a producción y devuelve el commit/deployment utilizado. No reactives ventas. La aceptación final la hará el workflow `Estudiante strict privacy audit`, que debe mostrar prohibición explícita visible=true y 0 campos sin advertencia cercana.