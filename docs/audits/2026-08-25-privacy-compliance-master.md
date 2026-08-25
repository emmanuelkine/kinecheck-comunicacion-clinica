# Auditoría maestra de protección de datos personales — KineCheck

**Fecha:** 25 de agosto de 2026  
**Tipo:** auditoría técnica-jurídica preliminar de cumplimiento y preparación regulatoria  
**Ámbito principal:** Chile — Ley N.º 19.628 vigente y adecuación preventiva a Ley N.º 21.719  
**Estado:** NO constituye certificación legal ni sustituye revisión de abogado especializado. Sirve como mapa verificable de riesgos, controles y tareas de remediación para ingeniería.

---

## 1. Resumen ejecutivo

KineCheck ha avanzado de forma importante en minimización y separación de finalidades: KineCheck Recupera está pausado/`Próximamente`, los documentos legales actuales del repositorio prohíben el ingreso de datos identificables de pacientes en los productos educativos, todas las tablas públicas observadas en Supabase tienen RLS activado, el bucket de Storage observado es privado y las escrituras autenticadas a las tablas legacy de casos fueron deshabilitadas en producción.

Sin embargo, **no corresponde declarar cumplimiento integral cerrado**. La auditoría identificó un hallazgo crítico de exposición potencial de datos personales, varios hallazgos altos de seguridad/privacidad y varias brechas de gobierno documental y preparación para la Ley N.º 21.719.

### Veredicto operativo

- **Lanzamiento educativo (Clínico/cursos):** puede continuar con controles, pero debe cerrar los P0/P1 de este informe.
- **KineCheck Recupera:** debe permanecer **Próximamente / sin captura de datos de salud** hasta completar una evaluación de impacto, base jurídica, consentimiento cuando proceda, arquitectura de seguridad y flujo de derechos.
- **KineCheck Estudiante:** **NO puede declararse auditado integralmente** porque su aplicación interna se abre en `apps.kinecheck.cl` y el código fuente de esa aplicación no está disponible en los repositorios conectados auditados.
- **Beta:** al momento de esta auditoría hay **0 usuarios beta activos y 0 grants beta activos**. La generación de este informe no modifica accesos beta.

### Prioridad inmediata

1. **P0 — cerrar RPC pública `kinecheck_status_center_snapshot()`**: actualmente es `SECURITY DEFINER` y puede ser ejecutada por `anon`; la función construye una respuesta con correos y actividad de testers beta. Esto debe corregirse antes de considerar el sistema seguro frente a exposición accidental de identidades.
2. **P1 — dejar de persistir tokens de autenticación en `localStorage`** en Academy, o justificar/mitigar técnicamente con un diseño de sesión más robusto.
3. **P1 — endurecer `support-request`**: el endpoint público permite inferir estado de compra/licencia a partir de correo + producto sin prueba suficiente de control del correo.
4. **P1 — sincronizar documentos legales de producción con la versión de repositorio y el registro de versiones legales de la base de datos.**
5. **P1 — completar la auditoría de `apps.kinecheck.cl`** antes de afirmar cierre integral de Estudiante.

---

## 2. Marco legal de referencia

### 2.1 Norma actualmente vigente

Al 25-08-2026 la norma general vigente es la **Ley N.º 19.628 sobre protección de la vida privada**. Para KineCheck son especialmente relevantes:

- definición de dato personal como información relativa a una persona natural identificada o identificable;
- categoría de datos sensibles, incluyendo estados de salud físicos o psíquicos;
- deber de utilizar datos para fines permitidos y mantener exactitud/actualización;
- deber de secreto y diligencia en el tratamiento;
- derechos de información/acceso, rectificación, eliminación y bloqueo en los casos legales;
- eliminación o cancelación cuando los datos carezcan de fundamento legal o hayan caducado.

### 2.2 Norma próxima a entrar en vigor

La **Ley N.º 21.719**, publicada el 13-12-2024, entra en vigencia el **01-12-2026**. KineCheck ya declara públicamente una adecuación preventiva, por lo que la arquitectura debe diseñarse desde ahora para:

- licitud, finalidad, proporcionalidad y minimización;
- transparencia y trazabilidad;
- derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo según proceda;
- privacidad desde el diseño y por defecto;
- seguridad proporcional al riesgo;
- gestión y notificación de incidentes cuando corresponda;
- evaluación de impacto en tratamientos de alto riesgo;
- obligaciones de responsables y mandatarios/encargados;
- reglas de transferencias internacionales;
- especial protección de datos sensibles y de salud.

### 2.3 Regla operativa para este proyecto

KineCheck debe evitar dos errores opuestos:

1. **Tratar datos de salud sin haber diseñado la base jurídica y controles necesarios.**
2. **Afirmar que no trata datos personales cuando sí procesa correos, compras, IDs de usuario, progreso, telemetría, soporte y trazabilidad.**

