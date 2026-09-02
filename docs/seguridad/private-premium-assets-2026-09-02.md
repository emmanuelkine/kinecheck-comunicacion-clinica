# Protección de contenido premium — 2 de septiembre de 2026

## Alcance

Se migraron los payloads ejecutables de KineCheck Clínico y Dolor Lumbar Persistente desde rutas públicas a `course-assets`, bucket privado de Supabase Storage.

## Copias privadas verificadas

| Objeto privado | Bytes | SHA-256 |
|---|---:|---|
| `kinecheck-clinico-curso/course-data.js` | 45.336 | `e6070e0d1a28ee2ac2ba646cadbd54b7c877be0272ad45ccb465219bc2f3bbc0` |
| `kinecheck-clinico-curso/renderer.js` | 14.249 | `29be091ccce457d1ae4c95304f799666d80c775a05af768568cc1299a33f4b40` |
| `dolor-lumbar-persistente/data-v6.js` | 34.070 | `e1548a757997370242c5a69bd1f65272e347e14adaf51c9c0964b4c15293084a` |
| `dolor-lumbar-persistente/app-v6.js` | 29.447 | `cf7a9b11383b546f9e84b4ee16367a0c57e5b8b825f458a80c17734a8c86bdf8` |

La migración descargó nuevamente cada objeto después de subirlo y comparó su SHA-256 antes de declararlo válido.

## Ruta de acceso

- KineCheck Clínico usa `protected-course-key`, con JWT obligatorio, validación de `course_access` y descarga server-side desde `course-assets`.
- Dolor Lumbar Persistente usa `dolor-lumbar-course-key` v3, también con JWT obligatorio, validación de licencia y descarga server-side desde `course-assets`.
- Los payloads premium dejan de formar parte del árbol público desplegable.

## Regla de regresión

No deben volver a versionarse en el árbol público:

- `kinecheck-clinico-curso/course-data.js`
- `kinecheck-clinico-curso/renderer.js`
- `academy/dolor-lumbar-persistente/data-v6.js`
- `academy/dolor-lumbar-persistente/app-v6.js`

## Historial Git

Eliminar archivos del árbol actual no los elimina de commits históricos de un repositorio que fue público. La reescritura del historial se mantiene como una operación separada porque cambia SHAs y puede afectar clones, referencias, despliegues y evidencia de recuperación. Debe ejecutarse únicamente con una ventana de mantenimiento y preservación previa del repositorio.

## Pendientes externos a esta migración

Esta corrección no sustituye la conciliación administrativa de Hotmart, las pruebas controladas de compra/reembolso, la protección de rama `main` ni la configuración de protección contra contraseñas filtradas en Supabase Auth.
