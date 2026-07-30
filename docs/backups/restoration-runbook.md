# Procedimiento de restauración integral de KineCheck

## Regla principal

No ejecutar una restauración de prueba sobre producción. La prueba integral debe realizarse en un proyecto temporal o de staging independiente.

## Objetivo

Demostrar que, a partir de los respaldos versionados, es posible reconstruir:

- tablas críticas y restricciones;
- concesiones de productos;
- función `process_hotmart_event`;
- permisos de tablas y ejecución RPC;
- Edge Functions;
- módulos protegidos de Storage;
- flujo de aprobación, acceso, reembolso y bloqueo.

## Insumos necesarios

- `supabase/functions/course-key/index.ts`
- `supabase/functions/hotmart-webhook/index.ts`
- `supabase/functions/evidence-hotmart-webhook/index.ts`
- `supabase/migrations/20260729_process_hotmart_event.sql`
- `supabase/migrations/20260729_revoke_anon_authenticated_table_privileges.sql`
- `supabase/migrations/20260729_restrict_process_hotmart_event_execute.sql`
- `supabase/seeds/20260729_hotmart_product_grants.sql`
- snapshots de columnas, índices, RLS y privilegios
- copia autorizada de los tres módulos protegidos de `course-assets`
- listado de secretos requeridos, sin almacenar sus valores en el repositorio

## Prueba integral en staging

### 1. Preparación

1. Crear un proyecto temporal de Supabase.
2. Registrar fecha, responsable y objetivo de la prueba.
3. No reutilizar compradores reales ni secretos de producción cuando no sea imprescindible.
4. Crear credenciales de prueba independientes.

### 2. Base de datos

1. Crear las cinco tablas críticas conforme al snapshot de columnas.
2. Crear claves primarias e índices documentados.
3. Habilitar RLS en las cinco tablas.
4. Mantenerlas sin políticas explícitas, de acuerdo con la arquitectura certificada.
5. Aplicar `process_hotmart_event`.
6. Aplicar las migraciones de hardening.
7. Cargar las ocho concesiones de productos.

### 3. Storage

1. Crear el bucket privado `course-assets`.
2. Cargar:
   - `comunicacion-clinica/index.js`
   - `index-nmhIRPii.js`
   - `traumatologia-ortopedia-clinica/course-source.js`
3. Confirmar que los objetos no sean públicos.

### 4. Edge Functions

1. Desplegar `course-key`.
2. Desplegar `hotmart-webhook`.
3. Desplegar `evidence-hotmart-webhook`.
4. Configurar los secretos requeridos desde el panel o CLI.
5. Verificar que `anon` y `authenticated` no ejecuten `process_hotmart_event`.
6. Confirmar que `service_role` sí pueda ejecutarla.

### 5. Prueba funcional

Usar exclusivamente datos ficticios.

1. Simular `PURCHASE_APPROVED` para un producto individual.
2. Confirmar compra activa y licencia creada.
3. Abrir Academy con la cuenta de prueba.
4. Confirmar acceso al producto.
5. Simular `PURCHASE_REFUNDED`.
6. Confirmar licencia inactiva y acceso bloqueado.
7. Repetir con el Pack Estudiante y verificar dos concesiones.
8. Probar un curso protegido y verificar entrega del módulo desde Storage.
9. Repetir un evento con el mismo `event_id` y confirmar `duplicate`.
10. Enviar un evento anterior y confirmar `stale_event`.

## Criterios de aprobación

- todas las tablas, restricciones e índices coinciden con el respaldo;
- ocho concesiones cargadas sin duplicados;
- webhooks aceptan eventos válidos y rechazan tokens inválidos;
- aprobación concede acceso;
- reembolso bloquea acceso;
- pack concede dos cursos;
- módulos protegidos no son públicos;
- `anon` y `authenticated` no acceden directamente a tablas ni RPC crítica;
- no quedan datos ficticios después de la limpieza.

## Evidencia de la prueba

Guardar:

- fecha y responsable;
- identificador del proyecto temporal;
- commits utilizados;
- capturas de despliegue;
- consultas de verificación;
- resultados de aprobación y revocación;
- incidencias encontradas;
- decisión aprobada o rechazada.

No guardar secretos, tokens ni contraseñas.

## Procedimiento ante incidente en producción

### P0: caída total, seguridad o licencias masivamente incorrectas

1. Detener cambios y registrar hora.
2. Identificar el último despliegue o commit.
3. Preservar logs y evidencia antes de limpiar datos.
4. Si el incidente proviene del frontend, revertir al último commit estable.
5. Si proviene de una Edge Function, desplegar la última versión respaldada.
6. Si proviene de datos, no borrar masivamente: aislar las transacciones afectadas.
7. Verificar compra, licencia, acceso y revocación con una cuenta ficticia.
8. Comunicar estado a usuarios afectados sin exponer detalles de seguridad.
9. Documentar causa raíz y acción preventiva.

### P1: comprador individual sin acceso

1. Verificar correo normalizado, producto, transacción, estado y concesión.
2. Confirmar que la compra sea aprobada y activa.
3. Revisar el evento más reciente y su fecha.
4. Corregir solo el registro afectado cuando exista evidencia suficiente.
5. Confirmar acceso con el comprador.

## Estado actual

El procedimiento está documentado. La restauración integral continúa pendiente hasta disponer de un proyecto temporal de staging y ejecutar la prueba completa sin riesgo para producción.
