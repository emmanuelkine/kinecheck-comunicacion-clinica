# Matriz de acceso por producto KineCheck

Última verificación técnica: 30 de agosto de 2026.

## Principio obligatorio

La sesión de KineCheck identifica a la persona una sola vez. La sesión no concede productos. Cada curso, aplicación o herramienta protegida debe comprobar una licencia activa para su `course_slug` exacto antes de mostrar contenido.

## Compras individuales

| Hotmart Product ID | Producto comprado | Accesos concedidos |
|---:|---|---|
| 8150019 | KineCheck Clínico | `kinecheck-clinico-curso` y `kinecheck-clinico` |
| 8154796 | KineCheck Estudiante | `kinecheck-estudiante` |
| 8157431 | KineCheck Recupera | `kinecheck-recupera` |
| 8192814 | Comunicación Clínica | `comunicacion-clinica` |
| 8194777 | Más allá del dolor | `mas-alla-del-dolor` |
| 8205453 | Traumatología y Ortopedia Clínica | `traumatologia-ortopedia-clinica` |
| 8208817 | KineCheck Evidencia Aplicada | `evidencia-aplicada` |
| 8289351 | KineCheck Escalas Clínicas | `kinecheck-escalas` |
| 8289677 | KineCheck Pruebas Especiales | `kinecheck-pruebas-especiales` |
| 8330940 | Dolor Lumbar Persistente | `dolor-lumbar-persistente` |
| 8340185 | Dolor Musculoesquelético | `dolor-musculoesqueletico` |

KineCheck Clínico concede dos componentes porque ambos forman un único producto comercial: el curso profesional central y su guía complementaria. No concede KineCheck Estudiante, Recupera ni otro curso.

## Pack

| Hotmart Product ID | Pack comprado | Accesos concedidos |
|---:|---|---|
| 8195982 | Pack KineCheck Estudiante | `kinecheck-estudiante` y `mas-alla-del-dolor` |

El pack no concede Comunicación Clínica, Evidencia Aplicada, Traumatología, Recupera ni KineCheck Clínico.

## Aplicaciones externas

El SSO externo solo acepta `kinecheck-estudiante`. `kinecheck-recupera` permanece bloqueado y no debe entrar al relay.

La antigua aplicación externa de KineCheck Clínico fue retirada del relay. KineCheck Clínico se abre dentro del ecosistema mediante su curso y guía complementaria.

## Controles de autorización

1. Academy verifica las licencias activas asociadas al correo autenticado.
2. El botón se habilita únicamente para un `course_slug` activo.
3. La ruta protegida vuelve a validar identidad y licencia en el servidor.
4. Los cursos externos rechazan un handoff cuyo producto no coincide con el producto esperado.
5. Estudiante envía el producto exacto a `POST /api/license/sso`; Recupera se rechaza antes de crear el POST.
6. Una URL modificada o una sesión válida sin licencia no debe abrir contenido.
7. Los accesos vencidos, reembolsados, cancelados o con contracargo deben permanecer desactivados.

## Regresión automática

El workflow `Validate Ecosystem Access` revisa diariamente la ausencia de formularios secundarios, la separación de productos, el uso de sesiones temporales y las validaciones exactas de curso y aplicación.
