# Pruebas de seguridad para release KineCheck

## Estado verificado (2026-10-08)
- beta-apply: función desplegada v5. No modifica una postulación existente sin identidad verificada; inserción nueva con conflicto 23505 seguro. Máximo real 20 KB.
- metric-event: función desplegada v9. Metadatos solo mediante claves autorizadas y valores acotados; máximo real 8 KB.
- Webhooks Hotmart: principal, Evidencia Aplicada y Dolor tienen RPC transaccional en versión desplegada.
- Los accesos de Academy y apps.kinecheck.cl no se alteraron.

## Pruebas obligatorias antes de fusionar
1. Beta: nuevo formulario sintético válido -> 200; enviar segunda vez el mismo correo con valores diferentes -> sin cambios en DB.
2. Beta: solicitudes simultáneas sobre el mismo email sintético -> exactamente un registro.
3. Beta: body sin Content-Length >20 KB -> 413, 0 operaciones DB; JSON inválido -> 400.
4. Métricas: body >8 KB -> 413; metadata email/token/url -> no persistir; metadata source válida -> persistir si se cumplen controles.
5. Hotmart: aprobación/reembolso concurrentes en DB aislada; un evento anterior no debe restaurar una licencia revocada; eventos sin timestamp/ID requieren política contrastada con proveedor.
6. SSO: token falso, expirado y producto distinto -> no acceso; token correcto sin licencia -> no acceso.
7. Confirmar que no hay regresión de Academy y recursos gratuitos.

## Bloqueos materiales
No existe código del receptor privado de apps.kinecheck.cl en los repositorios accesibles. El staging Supabase preexistente está inactivo. No afirmar que el sistema esté certificado ni deshabilitar compras o licencias hasta completar pruebas reales.
