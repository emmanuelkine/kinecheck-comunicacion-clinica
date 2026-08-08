# Validación comercial real del Release Candidate

**Estado inicial:** NO EJECUTADO

**Alcance:** beta controlada y lanzamiento público limitado
**Resultado inicial:** pendiente de evidencia comercial real

Este documento es una matriz operativa para transacciones reales controladas. No acredita compras, webhooks, licencias ni revocaciones hasta que un operador autorizado complete los campos y adjunte evidencia.

## Reglas de ejecución y evidencia

- Ejecutar únicamente con autorización comercial y cuentas de prueba controladas.
- No activar, revocar ni corregir licencias manualmente durante un caso. Una intervención manual invalida el resultado del flujo productivo.
- Consultar eventos, licencias y accesos solo mediante herramientas autorizadas y en modo de lectura.
- No guardar contraseñas, tokens, secretos, datos de tarjeta, correos completos ni identificadores de transacción completos en este repositorio.
- Anonimizar correos como `e***@dominio.test` y transacciones como `HP***1234`.
- Guardar capturas y registros en el repositorio de evidencia restringido; aquí se registra únicamente su referencia.
- Registrar horas con zona, idealmente en formato ISO 8601.
- Marcar **PASS** solo cuando todo el resultado esperado fue observado y existe evidencia. Marcar **FAIL** ante cualquier desviación. Mantener **NO EJECUTADO** mientras falte la prueba.
- No convertir un resultado parcial, automatizado o inferido en PASS.

## Resumen de gates

| Caso | Flujo real | Estado inicial |
|---|---|---|
| A | KineCheck Clínico: compra → webhook → licencia → Academy | NO EJECUTADO |
| B | Curso: compra → licencia → Academy | NO EJECUTADO |
| C | Pack Estudiante: compra → dos productos exactos | NO EJECUTADO |
| D | Correo de compra distinto al correo de cuenta | NO EJECUTADO |
| E | Reembolso y revocación | NO EJECUTADO |
| F | Chargeback o cancelación y revocación | NO EJECUTADO |
| G | Pago fallido sin acceso | NO EJECUTADO |
| H | Expiración de sesión | NO EJECUTADO |

## Preparación común

1. Confirmar responsable, ventana de ejecución, presupuesto y autorización de reembolso o cancelación.
2. Usar una cuenta nueva por flujo cuando el resultado dependa de que no existan accesos previos.
3. Registrar producto, URL del checkout, precio, vigencia y garantía realmente mostrados antes de pagar. Este registro no elimina la nota legal “Pendiente de certificación comercial”.
4. Preparar acceso de solo lectura a la evidencia del evento Hotmart, recepción del webhook, licencia y catálogo visible en Academy.
5. Sincronizar la hora de los dispositivos y abrir el registro del caso antes de iniciar el pago.
6. Capturar el estado previo de la cuenta para distinguir accesos nuevos de accesos preexistentes.

## Caso A — KineCheck Clínico

**Producto:** KineCheck Clínico (`8150019`)

**Flujo:** compra real → Hotmart aprobado → webhook real → `course_access` activo → login → Clínico visible.

### Procedimiento

1. Comprar KineCheck Clínico con un correo controlado sin acceso previo al producto.
2. Confirmar en Hotmart que la transacción figure aprobada y registrar su hora.
3. Confirmar en la evidencia productiva autorizada la recepción del webhook correspondiente a esa transacción.
4. Confirmar en lectura que se creó acceso activo para el mismo correo y producto, sin activación manual.
5. Crear o abrir la cuenta en `/academy/` con el mismo correo.
6. Confirmar que KineCheck Clínico sea visible y pueda abrirse.

**Criterio PASS:** los seis pasos coinciden por correo, producto y transacción, y la evidencia permite seguir el flujo completo.

| Campo | Registro |
|---|---|
| Fecha | — (completar al ejecutar) |
| Correo anonimizado | — |
| Producto | KineCheck Clínico |
| `transaction_id` anonimizado | — |
| Resultado esperado | Aprobación, webhook real, acceso activo y Clínico visible en Academy. |
| Resultado observado | — |
| PASS/FAIL | NO EJECUTADO |
| Evidencia | — |
| Observaciones | — |

## Caso B — Curso

**Producto piloto:** Comunicación Clínica (`8192814`)

**Flujo:** compra real de curso → licencia → Academy → curso visible.

