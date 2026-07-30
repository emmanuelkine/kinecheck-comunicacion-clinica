# Playbook de soporte KineCheck

**Canal oficial:** soporte.kinecheck@gmail.com  
**Horario operativo:** lunes a viernes, días hábiles de Chile.  
**Objetivo interno de primera respuesta:** dentro de 1 día hábil.  
**Incidencias críticas de acceso general:** primera revisión dentro de 4 horas hábiles cuando sea posible.

> Estos tiempos son objetivos internos de operación y no una garantía contractual.

## Datos mínimos que debe solicitar soporte

1. Producto adquirido.
2. Correo exacto utilizado en Hotmart.
3. Fecha aproximada de compra.
4. Código de transacción HP solo cuando sea necesario.
5. Captura del mensaje de error, sin datos clínicos de pacientes.
6. Dispositivo y navegador utilizados.

No solicitar contraseñas, códigos de verificación, claves de Supabase ni información clínica identificable.

## Clasificación

- **P0 — Crítica:** Academy o todos los accesos están caídos; compras aprobadas no se activan de forma general; riesgo de seguridad o exposición de datos.
- **P1 — Alta:** un comprador con pago aprobado no puede acceder; reembolso no bloquea; enlace o descarga principal está roto.
- **P2 — Media:** error parcial, problema de navegación, progreso o visualización con alternativa disponible.
- **P3 — Baja:** duda de uso, sugerencia, mejora estética o consulta comercial.

## Flujo de atención

1. Registrar la incidencia en el archivo único de tickets.
2. Confirmar recepción al usuario.
3. Verificar primero correo, producto y estado de compra.
4. Reproducir el problema sin usar datos reales de pacientes.
5. Aplicar solución o escalar.
6. Confirmar con el usuario.
7. Documentar causa, solución y prevención.
8. Cerrar el ticket solo cuando exista evidencia de resolución o una explicación final.

## Respuestas base

### 1. Producto no aparece en Academy

**Asunto:** Revisión de acceso a KineCheck

Hola:

Gracias por escribirnos. No vuelvas a realizar la compra.

Por favor confirma:

- producto adquirido;
- correo exacto utilizado en Hotmart;
- fecha aproximada de compra;
- captura del mensaje que aparece en Academy.

Antes de responder, prueba cerrar sesión e ingresar nuevamente en:

https://emmanuelkine.github.io/kinecheck-comunicacion-clinica/academy/?v=41

Debes utilizar exactamente el mismo correo registrado durante la compra.

Equipo de Soporte KineCheck

### 2. Código de transacción HP rechazado

**Asunto:** Revisión de activación KineCheck

Hola:

Revisaremos la activación. Confirma el correo usado en Hotmart y copia el código de transacción completo que comienza con HP.

No envíes tu contraseña ni códigos de verificación. La compra debe encontrarse aprobada y activa.

Equipo de Soporte KineCheck

### 3. No recibió el correo de confirmación

**Asunto:** Confirmación de cuenta KineCheck

Hola:

Revisa las carpetas Spam, Promociones y Correo no deseado. Busca mensajes relacionados con la confirmación de la cuenta.

Si el correo no aparece, responde indicando la dirección exacta con la que creaste tu cuenta. No envíes tu contraseña.

Equipo de Soporte KineCheck

### 4. Olvidó la contraseña

**Asunto:** Recuperación de acceso KineCheck

Hola:

Utiliza la opción de recuperación de contraseña disponible en la pantalla de acceso. Debes ingresar el mismo correo asociado a tu cuenta.

Revisa también Spam y Promociones. Nunca compartas tu contraseña con soporte.

Equipo de Soporte KineCheck

### 5. Reembolso o compra anulada

**Asunto:** Estado de licencia KineCheck

Hola:

Cuando Hotmart confirma un reembolso, contracargo, expiración o cancelación que revoca la compra, el acceso al producto se desactiva automáticamente.

Si consideras que el bloqueo es incorrecto, envía el correo de compra, el producto y el código de transacción para revisar el estado registrado.

Equipo de Soporte KineCheck

### 6. Enlace, video o descarga no funciona

**Asunto:** Revisión de contenido KineCheck

Hola:

Gracias por reportarlo. Indica:

- nombre del curso;
- módulo o lección;
- enlace, video o archivo afectado;
- dispositivo y navegador;
- captura del error.

Mientras revisamos, prueba actualizar la página con Ctrl + Shift + R o abrirla en una ventana privada.

Equipo de Soporte KineCheck

### 7. Problema en teléfono o tablet

**Asunto:** Revisión de acceso móvil KineCheck

Hola:

Confirma el modelo del dispositivo, sistema operativo y navegador. Prueba primero con Chrome, Edge o Safari actualizado y desactiva temporalmente bloqueadores de contenido para verificar.

No borres tu cuenta ni vuelvas a comprar.

Equipo de Soporte KineCheck

### 8. Consulta con datos clínicos

**Asunto:** Protección de información clínica

Hola:

Para proteger la privacidad, no envíes nombres, RUT, fichas, fotografías identificables ni otros datos clínicos de pacientes. Describe el problema técnico utilizando información ficticia o anonimizada.

Equipo de Soporte KineCheck

## Criterios de escalamiento

Escalar inmediatamente cuando exista:

- sospecha de exposición de datos o credenciales;
- múltiples compradores afectados;
- compra aprobada sin licencia tras verificaciones básicas;
- acceso que continúa activo después de un reembolso confirmado;
- falla de webhook, Supabase, GitHub Pages o curso protegido;
- pérdida de contenido o progreso sin respaldo.

## Cierre semanal

Cada viernes revisar:

- tickets abiertos y vencidos;
- cantidad por producto y categoría;
- causas repetidas;
- tiempo medio de primera respuesta;
- tiempo medio de resolución;
- mejoras que eviten nuevos tickets.