La estrategia actual correcta es: **productos educativos sin datos identificables de pacientes; Recupera pausado hasta completar su diseño de privacidad específico.**

---

## 3. Alcance y metodología

### Revisado directamente

- repositorio `emmanuelkine/kinecheck-comunicacion-clinica`;
- documentos legales `legal/privacidad.html` y `legal/terminos.html`;
- Academy y almacenamiento de sesión/progreso del frontend;
- telemetría `metrics-v1.js`;
- watermark/licencia visual;
- cabeceras `_headers`;
- Supabase producción: tablas, columnas, RLS, políticas, grants, funciones, crons, Storage, recuentos agregados, funciones de limpieza y Security Advisor;
- Edge Function `support-request`;
- PRs de endurecimiento legal y post-login recientes;
- estado agregado de beta, sin exponer correos ni inspeccionar contenidos potencialmente sensibles.

### No revisado integralmente

- código interno de `apps.kinecheck.cl` (KineCheck Estudiante);
- contratos/DPA y configuración contractual completa de cada proveedor externo;
- contenido del único registro legacy de `platform_cases` (deliberadamente no se inspeccionó para evitar acceder a contenido potencialmente sensible sin necesidad);
- configuración de backups administrados por proveedor más allá de lo observable;
- dispositivos finales de usuarios;
- procesos humanos fuera del sistema (correos, planillas, exportaciones manuales);
- una compra real end-to-end realizada durante esta auditoría;
- revisión jurídica profesional de cláusulas o interpretación normativa.

---

## 4. Inventario de datos verificado

### Identidad y autenticación

- correo electrónico;
- UUID/ID de usuario;
- tokens de sesión en el navegador de Academy;
- timestamps de creación/último inicio de sesión en funciones administrativas;
- preferencias de usuario.

### Compras y licencias

- correo del comprador;
- nombre del comprador en `hotmart_purchases`;
- transaction ID;
- product ID / producto;
- estado, evento y fechas de compra/licencia;
- vigencia y fuente de acceso.

### Aprendizaje

- `user_id`;
- progreso y timestamps;
- reseñas asociadas al usuario;
- historial local de apertura/progreso en el navegador.

### Beta

- estructura de `beta_applications` preparada para nombre, correo, rol/triage y otros campos de postulación;
- actualmente `beta_applications` tiene 0 filas;
- histórico de beta existe en `course_access`;
- **beta activo al auditar: 0 usuarios / 0 grants**.

### Soporte

- correo;
- transaction ID opcional;
- mensaje libre;
- diagnóstico automatizado JSON;
- prioridad/estado/timestamps.

Al momento de la auditoría `kinecheck_support_requests` tiene 0 filas.

### Telemetría

`kinecheck_public_events` contiene:

- event name;
- path;
- product slug;
- UUID de sesión;
- referrer host;
- device class;
- metadata JSON;
- `user_id` cuando existe sesión autenticada;
- flag QA;
- timestamp.

Al momento de la auditoría existen 1.059 eventos. No se observaron claves en `metadata` en la consulta de estructura/datos agregados realizada.

### Legacy de casos

- `platform_cases`: 1 fila;
- `platform_case_events`: 1 fila;
- nuevas escrituras autenticadas fueron revocadas en producción;
- contenido no inspeccionado.

### Storage

- bucket observado: `course-assets`;
- `public = false`;
- 3 objetos;
- sin políticas de cliente observadas.

---

## 5. Controles positivos verificados

### V-01 — RLS habilitado en todas las tablas públicas observadas — PASS

Las 28 tablas base del esquema `public` tienen `relrowsecurity=true`.

Esto no reemplaza una revisión de políticas/grants, pero es una buena línea base.

### V-02 — Datos de compra sensibles no expuestos directamente por políticas de tablas — PASS PARCIAL

Las tablas de Hotmart y operación backend observadas no tienen políticas RLS de cliente y el acceso normal se concentra en `service_role`.

### V-03 — `course_access` limita lectura al correo autenticado — PASS

La política `course_access_select_own` compara el correo de la fila con el correo del JWT.

### V-04 — `learning_progress` se limita por `auth.uid()` — PASS

Insert/select/update se restringen al propio `user_id`.

### V-05 — Recupera pausado en documentos legales de `main` — PASS EN REPOSITORIO

Los términos y privacidad de `main` declaran Recupera `Próximamente`, sin compra ni registro de datos de salud.

**Debe verificarse separadamente el contenido efectivamente servido en producción.**

### V-06 — Prohibición de datos identificables de pacientes — PASS EN DOCUMENTACIÓN

Los términos actuales prohíben nombres, RUT, teléfonos, correos, direcciones, fotografías identificables, números de ficha, documentos y diagnósticos asociados a una persona identificable en productos educativos.

