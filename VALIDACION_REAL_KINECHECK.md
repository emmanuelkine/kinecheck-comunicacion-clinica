# Validación real KineCheck — cierre técnico de los 14 controles

**Fecha:** 2026-10-29  
**Rama evaluada:** `audit/security-privacy-followup-2026-10-29` (PR #294)  
**Base inicial:** `64f5883b525405c7b47cd76c207aee143219f40d`  
**Decisión:** técnicamente preparado para ejecutar los casos reales restantes; lanzamiento comercial real y pruebas humanas aún no certificados.

## Regla de interpretación

Una simulación controlada demuestra lógica y regresión, pero **no equivale** a una compra, webhook, reembolso, chargeback, dispositivo físico ni prueba humana real. Los estados de este informe son:

- **APROBADO:** el alcance indicado fue ejecutado con evidencia reproducible.
- **FALLIDO:** el resultado observado contradijo el control; exige corrección.
- **BLOQUEADO:** existe una dependencia externa o autorización que esta ejecución no puede suplir.
- **NO EJECUTADO:** requiere una persona, dispositivo o transacción real y no existe evidencia de ejecución.

No se hicieron pagos, reembolsos, chargebacks, despliegues, merges, cambios de secretos ni modificaciones de licencias reales.

## Resumen ejecutivo

| Estado | Controles |
|---|---:|
| APROBADO, sólo en alcance automatizado/simulado | 6 |
| FALLIDO | 0 |
| BLOQUEADO | 4 |
| NO EJECUTADO | 4 |

La suite existente ya cubría idempotencia, compras duplicadas, orden temporal, packs, reembolsos, cancelaciones, chargebacks, expiración de licencias, denegación sin licencia y handoffs vencidos. No se repitió manualmente esa auditoría. Se añadió únicamente la cobertura faltante para pago pendiente/fallido, correo de compra A frente a cuenta B y `PURCHASE_PROTEST`.

### Corrección confirmada

La documentación oficial de Hotmart enumera `PURCHASE_PROTEST` entre los eventos de compra. El webhook general lo ignoraba, aunque el webhook específico de Evidencia ya lo trataba como revocación. Se incorporó `PURCHASE_PROTEST`/`PROTEST` a `REVOKE_EVENTS` en `supabase/functions/hotmart-webhook/index.ts` y se agregaron regresiones en `tests/hotmart-access-regression.test.mjs`.

Fuentes de contrato consultadas: [eventos de webhook Hotmart 2.0.0](https://developers.hotmart.com/docs/en/2.0.0/webhook/purchase-webhook/) y [autenticación de webhooks externos en Supabase Edge Functions](https://supabase.com/docs/guides/functions/auth).

## Evidencia reutilizada, sin repetir pruebas

- PR #294, commit base `64f5883b`: CI registró **166/166 pruebas Node** y **58/58 Playwright**, sin fallos, omitidas ni inestables; el detalle y sus límites están en `docs/audits/2026-10-29-hardening-follow-up.md`.
- La prueba SQL previa con `SET ROLE anon/authenticated` y UUID sintéticos devolvió cero filas en `course_access` y en las tablas de Horas Disponibles. Es evidencia RLS a nivel SQL, no una sesión REST/JWT real.
- `tests/hotmart-access-regression.test.mjs` usa PGlite, carga las migraciones versionadas y prueba el mismo `process_hotmart_event` que materializa `hotmart_purchases` y `course_access`.
- `tests/tester-p0-access-sso.spec.mjs`, `tests/lumbar-authorization.test.mjs` y `tests/clinico-buttons.spec.mjs` cubren handoff vencido, autenticación inválida, licencia expirada y contenido protegido no publicado para una cuenta sin licencia.
- Las pruebas Playwright existentes ejercitan Chromium y WebKit con viewports móviles; son emulación automatizada, no iPhone/Android físicos.

## Los 14 controles

### 01. Compra Hotmart real — BLOQUEADO

- **Evidencia concreta:** existe protocolo operativo en `docs/release-commercial-validation.md`, pero no hay ID de transacción real autorizado ni evidencia de checkout completado en esta ejecución.
- **Entorno:** repositorio/PR y documentación; sin transacción financiera.
- **Correcciones:** ninguna.
- **Riesgo residual:** precio, garantía, moneda, página pospago y comportamiento real del checkout siguen sin certificación de extremo a extremo.
- **Intervención humana:** autorizar presupuesto y compra controlada con correo nuevo; registrar evidencia anonimizada conforme al protocolo.

### 02. Recepción de webhook auténtico — BLOQUEADO

- **Evidencia concreta:** `hotmart-webhook` valida `X-HOTMART-HOTTOK`, exige campos mínimos y delega atómicamente a `process_hotmart_event`; sólo hay fixtures y evidencia histórica, no un evento auténtico correlacionado con una compra de esta ejecución.
- **Entorno:** fuente versionada y CI.
- **Correcciones:** se agregó la revocación de `PURCHASE_PROTEST`.
- **Riesgo residual:** la configuración desplegada, el secreto, `verify_jwt=false` requerido para un webhook externo y la suscripción de eventos en Hotmart no están versionados de forma completa ni fueron observados aquí.
- **Intervención humana:** ejecutar una compra autorizada y correlacionar hora/ID anonimizado entre Hotmart, logs del webhook y Supabase en modo sólo lectura.

### 03. Licencia real y producto visible en Academy — BLOQUEADO

- **Evidencia concreta:** la simulación PGlite prueba creación de `course_access`; las pruebas Academy comprueban denegación/visualización con respuestas controladas. No existe licencia originada por pago real en esta ejecución.
- **Entorno:** PGlite + Playwright/CI.
- **Correcciones:** ninguna adicional.
- **Riesgo residual:** una diferencia entre la función desplegada, las migraciones versionadas o el catálogo Academy podría romper el flujo real.
- **Intervención humana:** comprobar, sin activación manual, compra → fila activa → catálogo → apertura del producto.

### 04. Correo de compra distinto al correo de cuenta — APROBADO (SIMULACIÓN)

- **Evidencia concreta:** la regresión crea acceso para correo A, confirma ausencia de acceso para B y verifica que `course-key` toma el correo desde `auth.getUser()` y consulta `course_access.email` con ese valor.
- **Entorno:** PGlite y revisión de la Edge Function versionada.
- **Correcciones:** nueva prueba de regresión A/B.
- **Riesgo residual:** falta confirmar el mensaje exacto con dos cuentas Auth reales en staging.
- **Intervención humana:** opcional para cierre real: iniciar sesión con B y confirmar rechazo comprensible; luego confirmar que A conserva acceso.

### 05. Reembolso actualiza la licencia — APROBADO (SIMULACIÓN)

- **Evidencia concreta:** la suite prueba `PURCHASE_REFUNDED`, orden temporal, duplicados y que un reembolso tardío de una compra antigua no revoque una compra posterior válida.
- **Entorno:** PGlite con migraciones reales del repositorio.
- **Correcciones:** ninguna; cobertura existente reutilizada.
- **Riesgo residual:** no se midió entrega/latencia del evento real de Hotmart.
- **Intervención humana:** para certificación comercial, autorizar reembolso real y observar el cambio sin intervención manual.

### 06. Chargeback, cancelación o protesta — APROBADO (SIMULACIÓN)

- **Evidencia concreta:** regresiones para `PURCHASE_CHARGEBACK`, `PURCHASE_CANCELED`, `PURCHASE_EXPIRED` y ahora `PURCHASE_PROTEST` terminan con acceso inactivo.
- **Entorno:** clasificador del webhook + PGlite.
- **Correcciones:** `PURCHASE_PROTEST` y alias `PROTEST` añadidos a revocación.
- **Riesgo residual:** no se generó una disputa bancaria ni cancelación real; `SUBSCRIPTION_CANCELLATION` mantiene por diseño el período pagado y requiere una política comercial explícita de fin de vigencia.
- **Intervención humana:** autorizar un caso real permitido por Hotmart; nunca iniciar un chargeback bancario sólo para probar sin autorización expresa.

### 07. Revocación efectiva del acceso — APROBADO (SIMULACIÓN)

- **Evidencia concreta:** después del evento revocatorio, `course_access.active=false`; las pruebas de curso verifican que un 403 no publica ni ejecuta los activos protegidos.
- **Entorno:** PGlite + Playwright con API controlada.
- **Correcciones:** ampliación de la matriz revocatoria a protesta.
- **Riesgo residual:** cachés, sesión ya abierta y latencia del despliegue real no fueron observados con una cuenta licenciada auténtica.
- **Intervención humana:** reabrir Academy y el producto tras un reembolso/chargeback real y verificar bloqueo en una sesión nueva y otra ya abierta.

### 08. Pago fallido o pendiente sin licencia — APROBADO (SIMULACIÓN)

- **Evidencia concreta:** sólo `PURCHASE_APPROVED` y `PURCHASE_COMPLETE` pertenecen a `ACTIVE_EVENTS`; `PURCHASE_BILLET_PRINTED` y eventos desconocidos/fallidos siguen la rama `ignored` y no invocan el RPC de licencia.
- **Entorno:** prueba de contrato del webhook en CI.
- **Correcciones:** nueva regresión que impide incorporar eventos pendientes/fallidos al conjunto activo.
- **Riesgo residual:** Hotmart no documenta un evento genérico `PURCHASE_FAILED`; debe verificarse el estado/evento exacto emitido por el medio de pago elegido.
- **Intervención humana:** ejecutar el escenario fallido permitido por Hotmart y comprobar ausencia de `course_access` activo.

### 09. Expiración de sesión y tokens inválidos — APROBADO (AUTOMATIZADO)

- **Evidencia concreta:** `tester-p0-access-sso` rechaza un handoff vencido sin POST; `lumbar-authorization` rechaza ausencia/token inválido sin descargar activos; `course-key` usa `auth.getUser()` y devuelve 401 para identidad inválida.
- **Entorno:** Node VM + Playwright, sin credenciales reales.
- **Correcciones:** ninguna; cobertura existente reutilizada.
- **Riesgo residual:** no se esperó la expiración real de un JWT emitido por Auth ni se probó rotación/revocación simultánea en staging.
- **Intervención humana:** usar una cuenta sintética válida de staging, registrar `expires_at`, esperar o usar el mecanismo autorizado y confirmar reautenticación sin exposición.

### 10. Misma cuenta en dos dispositivos físicos — NO EJECUTADO

- **Evidencia concreta:** no hay registro de dos equipos reales; las sesiones de navegador CI son aisladas y no sustituyen dispositivos.
- **Entorno:** no ejecutado.
- **Correcciones:** ninguna.
- **Riesgo residual:** sincronización, revocación concurrente, límites de sesión y persistencia pueden diferir.
- **Intervención humana:** iniciar sesión simultáneamente en dos dispositivos, abrir el mismo producto, cerrar/revocar en uno y documentar el comportamiento en ambos.

### 11. iPhone físico con Safari — NO EJECUTADO

- **Evidencia concreta:** WebKit y preset iPhone existen en pruebas automatizadas, pero no hay modelo, iOS, Safari, capturas ni recorrido físico.
- **Entorno:** sólo emulación CI.
- **Correcciones:** ninguna.
- **Riesgo residual:** teclado virtual, almacenamiento, enlaces universales, audio, orientación y VoiceOver pueden diferir.
- **Intervención humana:** ejecutar el protocolo físico definido abajo y adjuntar evidencia.

### 12. Android físico con Chrome — NO EJECUTADO

- **Evidencia concreta:** Chromium/Pixel simulado y viewports móviles están cubiertos; no existe evidencia de hardware Android.
- **Entorno:** sólo emulación CI.
- **Correcciones:** ninguna.
- **Riesgo residual:** WebView/Chrome, back navigation, teclado, ahorro de batería y almacenamiento pueden diferir.
- **Intervención humana:** ejecutar el protocolo físico y registrar fabricante/modelo, Android y Chrome.

### 13. Lector de pantalla real — NO EJECUTADO

- **Evidencia concreta:** axe, roles ARIA, foco visible, skip links, Escape y navegación por teclado tienen cobertura automatizada en superficies parciales; no hubo VoiceOver, TalkBack, NVDA o JAWS real.
- **Entorno:** axe/Playwright únicamente.
- **Correcciones:** ninguna.
- **Riesgo residual:** orden y nombre accesible, anuncios de errores/licencias y continuidad al cambiar de vista requieren evaluación humana.
- **Intervención humana:** completar el recorrido descrito abajo con lector de pantalla real y navegación sólo por teclado.

### 14. Prueba de penetración independiente autorizada — BLOQUEADO

- **Evidencia concreta:** se realizó revisión defensiva de fuente y pruebas no destructivas existentes; los tres revisores de reconocimiento independientes solicitados no devolvieron resultados por límite de ejecución, por lo que no se afirma auditoría exhaustiva ni pentest.
- **Entorno:** código fuente/CI; sin tráfico ofensivo a producción.
- **Correcciones:** sólo la brecha Hotmart demostrada.
- **Riesgo residual:** configuración desplegada, secretos, gateway, Auth, CORS, Storage, rutas no versionadas y abuso de negocio requieren observación autorizada.
- **Intervención humana:** contratar/autorizar un tercero independiente con alcance, ventana, contactos, datos sintéticos y reglas de detención.

## Validaciones de seguridad complementarias

| Control técnico | Resultado | Límite |
|---|---|---|
| Idempotencia y duplicados | Aprobado por pruebas PGlite (`event_id` único, lock y PK por correo/curso) | No mide reintentos de red reales |
| Token ausente/inválido | Aprobado automatizado: 401 y cero descarga de activos | Sin JWT real de staging |
| Cuenta sin licencia | Aprobado automatizado: 403, shell de acceso visible y activos privados 404 | API de licencia simulada en navegador |
| Aislamiento por correo | Aprobado simulado: A no concede acceso a B | Falta dos cuentas Auth válidas |
| RLS sintético | Denegación observada previamente con roles/UUID sintéticos | No equivale a REST/JWT, ni cubre usuario autorizado positivo |
| Acceso concurrente/dos dispositivos | No ejecutado | Requiere dispositivos físicos |

## Protocolos verificables pendientes

### iPhone/Safari y Android/Chrome

Para cada dispositivo registrar modelo, sistema, navegador/versión, fecha/hora y red. Usar cuenta sintética, nunca una cuenta personal:

1. Abrir `https://kinecheck.cl/academy/` y autenticar.
2. Confirmar catálogo, producto licenciado y rechazo de uno no licenciado.
3. Abrir el contenido protegido, completar una acción inocua y volver atrás.
4. Cerrar y reabrir navegador; comprobar persistencia esperada.
5. Probar orientación, zoom al 200 %, teclado virtual, enlace de compra sin pagar y cierre de sesión.
6. Tras revocación autorizada, confirmar que una sesión ya abierta y una nueva no carguen contenido.
7. Guardar evidencia restringida; en Git sólo referencia anonimizada.

### Lector de pantalla y teclado

1. Ejecutar al menos VoiceOver/Safari en iPhone o TalkBack/Chrome en Android; complementar con NVDA/Firefox o NVDA/Chrome en escritorio.
2. Recorrer skip link, navegación, formulario de acceso, errores, catálogo, tarjeta de producto, apertura y cierre de sesión.
3. Confirmar nombre/rol/estado, orden lógico, anuncio de errores y ausencia de trampas de foco.
4. Repetir sólo con teclado: `Tab`, `Shift+Tab`, `Enter`, `Space`, flechas cuando corresponda y `Escape`.
5. Registrar cada bloqueo con ruta, control, resultado esperado/observado y evidencia.

### Dos dispositivos

1. Autenticar la misma cuenta sintética licenciada en A y B.
2. Abrir el mismo producto en ambos y comprobar que no se comparte estado sensible por URL.
3. Cerrar sesión en A y verificar la política esperada en B.
4. Revocar la licencia mediante un evento autorizado y comprobar bloqueo en ambos, sin modificar manualmente `course_access`.

### Pentest independiente

**Alcance propuesto:** `kinecheck.cl`, Academy, funciones Supabase versionadas, Auth, REST/RLS, Storage de cursos, webhook Hotmart y SSO de apps. Excluir Hotmart, Supabase y Cloudflare como infraestructura de terceros salvo autorización escrita específica.

**Reglas:** cuentas/datos sintéticos, sin DoS, spam, ingeniería social, pagos, persistencia, borrado, cambios de secretos ni acceso a datos reales. Detener ante exposición de datos, escritura fuera de fixture o degradación. Entregar trazabilidad, reproducción mínima, severidad, corrección y prueba de regresión.

## Revisión de PR existentes

- **PR #294 (seguridad):** rama de este informe. Mantiene separados documentación, corrección del clasificador Hotmart y pruebas de regresión. No autoriza despliegue ni merge.
- **PR #295 (Horas Disponibles):** CI observado en verde salvo el job público HTTPS omitido; sus migraciones RLS y flujo funcional permanecen separados. No se desplegaron ni se mezclaron con este cierre. La validación con usuarios Auth positivos y dos instituciones sigue pendiente.

## Gate de comercialización

- **Preparación técnica automatizada:** apta cuando los checks del PR actualizado estén verdes.
- **Compra/webhook/licencia reales:** bloqueados hasta autorización y evidencia de los controles 01–03.
- **Lanzamiento comercial real:** no certificado mientras 01–03 sigan bloqueados.
- **Lanzamiento humano/multidispositivo:** no certificado mientras 10–14 no tengan evidencia.
- **Merge y producción:** no autorizados por este informe.
