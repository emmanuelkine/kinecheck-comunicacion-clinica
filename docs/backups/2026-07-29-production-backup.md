# Respaldo técnico de producción — 29-07-2026

## Estado certificado

Se completó la certificación de aprobación, licencia, acceso, reembolso y bloqueo para:

- KineCheck Clínico — `8150019`
- KineCheck Estudiante — `8154796`
- KineCheck Recupera — `8157431`
- Comunicación Clínica — `8192814`
- Más allá del dolor — `8194777`
- Pack KineCheck Estudiante — `8195982`
- Traumatología y Ortopedia Clínica — `8205453`
- Evidencia Aplicada — `8208817`

## Respaldos incluidos

### `course-key`

La función `course-key` de producción quedó guardada en:

`supabase/functions/course-key/index.ts`

La función valida el acceso en `public.course_access` y entrega módulos protegidos para:

- `comunicacion-clinica`
- `mas-alla-del-dolor`
- `traumatologia-ortopedia-clinica`

### `hotmart-webhook`

La función general `hotmart-webhook` de producción quedó guardada en:

`supabase/functions/hotmart-webhook/index.ts`

Esta versión:

- valida `HOTMART_HOTTOK`;
- procesa eventos de aprobación y revocación;
- registra cancelaciones de suscripción sin revocación inmediata;
- delega la actualización de accesos a `public.process_hotmart_event`;
- no contiene valores secretos.

## Concesiones esperadas

| product_id | course_slug |
|---:|---|
| 8150019 | kinecheck-clinico |
| 8154796 | kinecheck-estudiante |
| 8157431 | kinecheck-recupera |
| 8192814 | comunicacion-clinica |
| 8194777 | mas-alla-del-dolor |
| 8195982 | kinecheck-estudiante |
| 8195982 | mas-alla-del-dolor |
| 8205453 | traumatologia-ortopedia-clinica |

## Auditoría final

- Registros temporales de certificación: 0
- Concesiones duplicadas: ninguna
- Módulos protegidos verificados: 3
- KineCheck Clínico en producción: versión 20

## Respaldo pendiente

Falta copiar desde Supabase el código exacto desplegado de:

- `evidence-hotmart-webhook`

No debe reconstruirse desde memoria. Debe guardarse únicamente el código exacto exportado desde Supabase.

## Seguridad

Este repositorio es público. No guardar claves, tokens, contraseñas ni valores secretos. Solo versionar código y nombres genéricos de configuración.
