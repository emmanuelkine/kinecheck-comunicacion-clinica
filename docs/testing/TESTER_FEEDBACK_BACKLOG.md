# Sprint 1 — Tester Feedback Backlog

Estado inicial del sprint posterior al hardening de privacidad verificado en producción.

## Objetivo

Convertir feedback real de testers en incidencias reproducibles, priorizadas y verificables, sin registrar datos clínicos ni información personal innecesaria.

## Estados

`REPORTED` → `REPRODUCED` / `NOT_REPRODUCED` → `FIXED` → `TESTED` → `VERIFIED`

## Prioridad

- **P0**: impide acceso o uso principal.
- **P1**: fricción grave de onboarding/activación o comprensión del producto.
- **P2**: problema de interfaz, legibilidad o claridad que no bloquea el uso principal.

## Backlog inicial

| ID | Prioridad | Estado | Área | Hallazgo | Criterio de cierre |
|---|---|---|---|---|---|
| TF-001 | P0 | REPORTED | Acceso / licencias | Desde Biblioteca, Estudiante o Recupera puede mostrar “acceso temporal venció” aun cuando el tester espera acceso vigente. | Reproducir con cuenta sintética o de prueba; identificar causa; acceso autorizado abre el producto correcto sin mensaje falso de expiración. |
| TF-002 | P0 | REPORTED | SSO / botones | Botones o relay SSO pueden fallar al abrir un producto autorizado. | Cada producto autorizado abre por el flujo previsto; Estudiante conserva POST SSO; error de licencia se comunica de forma inequívoca. |
| TF-003 | P2 | REPORTED | Responsive / soporte | Elementos de interfaz y soporte pueden superponerse en ciertos tamaños de pantalla. | Sin solapamiento ni overflow en móvil, tablet y escritorio. |
| TF-004 | P2 | REPORTED | Accesibilidad visual | Contraste insuficiente en algunos textos o controles. | Contraste legible en estados normales, hover/focus y pantallas pequeñas; validación visual en los tres tamaños. |
| TF-005 | P2 | REPORTED | Layout | Títulos cortados o desalineados en algunas vistas. | Títulos completos y alineados sin truncamiento accidental ni desbordamiento horizontal. |
| TF-006 | P2 | REPORTED | Roles / UX | Información propia del rol propietario puede aparecer en una experiencia de tester. | Testers ven únicamente elementos compatibles con su rol/licencia; datos o controles de propietario no aparecen. |
| TF-007 | P1 | REPORTED | Onboarding | Durante beta puede generarse confusión sobre si es necesario comprar un curso para usar KineCheck. | El onboarding beta distingue explícitamente prueba/asignación de compra comercial y explica qué acceso posee el tester. |
| TF-008 | P1 | REPORTED | Activación / medición | Hay testers invitados con poca o ninguna actividad observada; la causa no está demostrada. | Medir el embudo mínimo antes de atribuir causa; documentar dónde se detienen las sesiones sin inferir motivación. |

## Embudo mínimo de validación

Registrar únicamente eventos técnicos necesarios, sin nombres, RUT, datos clínicos, textos libres de casos ni identificadores de pacientes:

`tester_invited → account_created → license_activated → academy_opened → product_opened → first_activity → return_session`

Cada evento debe contener, como máximo:

- identificador técnico seudónimo de tester;
- producto asignado;
- tipo de dispositivo o viewport;
- timestamp;
- resultado técnico (`success` / código de error normalizado).

No incorporar analítica externa ni nuevos servicios de tracking sin revisión y autorización separada.

## Orden de ejecución

1. TF-001 y TF-002: acceso y SSO.
2. TF-007 y TF-008: onboarding y embudo de activación.
3. TF-006: separación de roles.
4. TF-003, TF-004 y TF-005: responsive, contraste y layout.

## Reglas del sprint

- No usar datos clínicos reales para reproducir incidencias.
- No modificar Supabase, Hotmart, DNS, precios, Product IDs ni producción como parte de una incidencia sin autorización separada.
- No declarar una incidencia resuelta hasta completar `FIXED → TESTED → VERIFIED`.
- No interpretar inactividad como desinterés: primero medir el punto de abandono.
- Cada corrección debe incluir prueba de regresión cuando sea técnicamente posible.
