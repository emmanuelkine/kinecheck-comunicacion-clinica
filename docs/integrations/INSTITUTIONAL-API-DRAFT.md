# KineCheck Institutional API — contrato conceptual

**Estado:** borrador de diseño; NO desplegado  
**Fecha:** 3 de septiembre de 2026  
**Relacionado:** `INSTITUTIONAL-INTEGRATION-ROADMAP.md`

> Este documento describe capacidades y recursos posibles. No define endpoints productivos ni autoriza integraciones con terceros.

## 1. Objetivo

Tener un contrato conceptual reutilizable para conversaciones técnicas con universidades u organizaciones antes de implementar una API institucional.

## 2. Recursos conceptuales

### Institution
Representa una organización autorizada.

Campos conceptuales:
- `institution_id`
- `display_name`
- `status`
- `allowed_products`
- `contract_start`
- `contract_end`

### Cohort
Grupo de usuarios asociado a una actividad o periodo.

Campos conceptuales:
- `cohort_id`
- `institution_id`
- `name`
- `starts_at`
- `ends_at`
- `status`

### Membership
Vincula una persona con una cohorte.

Campos mínimos:
- identificador institucional pseudonimizado o correo institucional, según acuerdo;
- estado;
- fecha de alta/baja.

### Entitlement
Permiso para utilizar un producto.

Campos conceptuales:
- `product_slug`
- `active`
- `starts_at`
- `expires_at`
- `source=institutional`

### LearningProgress
Solo cuando el producto lo soporte y exista autorización para compartirlo.

Campos posibles:
- `product_slug`
- `progress_percent`
- `completed_units`
- `last_activity_at`
- `completion_status`

## 3. Operaciones potenciales

### Cohortes
- crear cohorte;
- consultar cohorte;
- cerrar cohorte;
- listar participantes autorizados.

### Participantes
- alta;
- activación;
- revocación;
- consulta de estado.

### Licencias
- asignar producto;
- consultar entitlement;
- expirar/revocar entitlement.

### Analítica
- resumen agregado por cohorte;
- adopción;
- progreso agregado;
- finalización agregada;
- incidencias agregadas.

## 4. Operaciones que NO deben formar parte de una primera versión

- acceso directo a tablas de Supabase;
- lectura de datos clínicos;
- endpoints que permitan consultar usuarios arbitrarios;
- exportaciones masivas sin scope institucional;
- retorno de notas o calificaciones antes de acordar semántica, base jurídica y seguridad;
- modificación de contenido premium;
- administración global de KineCheck por parte de terceros.

## 5. Autenticación futura

La API institucional, si se implementa, debe usar credenciales machine-to-machine independientes por institución y con mínimo privilegio.

Requisitos mínimos:
- secretos fuera del frontend;
- rotación/revocación;
- scopes;
- expiración cuando corresponda;
- rate limit;
- logging/auditoría;
- bloqueo por institución.

## 6. Scopes conceptuales

Ejemplos, sujetos a diseño definitivo:
- `cohorts:read`
- `cohorts:write`
- `members:read`
- `members:write`
- `entitlements:read`
- `entitlements:write`
- `analytics:read`

No crear scopes de datos que KineCheck no necesita tratar.

## 7. Respuestas y privacidad

La API debería retornar el mínimo de información requerido. Siempre que sea posible:
- usar identificadores internos o pseudónimos;
- no devolver nombre completo;
- no devolver información de pacientes;
- no incluir query strings ni metadatos innecesarios en analítica;
- separar reportes agregados de consultas individualizadas.

## 8. Versionado

Si se implementa:
- contrato versionado (`v1`, `v2`, etc.);
- cambios incompatibles requieren nueva versión;
- documentación de deprecación;
- pruebas de contrato automatizadas.

## 9. Criterios para convertir este borrador en OpenAPI

No generar especificación OpenAPI productiva hasta conocer:
- institución piloto;
- sistema institucional;
- requerimientos de identidad;
- campos mínimos;
- operaciones requeridas;
- reglas de privacidad;
- modelo contractual;
- responsables de soporte.

Después de ese descubrimiento se puede generar un `openapi.yaml` real, validarlo contra seguridad y recién entonces implementar una API.
