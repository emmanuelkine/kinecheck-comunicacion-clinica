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

### `evidence-hotmart-webhook`

La función dedicada de Evidencia Aplicada quedó guardada en:

`supabase/functions/evidence-hotmart-webhook/index.ts`

Esta versión:

- valida `EVIDENCE_HOTMART_HOTTOK` y `EVIDENCE_HOTMART_PRODUCT_ID`;
- acepta el producto real y el producto oficial de prueba de Hotmart;
- procesa aprobación y revocación de `evidencia-aplicada`;
- ignora eventos duplicados o cronológicamente obsoletos;
- registra auditoría en `public.hotmart_events`;
- no contiene valores secretos.

### `public.process_hotmart_event`

La definición de producción de la función SQL quedó guardada en:

`supabase/migrations/20260729_process_hotmart_event.sql`

Esta función:

- garantiza idempotencia mediante `public.hotmart_webhook_events`;
- protege el orden temporal de los eventos y prioriza la revocación en igualdad de fecha;
- registra y actualiza compras en `public.hotmart_purchases`;
- procesa todos los cursos asociados a un producto mediante `public.hotmart_product_grants`;
- evita duplicados concurrentes con bloqueo transaccional por usuario y curso;
- preserva los accesos de propietario;
- crea, actualiza o revoca licencias en `public.course_access`.

### Concesiones de productos

La configuración certificada de `public.hotmart_product_grants` quedó guardada en:

`supabase/seeds/20260729_hotmart_product_grants.sql`

El archivo contiene las ocho concesiones verificadas y puede restaurarlas de forma idempotente mediante `ON CONFLICT`.

### Esquema de columnas de la base de datos

El snapshot de columnas de producción quedó guardado en:

`docs/backups/2026-07-29-database-schema-columns.csv`

Incluye la estructura observada de:

- `public.course_access`
- `public.hotmart_events`
- `public.hotmart_product_grants`
- `public.hotmart_purchases`
- `public.hotmart_webhook_events`

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
- Edge Functions de producción respaldadas: 3
- Función SQL crítica respaldada: 1
- Configuración de concesiones respaldada: 8 filas
- Tablas críticas documentadas: 5

## Seguridad

Este repositorio es público. No guardar claves, tokens, contraseñas ni valores secretos. Solo versionar código y nombres genéricos de configuración.
