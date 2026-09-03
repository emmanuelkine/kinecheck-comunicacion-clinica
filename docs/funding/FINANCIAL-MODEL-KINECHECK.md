# KineCheck — modelo financiero de trabajo

**Corte:** 3 de septiembre de 2026  
**Estado:** modelo pre-escala; escenarios, no forecast aprobado.

---

## 1. Regla principal

El backend actual **no acredita ventas netas comerciales**: las 7 transacciones Hotmart registradas terminan reembolsadas/revocadas. Por lo tanto:

- no usar esas 7 transacciones como ingresos;
- no calcular crecimiento de ventas sobre ellas;
- no informar clientes pagadores desde esa tabla;
- acreditar ventas para fondos mediante Hotmart Admin, comprobantes y antecedentes tributarios.

---

## 2. Precios públicos vigentes

| Producto | Precio CLP | Acceso visible |
|---|---:|---|
| KineCheck Estudiante | 14.990 | 12 meses |
| KineCheck Clínico | 39.990 | 12 meses |
| Comunicación Clínica | 19.900 | 12 meses |
| Evidencia Aplicada | 29.990 | 12 meses |
| Traumatología y Ortopedia Clínica | 35.900 | 12 meses |
| Más allá del Dolor | 39.990 | 12 meses |
| Dolor Lumbar Persistente | 39.990 | 12 meses |
| Pack KineCheck Estudiante | 49.900 | 12 meses |

Fuente: catálogo público versionado en `estudiantes/index.html` y `profesionales/index.html`.

---

## 3. Modelo de ingreso actual

### B2C

- pago único por producto;
- vigencia visible de 12 meses en productos comerciales principales;
- venta mediante Hotmart;
- posibilidad de profundización mediante cursos adicionales o packs.

### B2B/B2B2C

No se considera ingreso activo hasta que exista:

- oferta institucional definida;
- estructura de precio/licencia;
- contrato, orden de compra o piloto pagado.

---

## 4. Fee de plataforma de pago

Hotmart publica actualmente una tarifa de referencia para productores de **9,90% sobre el valor del producto más una tarifa fija que depende de la región/moneda**. La política de pagos oficial también señala que la tarifa fija depende de la moneda utilizada.

### Regla

No aplicar una tarifa fija USD/EUR a ventas CLP sin confirmar el detalle real del checkout chileno en Hotmart Admin.

Fuentes:
- https://hotmart.com/es/blog/precios
- https://hotmart.com/en/legal/payments-policy

---

## 5. Sensibilidad profesional Chile

SAM de trabajo: **44.797 profesionales practicantes**.  
Producto de referencia: **KineCheck Clínico, $39.990 CLP**.

| Penetración | Usuarios | Facturación bruta equivalente |
|---:|---:|---:|
| 0,5% | 224 | $8.957.760 |
| 1,0% | 448 | $17.915.520 |
| 1,5% | 672 | $26.873.280 |
| 3,0% | 1.344 | $53.746.560 |

Estas cifras no descuentan Hotmart, impuestos, reembolsos, descuentos, marketing ni costos.

---

## 6. Escenario de crecimiento de referencia a 36 meses

Este escenario sirve para dimensionar una postulación, **no para prometer ventas**. Utiliza la sensibilidad de penetración del SAM profesional chileno y no incluye todavía el segmento estudiante ni B2B.

| Periodo | Penetración ilustrativa | Usuarios equivalentes | Bruto equivalente CLP |
|---|---:|---:|---:|
| Año 1 | 0,5% | 224 | $8.957.760 |
| Año 2 | 1,5% | 672 | $26.873.280 |
| Año 3 | 3,0% | 1.344 | $53.746.560 |

### Condición para convertirlo en forecast

Sustituir penetraciones ilustrativas por supuestos calibrados con:

- conversión observada;
- CAC por canal;
- capacidad de adquisición mensual;
- tasa de reembolso;
- mix de productos;
- recompra/renovación;
- churn o expiración;
- capacidad de soporte.

---

