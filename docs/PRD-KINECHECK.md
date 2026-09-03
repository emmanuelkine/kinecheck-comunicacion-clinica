# PRD maestro de KineCheck

**Documento:** Product Requirements Document (PRD)  
**Producto:** KineCheck  
**Estado:** vigente como marco maestro de requisitos de producto  
**Responsable:** Emmanuel Zúñiga  
**Última actualización:** 3 de septiembre de 2026  
**Baseline técnico auditado:** `b6b36f9c6dbd549462ecad9b1482ea6eb0b6e0b9`

> Este documento define qué debe ser KineCheck, qué debe hacer, qué no debe hacer y qué condiciones deben cumplirse para considerar una funcionalidad correctamente implementada. No reemplaza los Términos, la Política de Privacidad, la arquitectura de marca ni la configuración técnica; los complementa como especificación maestra de producto.

---

## 1. Resumen ejecutivo

KineCheck es un ecosistema digital de **salud musculoesquelética** orientado a formación, aprendizaje, razonamiento y acceso a recursos educativos para profesionales y estudiantes.

La propuesta central es entregar una experiencia coherente desde el descubrimiento del producto hasta el acceso al contenido adquirido:

`Usuario → kinecheck.cl → producto → Hotmart → compra → validación de licencia → Academy / Mi KineCheck → curso o aplicación autorizada`

KineCheck no debe operar como ficha clínica institucional, sistema de registro asistencial ni repositorio de pacientes. En los productos educativos habilitados se utilizan exclusivamente casos ficticios, simulados o debidamente anonimizados.

La entrada autenticada canónica del ecosistema es **`/academy/`**. La marca raíz es **KineCheck** y su descriptor global es **SALUD MUSCULOESQUELÉTICA**.

---

## 2. Problema que resuelve

Profesionales y estudiantes de áreas musculoesqueléticas suelen consumir contenidos, herramientas de razonamiento y cursos en superficies separadas, con experiencias de acceso, continuidad y organización poco consistentes.

KineCheck busca resolver ese problema mediante:

- una marca y experiencia de acceso únicas;
- contenidos educativos organizados por producto;
- compra externa segura mediante Hotmart;
- autenticación y licenciamiento controlados;
- una Academy que muestre únicamente lo que corresponde a cada usuario;
- protección de contenido premium en servidor o almacenamiento privado;
- continuidad entre compra, licencia, acceso, progreso y soporte;
- límites explícitos respecto del uso de datos de pacientes reales.

---

## 3. Visión de producto

Construir un ecosistema digital confiable y progresivamente ampliable de educación musculoesquelética, donde una persona pueda:

1. entender qué producto corresponde a su perfil;
2. comprarlo de forma clara;
3. recibir el acceso correcto;
4. ingresar desde una experiencia unificada;
5. utilizar cursos, aplicaciones y herramientas autorizadas;
6. conservar una experiencia consistente en computador y móvil;
7. recibir soporte, y ver reflejado correctamente cualquier cambio comercial de su licencia.

---

## 4. Objetivos

### 4.1 Objetivos de producto

- Mantener una experiencia KineCheck coherente entre sitio público, compra, acceso y aprendizaje.
- Entregar solo los productos y contenidos asociados a una licencia válida.
- Facilitar el aprendizaje y razonamiento musculoesquelético sin reemplazar la responsabilidad clínica profesional.
- Proteger la propiedad intelectual de los contenidos premium.
- Reducir fricción entre compra y acceso.
- Mantener privacidad por diseño y minimización de datos.
- Permitir crecimiento del catálogo sin duplicar lógicas de autenticación y licenciamiento.

### 4.2 Objetivos operativos

- Mantener pruebas automatizadas de rutas críticas.
- Detectar regresiones antes de que alcancen producción.
- Mantener trazabilidad entre configuración comercial, licencia y acceso.
- Disponer de procedimientos de respaldo y recuperación comprobables.

---

## 5. No objetivos

KineCheck **no** tiene como objetivo, en su arquitectura pública actual:

- reemplazar una evaluación profesional;
- emitir diagnósticos médicos o sustituir la decisión clínica de un profesional habilitado;
- ser ficha clínica, registro kinésico institucional o repositorio de pacientes;
- almacenar datos identificables de pacientes en KineCheck Clínico, KineCheck Estudiante, cursos, casos, notas o ejercicios educativos;
- procesar directamente números completos de tarjetas;
- otorgar acceso premium basándose únicamente en parámetros de URL o datos manipulables por el navegador;
- habilitar KineCheck Recupera antes de completar su arquitectura específica de privacidad y protección de datos.