### V-07 — Legacy de casos bloqueado para nuevas escrituras de clientes — PASS EN BASE DE DATOS

`authenticated` mantiene solamente `SELECT` y `DELETE` en `platform_cases` y `platform_case_events`; no conserva `INSERT`/`UPDATE` por grants de tabla.

### V-08 — Retención parcial automatizada — PASS PARCIAL

La operación diaria ejecuta una función de limpieza que elimina:

- límites de login >30 días;
- notificaciones leídas >180 días;
- automation runs >365 días;
- issues resueltos/ignorados >180 días;
- beta applications declined/completed >365 días;
- spam de soporte >30 días;
- soporte resolved/closed >730 días;
- eventos públicos >400 días;
- métricas diarias >730 días.

El cron diario está activo.

### V-09 — Cabeceras de seguridad — PASS PARCIAL

Se observan HSTS, no-sniff, Referrer Policy, restricciones de cámara/micrófono/geolocalización, X-Frame/COOP/CORP y `no-store` para áreas autenticadas.

### V-10 — Storage privado — PASS

`course-assets` no es bucket público.

---

## 6. Hallazgos priorizados

## P0-01 — RPC `kinecheck_status_center_snapshot()` expuesta a `anon` con datos identificables

**Severidad: CRÍTICA / P0**  
**Estado: VERIFICADO**

La función:

- es `SECURITY DEFINER`;
- tiene `EXECUTE` para `anon` y `authenticated`;
- construye un arreglo `testers` que incluye correos, cursos activos, fechas de creación de cuenta/último login/último evento, conteos de eventos y registros de progreso.

El Security Advisor de Supabase también la marca como `anon_security_definer_function_executable`.

### Riesgo

Una llamada pública al RPC puede revelar identidades y actividad de personas que participaron en beta. El hecho de que hoy haya 0 beta activos no elimina el riesgo porque la función construye `testers` a partir del histórico beta.

### Corrección requerida

**Opción preferida:**

- revocar `EXECUTE` de `public`, `anon` y `authenticated`;
- dejar ejecución únicamente a `service_role` o a un canal administrativo autenticado/autorizado;
- si el Status Center necesita información pública/cliente, crear un RPC separado **solo agregado**, sin correos, UUID, timestamps individuales ni actividad por persona.

SQL objetivo a validar en staging antes de producción:

```sql
revoke execute on function public.kinecheck_status_center_snapshot() from public, anon, authenticated;
grant execute on function public.kinecheck_status_center_snapshot() to service_role;
```

### Gate

- llamada con anon debe devolver 401/403/permission denied;
- llamada con usuario normal autenticado debe fallar salvo requerimiento funcional explícito;
- ninguna respuesta pública puede contener correos beta.

---

## P1-02 — Tokens Supabase persistidos en `localStorage`

**Severidad: ALTA / P1**  
**Estado: VERIFICADO**

`academy/academy-v39.js` guarda el objeto de sesión completo bajo `kinecheck_secure_session_v1` en `localStorage`; el flujo de refresh utiliza `refresh_token` persistido.

### Riesgo

`localStorage` es accesible a cualquier JavaScript que llegue a ejecutarse en el mismo origen. Una vulnerabilidad XSS o script comprometido podría extraer tokens persistentes, elevando el impacto desde un problema visual a secuestro de sesión.

### Corrección requerida

Codex debe estudiar una migración segura hacia una de estas arquitecturas:

1. cookies `HttpOnly + Secure + SameSite` gestionadas por backend/BFF; o
2. cliente oficial Supabase con persistencia reducida y token sensible fuera de almacenamiento persistente cuando sea técnicamente posible; o
3. memoria/sessionStorage con renovación controlada, documentando el trade-off UX.

No cambiar autenticación directamente en producción. Crear rama, pruebas de login/refresh/logout/password reset/SSO/móvil antes de merge.

### Gate

- ningún refresh token queda legible desde `localStorage`;
- cerrar sesión invalida/borra el estado;
- refresh de sesión sigue funcionando;
- no se rompe Academy móvil ni SSO.

---

## P1-03 — Enumeración de estado de compra/licencia en `support-request`

**Severidad: ALTA / P1**  
**Estado: VERIFICADO**

La Edge Function `support-request` tiene `verify_jwt=false`. Acepta llamadas no autenticadas y, para correo + producto, consulta compra/licencia con service role y responde mensajes/códigos distintos (`license_active`, `license_expired`, `purchase_revoked`, `purchase_not_found`, etc.).

CORS limita navegadores, pero **CORS no es autenticación** y solicitudes sin `Origin` no prueban propiedad del correo.

### Riesgo

Un tercero puede probar correos conocidos/estimados y obtener señales sobre si esa persona compró un producto, tiene una licencia activa, expiró o recibió reembolso.

### Corrección requerida

