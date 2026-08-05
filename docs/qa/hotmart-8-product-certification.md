# Certificación manual Hotmart — 8 productos KineCheck

Actualizado: 2026-08-05

## Regla de cierre

Un producto solo se considera **Certificado** cuando existe evidencia de:

1. checkout correcto;
2. garantía y vigencia coherentes;
3. compra aprobada procesada por webhook;
4. licencia visible con el mismo correo;
5. producto abierto y contenido recorrido;
6. progreso persistente;
7. devolución, cancelación y contracargo bloqueando el acceso;
8. funcionamiento en celular y computador; tablet cuando corresponda;
9. PDF, correo, pospago y enlace de Hotmart Academy actualizados.

El workflow `KineCheck Commercial QA` verifica diariamente rutas públicas, checkouts y coherencia de código. No sustituye las pruebas de compra y devolución.

## Productos

| Producto | Checkout | Product ID | Vigencia | Grants |
|---|---|---:|---|---|
| KineCheck Clínico | https://pay.hotmart.com/L106791841D | 8150019 | 12 meses | kinecheck-clinico |
| KineCheck Estudiante | https://pay.hotmart.com/G106801166S | 8154796 | 12 meses | kinecheck-estudiante |
| KineCheck Recupera | https://pay.hotmart.com/P106806251E | 8157431 | 3 meses | kinecheck-recupera |
| Comunicación Clínica | https://pay.hotmart.com/T106883983U | 8192814 | 12 meses | comunicacion-clinica |
| Más allá del dolor | https://pay.hotmart.com/W106888386Q | 8194777 | 12 meses | mas-alla-del-dolor |
| Evidencia Aplicada | https://pay.hotmart.com/F106921972I | 8208817 | 12 meses | evidencia-aplicada |
| Traumatología y Ortopedia Clínica | https://pay.hotmart.com/B106913952R | 8205453 | 12 meses | traumatologia-ortopedia-clinica |
| Pack KineCheck Estudiante | https://pay.hotmart.com/Q106891608M | 8195982 | 12 meses | kinecheck-estudiante + mas-alla-del-dolor |

## Evidencia requerida por producto

Guardar una carpeta o registro por producto con:

- captura de la página de producto y precio;
- captura de la garantía mostrada en checkout;
- URL del checkout;
- PDF de bienvenida cargado;
- copia del correo de bienvenida;
- URL de la página posterior al pago;
- URL del enlace de Hotmart Academy;
- identificación del webhook asignado;
- ID de una transacción de prueba aprobada;
- hora del evento y hora de activación en Supabase;
- captura de licencia visible en KineCheck;
- captura de apertura del producto;
- registro de progreso antes y después de volver a ingresar;
- ID y hora del evento de reembolso o cancelación;
- captura del acceso bloqueado;
- dispositivo, navegador y versión probados.

No guardar contraseñas, números completos de tarjetas ni datos clínicos.

## Secuencia recomendada

### A. Configuración del panel

1. Abrir el producto en Hotmart.
2. Confirmar nombre, imagen, descripción, precio y moneda.
3. Confirmar plazo de garantía mostrado al comprador.
4. Cargar el PDF específico del producto.
5. Actualizar el correo o material de bienvenida.
6. Establecer como acceso general: `https://kinecheck.cl/platform/`.
7. Confirmar la página posterior al pago.
8. Confirmar el webhook de producción.
9. Eliminar enlaces antiguos con versiones `?v=39`, `?v=41` o correos anteriores.

### B. Compra aprobada

1. Usar una cuenta de prueba controlada y un correo nuevo.
2. Completar una transacción autorizada.
3. Registrar la hora exacta de aprobación.
4. Verificar el evento en Hotmart y Supabase.
5. Crear o abrir la cuenta KineCheck con el mismo correo.
6. Verificar producto, vigencia y fecha de término.
7. Abrir el producto y recorrer sus funciones esenciales.

### C. Persistencia

1. Completar una actividad o crear un registro de prueba anonimizado.
2. Cerrar sesión.
3. Cerrar el navegador.
4. Volver a ingresar.
5. Confirmar que el progreso o registro permanece y que la sesión anterior no quedó persistente.

### D. Reembolso y bloqueo

1. Solicitar el reembolso dentro de la prueba controlada.
2. Registrar el evento recibido.
3. Confirmar `active = false` para la licencia correspondiente.
4. Volver a ingresar con la misma cuenta.
5. Confirmar que el producto ya no abre.
6. Para el pack, confirmar que se bloquean ambos grants.

### E. Dispositivos

Prueba mínima:

- iPhone/Safari;
- Android/Chrome;
- computador/Chrome;
- computador/Safari o Edge;
- tablet cuando la interfaz o el contenido tenga una disposición distinta.

## Severidad de hallazgos

- **P0 — Bloqueante:** compra perdida, licencia incorrecta, acceso de terceros, datos expuestos, reembolso sin bloqueo o producto inutilizable.
- **P1 — Crítico:** función principal rota, pérdida de progreso, enlaces equivocados, contenido importante inaccesible o error repetido de autenticación.
- **P2 — Mayor:** fricción relevante, texto cortado, problema de dispositivo o instrucción ambigua con alternativa disponible.
- **P3 — Menor:** mejora visual, editorial o de comodidad que no impide el uso.

No se autoriza soft launch con P0 abiertos. Los P1 deben estar cerrados o aceptados expresamente con mitigación y fecha.