---

## 6. Usuarios objetivo

### 6.1 Profesionales

Profesionales que buscan formación avanzada, revisión estructurada de seguridad, evaluación, razonamiento musculoesquelético, evidencia y contenidos aplicados.

### 6.2 Estudiantes

Estudiantes que requieren práctica académica guiada, aprendizaje progresivo y herramientas de razonamiento sobre casos ficticios, simulados o anonimizados.

### 6.3 Usuarios futuros de KineCheck Recupera

KineCheck Recupera constituye una línea futura separada. Mientras su arquitectura de datos, privacidad, consentimiento, seguridad y conservación no esté aprobada, debe permanecer **Próximamente**, sin compra y sin registro de información de salud.

---

## 7. Arquitectura de marca y familias

La fuente de verdad para nombres y familias es `docs/brand-architecture.md`.

### 7.1 Marca principal

- **KineCheck**
- Descriptor global: **SALUD MUSCULOESQUELÉTICA**

### 7.2 KineCheck Apps

- **KineCheck Estudiante**
- **KineCheck Recupera**

### 7.3 KineCheck Formación

- **KineCheck Clínico** — curso profesional avanzado con guía digital complementaria.
- **Comunicación Clínica**
- **Más allá del Dolor**
- **Evidencia Aplicada**
- **Traumatología y Ortopedia Clínica**

### 7.4 KineCheck Packs

- **Pack KineCheck Estudiante**

### 7.5 Experiencias adicionales presentes en el runtime

Academy contiene además experiencias educativas o herramientas configuradas, entre ellas **KineCheck Banderas Clínicas**, **Ejercicio Terapéutico** y **KineCheck Lab Clínico**. Su presencia técnica no modifica por sí sola la taxonomía oficial de marca. Cualquier incorporación formal a una familia debe actualizar primero `docs/brand-architecture.md`.

El inventario técnico/comercial también contiene otros productos asociados a Hotmart. La existencia de un Product ID o grant técnico no debe interpretarse automáticamente como promesa comercial pública; la conciliación administrativa vigente se gestiona en `#11`.

---

## 8. Estado funcional actual de productos clave

| Producto / experiencia | Estado requerido actual | Observación |
|---|---|---|
| KineCheck Clínico | Activo | Curso profesional + guía digital complementaria. |
| KineCheck Estudiante | Activo | Aplicación educativa con acceso mediante SSO. |
| KineCheck Recupera | Próximamente / bloqueado | Sin compra, acceso funcional ni registro de información de salud. |
| Comunicación Clínica | Activo | Curso educativo. |
| Más allá del Dolor | Activo | Curso educativo. |
| Evidencia Aplicada | Activo | Curso educativo. |
| Traumatología y Ortopedia Clínica | Activo | Curso educativo. |
| Pack KineCheck Estudiante | Activo comercialmente | Debe entregar únicamente los grants definidos para el pack. |
| KineCheck Banderas Clínicas | Activo en Academy | Producto/curso de propietario según configuración actual. |
| Ejercicio Terapéutico | Activo en Academy | Contenido premium; existe trabajo pendiente de paridad segura de `course-key` en `#129`. |
| KineCheck Lab Clínico | En preparación | No debe presentarse como producto terminado si el runtime indica `preparing`. |

Los precios, vigencias y checkouts no se duplican como constantes normativas en este PRD. Deben provenir de la configuración comercial vigente y ser conciliados con Hotmart.

---

## 9. Arquitectura funcional de alto nivel

### 9.1 Superficie pública

`kinecheck.cl` debe permitir:

- reconocer la marca y su propósito;
- navegar por perfiles y productos;
- acceder a información comercial y legal;
- iniciar una compra habilitada mediante Hotmart;
- ingresar a Academy si la persona ya tiene acceso.

### 9.2 Compra

Hotmart es el procesador de checkout, pago, comprobantes y estado comercial de las transacciones habilitadas.

KineCheck no debe conceder acceso por el simple retorno del navegador desde una página de pago. La concesión debe depender de evidencia de compra procesada por el backend y de la política de acceso configurada.

### 9.3 Backend y licencias

