# Implementación de piloto por competencias

## Qué aporta la rama

La migración `20261028130605_academy_competency_workflow.sql` fue creada con Supabase CLI 2.122.0. Crea `academy_core`, una RPC autenticada y una consulta pública mínima de verificación de certificados. No toca las tablas ni flags existentes. No incluye preguntas, estudiantes, operadores ni emisores. `exams_enabled=false` y `otec_enabled=false`.

El acceso usa usuario y sesión vigentes del servidor, cuenta confirmada, licencia del curso y matrícula explícita. Los roles académicos residen en una tabla protegida; no se lee `user_metadata` para autorizar. Todas las tablas nuevas tienen RLS y carecen de permisos directos de cliente. Los permisos de las funciones se revocan de PUBLIC/anon y se otorgan de forma explícita solo donde corresponde.

La RPC necesita `SECURITY DEFINER` para comprobar roles y operar en el esquema privado. Su superficie pública está revocada para anónimos y cada operación valida sesión, pertenencia o rol antes de devolver datos. Las funciones auxiliares viven en `academy_core`, sin USAGE ni EXECUTE para clientes. La única consulta anónima es `academy_certificate_verify(uuid)`, que devuelve título, emisor, fecha, hash y validez; no identidad del estudiante ni URL del documento.

## Tres estados independientes

| Registro | Significado | Quién lo acredita |
|---|---|---|
| `completions` | Actividades obligatorias finalizadas | Registrar con evidencia y lista completa; no es un puntaje ni aprobación |
| `attempts` + `reviews` + `approvals` | Evaluación corregida, seguridad y requisitos cumplidos | Motor transaccional y revisión humana identificada |
| `certificates` | Solicitud o documento realmente emitido | Certifier con emisor habilitado, aprobación válida, requisitos administrativos y metadatos del documento |

La matrícula vincula una versión y evidencia de condiciones aceptadas. No se importan automáticamente finalizaciones legadas como aprobaciones. La tabla de licencia actual se consulta, sin cambiar compras, Hotmart, usuarios, vigencias o permisos de otros servicios.

## Evaluación

Una versión solo se puede aprobar con un formulario completo de 100 puntos, todos los ítems revisados y referenciados, casos de siete etapas, al menos 50 puntos de respuestas justificadas, máximo 15 puntos de fundamentos y una competencia crítica. La activación es un paso separado y requiere además el interruptor de examen. La aprobación exige revisión humana; una IA no puede registrar un resultado por sí sola.

El inicio bloquea la matrícula para asignar intentos de forma controlada; un reintento de la petición devuelve el intento abierto existente. Los intentos iniciados y expirados consumen cupo. Los casos se ordenan aleatoriamente, sus etapas mantienen el orden y se barajan las opciones e ítems de cada etapa. La respuesta correcta se remapea en el snapshot privado. No se exponen claves, explicaciones de distractores ni etapas futuras al estudiante.

Cada etapa confirmada queda inmutable para el estudiante. Un envío repetido de una etapa anterior no reemplaza respuestas. El plazo lo comprueba el servidor. Al terminar, el estado queda `pending_review`, sin aprobar por cantidad de caracteres. La persona revisora puntúa cada dimensión dentro de su máximo, registra feedback y valora seguridad. La puntuación total no se redondea al umbral. Una falla crítica impide aprobar con cualquier total.

La UI de piloto está en `/academy/competencias/`. Usa la sesión ya existente de Academy y una matrícula proporcionada por el equipo; no incorpora un nuevo sistema de identidad. La API `/api/academy-workflow` permanece 404 si `ACADEMY_COMPETENCY_PREVIEW` no es `enabled`. Este flag se debe usar solo en un entorno de revisión hasta aprobar la liberación. La RPC y sus flags son un control independiente; habilitar el proxy no activa exámenes.

## Emisión y conciliación

Solicitar certificado no lo emite. El registro de emisión requiere emisor con convenio y autorización, aprobación vigente, visto bueno administrativo, identificador externo único, documento HTTPS, hash SHA-256 y costo no negativo. El motor registra un documento externo real, **no fabrica ni firma un certificado OTEC**. La verificación pública mínima permite comprobar identificación y anulación. El nombre de una OTEC, horas oficiales, firmas y QR final deben aprobarse e integrarse con el emisor.

