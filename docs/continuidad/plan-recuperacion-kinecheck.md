# Plan de recuperación KineCheck

Última actualización: 30 de agosto de 2026

## Objetivo

Recuperar la configuración y los datos operativos de KineCheck después de una pérdida, corrupción o despliegue defectuoso, sin modificar producción durante las pruebas.

## Alcance cubierto automáticamente

El workflow `KineCheck Disaster Recovery v2`:

1. Exporta el esquema `public` de Supabase mediante PostgreSQL 17.
2. Calcula una huella SHA-256 del respaldo.
3. Restaura el archivo en una base PostgreSQL temporal.
4. Comprueba tablas y funciones críticas.
5. Registra conteos restaurados y manifiesto técnico.
6. Cifra el respaldo con AES-256-CBC, PBKDF2 y 250.000 iteraciones.
7. Descifra una copia temporal, compara su SHA-256 con el dump original y verifica el catálogo con `pg_restore --list`.
8. Valida la estructura JSON del manifiesto y los conteos restaurados.
9. Elimina el dump y toda copia temporal sin cifrar antes de subir el artefacto.
10. Conserva el paquete cifrado en GitHub Actions durante 30 días.

Los eventos `push` y `pull_request` ejecutan únicamente el validador estático del contrato. El respaldo real se ejecuta solo por agenda o despacho manual, porque requiere secretos de producción.

## Secretos requeridos

En GitHub → Settings → Secrets and variables → Actions → New repository secret:

- `SUPABASE_DB_URL`: cadena PostgreSQL de conexión directa o de sesión, con SSL y permisos suficientes para `pg_dump` del esquema `public`.
- `BACKUP_ENCRYPTION_PASSPHRASE`: frase aleatoria extensa, exclusiva para respaldo y guardada también fuera de GitHub en un gestor seguro.

No incorporar estos valores al código, archivos, incidencias, capturas ni conversaciones.

## Evidencia mínima de una ejecución válida

La ejecución debe terminar en verde y el artefacto debe contener:

- `kinecheck-public.dump.enc`
- `kinecheck-public.dump.enc.sha256`
- `manifest.json`
- `restored-counts.json`

El manifiesto debe indicar `restore_validation: passed`.

Además, la ejecución debe demostrar que el archivo cifrado se descifra con la frase configurada, que conserva la huella del dump restaurado y que no se sube ningún archivo PostgreSQL sin cifrar.

## Restauración controlada

1. Descargar el artefacto desde GitHub Actions.
2. Verificar la huella del archivo cifrado.
3. Descifrar solo en un entorno temporal y controlado:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -in kinecheck-public.dump.enc \
  -out kinecheck-public.dump \
  -pass env:BACKUP_ENCRYPTION_PASSPHRASE
```

4. Crear una base PostgreSQL temporal vacía.
5. Restaurar con PostgreSQL 17:

```bash
pg_restore --no-owner --no-acl --exit-on-error \
  --dbname=<BASE_TEMPORAL> kinecheck-public.dump
```

6. Comparar tablas, funciones, conteos y configuración con el manifiesto.
7. Destruir el entorno temporal y borrar el archivo sin cifrar.
8. No restaurar producción sin decisión formal, respaldo previo y ventana de mantenimiento.

## Alcance no cubierto por este paquete

- Usuarios y configuración administrada por Supabase Auth.
- Archivos binarios alojados en Supabase Storage.
- Secretos de Supabase, GitHub, Cloudflare, Hotmart o correo.
- Configuración de DNS y cuenta de Cloudflare.
- Configuración interna de productos y webhooks en Hotmart.

Estos componentes requieren inventario y procedimientos separados. El checklist vigente está en [Recuperación de servicios administrados](./recuperacion-servicios-administrados.md).

## Estado y criterio de cierre de #10

La restauración lógica interna ya fue verificada. El respaldo externo permanece bloqueado mientras no existan en GitHub Actions `SUPABASE_DB_URL` y `BACKUP_ENCRYPTION_PASSPHRASE`.

La incidencia #10 no se puede cerrar hasta que exista una ejecución verde que genere el paquete cifrado, restaure el dump en PostgreSQL 17 y conserve sus artefactos, y hasta que los procedimientos separados de Storage y Auth hayan sido ejecutados con evidencia. Configurar los secretos requiere autorización del propietario; este plan no crea ni cambia credenciales.

El respaldo del esquema `public` no contiene los binarios de Storage ni usuarios de Auth. Tampoco reemplaza el respaldo de Edge Functions, secretos por nombre, configuración de proveedores, DNS o Cloudflare.

## Frecuencia

- Respaldo externo y restauración temporal: semanal.
- Restauración lógica de configuración crítica dentro de Supabase: semanal.
- Prueba manual integral incluyendo Storage y autenticación: trimestral y antes de un lanzamiento importante.

## Criterios de escalamiento

Detener cambios y evaluar restauración cuando exista:

- pérdida o corrupción de licencias;
- eliminación de tablas o funciones críticas;
- modificación masiva no autorizada;
- imposibilidad de validar compras;
- acceso indebido confirmado;
- despliegue que no pueda revertirse de forma segura.

## Responsabilidad

El propietario de KineCheck autoriza cualquier restauración sobre producción. Las pruebas automáticas solo restauran bases temporales y nunca sustituyen producción.
