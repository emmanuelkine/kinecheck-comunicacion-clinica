# Estado verificable de gates de lanzamiento

**Corte:** 6 de agosto de 2026  
**Regla:** un gate solo se cierra con evidencia reproducible. No se aceptan simulaciones como sustituto de personas, compras, credenciales o revisión profesional reales.

## 1. Seguridad y continuidad — ABIERTO

### Evidencia disponible
- RLS, separación de privilegios, sesiones temporales y rate limit persistente activos.
- Restore lógico de configuración aprobado dos veces con conteos y hashes coincidentes.
- Workflow externo de dump, cifrado, restore PostgreSQL 17 y artefacto de recuperación preparado.

### Bloqueos reales
- Supabase Auth mantiene desactivada la protección de contraseñas filtradas.
- Falta certificar 2FA y recuperación en Supabase, GitHub, Cloudflare, Hotmart y correo.
- Faltan los secretos `SUPABASE_DB_URL` y `BACKUP_ENCRYPTION_PASSPHRASE`; por eso el workflow externo no puede generar su primer artefacto verde.

### Criterio de cierre
Todos los controles administrativos confirmados y al menos un backup externo cifrado restaurado satisfactoriamente.

## 2. Hotmart final — ABIERTO

### Evidencia disponible
- Ocho checkouts, Product IDs, slugs, vigencias y grants mapeados.
- Precios públicos auditados.
- Pack Estudiante confirmado en panel a $49.900 CLP, pago al contado, conversión internacional activa y retracto/reembolso de 7 días.

### Bloqueos reales
Para los ocho productos todavía se requiere evidencia del panel de PDF, correo de bienvenida, página pospago, enlace a Academy y webhook. También falta una compra y un reembolso controlados.

### Criterio de cierre
8/8 productos con capturas o registro del panel y ciclo compra → licencia → acceso → devolución → revocación aprobado.

## 3. QA completa — ABIERTO, MUY AVANZADO

### Evidencia disponible
- Certificación transversal de acceso: 54/54 controles.
- Matriz temporal de autorización en base de datos: 17/17 controles aprobados y datos ficticios eliminados.
- Compras individuales no habilitan productos ajenos.
- Clínico habilita únicamente curso y guía.
- Pack habilita únicamente Estudiante y Más allá del dolor.
- Compra revocada y cuenta sin compra permanecen bloqueadas.
- QA pública multidispositivo automatizada incorporada para celular, tableta y computador.

### Bloqueos reales
Faltan sesiones autenticadas con cuentas representativas reales, revisión completa de contenidos, persistencia del progreso y dispositivos físicos.

### Criterio de cierre
Matriz 8 productos × 3 dispositivos × compra/acceso/contenido/progreso/reembolso sin P0 y con P1 resueltos o aceptados.

## 4. Legal final — ABIERTO

### Evidencia disponible
- Términos, privacidad y retracto/reembolsos publicados.
- Aceptación legal versionada y trazable.
- Mapa de datos, retención, seguridad y proveedores documentados.
- Métricas nuevas diseñadas sin correo, IP ni datos clínicos.

### Bloqueos reales
Faltan definición formal del proveedor, RUT, domicilio, comuna/región, teléfono o canal equivalente y revisión jurídica chilena.

### Criterio de cierre
Identidad idéntica en web, Hotmart y comprobantes, más revisión jurídica documentada.

## 5. Marca y propiedad intelectual — ABIERTO

### Evidencia disponible
- Ruta oficial de búsqueda INAPI identificada.
- Clases preliminares a evaluar: 9, 41 y 42, sujetas al clasificador vigente y revisión del alcance real.
- Registro de activos y protocolo de revisión incorporados al proyecto.

### Bloqueos reales
Falta búsqueda formal exacta y por semejanza en INAPI, decisión de clases/cobertura y verificación de licencia o autoría de cada imagen, escala, tabla y material de terceros.

### Criterio de cierre
Informe de búsqueda, decisión marcaria y 100% de activos clasificados como propios, autorizados, licenciados o retirados.

## 6. Beta observada — ABIERTO

### Evidencia disponible
- Página, formulario, consentimiento, tabla protegida, función de servidor y triage automático activos.
- Protocolo de tareas y clasificación P0–P3 disponible.

### Bloqueo real
Actualmente no existen postulaciones ni sesiones observadas. No se crearán participantes ficticios.

### Criterio de cierre
5–10 participantes representativos, tareas completadas, evidencia registrada, cero P0 y P1 resueltos o aceptados explícitamente.

## 7. Métricas — CERRADO TÉCNICAMENTE

### Implementación
- Eventos anónimos y mínimos: visita, vista de producto, checkout, Academy, curso, beta y soporte.
- Sin correo, IP, contraseña, texto clínico ni identificadores Hotmart en analítica pública.
- Embudo diario con conversión y abandono estimados.
- Compras, reembolsos y revocaciones derivados de webhooks Hotmart.
- Retención automática de eventos públicos por 400 días.
- Panel administrativo actualizado en tiempo real.

### Seguimiento
El gate técnico está cerrado. La utilidad estadística crecerá cuando exista tráfico real.

## 8. Go/No-Go — ABIERTO

### Evidencia disponible
- Criterios de entrada, monitoreo, detención y decisión documentados.
- Precios definidos y métricas disponibles.

### Bloqueos reales
Faltan grupo real, fecha, Hotmart 8/8, beta, seguridad administrativa y operación durante 48–72 horas.

### Criterio de cierre
Soft launch ejecutado, métricas revisadas y decisión escrita Go/No-Go con responsables y contingencia.

## Resultado del corte

- **Cerrados:** 1 de 8 gates — Métricas.
- **Abiertos y avanzados:** QA, Hotmart, seguridad/continuidad.
- **Abiertos por dependencia humana o profesional:** legal, marca/PI, beta y Go/No-Go.
