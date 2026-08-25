# Auditoría de privacidad post-login — 25-08-2026

## Alcance

Revisión de la capa autenticada de KineCheck con foco en evitar que herramientas educativas se confundan con una ficha clínica real o incentiven el ingreso de datos identificables de pacientes.

## Estado por criterio

### 1. Formularios y textos libres

- **KineCheck Clínico:** revisado en `kinecheck-clinico-guia/`. La guía ya usaba código ficticio y una regla general de no ingresar identificadores. Se añadió advertencia contextual inmediatamente antes de cada campo de texto libre.
- **Plataforma legacy:** `platform/platform.js` permitía crear casos con `title`, `context` y `details` en `platform_cases`. La ruta `platform/` redirige actualmente a `academy/`. Se deshabilitaron nuevas escrituras autenticadas en las tablas legacy.
- **KineCheck Estudiante:** el acceso se realiza por SSO a `https://apps.kinecheck.cl`. El código fuente de esa aplicación no está presente en este repositorio conectado, por lo que la auditoría campo por campo de su interfaz interna permanece **pendiente**.

### 2. Advertencias junto a campos sensibles

- Clínico: implementado mediante `kinecheck-clinico-guia/privacy-guard-v1.js`.
- Estudiante: pendiente de auditar e implementar en el código de `apps.kinecheck.cl` si no existe actualmente.

Texto aplicado en Clínico:

> Uso educativo: utiliza exclusivamente información ficticia, simulada o debidamente anonimizada. No ingreses nombre, RUT, teléfono, correo, número de ficha ni otros identificadores reales.

### 3. Etiquetas y ejemplos identificatorios

- Clínico usa `Código ficticio del caso` y ejemplo `CASO-HOMBRO-01`.
- No se detectaron campos de nombre/RUT/contacto/número de ficha en la guía activa de Clínico.
- Estudiante: pendiente de inspección interna del código de `apps.kinecheck.cl`.

### 4. PDF / CSV

- Clínico ofrece impresión/guardado como PDF. Se añadió la marca visible: **Documento educativo — no corresponde a una ficha clínica**.
- No se identificó exportación CSV en la guía de Clínico.
- Estudiante: pendiente de inspección de la aplicación externa y de sus exportaciones.

### 5. Almacenamiento, logs, respaldos, retención y eliminación

- Todas las tablas `public` observadas en Supabase tienen RLS habilitado.
- `platform_cases` tiene RLS por `owner_id`, pero su campo `summary` es JSON libre y podía recibir texto identificable.
- Producción tenía 1 registro legacy en `platform_cases` y 1 evento relacionado, ambos del 04-08-2026. No se inspeccionó el contenido.
- Se aplicó en producción la migración `disable_legacy_platform_case_writes`: `authenticated` ya no tiene INSERT/UPDATE/TRUNCATE/REFERENCES/TRIGGER sobre `platform_cases` ni `platform_case_events`. Se mantienen SELECT/DELETE según las políticas existentes para permitir gestión controlada del legado.
- `student_semester_responses` tenía 0 registros al momento de la auditoría.
- Storage: un único bucket privado `course-assets`, 3 objetos, sin políticas de acceso de cliente observadas.
- Logs API revisados: rutas, método, estado y algunos identificadores técnicos de sesión; no se observaron cuerpos de formularios en los eventos revisados.
- La documentación de tratamiento define conservación de casos hasta eliminación/cierre de cuenta y respaldo temporal, pero no se verificó un TTL técnico automatizado para `platform_cases`. El único registro legacy debe clasificarse y eliminarse de forma controlada si no existe obligación de conservarlo.

### 6. Recupera

- Se detectó que el SSO autenticado todavía aceptaba `kinecheck-recupera` pese a que la capa pública lo declaraba Próximamente.
- Corregido en la rama: Academy lo deshabilita y presenta como Próximamente.
- El relay SSO rechaza explícitamente `kinecheck-recupera`; sólo KineCheck Estudiante permanece permitido.
- `academy/config.js` elimina la ruta SSO de Recupera y lo marca `preparing`.
- La portada HTML estática se alineó con el estado Próximamente para no depender sólo de JavaScript en caché/rastreadores.

### 7. Producción, caché y dominios

- El HTML rastreado de `https://kinecheck.cl/` todavía mostraba textos estáticos antiguos, mientras `kinecheck/site-v5.js` los corrige en tiempo de ejecución a Próximamente. Se corrigió el HTML base en esta rama para evitar esa discrepancia.
- La verificación final de producción debe repetirse después del merge/despliegue y purga de caché, tanto en dominio raíz como en `www`.

## Hallazgos de seguridad relacionados, fuera del alcance inmediato

El Security Advisor de Supabase reportó, entre otros, funciones `SECURITY DEFINER` ejecutables por roles de cliente (`kinecheck_status_center_snapshot`, `has_course_access`) y protección contra contraseñas filtradas desactivada. Estos hallazgos requieren una revisión de seguridad separada; no se modificaron dentro de esta auditoría para evitar mezclar cambios de autorización con la corrección de privacidad educativa.

## Criterio de cierre

- **Clínico:** protección post-login reforzada en esta rama; puede mantenerse como herramienta educativa.
- **Recupera:** debe continuar **Próximamente** y sin registro de información.
- **Estudiante:** **no debe declararse auditado/cerrado** hasta revisar el código o despliegue interno de `apps.kinecheck.cl` campo por campo, incluyendo almacenamiento y PDF/CSV si existen.
