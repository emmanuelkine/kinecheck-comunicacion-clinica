# Registro de actividades de tratamiento — KineCheck

Versión: 1.0  
Fecha: 5 de agosto de 2026  
Responsable operativo: Emmanuel Zúñiga / KineCheck  
Estado: base de cumplimiento; identificación tributaria y domicilio legal pendientes de completar antes del lanzamiento comercial abierto.

## 1. Cuenta y autenticación

- **Titulares:** usuarios registrados.
- **Datos:** correo, identificador de autenticación, nombre de perfil, fecha de creación, eventos técnicos de sesión.
- **Finalidad:** crear y proteger la cuenta, permitir el ingreso y recuperar credenciales.
- **Fundamento:** ejecución del servicio, seguridad y consentimiento cuando corresponda.
- **Encargados:** Supabase; Cloudflare para entrega y seguridad del sitio.
- **Acceso interno:** propietario y funciones de servidor autorizadas.
- **Conservación:** mientras exista la cuenta; eliminación o anonimización posterior conforme a obligaciones legales y solicitudes válidas.
- **Riesgos:** apropiación de cuenta, contraseña comprometida, sesión en dispositivo compartido.
- **Controles:** sesión temporal, cierre por inactividad, rate limit, 2FA administrativo pendiente y protección contra contraseñas filtradas pendiente.

## 2. Compra, licencia y vigencia

- **Titulares:** compradores y beneficiarios de una licencia.
- **Datos:** correo de compra, producto, transacción, estado, fecha de compra, vigencia, reembolso, cancelación o contracargo.
- **Finalidad:** activar, renovar, conciliar, bloquear y auditar accesos.
- **Fundamento:** ejecución del contrato, cumplimiento de obligaciones de consumo, prevención de fraude y defensa de derechos.
- **Encargados:** Hotmart, Supabase y Cloudflare.
- **Conservación:** durante la relación contractual y el período necesario para comprobantes, defensa de derechos y obligaciones aplicables.
- **Riesgos:** licencia asignada a correo incorrecto, evento duplicado o desordenado, reembolso no sincronizado.
- **Controles:** webhook idempotente, prioridad temporal de eventos, conciliación diaria y registros de auditoría.

## 3. Progreso, preferencias y biblioteca

- **Titulares:** usuarios con productos activos.
- **Datos:** progreso, productos abiertos, preferencias, espacio principal y fechas de actividad.
- **Finalidad:** continuar aprendizaje, adaptar la interfaz y mostrar productos disponibles.
- **Fundamento:** prestación del servicio y preferencias solicitadas por el usuario.
- **Conservación:** mientras exista la cuenta o hasta eliminación solicitada, salvo datos mínimos necesarios para auditoría contractual.
- **Riesgos:** exposición de hábitos de uso o asociación incorrecta de progreso.
- **Controles:** RLS por usuario, autenticación y acceso mínimo.

## 4. Casos y proyectos guardados

- **Titulares:** profesionales, estudiantes y otros usuarios habilitados.
- **Datos:** título, tipo de caso, contexto, contenido ingresado, avance y fechas.
- **Finalidad:** organizar razonamiento, aprendizaje, docencia o seguimiento personal.
- **Regla esencial:** no deben incorporarse datos que identifiquen pacientes o terceros.
- **Fundamento:** prestación solicitada por el usuario.
- **Conservación:** hasta eliminación por el usuario o cierre de cuenta, sujeto a respaldo temporal y obligaciones aplicables.
- **Riesgos:** ingreso accidental de datos clínicos identificables.
- **Controles:** advertencias, confirmación de anonimización, acceso por propietario del registro y posibilidad de eliminación.

## 5. Soporte

- **Titulares:** personas que solicitan ayuda.
- **Datos:** correo, producto, transacción cuando corresponda, categoría, descripción, diagnóstico automático, prioridad y estado.
- **Finalidad:** resolver acceso, compra, privacidad y funcionamiento.
- **Fundamento:** ejecución del servicio, atención de derechos y defensa contractual.
- **Conservación operativa:** hasta 24 meses después del cierre, salvo necesidad legal o de seguridad justificada.
- **Riesgos:** envío de contraseñas o datos clínicos.
- **Controles:** advertencias, campos limitados, clasificación automática y acceso administrativo restringido.

