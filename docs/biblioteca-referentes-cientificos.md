# KineCheck — Atlas de referentes científicos MSK
Estado: contenido editorial inicial; NO publicado ni habilitado para cobro.
## Objetivo
Biblioteca educativa independiente. Ningún investigador está afiliado a KineCheck ni avala sus productos. Perfiles redactados originalmente; enlaces a publicaciones, sin reproducir textos protegidos.
## Catálogo inicial (18)
- Terapia manual y razonamiento: Chad Cook — utilidad contextual de intervenciones, diagnóstico y razonamiento.
- Dolor persistente: Jo Nijs — mecanismos del dolor, rehabilitación y educación.
- Tendinopatías: Jill Cook — modelo continuo, carga y variabilidad; Ebonie Rio — ejercicio y dolor tendinoso; Karin Silbernagel — tendón de Aquiles y retorno deportivo; Peter Malliaras — rehabilitación y carga; Bill Vicenzino — tendinopatía lateral del codo.
- Dolor y educación: Lorimer Moseley — ciencia del dolor y educación; Peter O'Sullivan — manejo centrado en la persona del dolor lumbar; Adriaan Louw — educación en neurociencia del dolor.
- Cervical: Deborah Falla — función neuromuscular; Gwendolen Jull — evaluación y rehabilitación cervical; Michele Sterling — latigazo cervical, pronóstico y factores biopsicosociales.
- Hombro: Jeremy Lewis — dolor relacionado con manguito rotador; Ann Cools — escápula y rehabilitación; Jo Gibson — razonamiento y rehabilitación de hombro; Adam Meakins — comunicación crítica y ejercicio.
## Versión gratuita
18 fichas introductorias con área, pregunta clínica, conceptos, limitaciones, referencias abiertas, glosario y navegación por región. No incluir extractos premium en el HTML, JS, JSON público ni assets descargables.
## Versión premium
Por autor: contexto histórico; 3–8 estudios seleccionados con DOI/PMID y tipo de estudio; pregunta PICO; población; resultados absolutos cuando existan; sesgos; certeza GRADE cuando proceda; controversias; aplicabilidad; casos clínicos con razonamiento y decisiones; cuestionarios; bibliografía actualizable; PDF original con marca de agua y fecha de revisión. No prometer contenido no redactado.
## Muestra desarrollada: Jill Cook
**Pregunta clínica:** ¿Una imagen tendinosa anormal explica por sí sola el dolor? No necesariamente. La asociación estructura-síntomas es imperfecta y el manejo requiere historia, función, carga, objetivos y diagnósticos diferenciales.
**Marco conceptual:** el modelo continuo de Cook y Purdam (2009) propone respuestas tendinosas heterogéneas a la carga y categorías de adaptación/patología. Es un modelo explicativo, no una prueba diagnóstica validada para clasificar individualmente a todo paciente.
**Aplicación:** valorar irritabilidad, exposición a carga, capacidad funcional, contexto deportivo, recuperación y progresión tolerable. Evitar reglas universales de dolor o dosis.
**Lecturas:** Cook & Purdam 2009 DOI 10.1136/bjsm.2008.051193; Cook & Purdam 2012 DOI 10.1136/bjsports-2011-090414; Cook & Purdam 2014 DOI 10.1136/bjsports-2012-092078.
**Caso de discusión:** deportista con dolor aquíleo de 8 semanas al correr. Documentar antecedentes, cambios recientes de carga, síntomas, función, pruebas relevantes, factores de riesgo y diagnósticos alternativos; formular hipótesis; consensuar exposición progresiva y seguimiento.
**Limitación:** no asumir que la reducción del dolor confirma reversión de cambios histológicos.
## Muestra desarrollada: Jeremy Lewis
**Pregunta clínica:** ¿Debe una alteración de imagen del manguito rotador determinar por sí sola el tratamiento? No. Integrar síntomas, función, historia y objetivos; considerar diagnósticos diferenciales.
**Evidencia:** Lewis et al. 2015 DOI 10.2519/jospt.2015.5941; guía de práctica clínica Desmeules et al. 2025 DOI 10.2519/jospt.2025.13182.
**Caso:** persona de 52 años con dolor al elevar el brazo, sin trauma mayor. Explorar antecedentes, banderas rojas, función, carga, cervical, fuerza y movilidad; decidir si requiere evaluación adicional y construir programa progresivo individualizado.
**Limitación:** la evidencia para algunas intervenciones es de certeza variable; no confundir efectos a corto plazo con resultados sostenidos.
## Arquitectura y seguridad de publicación
Rutas propuestas: /gratis/profesionales/referentes/ (público), /referentes/ (premium). API /api/referentes/:slug/premium verifica en servidor sesión y licencia vigente del producto correcto; respuesta 403 sin licencia, revocada o vencida; 401 sin sesión. Validar firmas webhooks Hotmart, eventos idempotentes y correspondencia producto-usuario; revocación inmediata y auditoría. No confiar en ocultamiento CSS, localStorage, JavaScript del cliente ni archivos estáticos. Mantener acceso de pago DESACTIVADO hasta aprobar pruebas en staging de 200/401/403, revocación, expiración y filtración de assets. No usar materiales históricos premium sin sustitución y autorización.
## Diseño
Identidad KineCheck: fondo oscuro, cian/turquesa, logo original obtenido del repositorio (no recreado), sin rostros; tarjetas con ilustraciones anatómicas originales y marca de agua. Accesibilidad WCAG, móvil y navegación por teclado.
## Analítica
Eventos: vista_catalogo, vista_autor_gratis, clic_referencia, clic_premium, compra_confirmada (solo webhook), vista_autor_premium, descarga_pdf, encuesta_satisfaccion; minimizar datos personales.
## Criterios para publicación
Revisión editorial y bibliográfica por autor; revisión de permisos y derechos; confirmación del SKU Hotmart; pruebas aisladas; revisión de seguridad pendiente del issue #213; despliegue controlado y verificación de rutas. No publicar producción sin estos requisitos.
