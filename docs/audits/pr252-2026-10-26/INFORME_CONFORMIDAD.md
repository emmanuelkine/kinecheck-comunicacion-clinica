# Conformidad técnica del PR #252

Fecha de cierre de pruebas: 26 de octubre de 2026 (America/Santiago).
Código comprobado: `bb32e565a8dbbe50e67a9c93a5690d16fb48edc7`. Base integrada: `01b8b78dc66ee172dd7eccfaa658f9353f694e2f`.

Este registro sustituye el estado de bloqueo documentado el 23 de octubre. Conserva aquel informe y sus fallos como evidencia histórica. La fusión y la verificación posterior de producción se documentan en el [cierre del PR #252](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/pull/252).

## Resultado de las pruebas

| Control | Resultado observado |
| --- | --- |
| Node completo | 142 aprobadas, 0 fallidas, 0 omitidas; 30 archivos de pruebas |
| Navegador Chromium | 58 aprobadas, 0 fallidas, 0 omitidas; nueve archivos de la suite |
| Programas independientes | Ocho aprobados; incluyen preparación pública, roles, protección, opiniones y diagnóstico de desbordamiento |
| Auditoría visual automatizada | Chromium: 27/27; WebKit: 27/27 |
| Validadores de código y arquitectura | Diez aprobados; acceso, integridad, privacidad, marca, instrumentación y contratos de interfaz |
| Sintaxis JavaScript | 190 archivos comprobados; cero errores |
| Auditoría de archivos | 27/27: 14 raster, 12 SVG y un PDF; cero errores, hallazgos u omisiones |
| Examen visual manual de archivos | 26 gráficos y las 23 páginas del PDF; registro individual conservado del 23 de octubre |
| Dependencias públicas en fuente | 131 HTML y 684 referencias locales a recursos; cero archivos ausentes |
| HTTP público previo a la fusión | 132 destinos, incluido `/qr`: 132 respuestas finales HTTP 200; sin términos de marca externa detectados en HTML |
| Checkouts públicos | Ocho GET finales HTTP 200 en Hotmart; no se enviaron compras |
| Checkout Clínico para Chile | Abierto visualmente; muestra $39.990 y opción de 12 cuotas de $3.333 |

Los 47 programas ejecutables de `tests/` se invocan mediante Node, la suite Playwright y el bucle de programas independientes. El bucle ejecuta los ocho programas incluso cuando uno falla. Los códigos de error se propagan a GitHub Actions. Las correcciones y sus reejecuciones se identifican por commit; los fallos anteriores permanecen en el historial.

[Ejecutar y consultar el CI completo](https://github.com/emmanuelkine/kinecheck-comunicacion-clinica/actions/runs/40306295817). Los resultados detallados y las ocho salidas independientes acompañan este informe. Los artefactos de Actions contienen además capturas de pantalla; su retención es limitada y los resultados textuales esenciales quedan versionados aquí.

## Reparación y preservación

El WebP de mecanismos de tratamiento estaba truncado: 14.729 bytes, frente a 48.830 declarados en RIFF. Se recuperó el PNG original indicado por el commit que incorporó la imagen y se convirtió a WebP sin pérdida, a 1024 × 1536 píxeles. Se verificó igualdad exacta de los bytes RGBA decodificados entre el PNG y el WebP restaurado. El resultado ocupa 1.469.852 bytes.

SHA-256 del WebP reparado: `01eea820fe6448b7a1619074ceae2435bcd31a28f1b7e50dbaa50dbdaafdb089`.

El escáner comprueba la longitud RIFF y los chunks, decodifica los raster a resolución nativa y aplica metadatos, extracción de texto y OCR. Renderiza todas las páginas del PDF y trata como error cualquier herramienta o extracción fallida. Las regresiones prueban tanto el archivo completo como el rechazo de contenedores truncados.

La revisión también corrigió tres referencias CSS rotas tras mover la biblioteca profesional. Se cargan los estilos originales de marca y legibilidad móvil. En la vista previa se observaron 45 tarjetas, ausencia de desbordamiento horizontal y un logotipo nativo de 900 × 183 mostrado a aproximadamente 245 × 50 píxeles. Se restablecieron, además, las cargas existentes de diagnóstico y protección de recuperación de cuenta en Academy.

La diferencia HTML respecto de main se limita a esos tres enlaces CSS y tres cargas de scripts. No se editaron textos clínicos, preguntas, respuestas, referencias bibliográficas, logotipos ni el PDF. Recupera conserva su estado pausado y la certificación OTEC sigue inactiva.

Las pruebas se actualizaron para contrastar el producto vigente: portada educativa, catálogos actuales, métricas con consentimiento, ausencia del contador de opiniones, dominio de aplicaciones actual y evaluaciones académicas internas autorizadas por el servidor. Se sustituyó una expectativa de bundles privados retirados por controles de denegación de licencia, ausencia pública de esos bundles y accesibilidad de los controles públicos; no se volvió a exponer contenido protegido.

## Límites reales

- La igualdad de píxeles se demuestra contra el PNG histórico recuperado. El WebP truncado anterior no se decodifica y no permite una comparación visual completa.
- La inspección visual y el OCR no constituyen una certificación clínica, legal ni de ausencia de defectos en cada píxel. Los hashes actuales de los 27 archivos coinciden con los del examen manual, según `continuidad-activos.json`. El registro manual individual de gráficos y PDF está en [revision-visual.json](../pr252-2026-10-23/revision-visual.json).
- El PDF conserva una página 11 prácticamente vacía y un recuadro que se divide entre las páginas 15 y 16. Se registraron las observaciones y se mantuvo intacto el documento.
- La cobertura visual de páginas es representativa, con ensayos multidispositivo y dos motores. La comprobación HTTP de 132 destinos no significa que se haya inspeccionado visualmente cada página completa.
- Las pruebas de acceso y Hotmart usan fixtures y bases aisladas donde corresponde. No se realizó una compra real, ni un reembolso, ni una activación de licencia derivada de un pago real, ni un SSO positivo autenticado en producción. La validación de recuperación de desastres es estática; no se declara una restauración real de la base productiva.
- El checkout de Clínico conserva en Hotmart el subtítulo anterior «Registro Kinésico Profesional». Se confirmó su disponibilidad y precio chileno; no se modificó su configuración comercial.
- Las advertencias del healthcheck sobre nombres no expuestos en HTML de Hotmart se conservan en el log. La comprobación visual del precio chileno corresponde a Clínico; no se certifican precios regionales visuales de los otros siete checkouts.

El resultado técnico habilita la integración del cambio revisado. El recibo posterior de despliegue, igualdad binaria servida y estado de producción se consulta en el cierre del PR enlazado al inicio.
