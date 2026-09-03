# KineCheck — línea base de evidencia para financiamiento

**Corte:** 3 de septiembre de 2026  
**Uso:** postulaciones, pitch, due diligence y definición de KPIs  
**Regla:** este documento distingue resultados observados, pruebas técnicas y escenarios. No mezclar categorías.

---

## 1. Clasificación de evidencia

- **OBSERVADO:** dato medido directamente en KineCheck o fuente pública identificada.
- **TÉCNICO/QA:** evidencia de pruebas o validación interna; no equivale a cliente, venta ni impacto.
- **ESCENARIO:** cálculo de sensibilidad para planificación; no es forecast ni resultado.
- **PENDIENTE:** requiere documento administrativo, tributario, contractual o medición adicional.

---

## 2. Producto y operación — OBSERVADO

KineCheck dispone actualmente de:

- sitio público por perfil;
- Academy / Mi KineCheck;
- autenticación y control de acceso;
- integración con Hotmart;
- catálogo de cursos y aplicaciones educativas;
- productos premium protegidos en componentes críticos;
- términos y política de privacidad;
- QA automatizado multidispositivo;
- PRD maestro y arquitectura de marca versionados.

La operación comercial pública de los productos habilitados se mantiene en estado GO según el seguimiento técnico del repositorio, aunque la certificación administrativa/comercial completa aún conserva tareas abiertas.

---

## 3. Tracción interna instrumentada — OBSERVADO

Snapshot agregado desde Supabase, sin exponer datos personales:

| Indicador | Valor observado | Interpretación permitida |
|---|---:|---|
| Cuentas autenticadas existentes | 18 | Cuentas en Auth; no equivale a 18 clientes pagadores. |
| Usuarios históricos con `access_source=beta` | 14 | Evidencia de cohorte beta histórica; sus accesos están hoy inactivos. |
| Filas históricas beta | 28 | Distintos grants/curso; no equivale a 28 personas. |
| Usuarios con acceso activo total | 5 | Incluye owner/manual; no debe presentarse como clientes. |
| Sesiones no-QA instrumentadas | 370 | Sesiones observadas, no personas únicas. |
| Eventos no-QA | 969 | Telemetría de uso entre 7-ago-2026 y 3-sep-2026. |
| Sesiones con `academy_open` | 60 | Señal de uso de Academy. |
| Sesiones con `course_open` | 32 | Señal de apertura de cursos. |
| Sesiones con `product_view` | 18 | Señal de exploración de producto. |
| `page_view` no-QA | 608 eventos / 370 sesiones | Base de navegación instrumentada. |
| Reviews almacenadas en `course_reviews` | 0 | No existe hoy rating cuantitativo backend que sustente estrellas públicas. |
| Postulaciones en `beta_applications` | 0 | La cohorte beta histórica se gestionó por otra vía; no inferir formulario actual. |

### Lectura correcta

KineCheck tiene una **línea base pre-escala instrumentada**: producto operativo, cohorte beta histórica y uso medido. Todavía no corresponde describir esta fase como crecimiento comercial probado.

---

## 4. Evidencia Hotmart — TÉCNICO/QA, no ventas netas

La tabla `hotmart_purchases` contiene 7 transacciones agregadas, una para cada uno de siete Product IDs históricos. Al corte actual, **las siete aparecen en estado `revoked` con último evento `PURCHASE_REFUNDED`**.

Además, la tabla de eventos contiene un ciclo técnico con eventos como `PURCHASE_APPROVED`, `PURCHASE_COMPLETE`, `PURCHASE_CANCELED`, `PURCHASE_CHARGEBACK`, `PURCHASE_EXPIRED` y `PURCHASE_REFUNDED`.

### Regla de reporte

- **NO decir:** “KineCheck tiene 7 ventas”.
- **SÍ se puede decir:** “KineCheck ha ejercitado técnicamente el circuito de eventos Hotmart y revocación”.
- **Ventas netas verificadas para fondos:** PENDIENTES hasta contrastar Hotmart Admin, comprobantes y/o antecedentes tributarios.

Esta distinción evita inflar tracción y protege la credibilidad de la postulación.

---

## 5. Oferta y precios públicos actuales — OBSERVADO

Precios vigentes en las superficies públicas de KineCheck al corte:

| Producto | Precio público CLP | Modalidad visible |
|---|---:|---|
| KineCheck Estudiante | $14.990 | Pago único; acceso 12 meses |
| KineCheck Clínico | $39.990 | Pago único; acceso 12 meses |
| Comunicación Clínica | $19.900 | Pago único; acceso 12 meses |
| Evidencia Aplicada | $29.990 | Pago único; acceso 12 meses |
| Traumatología y Ortopedia Clínica | $35.900 | Pago único; acceso 12 meses |
| Más allá del Dolor | $39.990 | Pago único; acceso 12 meses |
| Dolor Lumbar Persistente | $39.990 | Pago único; acceso 12 meses |
| Pack KineCheck Estudiante | $49.900 | Pago único; acceso 12 meses |

Fuentes internas: `estudiantes/index.html` y `profesionales/index.html` en `main`.

Los precios pueden cambiar; una postulación debe congelar la fecha de evidencia y volver a verificarlos antes del envío.

---

## 6. Mercado profesional Chile — OBSERVADO externo

Dos fuentes permiten trabajar con una banda defendible:

