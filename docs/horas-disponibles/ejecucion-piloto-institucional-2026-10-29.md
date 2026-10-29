# KineCheck Horas Disponibles — implementación del piloto institucional

Fecha: 29-10-2026 (Chile). PR de desarrollo: #295. PR #294 permanece separado.

## Estado de salida

Implementación completada en la rama y validación local aprobada. **No activado ni publicado como servicio real.** No se modificó Supabase producción ni se cobraron servicios.

La migración nueva sigue pendiente de aplicar en staging: el conector devolvió `Invalid or expired requestState` en dos intentos. La consulta posterior confirmó que `kc_hours_private.release` no existe y que las tablas de perfiles e instituciones de Horas están vacías. No se crean usuarios Auth remotos mientras no se pueda instalar y validar el esquema. Los usuarios y las 205 fichas sintéticas de las pruebas existen exclusivamente en PostgreSQL embebido de la prueba local.

La ruta pública comprobada en navegador sigue redirigiendo a `https://kinecheck.cl/horas-disponibles/demo/`. El demo identifica expresamente los horarios como ficticios. El cambio de esta rama que retira la tarjeta extra de advertencia al paciente aún no está en producción.

## Funcionalidades implementadas

| Área | Implementación en la rama | Comprobación |
| --- | --- | --- |
| Declaración | Texto aprobado intacto; casilla desmarcada; perfil y aceptación atómicos; identidad, versión y fecha del servidor; aceptación inmutable | Pruebas locales de rechazo, atomicidad y suplantación |
| Perfil | Actualización y desactivación; cambio de nombre o profesión reinicia verificación; suspensión reservada a moderación | Pruebas locales |
| Institución | Registro pendiente de verificación; panel por sede; administradores y secretaría; incorporación con invitación vinculada a correo y de un solo uso | Pruebas locales, UI preparada para CI |
| Autorización | Aceptación del vínculo por el profesional y habilitación posterior por la institución; delegación individual a cada secretaria; revocación de vínculos, equipo e invitaciones pendientes | Pruebas locales con dos clínicas y profesional multiinstitución |
| Agenda | Publicación y edición con permisos actuales; cancelación; “se agendó” desactiva; no se permite trasladar la hora a otro titular o institución | Pruebas locales |
| Piloto | Inicio efectivo mediante acción autorizada; 1.440 horas exactas desde el servidor; activación idempotente; estado vencido calculado; bloqueo de publicación y búsqueda al vencer | Pruebas locales |
| Paciente | Búsqueda pública paginada por profesión/especialidad, región, comuna, fecha de Chile, modalidad y establecimiento; nombre profesional; enlace oficial HTTPS | Pruebas locales y UI preparada para CI |
| Denuncias | Categorías sin texto clínico ni datos del paciente; revisión por operador; una denuncia nunca suspende automáticamente | Pruebas locales |
| Métricas | Profesionales habilitados, publicaciones, disponibilidad vigente, contactos orientativos y reservas informadas por el prestador; aislamiento por institución | Pruebas locales |
| Pagos | Sin integraciones nuevas, cobros, medios de pago ni renovación automática. Modelo futuro: profesionales habilitados; no número de horas | Inspección y prueba de contrato |

## Seguridad técnica

- Esquema interno dedicado `kc_hours_private`; no se otorga acceso al esquema compartido `private`, para preservar Campus y otros servicios.
- RLS forzada y tablas internas sin acceso para roles públicos; las escrituras de clientes pasan por una API con autorización explícita. Se revocan los caminos de escritura directa anteriores.
- Las funciones públicas nuevas son envoltorios con `SECURITY INVOKER`; las funciones privilegiadas internas fijan `search_path=''` y restringen `EXECUTE`.
- Operaciones autenticadas validan cuenta confirmada, bloqueo de cuenta y pertenencia de `session_id` a una sesión vigente. No se usan metadatos editables como fuente de permisos.
- Invitaciones: token aleatorio de dos UUID, hash SHA-256, caducidad de siete días, correo vinculado, bloqueo transaccional y un solo uso. Se comprueba que quien invita conserve su autorización.
- Revocar secretaría invalida sus delegaciones. Se consulta el estado actual en la base de datos sin esperar un JWT nuevo.
- Cada escritura de una hora revalida vigencia, piloto, credenciales, declaración y enlace. Las publicaciones suspendidas no se pueden editar ni reactivar mediante esta API.
- Enlaces HTTPS sin credenciales, direcciones IP ni hosts locales; no se realizan solicitudes de servidor a esas direcciones. El paciente sale al sitio del prestador.
- Presupuesto de operaciones por cuenta; límites de publicaciones activas y tamaño de payload; denuncias y métricas acotadas por día. Los contactos son métricas orientativas susceptibles de automatización; no prueban conversiones reales.
- Búsquedas de 24 resultados y listados institucionales de 50, con índices de agenda, instituciones, vínculos y permisos. Las pruebas locales de cinco páginas con 205 profesionales adicionales tardaron decenas de milisegundos; esto **no es un benchmark de producción ni una prueba de carga real**.
- CSP propia sin scripts inline para Horas, selección de staging restringida al proyecto Pages conocido y entorno local de pruebas. Inicio por enlace mágico vinculado a una solicitud del mismo navegador durante 15 minutos.

## Migraciones

Migraciones previas del PR en staging: `20261029120239`, `20261029120346`, `20261029120350`, `20261029120357`, `20261029120405`.

Nueva migración creada con Supabase CLI:

`supabase/migrations/20261029130234_hours_institutional_pilot_secure.sql`

