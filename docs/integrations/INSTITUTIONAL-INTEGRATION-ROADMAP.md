# KineCheck — Roadmap de Integración Institucional

**Estado:** roadmap aprobado para exploración; no implementado en producción  
**Fecha:** 3 de septiembre de 2026  
**Documento rector:** `docs/PRD-KINECHECK.md`

## 1. Objetivo

Definir cómo KineCheck puede evolucionar desde su operación B2C actual hacia una capa institucional B2B/B2B2C interoperable con universidades, centros formadores y organizaciones, sin comprometer privacidad, seguridad ni la arquitectura actual de licencias.

Este documento NO afirma que KineCheck ya tenga integración institucional, LTI, SAML, OIDC ni conexión con el LMS de ninguna universidad.

## 2. Punto de partida real

KineCheck ya dispone de capacidades técnicas reutilizables:

- backend sobre Supabase y Edge Functions;
- autenticación y resolución de licencias;
- webhooks comerciales;
- Academy como entrada autenticada canónica;
- SSO/handoff controlado para KineCheck Estudiante;
- métricas técnicas minimizadas;
- contenido premium servido mediante mecanismos protegidos.

Estas capacidades son la base para una futura capa institucional, pero no equivalen todavía a una API pública para terceros.

## 3. Modelo objetivo

```text
Institución / LMS / Sistema de identidad
              │
              ▼
   KineCheck Institutional Layer
      ├── Identity / SSO
      ├── Cohort provisioning
      ├── Entitlements
      ├── Progress / learning events
      ├── Aggregated analytics
      └── Audit / support
              │
              ▼
        Academy + productos
```

## 4. Capacidades institucionales candidatas

### 4.1 Provisioning de cohortes

Permitir que una institución autorizada gestione cohortes sin depender de checkout individual.

Capacidades potenciales:
- alta de cohorte;
- asignación de producto/licencia;
- activación y expiración;
- baja/revocación;
- importación controlada por lote;
- trazabilidad de cambios.

### 4.2 Entitlements

Resolver de forma segura qué productos puede usar una persona.

Reglas:
- la fuente de autorización debe permanecer en servidor;
- nunca confiar en parámetros de URL como fuente de permiso;
- mantener producto, vigencia y estado de licencia separados de la interfaz.

### 4.3 SSO institucional

Opciones a evaluar según la infraestructura del socio:
- OIDC;
- SAML;
- LTI 1.3 / LTI Advantage para integración con LMS;
- handoff propietario solo cuando un estándar no sea viable.

No se seleccionará un mecanismo antes de conocer el entorno real de la institución.

### 4.4 Progress / learning events

Potencialmente exponer solo información educativa necesaria:
- producto/curso;
- módulos o hitos completados;
- porcentaje de progreso si el producto lo soporta;
- timestamps de actividad;
- resultado de una evaluación educativa cuando exista base y autorización para compartirlo.

Nunca incluir datos clínicos de pacientes reales.

### 4.5 Analytics institucional

Por defecto, priorizar información agregada:
- usuarios activados;
- usuarios activos;
- sesiones;
- aperturas de cursos;
- avance agregado;
- finalización;
- incidencias técnicas;
- métricas de adopción.

La institución no debe recibir más datos personales que los estrictamente necesarios para la finalidad acordada.

## 5. Principios de privacidad y seguridad

1. Minimización de datos.
2. Separación entre identidad, licencia, progreso y contenido premium.
3. Autorización server-side.
4. Credenciales institucionales almacenadas como secretos, nunca en frontend ni repositorio público.
5. Scopes/permisos por institución.
6. Registro auditable de altas, revocaciones y accesos administrativos.
7. Rate limiting y controles antiabuso antes de exponer endpoints institucionales.
8. Versionado explícito de contrato de API.
9. Revocación de credenciales por institución.
10. No reutilizar datos educativos para fines distintos sin base y aviso correspondiente.

