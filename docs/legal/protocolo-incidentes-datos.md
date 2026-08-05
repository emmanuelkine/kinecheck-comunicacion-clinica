# Protocolo de incidentes de seguridad y datos personales — KineCheck

Versión: 1.0  
Fecha: 5 de agosto de 2026

## 1. Objetivo

Detectar, contener, investigar, corregir y documentar eventos que puedan comprometer cuentas, licencias, datos personales, contenido protegido o continuidad de KineCheck.

## 2. Incidentes incluidos

- secreto, contraseña o token expuesto;
- acceso administrativo no reconocido;
- ingreso indebido a una cuenta de usuario;
- extracción o modificación masiva de información;
- pérdida o corrupción de base de datos;
- licencia activada o bloqueada de forma incorrecta a gran escala;
- datos identificables de pacientes ingresados por error;
- correo, repositorio, dominio o cuenta de proveedor comprometidos;
- archivo de respaldo perdido o descifrado sin autorización.

## 3. Clasificación

### P0 — Crítico

Riesgo activo de acceso no autorizado, secreto expuesto, pérdida masiva, control del dominio o cuenta administrativa comprometidos. Requiere contención inmediata.

### P1 — Alto

Exposición limitada, alteración relevante o falla de licencias que afecta a varios usuarios, sin evidencia de control total del sistema.

### P2 — Medio

Error individual con impacto acotado, dato enviado al destinatario incorrecto o problema que puede corregirse sin interrupción general.

### P3 — Bajo

Evento preventivo, intento bloqueado o hallazgo sin exposición confirmada.

## 4. Respuesta inicial

1. Registrar fecha, hora, sistema, descubrimiento y responsable.
2. No borrar evidencia necesaria para investigar.
3. Revocar o rotar credenciales afectadas.
4. Cerrar sesiones y accesos no reconocidos.
5. Aislar la función, cuenta o despliegue comprometido.
6. Detener automatizaciones que puedan ampliar el impacto.
7. Conservar logs y una cronología de decisiones.

## 5. Contención por sistema

### Supabase

- revocar claves o tokens comprometidos;
- revisar Auth, Edge Functions, logs y cambios de base;
- comprobar RLS y permisos;
- bloquear temporalmente funciones afectadas;
- comparar configuración con el último restore drill.

### GitHub

- revocar sesiones, tokens y aplicaciones;
- revisar commits y workflows recientes;
- eliminar secretos expuestos del historial cuando corresponda;
- rotar inmediatamente cualquier secreto que haya estado en un commit, incluso si el archivo se elimina después.

### Cloudflare

- revisar actividad, DNS, Pages y tokens;
- revocar tokens o usuarios sospechosos;
- congelar cambios de dominio mientras se investiga.

### Hotmart

- revisar usuarios, webhooks y productos;
- rotar secretos de webhook;
- suspender automatización comercial solo si existe riesgo de activaciones indebidas.

### Correo

- revocar sesiones;
- cambiar contraseña y recuperación;
- revisar filtros, reenvíos y mensajes enviados;
- notificar a destinatarios si se enviaron mensajes no autorizados.

## 6. Evaluación de datos personales

Documentar:

- categorías y volumen aproximado;
- titulares posiblemente afectados;
- si existen datos sensibles o clínicos;
- duración de la exposición;
- posibilidad de identificación;
- descarga, alteración o solo acceso potencial;
- medidas ya aplicadas;
- riesgo probable para los derechos de las personas.

## 7. Comunicación

La decisión de informar a usuarios, proveedores, autoridades o terceros debe basarse en la ley vigente, la gravedad y el riesgo. La comunicación debe ser clara y contener, cuando corresponda:

- qué ocurrió;
- cuándo se detectó;
- qué información pudo verse afectada;
- qué medidas tomó KineCheck;
- qué debe hacer la persona;
- canal de contacto.

No minimizar ni afirmar que no existió exposición sin evidencia suficiente.

## 8. Recuperación

1. Corregir la causa raíz.
2. Restaurar en un entorno temporal antes de tocar producción cuando sea posible.
3. Validar integridad, licencias y accesos.
4. Probar funciones críticas.
5. Autorizar formalmente la vuelta a operación.
6. Vigilar logs y soporte durante al menos 72 horas después de un P0 o P1.

## 9. Cierre y aprendizaje

Dentro del informe final registrar:

- causa raíz;
- línea de tiempo;
- datos y sistemas afectados;
- decisiones y responsables;
- comunicaciones realizadas;
- costo e impacto;
- controles correctivos;
- fecha de verificación posterior.

Después de cada P0 o P1 debe actualizarse este protocolo, el registro de tratamientos y el checklist de seguridad.

## 10. Canal

El canal operativo de incidentes es el soporte de KineCheck. Las credenciales, contraseñas, claves privadas y archivos sensibles nunca deben enviarse mediante el formulario ni por correo común.