**Estado: validada localmente; no aplicada remotamente.** La versión que se asigne al aplicarla mediante el conector puede ser distinta; debe conservarse el nombre y verificarse su contenido y registro antes de promover a producción. No ejecutar todas las migraciones históricas a ciegas: staging contiene un arnés y deriva previa que requieren un plan de migración explícito.

La migración añade tablas/columnas e índices y restringe los permisos del módulo Horas. Su estado por defecto es `enabled=false`, `legal_approved=false`, sin operadores ni pilotos. No activa el servicio al ejecutarla. No contiene instrucciones de cobro ni elimina datos legítimos.

## Pruebas y evidencia

- `npm test`: 187 pruebas aprobadas, 0 fallidas tras actualizar el contrato de registro atómico.
- Pruebas focales de declaración y piloto: 21 aprobadas, 0 fallidas (incluyen los escenarios funcionales y de seguridad).
- Validadores de marca, contratos UI de Academy y coherencia de Campus: aprobados.
- Compatibilidad con #294: `git merge-tree --write-tree HEAD origin/audit/security-privacy-followup-2026-10-29` sin conflictos. No se integró ni alteró esa rama.
- El PR incorpora `.github/workflows/hours-institutional-pilot.yml`: PostgreSQL embebido y pruebas de interfaz Chromium/WebKit en 360, 390, 768 y 1.280 px, incluyendo accesibilidad, registro, casilla obligatoria, publicación institucional, secretaría y paginación. Las respuestas de API de esas pruebas de navegador son fixtures del proceso, no cuentas ni sesiones reales.
- Descarga de navegadores local bloqueada por archivos incompletos de la red del entorno. La ejecución visual se traslada a CI; no se marca aprobada hasta ver sus resultados.
- **Pendiente obligatorio:** pruebas HTTP con JWT emitidos por Supabase Auth de staging, confirmación real del correo/enlace, dos clínicas con sesiones independientes, revocación con sesión existente y migración instalada. Los JWT simulados de la prueba SQL no reemplazan ese control.
- **Pendiente:** prueba del despliegue de vista previa y, después de aprobación de apertura, móvil/escritorio y registro reales en producción.

## Producción y Cloudflare

Base del PR consultada: `0c2fd083c6759ff8ba638298419a13c56bf9928a`.

Su check de Cloudflare Pages figura exitoso, con despliegue `de84be20-4719-402e-8c91-adee56df72a5`. La verificación de navegador confirma el demo. Esto es evidencia del despliegue base, no del código de este PR. No se obtuvo un manifiesto en el dominio público que vincule por sí solo todos sus assets al SHA; no se afirma esa comprobación adicional.

`_redirects` continúa enviando la ruta pública al demo. No retirar ese resguardo ni integrar/publicar la nueva versión antes de aprobar staging y los controles de apertura.

## Revisión jurídica y apertura

Se redactó `horas-disponibles/condiciones.html`, específico del piloto. Identifica al responsable y canal de privacidad existentes, fines/datos, responsabilidades institucionales, proveedores y región, revocación, denuncias, gratuidad y transición normativa. Es un texto preparado para revisión; no se presenta como validado por un abogado.

Fuentes oficiales consultadas:

- Ley 19.628, versión vigente hasta el 30-11-2026: https://www.bcn.cl/leychile/Navegar?idNorma=141599&idParte=8642680
- Ley 21.719 y entrada en vigor el 01-12-2026: https://www.bcn.cl/leychile/Navegar/imprimir?idNorma=1209272

Un piloto de 60 días iniciado a fines de octubre cruza esa fecha. La aceptación del profesional no elimina las obligaciones de KineCheck. Antes de abrir deben quedar documentadas: identidad formal y canales del responsable, bases jurídicas y avisos/consentimientos, representación institucional, acuerdos con encargados, garantías de transferencias internacionales, calendario de conservación/supresión (incluidas copias y auditoría), gestión de derechos e incidentes y condiciones de intermediación. La ficha legal general del repositorio también conserva datos pendientes; no se inventan RUN ni domicilio.

## Orden para terminar la liberación

1. Recuperar el acceso de escritura de Supabase o autorizar el uso del Dashboard para aplicar la migración en **KineCheck Staging**, referencia `mhnqtyvwxytppekktvxb`.
2. Aplicar la migración y ejecutar asesores. Revisar avisos relevantes a Horas y conservar el resto de hallazgos del PR #294 separados.
3. Provisionar únicamente cuentas sintéticas Auth en staging; no reutilizar cuentas reales. Registrar un operador sintético y habilitar la bandera exclusivamente para las pruebas; nunca marcar una revisión jurídica real como aprobada para probar.
4. Ejecutar todos los escenarios mediante Auth y PostgREST, más la prueba visual del despliegue. Revocar sesiones y retirar exclusivamente los fixtures al finalizar; volver a dejar la bandera de staging cerrada.
5. Documentar revisión jurídica humana y designar responsable operativo, mecanismo independiente de verificación, canal de denuncias y grupo autorizado de instituciones.
6. Revisar CI del SHA final y repetir únicamente los controles afectados por cambios posteriores.
7. Revisar diferencias de esquema en producción, preparar migración no destructiva con recuperación, integrar #295 y desplegar Pages con las banderas cerradas.
8. Verificar SHA y assets publicados, registro, declaración y regresiones en producción. Solicitar aprobación concreta para activar el servicio real y abrir únicamente el piloto autorizado. Iniciar cada piloto desde su activación efectiva.

Rutas previstas tras la liberación: paciente `/horas-disponibles/#searchPanel`, profesional `/horas-disponibles/#publishPanel`, institución `/horas-disponibles/#institutionPanel`. **Ahora esas rutas siguen llevando al demo; no se entregan como accesos operativos nuevos.**
