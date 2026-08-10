# Arquitectura de runtime público

## Portada

La portada pública se compone desde `index.html` y carga únicamente:

- `kinecheck/site-v5.css`
- `kinecheck/site-v5.js`

Los archivos `home.js`, `home-core-20260806.js`, `home-commercial-proof-v1.js` y
`home-experience-unification-v1.js` pertenecen a iteraciones anteriores. No forman
parte del runtime vigente y no deben usarse para corregir la portada actual.

## Mi KineCheck / Academy

`academy/index.html` es la única autoridad para declarar y ordenar los scripts de
Academy. Todos se cargan con `defer` y ningún módulo funcional debe crear o inyectar
otro `<script>`.

El selector de etapa de `academy-learning-path-v4.js` es legado y no se carga. La
experiencia actual infiere el perfil desde los productos activos sin bloquear la
página con un modal.

## Invariantes

1. La portada no carga ningún `home*.js` legado.
2. Academy no carga `academy-learning-path-v4.js`,
   `academy-integration-guard-v4.js` ni `academy-launch-router-v4.js`.
3. `academy-bootstrap-v28.js`, `academy-reviews.js` y
   `academy-brand-identity.js` no inyectan scripts dinámicos.
4. La ausencia de la capa visual `mi-kinecheck-simplify-v2.js` no puede bloquear
   el desplazamiento, los controles ni la navegación base.

Estos contratos están cubiertos por pruebas estáticas y de navegador.
