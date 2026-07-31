# Configuración de KineCheck en Cloudflare Pages

## Proyecto

- Repositorio: `emmanuelkine/kinecheck-comunicacion-clinica`
- Rama de producción: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `.`
- Root directory: dejar en blanco
- Variables de entorno: ninguna para el sitio estático

## Primera comprobación

Después del primer despliegue, comprobar:

1. `/academy/`
2. Inicio y cierre de sesión.
3. Biblioteca asociada al correo de compra.
4. Apertura de cada curso adquirido.
5. Bloqueo de un curso no adquirido.
6. Marca de agua del comprador.
7. Catálogo público en `/kinecheck/`.

## Dominio

Agregar el dominio desde `Workers & Pages > proyecto > Custom domains` solo después de aprobar la URL temporal `pages.dev`.

## Compatibilidad

Los archivos `_redirects` y `_headers` mantienen las rutas históricas usadas en GitHub Pages y aplican cabeceras de seguridad y revalidación para Academy.
