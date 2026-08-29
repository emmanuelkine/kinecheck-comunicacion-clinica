# Tester event schema — Sprint 1

## Objetivo
Medir activación y retorno de la beta sin inferir causas de inactividad y sin almacenar contenido clínico o identificadores personales dentro de los eventos.

## Embudo mínimo
1. `tester_invited`
2. `account_created`
3. `license_activated`
4. `academy_opened`
5. `product_opened`
6. `first_activity`
7. `return_session`

## Campos permitidos
- `event_name`: uno de los siete eventos definidos.
- `occurred_at`: fecha/hora del evento.
- `cohort`: identificador general de cohorte, por ejemplo `beta-2026-08`.
- `role`: `student`, `professional`, `teacher` u otro perfil aprobado para la beta activa.
- `product_slug`: slug del producto probado cuando corresponda.
- `device_class`: `mobile`, `desktop` o `both`.
- `result`: `success`, `blocked` o `error`.
- `error_code`: código técnico controlado, sin texto libre ni tokens.

## Datos prohibidos
No registrar en este esquema:
- nombres o apellidos;
- RUT;
- correos o teléfonos;
- contraseñas, access tokens o códigos de compra;
- nombres o datos de pacientes;
- texto libre de anamnesis, casos o contenidos clínicos;
- fotografías o documentos clínicos;
- números de ficha;
- diagnósticos o información de salud individual.

## Método inicial autorizado para Sprint 1
Mientras no exista una autorización separada para instrumentación persistente o analítica externa, el seguimiento del Sprint 1 se realizará mediante **conteos agregados y revisión manual de estados**, sin almacenar nuevos identificadores personales en el repositorio.

Las fuentes válidas para completar el reporte son evidencia ya existente del piloto, resultados de pruebas técnicas y conteos agregados proporcionados por el responsable de la beta. No se debe inferir una causa cuando un participante no avanza de etapa.

## Interpretación
Un abandono entre dos etapas significa únicamente que no existe evidencia de la etapa siguiente. No equivale por sí mismo a desinterés, error de producto, falta de tiempo, problema de licencia u otra causa.

## Instrumentación futura
Cualquier incorporación de analítica externa, persistencia nueva, cambios en Supabase o asociación de eventos a una persona requiere revisión y autorización separada antes de implementarse.
