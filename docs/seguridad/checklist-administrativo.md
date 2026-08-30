# Checklist de seguridad administrativa KineCheck

Última actualización: 30 de agosto de 2026

## Controles técnicos ya implementados

- Sesión temporal en navegador y eliminación al cerrar.
- Cierre automático por inactividad.
- Limitación de intentos en navegador y servidor.
- Validación de licencias del lado del servidor.
- RLS activado en tablas privadas.
- Tablas administrativas sin acceso directo desde el navegador.
- Cabeceras HSTS, `nosniff`, protección de marcos y `no-store` en plataforma.
- Aceptación legal versionada.
- Conciliación automática de compras y licencias.
- Auditoría diaria del repositorio para detectar secretos expuestos y pérdida de controles.
- Respaldo cifrado y restauración temporal preparados.

## Controles que requieren entrar a las cuentas

### Supabase

- [ ] Activar protección contra contraseñas filtradas.
- [ ] Confirmar 2FA de la cuenta propietaria.
- [ ] Revisar usuarios con acceso a la organización y eliminar accesos innecesarios.
- [ ] Confirmar el plan y la disponibilidad de backups administrados o PITR.
- [ ] Revisar los métodos de recuperación de cuenta.
- [ ] Guardar códigos de recuperación fuera del dispositivo habitual.

### GitHub

- [ ] Confirmar 2FA.
- [ ] Revisar aplicaciones y sesiones autorizadas.
- [ ] Revisar colaboradores del repositorio.
- [ ] Configurar `SUPABASE_DB_URL` y `BACKUP_ENCRYPTION_PASSPHRASE` como Actions secrets.
- [ ] Guardar una copia externa segura de la frase de cifrado.
- [ ] Confirmar que los workflows de seguridad y recuperación finalicen correctamente.

### Cloudflare

- [ ] Confirmar 2FA.
- [ ] Revisar usuarios, tokens y sesiones.
- [ ] Limitar tokens al mínimo permiso necesario.
- [ ] Confirmar dominio, DNS y proyecto de Pages correctos.
- [ ] Guardar procedimiento para recuperar el dominio.

### Hotmart

- [ ] Confirmar 2FA.
- [ ] Revisar usuarios con acceso y dispositivos autorizados.
- [ ] Comprobar webhook y secreto de validación de cada producto.
- [ ] Confirmar que los datos del vendedor y soporte estén actualizados.
- [ ] Revisar métodos de recuperación de cuenta.

### Correo de soporte

- [ ] Confirmar 2FA.
- [ ] Revisar correo y teléfono de recuperación.
- [ ] Revocar sesiones antiguas.
- [ ] Revisar reglas de reenvío y filtros desconocidos.
- [ ] Guardar códigos de recuperación.

## Regla de privilegio mínimo

- No compartir contraseñas entre servicios.
- No reutilizar la frase de cifrado del backup.
- No guardar service-role keys en HTML, JavaScript público, capturas o documentos.
- No usar cuentas personales de terceros como administradores permanentes.
- Revocar inmediatamente accesos que ya no sean necesarios.

## Revisión periódica

- Semanal: revisar workflows, errores y restauraciones.
- Mensual: revisar usuarios, sesiones, tokens y aplicaciones conectadas.
- Trimestral: cambiar secretos críticos cuando exista riesgo o exposición; probar recuperación de cuentas.
- Inmediata: ante pérdida de dispositivo, correo comprometido, acceso inesperado o secreto expuesto.

## Resultado de auditoría del 30 de agosto de 2026

Supabase no reportó vulnerabilidades críticas de base de datos. El aviso de seguridad pendiente es la protección contra contraseñas filtradas desactivada. Los avisos informativos de RLS sin políticas corresponden a tablas privadas deliberadamente inaccesibles para usuarios `anon` y `authenticated`; no deben abrirse solo para eliminar el aviso.

La evidencia por tabla, incluida la excepción de grants nominales de `evidence_library`, está documentada en [Supabase Advisors — 30 de agosto de 2026](./supabase-advisors-2026-08-30.md).