- para solicitudes sin identidad verificada, devolver una respuesta genérica y crear ticket sin revelar estado;
- para diagnóstico detallado, verificar control del correo mediante login, OTP/magic link o un mecanismo equivalente;
- si se usa `transaction_id` como factor adicional, validar combinación exacta y aun así minimizar la respuesta pública;
- añadir rate limit por IP/dispositivo además del límite por correo;
- no devolver diagnosis interno completo al cliente.

### Gate

Dos correos distintos, existentes o no, deben recibir respuestas indistinguibles antes de verificar identidad.

---

## P1-04 — Gobierno de versiones legales desalineado

**Severidad: ALTA / P1**  
**Estado: VERIFICADO**

Repositorio `main`:

- privacidad actualizada al 25-08-2026;
- términos actualizados al 25-08-2026.

Base de datos `kinecheck_legal_documents`:

- `privacy` activa = `2026-08-05`;
- `terms` activa = `2026-08-05`.

`kinecheck_legal_acceptances` tiene 0 registros al momento de esta auditoría.

### Riesgo

El sistema tiene dos fuentes de verdad distintas sobre cuál es la versión vigente. Si posteriormente se usa `kinecheck_missing_legal_acceptances()` o se exige aceptación, el registro puede apuntar a textos obsoletos.

### Corrección requerida

- migración versionada para registrar `2026-08-25` como versión vigente;
- desactivar versión anterior solo cuando la nueva esté cargada correctamente;
- separar claramente:
  - **aviso de privacidad** (informativo, no convertirlo artificialmente en “consentimiento”);
  - **aceptación de términos** cuando sea necesaria para la relación contractual;
  - **consentimientos específicos** cuando una finalidad/base jurídica realmente los requiera;
- guardar versión, fecha, usuario, fuente y evidencia mínima de aceptación cuando corresponda.

### Gate

Repositorio, UI y tabla de documentos legales deben mostrar la misma versión y fecha.

---

## P1-05 — Estado servido en producción debe verificarse contra `main`

**Severidad: ALTA / P1**  
**Estado: PENDIENTE DE CIERRE**

Durante la revisión externa se observaron respuestas/capturas indexadas con textos legales anteriores que presentaban Recupera como activo. El repositorio `main` ya contiene la versión corregida.

### Riesgo

Un aviso público desactualizado puede contradecir el comportamiento real, generar información incorrecta al titular y destruir trazabilidad de qué política estaba efectivamente disponible en una fecha determinada.

### Corrección requerida

Después del despliegue:

- purgar/verificar Cloudflare;
- comprobar `kinecheck.cl` y `www.kinecheck.cl`;
- validar fecha 25-08-2026;
- validar que Recupera figure Próximamente y sin tratamiento operativo de salud;
- guardar evidencia automática de hash/fecha de cada documento legal desplegado.

---

## P1-06 — KineCheck Estudiante no está auditado internamente

**Severidad: ALTA / P1**  
**Estado: PENDIENTE / LIMITACIÓN DE ALCANCE**

La app se abre mediante SSO en `https://apps.kinecheck.cl`. El código fuente interno no está en los repositorios conectados revisados.

### Antes de declarar cierre integral se debe revisar

- todos los inputs y textareas;
- nombres/labels/placeholders;
- almacenamiento local/remoto;
- endpoints y payloads;
- logs;
- PDF/CSV/impresión/descargas;
- posibilidad de copiar datos de pacientes;
- sesiones/tokens;
- telemetría;
- retención/eliminación;
- comportamiento offline;
- cachés/service workers;
- SSO y mensajes postMessage si existen.

### Gate

No debe existir ningún campo que invite al alumno a ingresar un paciente real. Los casos deben ser ficticios/simulados/anonimizados y cualquier texto libre debe llevar advertencia contextual cuando exista riesgo razonable.

---

## P1-07 — Recupera: cierre post-login aún depende del merge/despliegue del hardening

**Severidad: ALTA / P1**  
**Estado: CORREGIDO EN RAMA / NO CERRADO EN PRODUCCIÓN**

La auditoría post-login detectó que el SSO aún aceptaba `kinecheck-recupera` aunque la capa pública lo mostraba como Próximamente. La rama `privacy/post-login-educational-hardening` corrige:

- Academy lo marca/deshabilita como Próximamente;
- SSO relay rechaza Recupera;
- `academy/config.js` quita la ruta SSO y usa `status: preparing`;
- HTML estático se alinea.

### Gate antes de reactivar o dar por cerrado

- PR revisado y tests PASS;
- despliegue verificado en root/www;
- intento de abrir Recupera con sesión antigua debe fallar de manera segura;
- no debe existir checkout activo ni endpoint de escritura de salud.

---

## P1-08 — Retención y supresión no están cerradas para todo el inventario

**Severidad: ALTA / P1 (preparación 21.719)**  
**Estado: VERIFICADO PARCIAL**