Supabase se utiliza para funciones de servidor, autenticación, base de datos, almacenamiento y control de acceso de los servicios habilitados.

La arquitectura debe mantener separación entre:

- estado comercial de la compra;
- identidad de la cuenta;
- grants por producto;
- licencia o acceso efectivo;
- contenido premium protegido.

### 9.4 Academy / Mi KineCheck

`/academy/` es la entrada autenticada canónica.

Academy debe:

- identificar al usuario autenticado;
- resolver sus accesos vigentes;
- mostrar productos propios de manera diferenciada de recomendaciones;
- impedir acceso a productos sin autorización;
- mantener navegación compatible en móvil y escritorio;
- conservar `platform/` únicamente como compatibilidad técnica para enlaces antiguos, no como marca visible principal.

### 9.5 Aplicaciones externas KineCheck

Cuando una aplicación autorizada se sirve desde otro subdominio, el acceso debe realizarse mediante un handoff/SSO controlado por servidor. KineCheck Estudiante utiliza actualmente la ruta de aplicaciones de KineCheck y no debe depender de dominios ajenos a la marca como destino de producción.

---

## 10. Requisitos funcionales

### FR-001 — Descubrimiento público

El sitio público debe mostrar una propuesta de valor comprensible, rutas por audiencia, productos habilitados, estado de productos no disponibles y accesos legales/soporte.

### FR-002 — Consistencia de marca

Todas las superficies comerciales, legales y de acceso deben respetar los nombres y familias definidos en `docs/brand-architecture.md`.

### FR-003 — Producto no disponible

Un producto marcado `preparing`, pausado o `Próximamente` no debe presentar checkout activo ni flujo funcional que permita registrar información que el producto todavía no está autorizado a tratar.

### FR-010 — Compra externa

Las compras habilitadas deben iniciarse en el checkout oficial de Hotmart correspondiente al producto correcto.

### FR-011 — Conciliación de producto

Cada producto comercial debe tener correspondencia verificable entre:

- producto en Hotmart;
- producto configurado en KineCheck;
- grants que otorga;
- vigencia aplicable;
- experiencia pospago;
- soporte.

### FR-012 — Activación de acceso

Una compra aprobada válida debe traducirse en el grant/licencia esperado sin requerir intervención manual ordinaria.

### FR-013 — Revocación

Un evento comercial que corresponda a revocación debe reflejarse en el acceso conforme a la política comercial aplicable. La certificación final debe probar al menos un ciclo real de compra y posterior reembolso/cancelación con revocación efectiva.

### FR-014 — Idempotencia

El reprocesamiento de un mismo evento comercial no debe duplicar de manera incorrecta compras, grants o accesos.

### FR-020 — Cuenta individual

La cuenta y credenciales son individuales. El acceso debe estar asociado a una identidad autenticada y a una licencia válida.

### FR-021 — Acceso por correo de compra

Cuando el modelo de acceso dependa del correo utilizado en la compra, la reconciliación de identidad debe respetar las reglas definidas por el backend y no depender de datos editables del navegador.

### FR-022 — SSO seguro

El acceso a aplicaciones KineCheck externas a Academy debe usar un mecanismo de SSO/handoff autorizado, con destino y producto permitidos explícitamente.

### FR-030 — Catálogo personal

Academy debe diferenciar productos con acceso vigente de productos recomendados o no adquiridos.

### FR-031 — Navegación del producto

Un producto autorizado debe abrir su experiencia canónica, no un recurso histórico, una URL pública de contenido premium ni un dominio no autorizado.

### FR-032 — Recuperación de sesión

Una nueva sesión autenticada debe volver a resolver correctamente los permisos del usuario sin depender exclusivamente de estado local previo.

### FR-040 — Contenido premium privado

Los payloads premium que requieran protección no deben quedar expuestos como archivos públicos recuperables sin autorización.

La lógica pública/versionada puede contener reglas de acceso, pero no debe incorporar propiedad intelectual premium que deba mantenerse privada.

### FR-041 — Entrega de contenido

La entrega de contenido premium debe producirse solo después de validar autenticación y autorización/licencia según el producto.

### FR-042 — Paridad source/deploy

Las funciones críticas desplegadas deben poder reproducirse desde código versionado y activos privados autorizados. No debe existir una dependencia permanente de una versión productiva imposible de reconstruir desde fuentes controladas.

### FR-050 — Progreso y aprendizaje

