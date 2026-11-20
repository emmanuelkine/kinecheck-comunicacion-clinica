# Integración privada Academy en administración

Fecha de corte: 20 de noviembre de 2026

Rama local de publicación segura: `codex/academy-admin-release-2026-11-20`

Ruta objetivo: `https://kinecheck.cl/admin/academy/`

Estado: **implementada y verificada localmente; no publicada**.

## Resultado

- Se reutiliza el panel de `c07f53e`/`aa703fe`; no se reconstruyó.
- La ruta usa `kinecheck_admin_session_v1` y redirige a `/admin/` sin sesión.
- El servidor valida `auth.getUser()` y el criterio propietario de `platform-context`: acceso activo con `access_source=owner` o `last_event=OWNER_ACCESS`.
- El menú privado enlaza a `/admin/academy/` dentro de la vista autenticada.
- Conserva ocho cursos, 40 pares, 80 variantes, decisiones antes/después, rúbricas, brechas, pilotaje, Excel, CSV, JSON, Markdown e informes individuales.
- OTEC permanece `BLOQUEADA`, certificados `BLOQUEADOS` e instrumento `scorable=false`.

## Protección de claves

El repositorio GitHub es público. Los commits con instrumentos protegidos sólo existen en `codex/academy-admin-integration-2026-11-19` y no están en `origin/main`; **esa rama académica no debe enviarse al remoto**.

La Edge Function lee el paquete desde `academy_academic_review_instruments`, tabla privada sin políticas de cliente y con privilegios revocados a `public`, `anon` y `authenticated`. Sólo `service_role`, después de comprobar al propietario, puede leerla. Cloudflare niega `/supabase/*` y todo `/academy-validation-panel/*` salvo `app.js` y `styles.css`, que no contienen claves.

Esta rama limpia fue creada desde `origin/main` con sólo la integración pública. El paquete académico se instala directamente en Supabase desde el entorno local autorizado y nunca se agrega a Git.

## Persistencia

La migración local `20261119173000_academy_admin_review.sql`, no aplicada, prepara:

- paquete privado con checksum, ocho cursos, 80 variantes y controles fail-closed;
- estado versionado de decisiones;
- bitácora append-only con cadena SHA-256;
- commit atómico con bloqueo de fila y revisión optimista.

Las tablas usan RLS forzado, revocan acceso de clientes y conceden sólo lo necesario a `service_role`. En la rama académica local, `npm run academy:private-bundle:check` valida el paquete sin escribirlo. Una salida privada sólo puede crearse dentro de `academy-validation-panel/.local/`, ignorada por Git.

## Pruebas

| Verificación | Resultado |
|---|---|
| Integración, permisos, persistencia, exportaciones y panel previo | **54/54 aprobadas** |
| Navegador integrado, red externa bloqueada | **Aprobada** |
| Móvil / computador | **390×844 / 1440×1000** |
| Sin sesión / cuenta sin privilegio | Redirección / `403`, aprobados |
| Navegador del panel local original | **Aprobado** |
| Sintaxis JS/TS y `git diff --check` | **Aprobada** |
| Baseline de seguridad y secretos | **Aprobado** |
| Paquete privado | 8 cursos, 40 pares, 80 variantes; SHA-256 `6e40ff9959236794d696c23b8097641144bb9c78675f8542046410eb09d4b3b1` |

La regresión global ejecutó 237 pruebas: 230 aprobaron, una quedó omitida y seis no aprobaron. Ninguna corresponde a archivos modificados por esta integración: cuatro aserciones académicas previas no coinciden con el paquete local y Campus/Hotmart no iniciaron porque `@electric-sql/pglite` no está instalado. No se instaló software sin autorización ni se declaran aprobadas esas pruebas.

Las pruebas Supabase reales quedan pendientes: no existen Supabase CLI, Deno ni Docker locales y no se autorizó usar producción.

## Publicación pendiente de autorización

1. Rama limpia desde `origin/main`: **preparada localmente**; no publicar la rama académica fuente.
2. Aplicar la migración en un entorno Supabase seguro existente, sin recursos facturables.
3. Instalar el paquete privado y verificar su checksum sin incluirlo en Git.
4. Desplegar `academy-admin-review` con verificación JWT activa.
5. Publicar en Preview de Pages y repetir autenticación, permisos, concurrencia, exportaciones y móvil.
6. Revisar Advisors/RLS y logs sin datos sensibles.
7. Sólo con autorización expresa, desplegar en producción.
8. Verificar la URL objetivo con propietario y no autorizado; recién entonces puede declararse enlace definitivo.

No se ejecutaron migraciones, push, merge, despliegues, certificados ni cambios productivos.