## 6. Fases de implementación

### Fase 0 — Descubrimiento institucional

No requiere desarrollo.

Entregables:
- LMS utilizado;
- sistema de identidad;
- responsables TI;
- responsables académicos;
- tipo de piloto;
- necesidad o no de SSO;
- información que el docente necesita ver;
- restricciones de protección de datos;
- reglas de retención y soporte.

### Fase 1 — Piloto sin integración profunda

Objetivo: validar adopción antes de construir infraestructura específica.

Capacidades:
- cohorte gestionada manualmente o por importación segura;
- accesos institucionales temporales;
- Academy actual;
- métricas agregadas;
- informe de piloto.

### Fase 2 — Administración institucional

- panel de cohortes;
- roles institucionales;
- provisioning/revocación;
- reportes agregados;
- auditoría.

### Fase 3 — Integración de identidad/LMS

Solo si existe requerimiento validado:
- SSO institucional;
- LTI 1.3 / LTI Advantage o estándar equivalente;
- deep linking a actividades/productos cuando aplique;
- retorno de resultados educativos solo cuando exista acuerdo y soporte técnico adecuado.

### Fase 4 — API institucional versionada

- contrato estable;
- documentación;
- autenticación machine-to-machine;
- scopes;
- sandbox;
- monitoreo;
- SLA solo si se define formalmente.

## 7. Arquitectura comercial objetivo

### B2C actual

`Persona → Hotmart → licencia → Academy → producto`

### B2B institucional básico

`Institución → acuerdo/licencias → cohorte → Academy → producto`

### B2B integrado

`LMS/IdP institucional ↔ capa institucional KineCheck ↔ Academy/productos`

Hotmart no tiene que ser necesariamente el mecanismo de provisioning institucional; esa decisión dependerá del modelo contractual futuro.

## 8. Qué NO construir todavía

Hasta completar descubrimiento con una institución real, no se debe:

- desarrollar integración específica con un LMS supuesto;
- implementar SAML/OIDC/LTI sin requerimiento;
- exponer endpoints de progreso a terceros;
- crear credenciales institucionales productivas;
- publicar datos de estudiantes;
- prometer interoperabilidad ya existente;
- comprometer retornos de notas al LMS.

## 9. Uso en financiamiento

La capa institucional puede formularse como capacidad financiable si la convocatoria permite desarrollo tecnológico, adopción o transferencia.

Componentes financiables potenciales:
- gestión de cohortes;
- interoperabilidad;
- SSO/LTI;
- panel institucional;
- analítica educativa agregada;
- seguridad y auditoría;
- pilotos con organizaciones;
- documentación y escalamiento B2B/B2B2C.

Debe presentarse como roadmap o desarrollo propuesto mientras no exista implementación comprobada.

## 10. Criterios de éxito

Una fase institucional solo avanza si cumple:

- problema institucional confirmado;
- responsable académico y técnico identificados;
- base de datos mínima definida;
- requerimientos de privacidad acordados;
- integración técnicamente viable;
- piloto con indicadores predefinidos;
- costo de integración justificable;
- evidencia de uso/adopción suficiente para justificar la fase siguiente.

## 11. Definition of Ready para desarrollo

Antes de escribir código de integración institucional deben estar respondidas:

1. ¿Qué institución participa?
2. ¿Qué LMS usa?
3. ¿Qué sistema de identidad usa?
4. ¿Qué usuarios participan?
5. ¿Qué productos KineCheck usarán?
6. ¿Quién administra la cohorte?
7. ¿Qué datos debe recibir la institución?
8. ¿Qué datos NO debe recibir?
9. ¿Se necesita SSO?
10. ¿Se necesita retorno de progreso/notas?
11. ¿Cuánto dura el piloto?
12. ¿Qué éxito justifica escalar?

Mientras estas respuestas no existan, el estado correcto es **roadmap**, no desarrollo productivo.
