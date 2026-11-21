# Seguridad, privacidad y procedencia

## Límites de autorización

Pages Functions valida origen, método, tipo y tamaño de JSON, identidad confirmada mediante `/auth/v1/user` y tiempo máximo de conexión. La identidad y los roles no se toman de `user_metadata`, formularios ni parámetros de exportación. Se reutiliza la sesión existente de Academy; el entorno de preview usa una clave local separada y el proyecto de staging.

PostgreSQL vuelve a comprobar `auth.uid()`, la cuenta confirmada, bloqueo y existencia/vigencia de `auth.sessions`. Un JWT cuya sesión fue revocada no basta. Los operadores proceden de `private.campus_operators`; los otros roles se asignan por cohorte. La institución y la membresía activa de Campus se comprueban en cada solicitud. Un participante solo recibe sus respuestas y encuestas. Un analista no recibe respuestas individuales ni claves de instrumentos.

Las catorce tablas nuevas están en `private`, con RLS y sin privilegios para `anon` ni `authenticated`. No se añade acceso general al esquema privado compartido. Solo un wrapper `SECURITY INVOKER` en `public` llama al despachador autenticado del esquema aislado `qi_internal`. Las funciones privilegiadas fijan `search_path=''`, usan nombres cualificados y no ejecutan SQL dinámico con entradas del usuario. Los helpers carecen de permiso de ejecución para clientes.

## Integridad y archivos

Los programas, instrumentos, cohortes, registros, informes y aprobaciones no se reescriben por la API; existen controles adicionales de inmutabilidad. Los cambios académicos y revisiones se añaden con versión y responsable. Las actualizaciones de registros exigen la referencia de su última revisión para evitar sobrescrituras concurrentes. La eliminación legítima de un archivo conserva el manifiesto documental y la huella en el registro asociado.

Los archivos se almacenan como texto privado en PostgreSQL, sin URL pública ni bucket abierto. Se admiten únicamente `.txt` UTF-8 de hasta 100 KB y un máximo de 50 archivos por responsable y ámbito. La descarga requiere ser propietario o responsable académico/operador del mismo ámbito. La declaración de anonimización no garantiza por sí sola que el contenido sea adecuado: se exige revisión humana y no se solicitan datos de pacientes.

Las respuestas se puntúan con claves deterministas privadas o revisión humana con rúbrica. Los puntajes del navegador se ignoran. Las encuestas y respuestas se validan con tipos, escalas y longitudes. Los CSV escapan fórmulas de hojas de cálculo. Las pantallas construyen contenido con nodos y texto; no interpolan respuestas en HTML. API y exportaciones usan `private, no-store`, `nosniff` y política de referencia restringida.

Las acciones administrativas y mutaciones tienen auditoría sin copiar respuestas, archivos, contraseñas ni secretos. Los informes conservan una copia agregada, la huella de sus evaluaciones fuente y SHA-256 del respaldo. No contienen nombres, correos ni respuestas de estudiantes. Los archivos para difusión eliminan texto libre y suprimen el conjunto cuando hay grupos pequeños.

## Conservación y consentimiento

El consentimiento es explícito, versionado y revocable para seguimiento. Retirarlo elimina avisos pendientes de este módulo y bloquea nuevos seguimientos. El mantenimiento conserva respuestas/archivos durante 24 meses y preserva metadatos, auditoría e informes agregados. La eliminación personal borra respuestas, revisiones dependientes, encuestas y archivos del módulo; conserva los registros académicos originales de Academy. La política requiere validación institucional antes de uso real.

La exportación administrativa de un expediente sigue siendo privada: incluye responsables académicos. El CSV de difusión contiene indicadores agregados, sin expedientes ni texto de respuestas. La supresión no sustituye una revisión de riesgo de identificación antes de publicar resultados en grupos o contextos identificables.

## Fuera del alcance

No se modifican webhooks, compras, licencias, políticas de aprobación, certificados, progreso existente ni Edge Functions de otros servicios. No se crea un proveedor de email. No se carga un banco clínico de producción sin revisión y no se activan certificaciones CEL/OTEC/SENCE. No se atribuye validez clínica o psicométrica a las pruebas sintéticas del software.