1. **World Physiotherapy — Chile:** 44.797 fisioterapeutas/kinesiólogos practicantes y 80 programas de formación de nivel de entrada.
2. **Superintendencia de Salud — RNPI:** el registro oficial chileno contiene a profesionales habilitados; un boletín al 31-mar-2025 reportó 47.271 títulos de Kinesiología inscritos. Para una postulación se debe usar el corte más reciente disponible y aclarar que "títulos inscritos" y "profesionales practicantes" no son exactamente la misma métrica.

### SAM profesional de trabajo

Para evitar sobreestimar, este marco usa **44.797 profesionales practicantes en Chile** como universo profesional inicial conservador.

Fuente: https://www.world.physio/membership/chile

Fuente regulatoria complementaria: https://rnpi.superdesalud.gob.cl/

---

## 7. Mercado estudiante Chile — OBSERVADO + pendiente de consolidación oficial

Se dispone de dos señales útiles:

- World Physiotherapy reporta **80 programas** de formación de entrada en fisioterapia/kinesiología en Chile.
- El informe SIES 2025 de matrícula reporta **5.625 matrículas de primer año en Kinesiología**. Una copia secundaria del informe oficial es recuperable públicamente; para una postulación final conviene adjuntar la versión oficial SIES/Mineduc o extracción de base oficial.

Una fuente secundaria que declara basarse en SIES reporta 23.938 matrículas totales de Kinesiología en 2025 y 25.226 en 2026. **No usar estas cifras como fuente primaria en una postulación hasta recuperar el archivo oficial correspondiente.**

### Regla

El segmento estudiante se considera comercialmente relevante, pero su TAM/SAM definitivo queda sujeto a extracción oficial SIES por carrera e institución.

---

## 8. Mercado de expansión hispanohablante — OBSERVADO externo

World Physiotherapy reporta los siguientes universos de profesionales practicantes:

| País | Profesionales practicantes |
|---|---:|
| Chile | 44.797 |
| Argentina | 42.800 estimados |
| Colombia | 37.709 estimados |
| México | 35.528 |
| Perú | 8.500 estimados |
| España | 68.838 |
| **Total de referencia** | **238.172** |

Este total es un **pool profesional comparable de expansión**, no un TAM de ingresos automático. No todos los profesionales tienen foco musculoesquelético ni intención de compra.

Fuentes World Physiotherapy:
- https://www.world.physio/membership/chile
- https://www.world.physio/membership/argentina
- https://www.world.physio/membership/colombia
- https://www.world.physio/membership/mexico
- https://www.world.physio/membership/peru
- https://www.world.physio/membership/spain

---

## 9. Impacto — línea base honesta

### Lo que sí se puede afirmar

- existe producto funcional;
- existe cohorte beta histórica;
- existe instrumentación de uso;
- existen flujos autenticados y de acceso validados técnicamente;
- existe catálogo educativo orientado a estudiantes y profesionales.

### Lo que todavía NO se puede afirmar

- mejora demostrada del razonamiento clínico;
- aumento demostrado de competencias;
- reducción de errores clínicos;
- impacto asistencial;
- satisfacción promedio cuantificada;
- NPS;
- tasa de finalización consolidada;
- eficacia comparada frente a otra intervención.

### Protocolo propuesto para un piloto financiado

Definir antes del piloto:

1. tamaño de cohorte y criterios de inclusión;
2. actividad educativa trazable;
3. indicador de activación;
4. indicador de uso;
5. indicador de finalización;
6. instrumento pre/post para desempeño o autoeficacia según objetivo;
7. satisfacción y recomendación con consentimiento;
8. incidencias técnicas;
9. tasa de retención a 30/60/90 días si el fondo lo exige.

Las metas se fijan por convocatoria y deben marcarse explícitamente como **targets de proyecto**, no resultados previos.

---

## 10. Evidencia que todavía requiere documentos privados

No puede completarse de forma fiable desde el repositorio ni desde fuentes públicas:

- persona jurídica/postulante definitivo;
- RUT del postulante;
- fecha de inicio de actividades primera categoría;
- giros SII;
- domicilio tributario;
- ventas netas tributarias últimos 12 meses;
- ventas netas atribuibles a KineCheck;
- número de clientes pagadores netos;
- estructura societaria;
- deudas tributarias/previsionales;
- costos reales pagados por dominio, servicios, contabilidad, diseño, publicidad u otros;
- contratos, convenios o cartas de alianza firmadas.

Estos datos deben mantenerse en un data room privado, no en el repositorio público.

---

## 11. Fuentes públicas de referencia

- World Physiotherapy — Chile y perfiles país: https://www.world.physio/membership/chile
- Superintendencia de Salud — RNPI: https://rnpi.superdesalud.gob.cl/
- UOH Dirección de Transferencia e Innovación: https://www.uoh.cl/innovacion/
- UOH Proyectos de I+D Aplicada y TT: https://www.uoh.cl/innovacion/proyectos-de-id-aplicada-y-tt/
- Colegio de Kinesiólogos de Chile — Perfeccionamiento: https://www.ckch.cl/perfeccionamiento.php

---

## 12. Frase de tracción permitida hoy

> KineCheck se encuentra en una etapa pre-escala con producto operativo, una cohorte beta histórica de 14 usuarios identificados por su fuente de acceso y telemetría no-QA que registra 370 sesiones entre agosto y septiembre de 2026. El circuito técnico de Hotmart y revocación ha sido probado, pero la facturación comercial neta aún debe acreditarse mediante evidencia administrativa o tributaria antes de utilizarla como tracción financiera en una postulación.
