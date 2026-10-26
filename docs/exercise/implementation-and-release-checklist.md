# KineCheck Exercise: implementación y preparación de publicación

Fecha de revisión del cambio: 26 de octubre de 2026. Rama del PR: `feat/kinecheck-exercise-demo-20261026`.

## Alcance implementado

- PWA estática en `/exercise/`, con alcance y caché limitados a esa ruta.
- Tarjeta «Prescripción del Ejercicio» en `/gratis/`.
- Diez condiciones visibles; dos entradas demo y ocho bloqueadas bajo Pro.
- Formulario contextual sin identificadores ni almacenamiento clínico. Los datos no se envían al servidor.
- Resultados que separan recomendación de guía, hallazgo de ensayo y decisión editorial.
- Referencias con datos bibliográficos, DOI/enlace, población, intervención, resultado, límites y estado de revisión.
- Calculadoras 1RM, RPE/RIR, volumen-carga, variación de carga y HRR disponibles solo tras verificación server side.
- Edge Function `exercise-pro-api`, que valida JWT con `auth.getUser()`, comprueba `has_course_access` para el slug independiente `kinecheck-exercise-pro` y vuelve a comprobar la licencia en cada cálculo.
- No hay contenido Pro clínico privado en los archivos estáticos. Las respuestas del endpoint son `private, no-store`.

## Auditoría de integración

- `main` inspeccionada en `8d353152c9d96d40e276b00e0ceb79210b0516b2`; el repositorio tiene curso «Ejercicio Terapéutico» y el endpoint protegido `exercise-course-content`. Esa licencia conserva el slug `ejercicio-terapeutico` y no habilita Exercise Pro.
- Supabase producción (`eqhcdclyeoapmqtlduwf`) y staging (`mhnqtyvwxytppekktvxb`) están activos. Producción ya tiene `hotmart_product_grants`, `course_access`, webhook Hotmart y funciones protegidas con verificación JWT. El slug Exercise Pro todavía no tiene un producto asociado.
- Se inspeccionó el registro de productos activos. No se añadieron identificadores, precios, checkout URLs ni secretos ficticios.
- No se realizaron cambios de esquema ni escrituras en la base de producción.
- `exercise-pro-api` debe desplegarse con `verify_jwt=true`. El código también valida el usuario y la licencia mediante el servidor.
- En revisión del changelog Supabase al 26 de octubre de 2026, el único cambio marcado como breaking change de Edge Functions era la retirada futura de un subconjunto de cifrados TLS el 10 de noviembre; no afecta a la implementación sobre HTTPS moderno.

## Evidencia clínica y editorial

Los registros fuente en `exercise/evidence.json` incluyen WHO 2023 para dolor lumbar primario crónico y Breda et al. 2021 para tendinopatía rotuliana. También se incluyen referencias de seguridad y métodos de las calculadoras. Se revisaron identificadores bibliográficos y resúmenes de fuentes primarias. Cada ficha está marcada «revisión clínica profesional pendiente».

Por esa revisión pendiente, esta rama no se debe fusionar ni anunciar como herramienta clínica. La pantalla muestra un aviso y no genera dosis, progresiones ni una recomendación individual. El hallazgo del ensayo de tendinopatía se presenta como dato del protocolo de estudio y no como pauta universal.

## Integración comercial posterior

1. Crear en Hotmart los productos mensual y anual, primero en modo de prueba. Mantener desactivada la venta pública.
2. Registrar los Product IDs reales en `hotmart_product_grants` para `course_slug = 'kinecheck-exercise-pro'`; asignar los plazos de acceso de un mes y doce meses que correspondan a cada producto recurrente. No reutilizar el ID o slug del curso.
3. Confirmar que los webhooks Hotmart existentes procesan alta/compra, renovación, cancelación, reembolso y chargeback como se espera para suscripciones y terminan/desactivan el acceso correctamente.
4. Ejecutar pruebas autenticadas con cuentas de prueba autorizadas: sin compra, compra vigente, renovación, término, cancelación, reembolso y acceso con un producto distinto. Confirmar denegación server side para todos los estados no vigentes y para acceso al contenido desde URL directa.
5. Incorporar URL de checkout y valores comerciales reales solo después de aprobar estas pruebas. No activar cobros hasta entonces.

## Puertas de salida

- Revisión clínica profesional de los dos resúmenes, campos de seguridad, red flags, explicación de límites y resultados de calculadoras.
- QA unitario y navegador Chromium/WebKit, incluyendo viewport móvil y PWA.
- Despliegue de `exercise-pro-api` en staging y comprobaciones 401/403/200 autorizadas sin activar cobros.
- PR y preview de Cloudflare Pages. Verificar `/exercise/`, tarjeta en `/gratis/`, enlaces, headers, PWA y no-regresión de rutas existentes.
- Solo fusionar y publicar después de pasar las puertas anteriores. Al publicar, revisar `robots` y quitar `noindex` únicamente con aprobación clínica y comercial.

## Resultados registrados en esta rama

- `npm run test:exercise`: 9/9 pruebas unitarias aprobadas.
- Chromium/WebKit local: no ejecutado. Playwright no encontró binarios; la descarga del CDN devolvió un archivo vacío/inválido en este entorno. El workflow `KineCheck Exercise QA` está preparado para instalar y ejecutar Chromium, WebKit y presets móviles en CI.
- Despliegue de Cloudflare Pages: pendiente de PR.
- Despliegue de Supabase staging: pendiente.
- Checkout, ciclo Hotmart y revisión profesional: pendientes.
