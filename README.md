# KineCheck - El arte de comunicar en salud

Aplicación web educativa estática construida a partir de la masterclass original de 154 diapositivas.

## Contenido

- 154 diapositivas conservadas como imágenes, sin superposición de texto.
- Texto extraído disponible en un panel separado y accesible.
- 12 módulos de clase guiada.
- 60 preguntas formativas con retroalimentación y acceso a la diapositiva relacionada.
- Laboratorio de práctica con respuestas guardadas localmente.
- Biblioteca de referencias con DOI, PubMed y enlaces oficiales cuando están disponibles.
- Progreso, módulos completados, modo oscuro y funcionamiento tipo PWA.
- Sección Ecosistema KineCheck con enlaces configurables.

## Abrir en Windows

1. Descomprime la carpeta.
2. Abre la carpeta `kinecheck_comunicacion_salud_app`.
3. Haz clic en la barra de dirección del Explorador, escribe `cmd` y presiona Enter.
4. Ejecuta:

   py -m http.server 8080

5. En Edge abre: http://localhost:8080

Mantén abierta la ventana negra mientras usas la aplicación.

## Configurar el ecosistema

Abre `data.json`, busca `ecosystem` y reemplaza cada `"url": "#"` por la URL real de Hotmart, el dominio o la app correspondiente.

## Publicación

La carpeta puede publicarse en Netlify, Vercel, Cloudflare Pages, GitHub Pages o cualquier hosting estático. Para acceso de compradores de Hotmart se recomienda agregar autenticación y validación en servidor; no proteger el contenido solo con JavaScript.

## Revisión antes de vender

- Revisión clínica y editorial de afirmaciones.
- Verificación individual de referencias sin DOI.
- Auditoría de licencias de imágenes de terceros.
- Sustitución de enlaces provisionales del ecosistema.
- Pruebas en teléfono, tablet y escritorio.
