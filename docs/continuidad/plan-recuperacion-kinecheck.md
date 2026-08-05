# Plan de recuperación KineCheck

Última actualización: 5 de agosto de 2026

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
7. Elimina el archivo sin cifrar antes de subir el artefacto.
8. Conserva el paquete cifrado en GitHub Actions durante 30 días.

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

Estos componentes requieren inventario y procedimientos separados.

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