Existe automatización de limpieza para varias tablas, pero no una política técnica completa por categoría.

No se observó TTL automático específico para:

- `platform_cases` legacy;
- `course_access`;
- `hotmart_purchases`;
- `learning_progress`;
- `kinecheck_legal_acceptances`;
- notificaciones no leídas;
- datos que deban mantenerse en backups/proveedores.

### Corrección requerida

Crear una **Matriz de Retención** versionada con:

- dato/categoría;
- finalidad;
- base jurídica;
- origen;
- tabla/proveedor;
- acceso autorizado;
- retención principal;
- retención en backup;
- evento de borrado;
- excepción legal/contable;
- método de anonimización/supresión;
- dueño operacional.

Los períodos concretos que dependan de obligaciones fiscales/contractuales deben ser validados profesionalmente; Codex no debe inventarlos.

---

## P1-09 — Flujo formal de derechos del titular insuficientemente operativo

**Severidad: ALTA / P1 (especialmente 21.719)**  
**Estado: DOCUMENTALMENTE PARCIAL**

La política indica que el usuario puede pedir acceso, rectificación, eliminación/bloqueo y otros derechos. Sin embargo, no se verificó un workflow completo que:

- autentique razonablemente al solicitante;
- busque todas las fuentes;
- evite borrar datos que deban conservarse legalmente;
- ejecute supresión/rectificación en Supabase y terceros;
- registre responsable, fechas y resultado;
- produzca respuesta estructurada;
- gestione oposición/portabilidad/bloqueo conforme corresponda desde 01-12-2026.

### Corrección requerida

Crear `docs/privacy/dsar-runbook.md` y un flujo administrativo seguro (no público) para resolver solicitudes.

---

## P1-10 — Gestión de incidentes y brechas no formalizada

**Severidad: ALTA / P1 (preparación 21.719)**  
**Estado: NO VERIFICADO**

La política dice que se aplicarán medidas de contención/análisis/comunicación, pero no se encontró un playbook operativo detallado.

### Corrección requerida

Crear runbook con:

- detección;
- clasificación de severidad;
- contención;
- preservación de evidencia;
- evaluación de riesgo para titulares;
- roles y escalamiento;
- decisión de notificación a autoridad/titulares según norma aplicable;
- registro del incidente;
- recuperación;
- análisis postmortem;
- ventanas temporales internas suficientemente conservadoras.

No codificar un plazo legal inventado: el runbook debe referir a “sin dilación indebida”/plazo legal aplicable y actualizarse con la implementación reglamentaria de la Ley 21.719.

---

## P1-11 — Proveedores, encargados y transferencias internacionales requieren registro formal

**Severidad: ALTA / P1 (preparación 21.719)**  
**Estado: DOCUMENTACIÓN PARCIAL**

La política identifica Supabase, Cloudflare, Hotmart y GitHub y reconoce que algunos proveedores pueden tratar datos fuera de Chile. No se verificó:

- registro de subprocessors;
- ubicación/región efectiva de datos por servicio;
- DPA/condiciones de encargado;
- instrucciones de tratamiento;
- mecanismos de devolución/supresión al término;
- análisis de transferencias internacionales bajo el régimen aplicable desde 2026-12-01.

### Corrección requerida

Crear `docs/privacy/processors-and-transfers-register.md` con evidencia contractual y técnica. Las decisiones contractuales requieren intervención del titular/asesor, no deben ser inventadas por Codex.

---

## P2-12 — Grants de tablas más amplios de lo necesario

**Severidad: MEDIA / P2**  
**Estado: VERIFICADO**

Se observaron grants amplios para `anon`/`authenticated` en tablas donde RLS actualmente impide operaciones no autorizadas, por ejemplo:

- `course_reviews`;
- `evidence_library`;
- `learning_progress`;
- `platform_feature_flags`;
- `platform_user_preferences`.

RLS evita una fuga inmediata en las rutas revisadas, pero el principio de menor privilegio exige que el grant de tabla coincida con las operaciones necesarias.

### Corrección requerida

Revocar permisos redundantes y dejar explícitamente solo `SELECT/INSERT/UPDATE/DELETE` requeridos por producto. Probar RLS después de cada cambio.

---

## P2-13 — `has_course_access()` es `SECURITY DEFINER` ejecutable por authenticated

**Severidad: MEDIA / P2**  
**Estado: VERIFICADO**

El Advisor lo marca. La implementación actual tiene una defensa importante: cuando hay usuario autenticado exige que `p_email` coincida con el correo del JWT. No se verificó un bypass en esta auditoría.

### Mejora recomendada

- eliminar el parámetro de correo en la variante cliente y derivarlo siempre del JWT;
- conservar una variante service-only para automatizaciones administrativas si se requiere;
- revisar `search_path` y grants explícitos.

---

## P2-14 — Protección contra contraseñas filtradas desactivada

