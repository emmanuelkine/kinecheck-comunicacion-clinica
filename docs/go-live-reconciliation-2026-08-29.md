# Reconciliación go-live — 2026-08-29

## Estado comercial público

Los cursos independientes habilitados continúan disponibles. KineCheck Estudiante y Pack KineCheck Estudiante mantienen nuevas ventas pausadas hasta cerrar las validaciones de SSO/privacidad. KineCheck Recupera continúa en estado Próximamente y sin checkout público.

## Inventario técnico server-side observado

`public.hotmart_product_grants` contiene actualmente los siguientes productos/grants técnicos:

- 8150019 — `kinecheck-clinico` y `kinecheck-clinico-curso`
- 8154796 — `kinecheck-estudiante`
- 8157431 — `kinecheck-recupera`
- 8192814 — `comunicacion-clinica`
- 8194777 — `mas-alla-del-dolor`
- 8195982 — Pack Estudiante: `kinecheck-estudiante` + `mas-alla-del-dolor`
- 8205453 — `traumatologia-ortopedia-clinica`
- 8208817 — `evidencia-aplicada`
- 8289351 — `kinecheck-escalas`
- 8289677 — `kinecheck-pruebas-especiales`
- 8330940 — `dolor-lumbar-persistente`
- 8340185 — `dolor-musculoesqueletico`

Este inventario técnico es más amplio que la lista histórica de ocho IDs del issue #11. No debe interpretarse por sí solo como confirmación de que todos esos productos estén actualmente publicados o configurados para venta en el panel de Hotmart.

## Evidencia técnica validada

- El webhook principal `hotmart-webhook` está desplegado y autentica solicitudes mediante HOTTOK almacenado como secreto; no se publica su valor.
- Los eventos de compra/revocación se procesan server-side mediante `process_hotmart_event` y grants por producto.
- La tabla operativa `kinecheck_reconciliation_issues` no contiene incidencias registradas al momento de esta revisión.
- Las pruebas comerciales públicas verifican precios/checkouts de los productos habilitados y que Recupera, Estudiante y Pack permanezcan pausados cuando corresponde.

## Pendiente exclusivamente de administración Hotmart

Antes de cerrar #11 se requiere evidencia directa del panel Hotmart para confirmar, producto por producto, webhook configurado y páginas pospago. La ausencia de esa evidencia no bloquea las ventas de los cursos independientes que ya pasaron las pruebas públicas, pero impide declarar la reconciliación administrativa completa.

No registrar en este documento HOTTOK, tokens, correos de compradores ni códigos de transacción reales.
