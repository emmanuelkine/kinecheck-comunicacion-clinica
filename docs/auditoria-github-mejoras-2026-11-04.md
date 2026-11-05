# Auditoría de mejoras GitHub — 2026-11-04

## Alcance
Revisión inicial de la arquitectura del repositorio conectado a Cloudflare Pages para kinecheck.cl. Este documento es de diagnóstico; no modifica código de aplicación ni despliega cambios.

## Confirmado en package.json
- Pruebas Node: `node --test tests/*.test.mjs`.
- Pruebas específicas: Campus, Exercise, feedback, Hotmart y recuperación ante desastres.
- Playwright 1.62.1 y @axe-core/playwright 4.14.0 ya declarados.
- PGlite 0.5.4 para pruebas locales.

## Hallazgos iniciales
1. Evitar duplicar axe-core y Playwright.
2. Revisar cobertura real y resultados de CI antes de incorporar Sentry u otras dependencias.
3. Verificar controles de acceso de recursos pagados en servidor, nunca solo JavaScript.
4. Revisar separación institucional, RLS, credenciales y autorización de endpoints en staging.
5. Comprobar flujos de Hotmart, emisión/revocación de licencias y certificados.
6. Considerar tutor clínico de IA solo como prototipo aislado con casos ficticios, fuentes verificables y sin datos personales de pacientes.

## Plan propuesto
- P0: inventario de rutas, funciones, secretos y controles de acceso; pruebas existentes.
- P1: evaluación de errores observables, métricas, accesibilidad y rendimiento.
- P2: mejoras educativas de bajo riesgo y piloto con docentes.
- P3: prototipo de IA solo tras revisión de privacidad, costos, licencia y seguridad.

## Criterios de aceptación antes de fusionar
- Tests existentes pasan.
- No hay cambios involuntarios de permisos, licencias o pagos.
- Revisión de seguridad de dependencias y código.
- Prueba de staging, móvil y escritorio.
- Aprobación explícita antes de fusionar a main.

## Estado
Diagnóstico preliminar. No se ejecutaron pruebas en CI ni se desplegó código en producción como parte de esta revisión.
