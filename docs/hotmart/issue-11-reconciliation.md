# Reconciliación técnica Hotmart — issue #11

Última revisión técnica: 30 de agosto de 2026

Este documento separa evidencia técnica, estado público y evidencia pendiente del panel Hotmart. No contiene HOTTOK, tokens, compradores, correos ni transacciones reales. El issue #11 no debe cerrarse hasta completar la columna de evidencia administrativa con capturas o registros verificables del panel.

## Evidencia maestra

| Product ID | Producto | Grants técnicos | Vigencia técnica | Superficie pública | Evidencia panel Hotmart |
|---:|---|---|---:|---|---|
| 8150019 | KineCheck Clínico | `kinecheck-clinico`, `kinecheck-clinico-curso` | 12 meses | Activo | Pendiente |
| 8154796 | KineCheck Estudiante | `kinecheck-estudiante` | 12 meses | Activo · $14.990 CLP | Pendiente |
| 8157431 | KineCheck Recupera | `kinecheck-recupera` | 3 meses (histórico) | Próximamente · sin precio ni checkout | Pendiente; no reactivar |
| 8192814 | Comunicación Clínica | `comunicacion-clinica` | 12 meses | Activo | Pendiente |
| 8194777 | Más allá del dolor | `mas-alla-del-dolor` | 12 meses | Activo | Pendiente |
| 8195982 | Pack KineCheck Estudiante | `kinecheck-estudiante`, `mas-alla-del-dolor` | 12 meses | Activo · $49.900 CLP | Pendiente |
| 8205453 | Traumatología y Ortopedia Clínica | `traumatologia-ortopedia-clinica` | 12 meses | Activo | Pendiente |
| 8208817 | KineCheck Evidencia Aplicada | `evidencia-aplicada` | 12 meses | Activo | Pendiente |
| 8289351 | KineCheck Escalas Clínicas | `kinecheck-escalas` | Pendiente de evidencia | Checkout técnico en Academy | Pendiente |
| 8289677 | KineCheck Pruebas Especiales | `kinecheck-pruebas-especiales` | Pendiente de evidencia | Checkout técnico en Academy | Pendiente |
| 8330940 | Dolor Lumbar Persistente | `dolor-lumbar-persistente` | 12 meses | Activo | Pendiente |
| 8340185 | Dolor Musculoesquelético | `dolor-musculoesqueletico` | 12 meses | Activo en Academy | Pendiente |

No existe un Pack Profesional activo ni un Product ID técnico asociado en el inventario observado.

El contrato comercial versionado mantiene Estudiante y Pack activos. Cualquier cambio que los pause o altere sus precios/checkouts debe fallar en CI.

## Evidencia técnica observada

- `hotmart_product_grants`: 14 filas, 12 Product IDs.
- `kinecheck_reconciliation_issues`: 0 incidencias abiertas registradas al momento de la consulta.
- El webhook valida HOTTOK sin exponerlo, normaliza eventos y delega la escritura en `process_hotmart_event`.
- `process_hotmart_event` registra el ledger, protege el orden temporal, detecta eventos duplicados y procesa todos los grants del producto.
- Aprobación/complete activan; refund, chargeback, cancelación, expiración y delayed revocan.
- La cancelación de suscripción se registra sin revocar anticipadamente el período ya pagado.
- La expiración automática desactiva accesos comerciales con fecha vencida y excluye accesos de propietario.
- La prueba técnica no sustituye una compra, reembolso o contracargo real controlado en Hotmart.

## Dos vigencias sin resolver

`8289351` y `8289677` conservan `access_term_months = NULL`. No se asignará un plazo hasta obtener evidencia directa de la duración comercial configurada en Hotmart. La excepción está permitida temporalmente por el test de regresión y debe desaparecer al incorporar esa evidencia.

## Evidencia administrativa requerida por producto

1. Estado publicado/no publicado y nombre exacto.
2. Product ID y checkout correspondiente.
3. Precio/oferta vigente visible en Chile.
4. Webhook de KineCheck asignado a los eventos necesarios.
5. Página posterior al pago y material de bienvenida.
6. Correo de soporte.
7. Evento de prueba idempotente y licencia visible en Academy.
8. Reembolso/contracargo controlado con revocación comprobada.

## Criterio de cierre

El cierre técnico queda preparado cuando pruebas y fuente coinciden con esta matriz. El cierre administrativo requiere completar las 12 filas con evidencia del panel Hotmart y resolver las dos vigencias pendientes. Hasta entonces, #11 permanece abierto.