Cuando una experiencia guarde progreso, este debe estar vinculado al usuario o mecanismo definido para ese producto y no debe requerir datos clínicos identificables de terceros.

### FR-051 — Métricas técnicas minimizadas

Las métricas de uso pueden registrar información técnica necesaria para estabilidad y comprensión del recorrido, evitando parámetros de consulta, fragmentos y datos innecesarios.

### FR-060 — Soporte

Las superficies públicas y legales deben ofrecer una ruta funcional de soporte. Los cambios comerciales o de acceso deben poder investigarse con trazabilidad suficiente sin exponer secretos o datos personales en repositorios públicos.

### FR-061 — Reembolsos

La experiencia debe enlazar a la política aplicable y el backend debe reflejar correctamente los estados que afecten acceso.

### FR-070 — Beta y testimonios

Los formularios beta solo deben solicitar información necesaria para selección, contacto, experiencia y consentimiento.

Los testimonios públicos deben preservar privacidad. No deben mostrar nombres, iniciales, apellidos, correos, instituciones u otros identificadores cuando el consentimiento/publicación aprobada no lo autorice.

No se debe mostrar una valoración cuantitativa como `★★★★★` o “5/5” si no existe evidencia verificable que sustente específicamente esa calificación.

### FR-080 — KineCheck Recupera

Mientras Recupera permanezca en revisión:

- debe figurar como `Próximamente`;
- no debe tener compra habilitada;
- no debe ofrecer registro de información de salud;
- no debe habilitar un flujo legacy de consentimiento que reactive el producto;
- cualquier lanzamiento futuro requerirá revisión específica de privacidad, base jurídica, minimización, conservación, seguridad, proveedores y ejercicio de derechos.

---

## 11. Requisitos de datos y privacidad

### 11.1 Datos permitidos actualmente

Según la Política de Privacidad vigente, el ecosistema puede tratar, según la función:

- correo e identificador de autenticación;
- nombre de perfil cuando corresponda;
- datos técnicos de sesión;
- producto adquirido y estado de transacción;
- identificador de compra, vigencia, reembolso, cancelación o contracargo;
- progreso y actividad educativa;
- métricas técnicas minimizadas;
- información necesaria de postulaciones beta;
- mensajes y antecedentes necesarios de soporte.

### 11.2 Datos que no deben solicitarse para los productos educativos actuales

KineCheck Clínico, KineCheck Estudiante y los cursos educativos no deben solicitar ni necesitar datos clínicos identificables de pacientes.

Se debe instruir expresamente al usuario para no ingresar:

- nombres de pacientes;
- RUT;
- teléfonos;
- correos;
- direcciones;
- fotografías identificables;
- números de ficha;
- documentos;
- otros antecedentes que permitan identificar directa o indirectamente a una persona real.

### 11.3 Datos financieros

KineCheck no debe almacenar números completos de tarjetas. Hotmart mantiene su propio tratamiento para checkout, pago y facturación.

---

## 12. Requisitos de seguridad

### SEC-001 — Secretos

Tokens, claves privadas, HOTTOK, service-role keys y otros secretos deben mantenerse fuera del repositorio público y del frontend.

### SEC-002 — Principio de mínimo privilegio

Las tablas y funciones deben conceder únicamente los permisos necesarios. La ausencia de una necesidad de acceso público no debe resolverse creando políticas permisivas para eliminar advertencias de tooling.

### SEC-003 — RLS y autorización

Las tablas accesibles desde clientes deben contar con controles de autorización adecuados. Las tablas exclusivamente operativas pueden permanecer inaccesibles a usuarios finales aunque el linter informe que RLS está habilitado sin políticas.

### SEC-004 — Protección de contenido

Los activos premium sensibles deben servirse desde destinos privados o mecanismos equivalentes protegidos por autorización.

### SEC-005 — Seguridad de rama

`main` debe requerir PR y checks obligatorios, impedir force-push/borrado y mantener únicamente una vía administrativa explícita de recuperación. Este requisito está pendiente de implementación en `#128`.

### SEC-006 — Contraseñas

Deben utilizarse las capacidades de seguridad disponibles en el plan contratado. La protección contra contraseñas filtradas se considera hardening condicionado a un plan de Supabase que la soporte; no debe declararse habilitada mientras el Security Advisor indique lo contrario.

---

## 13. Requisitos no funcionales

