# Integración privada Academy en administración

Fecha de corte: 20 de noviembre de 2026

Rama local de publicación segura: `codex/academy-admin-release-2026-11-20`

Ruta objetivo: `https://kinecheck.cl/admin/academy/`

Estado: **publicada en Preview aislado; producción no modificada**.

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

La migración `20261119173000_academy_admin_review.sql` fue aplicada sólo a `KineCheck Staging` como `academy_admin_review_staging` y prepara:

- paquete privado con checksum, ocho cursos, 80 variantes y controles fail-closed;
- estado versionado de decisiones;
- bitácora append-only con cadena SHA-256;
- commit atómico con bloqueo de fila y revisión optimista.

Las tablas usan RLS forzado, revocan acceso de clientes y conceden sólo lo necesario a `service_role`. En la rama académica local, `npm run academy:private-bundle:check` valida el paquete sin escribirlo. Una salida privada sólo puede crearse dentro de `academy-validation-panel/.local/`, ignorada por Git.

## Pruebas

| Verificación | Resultado |
|---|---|
| Integración, permisos, persistencia, exportaciones y panel previo | **65/65 aprobadas** |
| Navegador integrado, red externa bloqueada | **Aprobada** |
| Móvil / computador | **390×844 / 1440×1000** |
| Sin sesión / cuenta sin privilegio | Redirección / `403`, aprobados |
| Navegador del panel local original | **Aprobado** |
| Sintaxis JS/TS y `git diff --check` | **Aprobada** |
| Baseline de seguridad y secretos | **Aprobado** |
| Paquete privado | 8 cursos, 40 pares, 80 variantes; SHA-256 `6e40ff9959236794d696c23b8097641144bb9c78675f8542046410eb09d4b3b1` |

La regresión global ejecutó 237 pruebas: 230 aprobaron, una quedó omitida y seis no aprobaron. Ninguna corresponde a archivos modificados por esta integración: cuatro aserciones académicas previas no coinciden con el paquete local y Campus/Hotmart no iniciaron porque `@electric-sql/pglite` no está instalado. No se instaló software sin autorización ni se declaran aprobadas esas pruebas.

Las pruebas Supabase se ejecutaron en el proyecto Staging existente, sin crear recursos. La Edge Function `academy-admin-review` quedó `ACTIVE`, versión 1 y `verify_jwt=true`. Las pruebas transaccionales comprobaron un commit válido, rechazo de revisión obsoleta (`40001`) y rechazo de activación de certificados (`22023`); el `ROLLBACK` dejó revisión y eventos en cero.

## Publicación de pruebas

Preview de rama: `https://codex-academy-admin-release.kinecheck-comunicacion-clinica.pages.dev/admin/academy/`

Preview inmutable del despliegue: `https://a8cd152e.kinecheck-comunicacion-clinica.pages.dev/admin/academy/`

- Cloudflare Pages y GitHub Actions: **aprobados** para `41354da`.
- Página Academy y recursos públicos permitidos: `200`.
- Biblioteca del panel y código Supabase: `404`.
- API sin sesión: `401`; origen no permitido: `403`; método no permitido: `405`.
- Las tres tablas privadas tienen RLS habilitada y forzada. `anon`/`authenticated` no tienen `SELECT`; sólo `service_role` puede leer.
- La RPC no es ejecutable por `anon` ni `authenticated`; sólo por `service_role`.
- Advisors sólo asocia a estas tres tablas el aviso informativo `rls_enabled_no_policy`, esperado porque el diseño es denegar todo a clientes. No relaciona advertencias ni errores nuevos con la función o las tablas Academy.
- Siguen existiendo avisos generales previos de Staging: funciones `SECURITY DEFINER` de otros módulos y protección de contraseñas filtradas desactivada. No se modificaron en esta entrega.
- La prueba autenticada positiva en navegador requiere que el propietario ingrese su contraseña de Staging; no se leyó, cambió ni simuló ninguna credencial.

No hubo merge, despliegue productivo, emisión de certificados ni cambio de calificaciones. `origin/main` y Supabase producción permanecen sin cambios. OTEC continúa bloqueada.