## 7. Unit economics — estado actual

| Métrica | Estado | Motivo |
|---|---|---|
| Ticket promedio | NO MEDIBLE comercialmente | No hay cohorte neta de compras verificada. |
| Margen bruto | PARCIAL | Falta fee real CLP, impuestos y costos variables. |
| CAC | NO MEDIBLE | Falta gasto por canal + clientes netos atribuidos. |
| LTV | NO MEDIBLE | Falta recurrencia/renovación/cohortes. |
| Payback CAC | NO MEDIBLE | Depende de CAC y margen. |
| Tasa de reembolso comercial | NO MEDIBLE | Registros actuales son QA/reembolsados y no una cohorte comercial. |

---

## 8. Umbrales para empezar a calcular métricas

### CAC

Calcular por canal cuando exista:

- gasto atribuible claro;
- tracking de origen;
- una base suficiente de compras netas. Como regla operativa, intentar acumular al menos ~30 clientes netos atribuidos por canal antes de presentar el CAC como estable; con menos datos, mostrar rango e intervalo.

Fórmula:

`CAC = gasto de adquisición atribuible / nuevos clientes netos atribuibles`

### LTV

Calcular cuando exista al menos una cohorte con comportamiento de recompra/renovación observable.

Versión inicial:

`LTV contribución = ingreso neto promedio por cliente × margen de contribución × número esperado de compras/renovaciones`

### Payback

`Payback = CAC / margen de contribución mensual o por ciclo`

No utilizar LTV:CAC como argumento de escalabilidad antes de tener evidencia real.

---

## 9. Costos — estructura que debe consolidarse

### Costos tecnológicos

- dominio/DNS;
- hosting/CDN;
- Supabase si se cambia de plan;
- almacenamiento y transferencia;
- herramientas de monitoreo/QA;
- correo/servicios transaccionales si se incorporan.

### Costos comerciales

- comisiones Hotmart;
- campañas pagadas;
- producción de contenidos de adquisición;
- afiliados/coproductores si se utilizan;
- descuentos/promociones.

### Costos de producto

- desarrollo;
- diseño;
- producción audiovisual;
- revisión clínica/editorial;
- bibliografía/licencias de terceros cuando aplique.

### Costos administrativos

- contabilidad;
- asesoría legal/IP;
- impuestos;
- certificaciones;
- administración de proyectos financiados.

### Estado

Los montos reales de estos costos deben venir de facturas/boletas/cotizaciones y mantenerse en data room privado.

---

## 10. Modelo de ingresos a construir en el piloto

Instrumentar por mes:

1. sesiones públicas;
2. vistas de producto;
3. clics a checkout;
4. checkouts iniciados si la plataforma lo permite;
5. compras aprobadas;
6. compras netas después de garantía/reembolso;
7. ingreso bruto;
8. fee de plataforma;
9. ingreso neto;
10. producto comprado;
11. canal de adquisición;
12. acceso activado;
13. apertura del producto;
14. recompra/cross-sell.

Con tres meses de esta estructura ya se puede construir un modelo financiero mucho más defendible.

---

## 11. Escenarios B2B que pueden modelarse después de validar precio

No fijar tarifas institucionales sin entrevistas y disposición de pago. Se pueden testear tres modelos:

- licencia por estudiante/año;
- licencia por cohorte/semestre;
- licencia institucional anual con bandas de usuarios.

Para cada piloto B2B medir:

- costo de implementación;
- usuarios activados;
- uso efectivo;
- soporte requerido;
- renovación/intención de continuidad;
- disposición de pago de la institución.

---

## 12. Evidencia financiera que debe pedir el data room

- reporte Hotmart de ventas y reembolsos por periodo;
- liquidaciones netas;
- documentos tributarios;
- declaración/registro de ventas cuando corresponda;
- facturas/boletas de costos;
- cartolas de campañas publicitarias;
- contratos/cotizaciones de proveedores;
- conciliación mensual producto→venta→pago→reembolso.

Esta evidencia no debe subirse al repositorio público.