### Procedimiento

1. Comprar Comunicación Clínica con un correo controlado sin acceso previo al curso.
2. Confirmar aprobación y recepción del webhook real.
3. Confirmar en lectura la licencia activa asociada a `comunicacion-clinica`.
4. Ingresar a `/academy/` con el mismo correo.
5. Confirmar que Comunicación Clínica sea visible y pueda abrirse.

**Criterio PASS:** la transacción real produce únicamente el acceso esperado y el curso abre desde Academy.

| Campo | Registro |
|---|---|
| Fecha | — (completar al ejecutar) |
| Correo anonimizado | — |
| Producto | Comunicación Clínica |
| `transaction_id` anonimizado | — |
| Resultado esperado | Licencia activa y curso visible y abrible en Academy. |
| Resultado observado | — |
| PASS/FAIL | NO EJECUTADO |
| Evidencia | — |
| Observaciones | — |

## Caso C — Pack KineCheck Estudiante

**Producto:** Pack KineCheck Estudiante (`8195982`)

**Flujo:** compra real del pack → deben aparecer exactamente los productos correspondientes al pack.

### Procedimiento

1. Usar un correo controlado sin accesos previos a productos del pack.
2. Comprar el Pack KineCheck Estudiante y confirmar aprobación y webhook real.
3. Confirmar que la transacción conceda exactamente:
   - KineCheck Estudiante (`kinecheck-estudiante`);
   - Más allá del Dolor (`mas-alla-del-dolor`).
4. Confirmar que la transacción no conceda otro producto.
5. Ingresar a `/academy/` y comprobar que ambos productos, y solo esos dos atribuibles al pack, sean visibles y puedan abrirse.

**Criterio PASS:** existen exactamente los dos grants esperados, sin faltantes ni concesiones adicionales, y ambos productos abren.

| Campo | Registro |
|---|---|
| Fecha | — (completar al ejecutar) |
| Correo anonimizado | — |
| Producto | Pack KineCheck Estudiante |
| `transaction_id` anonimizado | — |
| Resultado esperado | KineCheck Estudiante y Más allá del Dolor; ningún otro grant atribuible al pack. |
| Resultado observado | — |
| PASS/FAIL | NO EJECUTADO |
| Evidencia | — |
| Observaciones | — |

## Caso D — Correo incorrecto

**Flujo:** compra con correo A → login con correo B → acceso rechazado con mensaje comprensible.

### Procedimiento

1. Comprar un producto con el correo controlado A y confirmar su aprobación y acceso activo.
2. Ingresar o crear cuenta en `/academy/` con el correo controlado B, que no debe poseer el producto.
3. Intentar abrir el producto comprado por A.
4. Confirmar que B no reciba acceso, que no se cree una licencia incorrecta y que el mensaje explique que debe usarse el correo asociado a la compra o solicitar soporte.
5. Confirmar después que A conserva el acceso correcto.

**Criterio PASS:** B es rechazado de forma comprensible, no obtiene acceso y A mantiene su licencia.

| Campo | Registro |
|---|---|
| Fecha | — (completar al ejecutar) |
| Correo anonimizado | A: — / B: — |
| Producto | — |
| `transaction_id` anonimizado | — |
| Resultado esperado | B rechazado sin licencia; mensaje comprensible; A conserva acceso. |
| Resultado observado | — |
| PASS/FAIL | NO EJECUTADO |
| Evidencia | — |
| Observaciones | — |

## Caso E — Reembolso

**Flujo:** compra aprobada → acceso activo → reembolso real → acceso revocado.

### Procedimiento

1. Reutilizar una transacción aprobada de un caso anterior o efectuar una compra controlada separada.
2. Confirmar y documentar el acceso activo antes del reembolso.
3. Solicitar y completar el reembolso mediante Hotmart.
4. Confirmar el evento real y su recepción por el webhook productivo.
5. Confirmar en lectura que el acceso quedó revocado, sin intervención manual.
6. Volver a ingresar e intentar abrir el producto.

**Criterio PASS:** el evento real de reembolso revoca el acceso y el producto deja de abrirse. Para un pack deben revocarse sus dos grants.

| Campo | Registro |
|---|---|
| Fecha | — (completar al ejecutar) |
| Correo anonimizado | — |
| Producto | — |
| `transaction_id` anonimizado | — |
| Resultado esperado | Webhook de reembolso recibido y acceso revocado automáticamente. |
| Resultado observado | — |
| PASS/FAIL | NO EJECUTADO |
| Evidencia | — |
| Observaciones | — |