**Severidad: MEDIA-ALTA / P2**  
**Estado: VERIFICADO POR SUPABASE ADVISOR**

Supabase Auth reporta `Leaked Password Protection Disabled`.

### Corrección requerida

Activar protección contra contraseñas comprometidas en un cambio controlado, documentar UX/error y probar signup/reset/login.

---

## P2-15 — Telemetría captura `pathname + search` de forma genérica

**Severidad: MEDIA / P2**  
**Estado: VERIFICADO**

`metrics-v1.js` construye `path` usando `location.pathname + location.search`.

### Riesgo

Si una ruta futura coloca correo, token, nombre, identificador o dato clínico en query string, ese valor podría terminar en telemetría.

### Corrección requerida

- telemetría con allowlist de parámetros seguros;
- por defecto, guardar solo `pathname`;
- borrar parámetros de tracking antes de emitir métricas cuando sea posible;
- prohibir tokens/PII en URL como regla de arquitectura;
- añadir test que rechace keys como `email`, `token`, `code`, `name`, `rut`, `patient`, `diagnosis`.

---

## P2-16 — Watermark contiene correo enmascarado

**Severidad: BAJA-MEDIA / P2-P3**  
**Estado: VERIFICADO**

La marca visual genera un correo parcialmente enmascarado + ID de licencia + timestamp.

No se observó transmisión extra desde este script. El riesgo es principalmente de capturas de pantalla compartidas.

### Mejora sugerida

Evaluar si el ID de licencia pseudónimo por sí solo cumple el objetivo antifraude, evitando mostrar incluso correo enmascarado en contenidos que puedan compartirse legítimamente en docencia.

---

## P2-17 — Datos legacy `platform_cases`: 1 registro pendiente de clasificación

**Severidad: MEDIA / P2**  
**Estado: VERIFICADO**

Existe 1 caso y 1 evento legacy. No se inspeccionó el contenido.

### Corrección requerida

Con un procedimiento controlado:

- determinar propietario y finalidad sin exponer contenido innecesariamente;
- si no hay obligación/base para conservarlo, ofrecer/buscar eliminación segura;
- registrar la decisión;
- no reabrir escrituras legacy.

---

## 7. Preparación específica para KineCheck Recupera

**Regla de lanzamiento: NO-GO mientras cualquiera de estos puntos esté incompleto.**

Antes de reactivar Recupera se requiere, como mínimo:

1. mapa preciso de datos de salud y finalidades;
2. evaluación de impacto de privacidad (DPIA/EIPD) documentada si el tratamiento entra en supuestos de alto riesgo, y como buena práctica dado el carácter de salud;
3. definición de responsable/encargados y flujos de datos;
4. base jurídica por finalidad, y consentimiento específico, informado, verificable y revocable donde corresponda;
5. separación entre registro del paciente y razonamiento profesional;
6. autenticación robusta y control por relación paciente-profesional si esa relación existe;
7. minimización: no recolectar nombres clínicos/diagnósticos/antecedentes que no sean necesarios;
8. cifrado en tránsito y controles de acceso/segregación en reposo;
9. retención específica y borrado;
10. derechos del titular dentro del producto;
11. procedimiento para menores si se pretende admitirlos;
12. logs sin contenido clínico;
13. exportaciones seguras;
14. plan de incidentes;
15. contratos/DPA y transferencias revisadas;
16. pruebas de acceso cruzado/IDOR/RLS;
17. textos legales específicos de Recupera;
18. revisión jurídica antes de habilitar compra/captura real.

---

## 8. Matriz de cumplimiento técnico

| Área | Estado | Riesgo | Acción |
|---|---|---:|---|
| RLS tablas públicas | Verificado | Bajo | Mantener tests |
| RPC status center | Fallo verificado | **P0** | Revocar anon/auth y rediseñar salida |
| Auth tokens localStorage | Riesgo verificado | **P1** | Migrar sesión |
| Support public diagnosis | Riesgo verificado | **P1** | Verificar identidad / respuesta genérica |
| Recupera público | Pausado en main | Bajo actual | Mantener NO-GO |
| Recupera post-login | Fix en rama | **P1 hasta deploy** | Merge+verificación controlada |
| Estudiante app interna | No auditable aquí | **P1** | Auditar repositorio/despliegue apps |
| Términos/privacidad main | Mejorados | Medio | Sincronizar producción/DB |
| Versionado legal DB | Desalineado | **P1** | Migración 2026-08-25 |
| Aceptaciones legales | 0 registros | Medio | Diseñar gobernanza correcta |
| Retención | Parcialmente automatizada | **P1** | Matriz + TTLs restantes |
| DSAR/derechos | Parcial | **P1** | Runbook + tooling admin |
| Incidentes | Genérico | **P1** | Runbook y registro |
| Proveedores/transfers | Listados, no auditados | **P1** | Registro+DPA+región |
| DB grants | Más amplios que necesario | P2 | Least privilege |
| Leaked password protection | Off | P2 | Activar con QA |
| Telemetría URL | Query genérica | P2 | Allowlist/minimización |
| Storage | Privado | Bajo | Mantener políticas explícitas |
| Legacy case | 1 fila | P2 | Clasificar/suprimir si procede |
| Beta activo | 0 | Bajo | No tocar durante remediación |