## 6. Programa beta

- **Titulares:** postulantes y participantes beta.
- **Datos:** nombre, correo, rol, experiencia, dispositivo, disponibilidad, producto de interés y consentimientos.
- **Finalidad:** seleccionar participantes, organizar pruebas y mejorar la plataforma.
- **Fundamento:** consentimiento y medidas precontractuales solicitadas por la persona.
- **Conservación operativa:** postulaciones no seleccionadas hasta 12 meses; participantes hasta 24 meses después del cierre de la beta, salvo retiro del consentimiento u obligación aplicable.
- **Riesgos:** uso posterior no esperado o conservación excesiva.
- **Controles:** finalidad limitada, RLS, acceso por servidor y limpieza programada.

## 7. Seguridad y prevención de abuso

- **Titulares:** usuarios y visitantes que intentan autenticarse.
- **Datos:** hashes de correo e IP, conteos de intentos, bloqueo, eventos técnicos y registros de errores.
- **Finalidad:** impedir fuerza bruta, fraude, uso compartido y accesos no autorizados.
- **Fundamento:** seguridad del servicio e interés legítimo compatible con derechos de los usuarios.
- **Conservación:** período breve determinado por la función de seguridad y limpieza programada.
- **Riesgos:** correlación técnica o bloqueo incorrecto.
- **Controles:** hashes, ausencia de contraseñas en registros y revisión de excepciones.

## 8. Aceptaciones legales

- **Titulares:** usuarios registrados.
- **Datos:** identificador de usuario, documento, versión, fecha, origen de aceptación y hash técnico del agente de usuario.
- **Finalidad:** demostrar consentimiento contractual y versión aceptada.
- **Fundamento:** ejecución contractual, cumplimiento normativo y defensa de derechos.
- **Conservación:** durante la relación y el período necesario para acreditar la aceptación.
- **Riesgos:** aceptación no registrada o asociada al usuario incorrecto.
- **Controles:** función autenticada, versiones activas y bloqueo de acceso cuando falta aceptación obligatoria.

## 9. Notificaciones y comunicaciones operativas

- **Titulares:** usuarios con cuenta o licencia.
- **Datos:** destinatario, tipo de aviso, contenido, fecha de disponibilidad, lectura y estado de envío.
- **Finalidad:** informar activación, vencimiento, bloqueo, soporte y cambios relevantes.
- **Fundamento:** ejecución del servicio y comunicaciones necesarias.
- **Conservación:** período operativo limitado; limpieza programada.
- **Riesgos:** envío a correo incorrecto o exposición excesiva en el mensaje.
- **Controles:** mensajes sin datos clínicos, destinatario asociado a cuenta y proveedor de correo pendiente de integración.

## 10. Proveedores y transferencias

- **Supabase:** autenticación, base de datos, almacenamiento y funciones.
- **Cloudflare:** DNS, seguridad y entrega del sitio.
- **Hotmart:** pagos, checkout, comprobantes y eventos comerciales.
- **GitHub:** código y automatizaciones; no debe contener datos de usuarios ni secretos.

Puede existir tratamiento internacional según la infraestructura de cada proveedor. Antes del 1 de diciembre de 2026 debe documentarse el mecanismo aplicable a cada transferencia y conservar las condiciones contractuales correspondientes.

## 11. Derechos y solicitudes

Las solicitudes de acceso, rectificación, eliminación, bloqueo, oposición, portabilidad o suspensión cuando procedan se reciben en el soporte de KineCheck, con verificación razonable de identidad y registro de la respuesta.

## 12. Revisión

Este registro debe revisarse:

- al incorporar un producto o proveedor;
- al comenzar a tratar una nueva categoría de datos;
- después de un incidente;
- antes del 1 de diciembre de 2026;
- como mínimo una vez al año.
