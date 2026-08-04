# Vigencias comerciales KineCheck

Fecha de preparación: 4 de agosto de 2026.

Esta política se aplica únicamente a compras aprobadas después de ejecutar la migración `20260804_access_terms.sql`. Las licencias activas anteriores conservan sus condiciones originales.

## Textos obligatorios en Hotmart

| Producto | ID Hotmart | Vigencia | Texto para la descripción y checkout |
|---|---:|---:|---|
| KineCheck Clínico | 8150019 | 12 meses | Incluye acceso personal a KineCheck Clínico durante 12 meses desde la aprobación de la compra. |
| KineCheck Estudiante | 8154796 | 12 meses | Incluye acceso personal a KineCheck Estudiante durante 12 meses desde la aprobación de la compra. |
| KineCheck Recupera | 8157431 | 3 meses | Incluye acceso personal a KineCheck Recupera durante 3 meses desde la aprobación de la compra. |
| Comunicación Clínica | 8192814 | 12 meses | Incluye acceso personal al curso Comunicación Clínica durante 12 meses desde la aprobación de la compra. |
| Más allá del dolor | 8194777 | 12 meses | Incluye acceso personal al curso Más allá del dolor durante 12 meses desde la aprobación de la compra. |
| Pack KineCheck Estudiante | 8195982 | 12 meses | Incluye acceso personal a KineCheck Estudiante y Más allá del dolor durante 12 meses desde la aprobación de la compra. |
| Traumatología y Ortopedia Clínica | 8205453 | 12 meses | Incluye acceso personal al curso Traumatología y Ortopedia Clínica durante 12 meses desde la aprobación de la compra. |
| KineCheck Evidencia Aplicada | 8208817 | 12 meses | Incluye acceso personal al curso KineCheck Evidencia Aplicada durante 12 meses desde la aprobación de la compra. |

## Condiciones complementarias

- El acceso es personal y se asocia al correo utilizado en Hotmart.
- El plazo comienza cuando Hotmart aprueba la compra.
- Un reembolso, contracargo, cancelación o reversa desactiva el acceso correspondiente.
- Una renovación válida puede extender el acceso desde el vencimiento vigente.
- Las compras anteriores a la entrada en vigor no reciben un vencimiento retroactivo.
- `warranty_date` no controla la vigencia comercial.

## Orden de activación

1. Actualizar la descripción y el checkout de todos los productos en Hotmart.
2. Ejecutar `supabase/migrations/20260804_access_terms.sql` en producción.
3. Ejecutar `supabase/migrations/20260804_access_terms_cron.sql`.
4. Desplegar `supabase/functions/course-key/index.ts`.
5. Probar una licencia anterior, una compra nueva de Recupera y una compra nueva de 12 meses.
6. Comprobar reembolso y renovación con transacciones de prueba.