---

## 9. Paquete de ejecución para Codex

### Regla general

Codex debe trabajar **en rama**, no sobre `main`, y no debe conceder/revocar licencias, alterar compras Hotmart ni reactivar Recupera. Cada cambio de autorización debe probarse contra usuarios anon/auth/service y contra flujos existentes.

### Fase A — P0 inmediata

1. Cerrar `kinecheck_status_center_snapshot()` a `anon` y usuario normal.
2. Crear alternativa agregada sin PII si Status Center la necesita.
3. Añadir test automatizado que falle si cualquier RPC administrativa `SECURITY DEFINER` vuelve a concederse a `anon`.
4. Revisar Advisor después de la migración.

**Salida requerida:** `P0_STATUS_RPC = PASS/FAIL`.

### Fase B — autenticación

1. Inventariar todas las lecturas/escrituras de `kinecheck_secure_session_v1`.
2. Proponer y ejecutar en rama una estrategia sin refresh token persistente en localStorage.
3. Probar:
   - signup;
   - login;
   - refresh;
   - logout;
   - forgot password;
   - recovery;
   - SSO Estudiante;
   - mobile iOS/Android web;
   - reload/background/resume.

**Salida requerida:** `AUTH_TOKEN_STORAGE = PASS/FAIL`.

### Fase C — soporte

1. Mantener `support-request` público solo para recepción genérica si es necesario.
2. No revelar compra/licencia sin verificar control de identidad.
3. Separar diagnóstico interno service-only de respuesta cliente.
4. Rate limit adicional.
5. Tests de enumeración.

**Salida requerida:** `SUPPORT_ENUMERATION = PASS/FAIL`.

### Fase D — legal/versiones

1. Crear migración para `kinecheck_legal_documents` 2026-08-25.
2. Revisar `kinecheck_missing_legal_acceptances` / `kinecheck_accept_current_legal`.
3. No convertir política de privacidad en consentimiento genérico.
4. Crear tests de versión coherente.
5. Verificar Cloudflare producción tras despliegue.

**Salida requerida:** `LEGAL_VERSION_SYNC = PASS/FAIL`.

### Fase E — retención y derechos

1. Generar inventario máquina-legible `docs/privacy/data-inventory.yml`.
2. Generar `docs/privacy/retention-matrix.md` sin inventar obligaciones legales.
3. Marcar períodos que requieren decisión humana/legal.
4. Implementar jobs solo para períodos ya aprobados.
5. Crear runbook de derechos y comandos administrativos seguros.
6. Incluir export/delete con dry-run antes de mutar.

**Salida requerida:** `RETENTION_GOVERNANCE = PASS/FAIL`, `DSAR_RUNBOOK = PASS/FAIL`.

### Fase F — incidentes/proveedores

1. `docs/privacy/incident-response.md`.
2. `docs/privacy/processors-and-transfers-register.md`.
3. Inventariar región y tipo de dato para Supabase, Cloudflare, Hotmart, GitHub y cualquier otro proveedor detectado.
4. No afirmar DPA firmado ni transferencia adecuada si no hay evidencia.

**Salida requerida:** `INCIDENT_RUNBOOK = PASS/FAIL`, `PROCESSOR_REGISTER = PASS/FAIL`.

### Fase G — minimización técnica

1. Telemetría: `pathname` por defecto, query allowlist.
2. DB grants de mínimo privilegio.
3. Revisar `has_course_access` y derivar identidad de JWT en variante de cliente.
4. Activar leaked-password protection después de QA.
5. Revisar watermark.

**Salida requerida:** `DATA_MINIMIZATION = PASS/FAIL`, `LEAST_PRIVILEGE = PASS/FAIL`.

### Fase H — KineCheck Estudiante

Codex debe localizar el repositorio/deploy fuente de `apps.kinecheck.cl`. Si no tiene acceso, **debe detener esa parte y declarar `STUDENT_APP_PRIVACY = BLOCKED_SOURCE_UNAVAILABLE`**; no puede inferir cumplimiento desde la página comercial.

Si obtiene el código, ejecutar auditoría de campos, storage, red, exportaciones, sesiones, telemetría y borrar cualquier invitación a usar pacientes reales.

### Fase I — Recupera

No reactivar. Solo preparar un documento de diseño y DPIA preliminar. Cualquier activación requiere GO explícito del fundador y revisión jurídica.

---

## 10. Tests obligatorios de regresión de privacidad

