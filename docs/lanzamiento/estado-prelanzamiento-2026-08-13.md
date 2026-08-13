# Estado de prelanzamiento KineCheck — 13 de agosto de 2026

## Resumen ejecutivo

**Estado técnico:** GO técnico condicionado.

**Preparación global estimada:** 95–96%.

La superficie pública, las fichas canónicas de producto, los precios visibles en Chile, los checkouts públicos de Hotmart, Academy, el runtime de acceso a productos, las métricas de lanzamiento, los recorridos móviles y los principales gates automatizados están operativos y validados.

El lanzamiento comercial final sigue en **NO-GO** hasta completar las validaciones operativas que requieren credenciales, transacciones reales o datos jurídicos que no deben inferirse ni almacenarse en el repositorio.

## Certificado automáticamente

### Sitio público y SEO

- Portada y perfiles públicos operativos.
- Ocho fichas de producto canónicas e indexables.
- El endpoint legado `/productos/?producto=...` queda solo como compatibilidad y no como superficie SEO principal.
- Sitemap orientado a las ocho fichas canónicas.
- Canonical, Open Graph, datos estructurados, precios y acceso a Academy presentes por producto.
- Corrección de overflow horizontal móvil en portada y fichas detectadas durante QA.

### Comercio público

El gate `KineCheck Commercial QA` finalizó correctamente y valida la arquitectura comercial canónica, precios CLP, enlaces a Hotmart, enlaces legales y acceso a Academy.

La auditoría externa de Hotmart ejecutada el 13-08-2026 desde contexto `es-CL`, zona horaria `America/Santiago` y geolocalización Santiago abrió los ocho checkouts y observó los siguientes valores:

| Producto | Precio público observado |
|---|---:|
| KineCheck Clínico | $39.990 CLP |
| KineCheck Estudiante | $14.990 CLP |
| KineCheck Recupera | $9.990 CLP |
| Comunicación Clínica | $19.900 CLP |
| Más allá del dolor | $39.990 CLP |
| Evidencia Aplicada | $29.990 CLP |
| Traumatología y Ortopedia Clínica | $35.900 CLP |
| Pack KineCheck Estudiante | $49.900 CLP |

Esto confirma la superficie pública observable, pero **no reemplaza** la revisión del productor dentro del panel Hotmart ni una compra controlada de extremo a extremo.

### Academy y acceso

- Restablecidos los controladores seguros de apertura de productos en `academy/index.html`.
- Academy carga nuevamente `academy-open-v6.js` y `academy-owned-native-bridge-v1.js`.
- Restablecida la instrumentación `metrics-v1.js` para el evento de página y eventos de producto.
- El gate `Validate Academy Product Buttons` finalizó correctamente en Chromium y WebKit.
- Navegación móvil, botones de productos adquiridos, relay de aplicaciones y consentimiento de Recupera cubiertos por QA.
- El healthcheck del sistema finalizó correctamente después de restaurar el runtime de Academy.

### QA y seguridad de publicación

- `KineCheck Publication Readiness`: aprobado.
- `KineCheck Commercial QA`: aprobado.
- `Validate Academy Product Buttons`: aprobado en Chromium y WebKit.
- `KineCheck healthcheck`: aprobado en la revisión posterior al cambio principal de Academy.
- Las pruebas fuente y de arquitectura comercial fueron alineadas con las rutas canónicas actuales para evitar falsos rojos de la arquitectura retirada.

## Pendiente operativo — requiere al propietario

### 1. Backup y restauración real

El drill de backup/restauración no puede ejecutarse sin credenciales privadas de base de datos. Configurar de forma segura en **GitHub → Settings → Secrets and variables → Actions** una de estas alternativas:

- `SUPABASE_DB_URL`, o
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

No copiar estas credenciales a documentación, issues, commits ni chats.

Después, ejecutar el workflow **KineCheck Backup and Restore Drill** y exigir resultado verde con artefacto de backup/restauración.

### 2. Revisión del productor en Hotmart — 8/8

Entrar al panel de Hotmart y verificar cada producto:

- producto/oferta correctos;
- precio Chile correcto;
- plazo de garantía/reembolso configurado;
- vigencia/acceso coherente con KineCheck;
- descripción y nombre de producto coherentes;
- método de pago/oferta que se desea publicar.

La auditoría pública ya confirmó precios y accesibilidad de los ocho checkouts, pero no puede certificar configuraciones privadas del productor.

### 3. Transacción controlada de extremo a extremo

Realizar al menos una compra controlada y documentar:

1. pago aprobado en Hotmart;
2. webhook/evento recibido;
3. licencia creada/activada;
4. ingreso autenticado a Academy;
5. apertura del producto adquirido;
6. reembolso solicitado/procesado;
7. licencia revocada correctamente;
8. comprobar el comportamiento de contracargo/reversa cuando sea viable.

No declarar el flujo comercial completamente certificado antes de completar este ciclo real.

### 4. Identificación legal del proveedor

Completar únicamente con datos jurídicos verificados:

- persona natural o persona jurídica;
- nombre/razón social;
- RUT;
- domicilio legal o comercial válido;
- comuna/región;
- correo/canal formal de contacto;
- giro/actividad cuando corresponda;
- representante legal si aplica.

Revisar que sitio, Hotmart, comprobantes y soporte sean coherentes. No publicar una dirección personal inferida como domicilio comercial.

### 5. Soft launch antes de pauta masiva

Cuando los cuatro puntos anteriores estén cerrados:

- congelar release candidate;
- invitar 5–15 usuarios conocidos;
- mantener 48–72 horas de observación;
- revisar métricas, accesos, errores y tickets de soporte;
- si no existen P0/P1, emitir GO para lanzamiento abierto/pauta.

## Criterio de cierre

KineCheck debe considerarse **técnicamente listo** cuando los gates automatizados anteriores permanezcan verdes. Debe considerarse **comercialmente listo** solo cuando backup/restauración, Hotmart 8/8, transacción real completa e identificación legal hayan sido validados por el propietario.

Hasta entonces: **GO técnico / NO-GO comercial final**.
