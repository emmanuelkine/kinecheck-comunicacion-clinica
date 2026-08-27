# MASTER_BACKLOG

Última actualización: 26-08-2026

## Sprint 0 — Privacidad post-login

Estado: **LOCAL_VERIFIED / PRODUCTION_BLOCKED**

### Verificado en el repositorio

- [x] KineCheck Clínico mantiene protecciones educativas en campos libres, catálogo y PDF.
- [x] Las advertencias de KineCheck Estudiante presentes en este repositorio prohíben identificadores de pacientes.
- [x] Recupera queda bloqueado en superficies públicas locales, Academy, Mi KineCheck, relay SSO y ruta histórica de consentimiento.
- [x] Los validadores y controles de CI obsoletos dejaron de exigir precio, checkout o acceso de Recupera.
- [x] Batería estática, QA comercial, Chromium, WebKit, validadores de acceso y validadores públicos aprobados localmente.

### Bloqueos P0 pendientes

- [ ] Corregir y desplegar `apps.kinecheck.cl`: retirar Recupera de la portada, deshabilitar `patient-access.html`, eliminar el redirect activo de `patient-checkout` y bloquear los flujos de Recupera en `sso.js` y `access.js`.
- [ ] Obtener el repositorio o acceso autorizado al código autenticado de KineCheck Estudiante en `apps.kinecheck.cl` y auditar campos, almacenamiento, logs, retención, eliminación y exportaciones PDF/CSV.
- [ ] Repetir la auditoría pública y autenticada después del despliegue externo y registrar evidencia de producción.

### Puerta de cierre

Sprint 0 solo puede pasar a `VERIFIED_PRODUCTION` cuando los bloqueos P0 anteriores estén resueltos y el CI de GitHub esté verde. No iniciar Sprint 1, hacer merge ni desplegar como parte de este cierre local.