Codex debe añadir pruebas que demuestren, como mínimo:

- anon no puede ejecutar RPC administrativa con PII;
- usuario A no puede leer datos del usuario B;
- usuario autenticado no puede escribir `platform_cases` legacy;
- Recupera no abre vía URL directa, SSO antiguo ni Academy mientras esté pausado;
- telemetría no persiste parámetros sensibles;
- soporte público no confirma existencia de compra antes de verificar identidad;
- ningún HTML/JS público contiene service-role key;
- Academy no deja refresh token en localStorage después del refactor;
- documentos legales tienen versión única consistente;
- `apps.kinecheck.cl` queda marcado no auditado si el source no está disponible.

---

## 11. Decisiones que requieren intervención humana

Codex/Gemini/Claude pueden ejecutar gran parte del hardening técnico, pero **no deben decidir autónomamente**:

- domicilio legal/comercial que se publicará;
- identificadores tributarios personales;
- bases jurídicas definitivas por finalidad;
- plazos de conservación sujetos a obligaciones contables/fiscales/contractuales;
- contratos/DPA y cláusulas internacionales con proveedores;
- si Recupera tratará datos de menores;
- consentimiento final y lenguaje clínico/legal de Recupera;
- respuesta a una brecha real;
- supresión de datos cuando exista una obligación legal de conservación.

No publicar domicilio particular ni identificadores sensibles del titular sin decisión explícita.

---

## 12. Criterio de cierre integral

No usar la frase “KineCheck cumple íntegramente la normativa de datos personales” hasta que:

- todos los P0 estén cerrados;
- todos los P1 estén cerrados o aceptados formalmente con mitigación;
- Estudiante haya sido auditado en su código real;
- Recupera permanezca desactivado o complete su DPIA/diseño legal antes de lanzamiento;
- versiones legales de repo, base y producción coincidan;
- exista evidencia de pruebas de acceso cruzado, RLS, RPC y sesiones;
- exista matriz de datos/retención;
- exista runbook de derechos e incidentes;
- proveedores/transferencias estén documentados;
- una revisión jurídica humana confirme el marco documental final.

### Estado al 25-08-2026

**PRIVACY_COMPLIANCE_MASTER = NO-GO PARA CERTIFICACIÓN INTEGRAL**  
**EDUCATIONAL_PLATFORM_CONTINUITY = CONDITIONAL-GO** (cerrar P0 y hardenings P1)  
**RECUPERA_LAUNCH = NO-GO**  
**STUDENT_APP_PRIVACY = PENDING_SOURCE_AUDIT**  
**ACTIVE_BETA_USERS = 0**

---

## 13. Evidencia técnica base de esta auditoría

- `legal/privacidad.html` — política actual de `main`, 25-08-2026.
- `legal/terminos.html` — términos actuales de `main`, 25-08-2026.
- `_headers` — cabeceras, no-cache/no-store y noindex.
- `academy/academy-v39.js` — gestión de sesión y storage.
- `metrics-v1.js` — telemetría.
- `watermark.js` — marca de licencia.
- Edge Function Supabase `support-request` v2.
- funciones PostgreSQL `has_course_access`, `kinecheck_status_center_snapshot`, `kinecheck_cleanup_automation_data`, `run_kinecheck_daily_automation`.
- Supabase Security Advisor 25-08-2026.
- PR #75 — hardening público/Recupera Próximamente.
- PR #76 — alineación legal.
- PR #77 — hardening post-login y auditoría técnica en curso.
- `docs/audits/2026-08-25-post-login-privacy.md` — auditoría técnica complementaria.

### Fuentes legales oficiales recomendadas para revisión humana

- Biblioteca del Congreso Nacional de Chile — Ley N.º 19.628.
- Biblioteca del Congreso Nacional de Chile — Ley N.º 21.719.
- Diario Oficial — publicación Ley N.º 21.719 de 13-12-2024.

---

## 14. Instrucción para la revisión cruzada por otros modelos

Al enviar este informe a Codex, Gemini o Claude, exigir que cada uno:

1. clasifique cada hallazgo como `CONFIRMADO`, `REFUTADO`, `NO VERIFICABLE` o `NUEVO`;
2. cite archivo/función/SQL exacto;
3. no marque PASS por ausencia de evidencia;
4. no invente cumplimiento legal;
5. no modifique producción sin gate explícito;
6. preserve acceso comercial/Hotmart durante hardening;
7. mantenga Recupera desactivado;
8. no inspeccione contenido clínico/potencialmente sensible si basta metadata/esquema para resolver el riesgo;
9. entregue diff + tests + riesgos residuales;
10. enumere toda decisión que requiera al titular o abogado.

El objetivo no es conseguir tres opiniones que digan “todo bien”; es producir tres revisiones independientes que intenten **encontrar lo que las anteriores omitieron**.