La clave única por aprobación y por identificador del emisor evita duplicados. La anulación conserva registros y auditoría. Anular aprobación invalida el certificado y marca crédito requerido si se había emitido. El reporte mensual usa fecha de emisión en `America/Santiago`, incluye anulaciones y referencias de conciliación, y excluye aprobaciones o solicitudes sin emisión. No cobra nada al estudiante.

La descarga JSON de `monthly_report` es la fuente del generador de Excel. La planilla entregada con la auditoría es una plantilla sin registros reales; no demuestra un mes con cero certificados legados. El nuevo ledger no está instalado. Para un reporte operativo, utilizar solo el JSON autorizado de ese ledger y conciliar costos con la OTEC.

El generador reproducible está en `scripts/export-academy-monthly.mjs` y usa el runtime de documentos de Codex:

```bash
"$CODEX_PRIMARY_RUNTIME_NODE" scripts/export-academy-monthly.mjs reporte-autorizado.json reporte-mensual.xlsx
```

Requiere `CODEX_PRIMARY_RUNTIME_NODE_MODULES`; no instala dependencias ni necesita una clave de servicio. Rechaza duplicados, costos ausentes, fechas incompatibles y anulaciones inconsistentes. Conserva totales bruto, anulado y neto mediante fórmulas, comprueba el neto de forma independiente y renderiza una vista para verificación. Las fechas visibles se convierten al calendario de Chile. Los textos no confiables se escriben como literales para evitar inyección de fórmulas. Su ejecución de prueba utilizó dos documentos sintéticos fuera de los archivos entregados; no los presenta como emisiones reales.

El panel define «con actividad registrada en 30 días» por la mayor fecha de matrícula, verificación de finalización e inicio/envío de examen v2. No es una medida de tiempo de estudio ni de actividad en todas las lecciones legadas.

## Instalación controlada y reversión

1. Crear un entorno de ensayo con la estructura `auth` y `course_access` compatible; aplicar únicamente esta migración sobre un backup verificado. La ejecución actual solo la aplicó a PGlite local.
2. Registrar operadores reales por SQL administrativo, con evidencia de nombramiento; no habilitar roles desde JWT editable. Importar el banco revisado por un canal privado, nunca un archivo de claves en este repositorio público.
3. Registrar aprobación académica por ítem y versión. Aprobar parámetros, política de intentos, revisión de respuestas y ajustes razonables antes de exponerlos al estudiante.
4. Pilotar con cuentas de ensayo y licencia pertinente. Registrar opt-in y actividades verificadas. Mantener el interruptor OTEC en false.
5. Revisar el PR, pruebas, seguridad de PostgreSQL desplegado, sesiones reales y dispositivos. La prueba local no demuestra permisos ni conectividad del entorno remoto.
6. Publicar solo componentes aprobados. No ejecutar un despliegue masivo de las funciones legadas desde este checkout: se comprobó divergencia entre sus fuentes y producción.
7. Para revertir, quitar `ACADEMY_COMPETENCY_PREVIEW` y ejecutar [rollback](../../../supabase/rollback/academy_competency_workflow.sql): desactiva el piloto y revoca su RPC, preservando toda la evidencia. No borrar auditoría ni tablas con estudiantes.

Debe verificarse el cambio de [permisos explícitos de Supabase](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) antes de instalar en un proyecto con nuevos defaults. Esta implementación no depende de grants automáticos: otorga EXECUTE explícito y no expone las tablas.

## Límites pendientes

No se implementó una integración automática completa del recorrido protegido de Clínico/Lumbar. Existe un registro de verificación humana explícita. No se realizó migración de alumnos legados, carga de preguntas validadas, activación de exámenes, emisión OTEC, integración contractual de costos o firma documental. La cola de revisión requiere la persona académica responsable; la validez psicométrica requiere datos y estudio, no una prueba de software.