## Caso F — Chargeback o cancelación

**Flujo:** chargeback o cancelación real → revocación según la lógica productiva vigente.

### Procedimiento

1. Usar una transacción separada y el mecanismo controlado autorizado por Hotmart y por el responsable comercial. No iniciar una disputa bancaria sin autorización expresa.
2. Confirmar el acceso activo antes del evento.
3. Generar el evento real de chargeback o cancelación permitido para la prueba.
4. Confirmar el evento, la recepción del webhook y el estado productivo resultante.
5. Intentar abrir nuevamente el producto desde `/academy/`.
6. Registrar el tiempo observado entre el evento y la revocación; no asumir un SLA que no esté certificado.

**Criterio PASS:** el evento productivo reconocido por la lógica vigente revoca el acceso correspondiente, sin intervención manual.

| Campo | Registro |
|---|---|
| Fecha | — (completar al ejecutar) |
| Correo anonimizado | — |
| Producto | — |
| `transaction_id` anonimizado | — |
| Resultado esperado | Evento real recibido y acceso revocado según la lógica productiva vigente. |
| Resultado observado | — |
| PASS/FAIL | NO EJECUTADO |
| Evidencia | — |
| Observaciones | — |

## Caso G — Pago fallido

**Flujo:** pago real rechazado o fallido → sin acceso.

1. Ejecutar el escenario permitido por Hotmart para un pago fallido controlado.
2. Confirmar el estado comercial final y cualquier evento recibido.
3. Confirmar que no se cree acceso activo y que el producto no sea visible para esa cuenta.

| Campo | Registro |
|---|---|
| Fecha | — (completar al ejecutar) |
| Correo anonimizado | — |
| Producto | — |
| `transaction_id` anonimizado | — |
| Resultado esperado | Ninguna licencia activa ni acceso al producto. |
| Resultado observado | — |
| PASS/FAIL | NO EJECUTADO |
| Evidencia | — |
| Observaciones | — |

## Caso H — Expiración de sesión

**Flujo:** sesión válida → expiración real → acceso protegido exige reautenticación sin exponer contenido.

1. Ingresar con una cuenta que tenga licencia real activa.
2. Esperar la expiración real o usar únicamente el mecanismo de expiración autorizado; no alterar tokens ni secretos productivos.
3. Intentar abrir o continuar un producto protegido.
4. Confirmar que la sesión expirada no permita contenido protegido y que el usuario reciba una ruta comprensible para volver a ingresar.

| Campo | Registro |
|---|---|
| Fecha | — (completar al ejecutar) |
| Correo anonimizado | — |
| Producto | — |
| `transaction_id` anonimizado | — |
| Resultado esperado | Contenido protegido bloqueado y reautenticación comprensible. |
| Resultado observado | — |
| PASS/FAIL | NO EJECUTADO |
| Evidencia | — |
| Observaciones | — |

## Evidencia humana complementaria del lanzamiento

Estas pruebas permanecen pendientes aunque los checks responsive y de seguridad automatizados estén verdes.

| Prueba | Dispositivo o alcance | Resultado observado | PASS/FAIL | Evidencia | Observaciones |
|---|---|---|---|---|---|
| Dos dispositivos físicos | Misma cuenta y producto, dos equipos reales | — | NO EJECUTADO | — | — |
| iPhone / Safari | iPhone físico y versión registrada | — | NO EJECUTADO | — | — |
| Android / Chrome | Android físico y versión registrada | — | NO EJECUTADO | — | — |
| Lector de pantalla real | Tecnología, navegador y recorrido registrados | — | NO EJECUTADO | — | — |
| Prueba de penetración | Alcance y autorización formal previos | — | NO EJECUTADO | — | — |

## Decisión de salida

- **Beta controlada:** puede mantenerse APTA con los controles técnicos verdes y seguimiento estrecho.
- **Lanzamiento público limitado:** permanece PENDIENTE DE VALIDACIÓN COMERCIAL REAL hasta que los casos obligatorios definidos por el responsable tengan evidencia PASS y no existan fallos bloqueantes.
- **Lanzamiento masivo:** NO CERTIFICADO. Requiere además cierre formal de seguridad humana, accesibilidad y dispositivos físicos.