### NFR-001 — Multidispositivo

Las superficies públicas y autenticadas críticas deben funcionar sin overflow horizontal inesperado ni errores de ejecución en tamaños representativos de escritorio y móvil.

### NFR-002 — Navegadores

Los flujos críticos deben validarse al menos en motores Chromium y WebKit cuando la batería de CI correspondiente exista.

### NFR-003 — Accesibilidad

Las interfaces deben mantener HTML semántico, navegación comprensible, controles etiquetados y atributos de accesibilidad cuando correspondan.

### NFR-004 — Rendimiento

No se deben introducir patrones de base de datos o frontend que degraden innecesariamente cada fila, carga o navegación. Las optimizaciones no deben ampliar autorización como efecto colateral.

### NFR-005 — Resiliencia

Deben existir copias preservadas y procedimientos de recuperación que cubran progresivamente repositorio, base de datos, Storage, Auth y Edge Functions.

### NFR-006 — Observabilidad

Los errores críticos de acceso, licencias, webhooks y despliegue deben dejar evidencia suficiente para diagnóstico sin exponer secretos.

### NFR-007 — Sin SLA inventado

Mientras KineCheck no defina formalmente objetivos de disponibilidad o tiempos de respuesta, este PRD no establece un SLA numérico.

---

## 14. QA y criterios de aceptación generales

Una modificación que afecte una ruta crítica no está terminada solo porque compile o se vea correctamente en un navegador.

Cuando corresponda, debe comprobar:

1. navegación pública;
2. precio y checkout correctos;
3. ausencia de checkout en productos bloqueados;
4. autenticación;
5. licencia/grant;
6. acceso a producto propio;
7. bloqueo de producto no autorizado;
8. SSO cuando aplique;
9. contenido premium no accesible públicamente;
10. comportamiento móvil;
11. Chromium y WebKit;
12. privacidad y términos;
13. soporte funcional;
14. regresiones sobre productos no modificados.

Las pruebas automatizadas no sustituyen una prueba financiera real cuando el criterio que se desea certificar depende de una transacción real de Hotmart.

---

## 15. Métricas de éxito

KineCheck debe poder medir, cuando exista instrumentación válida:

- visitas a superficies públicas;
- inicio de checkout;
- compra aprobada;
- tiempo entre compra y acceso utilizable;
- tasa de acceso exitoso;
- errores de autenticación o autorización;
- uso de Academy;
- apertura de productos adquiridos;
- progreso educativo cuando el producto lo soporte;
- solicitudes de soporte;
- reembolsos/cancelaciones y revocación correspondiente;
- estabilidad multidispositivo;
- incidencias de CI o producción.

Este documento **no fija objetivos porcentuales o financieros** sin una decisión explícita de negocio. Los targets deben añadirse cuando exista una línea base y una meta aprobada.

---

## 16. Estado de lanzamiento al 3 de septiembre de 2026

### 16.1 Validado

- Operación comercial pública de los productos habilitados: **GO**.
- KineCheck Estudiante activo.
- Pack KineCheck Estudiante activo.
- KineCheck Recupera permanece `Próximamente`.
- E2E autenticado de Estudiante validado.
- Privacidad post-login validada.
- Contenido premium crítico de KineCheck Clínico y Dolor Lumbar Persistente retirado de las rutas públicas anteriores y servido mediante mecanismos protegidos.
- Healthcheck comercial actualizado.
- Auditoría posterior al merge `b6b36f9c...`: batería de workflows final sin fallos pendientes.

### 16.2 Pendientes para certificación técnica/comercial completa

- `#11` — conciliación administrativa de los 12 productos en Hotmart.
- Prueba comercial controlada real: compra → webhook → licencia → acceso → nueva sesión → reembolso/cancelación → revocación.
- `#128` — protección de `main` mediante PR y checks obligatorios.
- `#129` — eliminar drift de `course-key` sin publicar el payload privado de Ejercicio Terapéutico.
- `#10` — completar continuidad/recuperación integral de componentes restantes de DR.

### 16.3 Hardening no bloqueante actual

- protección de contraseñas filtradas cuando el plan de Supabase contratado lo permita;
- eventual limpieza histórica de blobs premium en Git mediante una operación separada y planificada;
- revisión periódica de advisories de seguridad y rendimiento sin aplicar cambios automáticos que amplíen permisos.

---

## 17. Dependencias principales

- **Hotmart:** checkout, pago, comprobantes y estado de transacción.
- **Supabase:** autenticación, base de datos, Storage, funciones de servidor y métricas para servicios habilitados.
- **Cloudflare:** DNS, seguridad, entrega y disponibilidad del sitio.
- **GitHub:** control de versiones, CI y repositorio técnico; no es base de datos de usuarios.

La indisponibilidad o cambio contractual de una dependencia debe evaluarse antes de modificar el comportamiento del producto.

---

## 18. Riesgos principales

| Riesgo | Control esperado |
|---|---|
| Cambio directo no validado en `main` | Branch protection y PR obligatorio (`#128`). |
| Diferencia entre función productiva y fuente versionada | Paridad source/deploy y activos privados (`#129`). |
| Desalineación Hotmart ↔ grants | Conciliación administrativa periódica (`#11`). |
| Acceso premium expuesto públicamente | Storage/funciones protegidas y pruebas externas. |
| Datos identificables de pacientes en productos educativos | Prohibición explícita, minimización y diseño sin necesidad de esos datos. |
| Compra aprobada sin acceso o reembolso sin revocación | E2E comercial real y trazabilidad de eventos. |
| Pérdida o imposibilidad de reconstrucción | DR probado y preservación externa (`#10`). |
| Prueba social no sustentada | Publicar únicamente testimonios/ratings con evidencia y autorización suficientes. |

---

## 19. Definition of Done para nuevas funcionalidades

Una funcionalidad nueva se considera terminada cuando:

- existe un problema de usuario definido;
- tiene criterios de aceptación verificables;
- respeta arquitectura de marca;
- respeta privacidad y límites de datos;
- no introduce secretos al frontend o repositorio;
- define su modelo de autorización;
- no expone contenido premium por una ruta pública no autorizada;
- funciona en las superficies/dispositivos relevantes;
- incluye o actualiza pruebas de regresión cuando corresponde;
- actualiza documentación, legal o producto cuando el comportamiento lo requiere;
- puede desplegarse y reconstruirse desde fuentes controladas;
- ha pasado CI antes de llegar a `main` una vez implementada la protección de rama.

---

## 20. Jerarquía de fuentes de verdad

Cuando exista una discrepancia, usar esta jerarquía y resolverla mediante cambio explícito, no por inferencia:

1. **Marco legal vigente:** `legal/terminos.html`, `legal/privacidad.html`, política de reembolsos y normativa aplicable.
2. **Arquitectura de marca:** `docs/brand-architecture.md`.
3. **Este PRD:** propósito, alcance y requisitos funcionales/no funcionales.
4. **Configuración de producto/runtime:** por ejemplo `academy/config.js`, rutas y funciones versionadas.
5. **Configuración comercial real:** Hotmart y grants conciliados.
6. **Issues operativos abiertos:** documentan excepciones, deuda o trabajo pendiente, pero no autorizan por sí mismos a contradecir fuentes superiores.

Si producción difiere del repositorio, la diferencia debe tratarse como drift y resolverse de forma segura; no se debe copiar automáticamente producción al repositorio cuando ello exponga secretos o propiedad intelectual.

---

## 21. Control de cambios del PRD

Modificar este documento cuando cambie cualquiera de los siguientes elementos:

- propósito o audiencia;
- familia/naturaleza de un producto;
- flujo de compra o acceso;
- modelo de licencias;
- tratamiento de datos personales;
- estado de Recupera;
- requisitos de seguridad;
- dependencias principales;
- criterios de aceptación de una ruta crítica.

Los cambios meramente visuales o editoriales que no alteren requisitos no necesitan redefinir el PRD.

Todo cambio sustantivo del PRD debe revisarse junto con las fuentes de verdad afectadas en el mismo PR cuando sea necesario.

---

## 22. Referencias internas

- `docs/brand-architecture.md`
- `academy/config.js`
- `legal/terminos.html`
- `legal/privacidad.html`
- `supabase/functions/`
- `#10` — Disaster Recovery
- `#11` — conciliación Hotmart
- `#106` — seguimiento de go-live
- `#128` — protección de `main`
- `#129` — paridad de `course-key`

---

**Regla final:** una decisión de implementación no debe redefinir silenciosamente el producto. Si el comportamiento deseado cambia, primero debe quedar explícito en la fuente de verdad correspondiente y luego implementarse y probarse.