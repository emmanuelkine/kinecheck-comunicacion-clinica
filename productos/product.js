(() => {
  "use strict";

  const ACCESS_URL = "../academy/";
  const CATALOG_URL = "../#productos";
  const PRODUCTS = Object.freeze({
    "kinecheck-clinico": {
      name: "KineCheck Clínico",
      family: "KineCheck Formación",
      shortName: "Clínico",
      type: "Curso profesional + guía complementaria",
      term: "12 meses",
      accent: "#18c7b7",
      accentSoft: "#77f1e5",
      subtitle: "Evaluación, seguridad y razonamiento musculoesquelético",
      description: "Curso profesional avanzado para aprender a integrar historia, seguridad, examen, medición, hipótesis y reevaluación. Incluye una guía digital complementaria para aplicar el método sin reemplazar la ficha clínica institucional.",
      audience: "Kinesiólogos y profesionales de rehabilitación musculoesquelética que buscan profundizar su evaluación y razonamiento clínico.",
      audiences: ["Kinesiólogos", "Profesionales musculoesqueléticos", "Docentes clínicos"],
      checkout: "https://pay.hotmart.com/L106791841D",
      outcomes: [
        ["Razonamiento clínico explícito", "Conecta historia, seguridad, examen, medición, hipótesis y decisiones revisables."],
        ["Evaluación segura", "Prioriza triage, banderas clínicas, deterioro neurológico y criterios de derivación."],
        ["Medición defendible", "Estandariza movilidad, fuerza, desempeño y resultados informados por la persona."],
        ["Integración biopsicosocial", "Relaciona función, participación, contexto, expectativas y factores modificadores."],
        ["Seguridad clínica", "Integra banderas, criterios de derivación y límites del manejo kinésico."],
        ["Aplicación mediante guía", "Utiliza la guía complementaria para revisar omisiones sin reemplazar la ficha institucional."],
      ],
      contents: [
        ["Curso profesional central", "10 módulos, 30 experiencias clínicas, casos, comprobaciones y progreso guardado."],
        ["Seguridad y triage", "Banderas clínicas, examen neurológico y marco cervical IFOMPT."],
        ["Historia y contexto", "Síntomas, irritabilidad, factores psicosociales, metas y decisiones compartidas."],
        ["Examen y medición", "Movimiento, fuerza, desempeño, examen neurológico, neurodinámica y pruebas especiales."],
        ["Integración y seguimiento", "CIF, hipótesis, pronóstico, resultados, reevaluación y síntesis final."],
        ["Guía digital complementaria", "Apoyo para revisar preguntas, hallazgos e hipótesis. No es una ficha clínica oficial ni un repositorio de pacientes."],
      ],
      disclaimer: "Producto educativo para profesionales. La guía complementaria no reemplaza el registro clínico institucional, no debe utilizarse como repositorio de datos identificables y no sustituye el juicio profesional ni la derivación oportuna.",
      faq: [
        ["¿Qué es KineCheck Clínico?", "Es un curso avanzado para profesionales. La guía digital es una herramienta complementaria para aplicar el método aprendido."],
        ["¿La guía reemplaza la ficha clínica de mi centro?", "No. La atención debe documentarse en el sistema oficial de la institución y respetar sus exigencias legales, éticas y de seguridad."],
      ],
    },
    "kinecheck-estudiante": {
      name: "KineCheck Estudiante",
      family: "KineCheck Apps",
      shortName: "Estudiante",
      type: "Aplicación web formativa · sin instalación",
      term: "12 meses",
      accent: "#5c67d7",
      accentSoft: "#b7bcff",
      subtitle: "Evaluación y razonamiento clínico paso a paso",
      description: "Herramienta formativa que guía la evaluación de casos y solicita justificar las decisiones. Ayuda a ordenar el proceso, reconocer omisiones y desarrollar un razonamiento clínico progresivo.",
      audience: "Estudiantes de kinesiología y carreras de la salud que necesitan practicar el proceso completo de evaluación con estructura y retroalimentación.",
      audiences: ["Estudiantes de kinesiología", "Internos clínicos", "Docentes"],
      checkout: "https://pay.hotmart.com/G106801166S",
      outcomes: [
        ["Ruta guiada", "Avanza desde la entrevista hasta la síntesis sin perder etapas esenciales."],
        ["Preguntas de razonamiento", "Explica por qué eliges una prueba, una hipótesis o una prioridad."],
        ["Errores frecuentes", "Reconoce omisiones, contradicciones y conclusiones apresuradas."],
        ["Práctica deliberada", "Utiliza casos para repetir, comparar y mejorar el desempeño."],
        ["Retroalimentación estructurada", "Revisa el proceso y no solamente la respuesta final."],
        ["Apoyo bibliográfico", "Relaciona el aprendizaje con conceptos y recursos clínicos relevantes."],
      ],
      contents: [
        ["Entrevista clínica", "Preguntas relevantes, cronología, síntomas, función y contexto."],
        ["Banderas y seguridad", "Identificación de señales que modifican el examen o requieren derivación."],
        ["Selección del examen", "Elección razonada de procedimientos, pruebas y medidas."],
        ["Interpretación", "Diferenciación entre datos, hallazgos, hipótesis y conclusiones."],
        ["Plan de aprendizaje", "Objetivos, retroalimentación y próximos pasos para mejorar."],
      ],
      disclaimer: "Uso educativo. No debe utilizarse para diagnosticar ni para tomar decisiones clínicas sin supervisión competente.",
      faq: [
        ["¿Entrega directamente la respuesta correcta?", "Prioriza preguntas, estructura y retroalimentación para ayudarte a razonar, no solo a memorizar respuestas."],
        ["¿Sirve para preparar evaluaciones prácticas?", "Sí. Puede ayudarte a ordenar los pasos y justificar decisiones, pero debe complementarse con práctica presencial y supervisión."],
      ],
    },
    "kinecheck-recupera": {
      name: "KineCheck Recupera",
      family: "KineCheck Apps",
      shortName: "Recupera",
      type: "Aplicación web de seguimiento · sin instalación",
      term: "3 meses",
      accent: "#31b779",
      accentSoft: "#9bf0c5",
      subtitle: "Tus ejercicios, registros y progreso en un solo lugar",
      description: "Experiencia simple para acompañar un proceso de recuperación. Permite revisar ejercicios, registrar dolor, función, sueño y cumplimiento, visualizar tendencias y preparar preguntas para la próxima consulta.",
      audience: "Personas que se encuentran realizando un plan de rehabilitación o ejercicio indicado por un profesional.",
      audiences: ["Personas en recuperación", "Pacientes", "Familias y cuidadores"],
      checkout: "https://pay.hotmart.com/P106806251E",
      outcomes: [
        ["Rutina visible", "Consulta los ejercicios y orientaciones disponibles para tu proceso."],
        ["Registro diario", "Anota dolor, función, sueño y cumplimiento de manera sencilla."],
        ["Progreso comprensible", "Observa tendencias sin convertirlas en diagnósticos automáticos."],
        ["Mejor comunicación", "Prepara dudas y comparte un resumen con tu profesional."],
        ["Mayor continuidad", "Mantén el plan presente entre una consulta y la siguiente."],
        ["Avisos de seguridad", "Recibe orientaciones generales cuando corresponde consultar."],
      ],
      contents: [
        ["Mi día", "Registro breve de síntomas, función, sueño y adherencia."],
        ["Mis ejercicios", "Consulta de la rutina y orientaciones entregadas."],
        ["Mi progreso", "Gráficos simples de evolución y cumplimiento."],
        ["Preguntas", "Espacio para preparar dudas para la siguiente consulta."],
        ["Resumen", "Documento compacto para revisar junto con el profesional."],
      ],
      disclaimer: "No diagnostica ni sustituye la atención de un profesional de salud. Ante síntomas de alarma o deterioro importante, consulta oportunamente.",
      faq: [
        ["¿KineCheck Recupera me indica qué lesión tengo?", "No. Está diseñado para acompañar un plan existente y facilitar el registro, no para diagnosticar."],
        ["¿Puedo cambiar mis ejercicios por mi cuenta?", "Las modificaciones del plan deben conversarse con el profesional que acompaña tu recuperación."],
      ],
    },
    "comunicacion-clinica": {
      name: "Comunicación Clínica",
      family: "KineCheck Formación",
      shortName: "Comunicación",
      type: "Curso interactivo",
      term: "12 meses",
      accent: "#e89036",
      accentSoft: "#ffd39a",
      subtitle: "El arte de comunicar en salud",
      description: "Curso orientado a convertir la comunicación en una herramienta terapéutica. Integra escucha activa, lenguaje comprensible, empatía, validación y decisiones compartidas para construir relaciones clínicas más claras, seguras y humanas.",
      audience: "Kinesiólogos, estudiantes, docentes clínicos y profesionales de la salud que desean mejorar la calidad de sus entrevistas y explicaciones.",
      audiences: ["Profesionales de la salud", "Estudiantes", "Docentes clínicos"],
      checkout: "https://pay.hotmart.com/T106883983U",
      outcomes: [
        ["Entrevistas más claras", "Utiliza preguntas abiertas, focalización, resumen y cierre."],
        ["Escucha activa", "Reconoce necesidades, emociones, expectativas y significados."],
        ["Explicaciones comprensibles", "Comunica hallazgos, pronóstico e incertidumbre sin alarmismo."],
        ["Validación y empatía", "Responde a la experiencia de la persona sin minimizarla ni exagerarla."],
        ["Decisiones compartidas", "Integra objetivos, preferencias y opciones de manejo."],
        ["Conversaciones difíciles", "Aborda desacuerdos, baja adherencia y expectativas complejas."],
      ],
      contents: [
        ["Alianza terapéutica", "Relación clínica, confianza, seguridad y participación."],
        ["Preguntas y escucha", "Preguntas abiertas, reformulación, focalización y síntesis."],
        ["Empatía y validación", "Respuestas clínicas que reconocen la experiencia de la persona."],
        ["Educación en salud", "Lenguaje claro, riesgo, incertidumbre y mensajes no estigmatizantes."],
        ["Decisiones y seguimiento", "Expectativas, acuerdos, cierre de entrevista y continuidad."],
      ],
      disclaimer: "Contenido educativo orientado al desarrollo de competencias comunicacionales. Debe aplicarse respetando el contexto, la ética y el alcance profesional.",
      faq: [
        ["¿Es útil fuera de kinesiología?", "Sí. Los principios de entrevista, escucha y explicación son aplicables en distintas profesiones de la salud."],
        ["¿Incluye situaciones aplicadas?", "La experiencia está diseñada para analizar decisiones comunicacionales y trasladarlas a conversaciones clínicas reales."],
      ],
    },
    "mas-alla-del-dolor": {
      name: "Más allá del dolor",
      family: "KineCheck Formación",
      shortName: "Más allá del dolor",
      type: "Curso clínico",
      term: "12 meses",
      accent: "#d2558e",
      accentSoft: "#ffb5d4",
      subtitle: "Evaluación musculoesquelética integral",
      description: "Curso para ampliar la evaluación más allá de la intensidad del dolor. Integra función, sueño, carga, creencias, emociones, entorno, expectativas y comportamiento para construir hipótesis clínicas más útiles y prudentes.",
      audience: "Profesionales y estudiantes que buscan evaluar problemas musculoesqueléticos desde una perspectiva biopsicosocial, segura y aplicable.",
      audiences: ["Kinesiólogos", "Estudiantes", "Docentes musculoesqueléticos"],
      checkout: "https://pay.hotmart.com/W106888386Q",
      outcomes: [
        ["Comprensión amplia", "Diferencia dolor, daño, discapacidad, irritabilidad y riesgo."],
        ["Contexto relevante", "Explora sueño, carga, estrés, creencias y expectativas."],
        ["Seguridad", "Identifica banderas y factores que modifican la evaluación."],
        ["Examen con propósito", "Selecciona procedimientos según hipótesis y objetivos."],
        ["Conclusiones prudentes", "Evita diagnósticos simplistas basados en un hallazgo aislado."],
        ["Educación clínica", "Comunica resultados de forma comprensible y no alarmista."],
      ],
      contents: [
        ["Dolor contemporáneo", "Conceptos esenciales para interpretar la experiencia dolorosa."],
        ["Entrevista musculoesquelética", "Síntomas, irritabilidad, función, conducta y contexto."],
        ["Factores biopsicosociales", "Sueño, carga, estrés, emociones, creencias y entorno."],
        ["Examen e interpretación", "Hallazgos físicos, concordancia y relevancia clínica."],
        ["Educación y reevaluación", "Objetivos, mensajes clínicos, seguimiento y ajuste."],
      ],
      disclaimer: "Curso educativo. La evaluación de una persona requiere integración clínica, consentimiento, seguridad y respeto por el alcance profesional.",
      faq: [
        ["¿El curso plantea que todo dolor es psicológico?", "No. Integra factores biológicos, psicológicos y sociales sin reducir la experiencia a una sola dimensión."],
        ["¿Reemplaza el aprendizaje del examen físico?", "No. Ayuda a seleccionar e interpretar el examen físico dentro de un razonamiento más completo."],
      ],
    },
    "evidencia-aplicada": {
      name: "Evidencia Aplicada",
      family: "KineCheck Formación",
      shortName: "Evidencia",
      type: "Curso clínico",
      term: "12 meses",
      accent: "#4f83e7",
      accentSoft: "#a9c8ff",
      subtitle: "De la pregunta clínica a una decisión informada",
      description: "Curso práctico para buscar, interpretar y aplicar evidencia científica sin transformar la atención en una lectura mecánica de artículos. Integra investigación, experiencia clínica y contexto de la persona.",
      audience: "Profesionales, estudiantes y docentes que necesitan usar evidencia con criterio, eficiencia y transparencia.",
      audiences: ["Profesionales", "Estudiantes", "Docentes e investigadores"],
      checkout: "https://pay.hotmart.com/F106921972I",
      outcomes: [
        ["Preguntas buscables", "Convierte dudas clínicas en preguntas claras y estructuradas."],
        ["Búsqueda eficiente", "Localiza estudios, revisiones y guías en fuentes pertinentes."],
        ["Lectura crítica", "Reconoce diseño, riesgo de sesgo y limitaciones metodológicas."],
        ["Interpretación", "Analiza magnitud del efecto, incertidumbre y relevancia clínica."],
        ["Aplicabilidad", "Valora si los resultados son pertinentes para una persona y contexto."],
        ["Comunicación transparente", "Explica beneficios, riesgos y límites sin exagerar certeza."],
      ],
      contents: [
        ["Pregunta clínica", "Estructura PICO y definición de resultados relevantes."],
        ["Búsqueda", "PubMed, PEDro, revisiones, guías y estrategias de selección."],
        ["Diseños y sesgo", "Comprensión de estudios, validez y calidad metodológica."],
        ["Resultados", "Efectos, intervalos, relevancia clínica y certeza."],
        ["Decisión aplicada", "Integración de evidencia, experiencia y preferencias."],
      ],
      disclaimer: "La evidencia no reemplaza el juicio clínico. Debe interpretarse junto con el contexto, los objetivos y las preferencias de la persona.",
      faq: [
        ["¿Necesito conocimientos avanzados de estadística?", "No. El curso prioriza interpretación clínica y explica los conceptos necesarios de forma aplicada."],
        ["¿Enseña a buscar artículos?", "Sí. Incluye la construcción de preguntas y la selección eficiente de fuentes y resultados relevantes."],
      ],
    },
    "traumatologia-ortopedia-clinica": {
      name: "Traumatología y Ortopedia Clínica",
      family: "KineCheck Formación",
      shortName: "Traumatología",
      type: "Curso clínico",
      term: "12 meses",
      accent: "#31b779",
      accentSoft: "#9cf0c7",
      subtitle: "Del mecanismo lesional a una decisión clínica segura",
      description: "Formación aplicada para comprender lesiones musculoesqueléticas, reconocer criterios de seguridad y organizar la evaluación desde el mecanismo lesional hasta las decisiones de manejo, derivación y retorno a la función.",
      audience: "Kinesiólogos y estudiantes que buscan una mirada integrada de traumatología, ortopedia, seguridad y progresión funcional.",
      audiences: ["Kinesiólogos", "Estudiantes", "Profesionales musculoesqueléticos"],
      checkout: "https://pay.hotmart.com/B106913952R",
      outcomes: [
        ["Mecanismo y tejido", "Relaciona carga, estructura, fase de recuperación y presentación clínica."],
        ["Criterios de seguridad", "Reconoce señales de alarma, límites y necesidad de derivación."],
        ["Examen contextualizado", "Integra antecedentes, hallazgos físicos e imágenes cuando corresponda."],
        ["Protección y carga", "Organiza movilidad, ejercicio y progresión según tolerancia y fase."],
        ["Razonamiento prudente", "Evita decidir por una prueba especial o una imagen aislada."],
        ["Retorno funcional", "Planifica la progresión hacia actividad, trabajo o deporte."],
      ],
      contents: [
        ["Respuesta tisular", "Mecanismos lesionales, inflamación, reparación y adaptación."],
        ["Lesiones frecuentes", "Fracturas, luxaciones, esguinces y lesiones musculotendinosas."],
        ["Seguridad", "Banderas, complicaciones, precauciones y derivación."],
        ["Extremidades", "Problemas de extremidad superior e inferior desde una mirada clínica."],
        ["Progresión", "Objetivos, carga, función y retorno a actividades relevantes."],
      ],
      disclaimer: "Curso educativo. El diagnóstico y manejo de lesiones requiere evaluación competente, seguridad clínica y coordinación cuando corresponde.",
      faq: [
        ["¿Se centra solamente en pruebas especiales?", "No. Las pruebas se interpretan dentro de la historia, el mecanismo, la función y otros hallazgos."],
        ["¿Incluye criterios de derivación?", "Sí. La seguridad clínica y los límites del manejo son parte central del enfoque."],
      ],
    },
    "pack-estudiante": {
      name: "Pack KineCheck Estudiante",
      family: "KineCheck Packs",
      shortName: "Pack Estudiante",
      type: "Pack formativo",
      term: "12 meses",
      accent: "#7a6de0",
      accentSoft: "#cfc8ff",
      subtitle: "Herramienta guiada y formación musculoesquelética integral",
      description: "Combina KineCheck Estudiante con el curso Más allá del dolor. Una ruta para practicar el proceso de evaluación y, al mismo tiempo, comprender dolor, función, contexto, banderas clínicas y educación.",
      audience: "Estudiantes que necesitan una ruta más completa para aprender evaluación y razonamiento musculoesquelético.",
      audiences: ["Estudiantes de kinesiología", "Internos clínicos", "Docentes"],
      checkout: "https://pay.hotmart.com/Q106891608M",
      outcomes: [
        ["Dos productos", "Acceso a KineCheck Estudiante y Más allá del dolor."],
        ["Práctica estructurada", "Utiliza casos guiados para aplicar el proceso de evaluación."],
        ["Comprensión integral", "Relaciona dolor, función, contexto y factores de seguridad."],
        ["Razonamiento progresivo", "Conecta preguntas, hallazgos, hipótesis y prioridades."],
        ["Una sola cuenta", "Ambas licencias se organizan automáticamente en tu plataforma."],
        ["Ruta formativa", "Combina estudio conceptual con aplicación práctica."],
      ],
      contents: [
        ["KineCheck Estudiante", "Flujo guiado, preguntas de razonamiento, práctica y retroalimentación."],
        ["Más allá del dolor", "Curso de evaluación musculoesquelética biopsicosocial y segura."],
        ["Integración", "Aplicación de conceptos del curso en casos y decisiones simuladas."],
        ["Biblioteca unificada", "Acceso a ambos productos desde una sola cuenta."],
        ["Vigencia común", "Doce meses de acceso desde la aprobación de la compra."],
      ],
      disclaimer: "Pack educativo. No habilita para diagnosticar ni sustituye la práctica supervisada y la formación formal.",
      faq: [
        ["¿Debo comprar los dos productos por separado?", "No. El pack concede acceso a KineCheck Estudiante y al curso Más allá del dolor con una sola compra."],
        ["¿Ambos aparecen en la misma cuenta?", "Sí. Debes ingresar con el mismo correo utilizado en Hotmart y la plataforma detectará los dos accesos."],
      ],
    },
  });

  const slug = new URLSearchParams(location.search).get("producto") || "kinecheck-clinico";
  const product = PRODUCTS[slug];
  if (!product) {
    location.replace(CATALOG_URL);
    return;
  }

  document.documentElement.style.setProperty("--accent", product.accent);
  document.documentElement.style.setProperty("--accent-soft", product.accentSoft);
  document.body.dataset.product = slug;
  document.querySelectorAll("[data-clinico-only]").forEach((node) => {
    node.hidden = slug !== "kinecheck-clinico";
  });
  document.title = `${product.name} | KineCheck`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", product.description);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${product.name} | KineCheck`);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", product.description);

  const $ = (selector) => document.querySelector(selector);
  const list = (items, renderer) => items.map(renderer).join("");
  const relatedSlugs = Object.keys(PRODUCTS).filter((item) => item !== slug).slice(0, 3);

  $("#product-family").textContent = product.family;
  $("#product-type").textContent = product.type;
  $("#product-term").textContent = product.term;
  $("#fact-format").textContent = product.type;
  $("#product-title").innerHTML = product.name.replace(/(KineCheck|Comunicación|Evidencia|Traumatología|Más allá)/, "<em>$1</em>");
  $("#product-subtitle").textContent = product.subtitle;
  $("#product-description").textContent = product.description;
  $("#breadcrumb-name").textContent = product.shortName;
  $("#audience-copy").textContent = product.audience;
  $("#audience-pills").innerHTML = list(product.audiences, (item) => `<span>${item}</span>`);
  $("#disclaimer").textContent = product.disclaimer;

  document.querySelectorAll("[data-checkout]").forEach((link) => {
    link.href = product.checkout;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
  document.querySelectorAll("[data-access]").forEach((link) => { link.href = ACCESS_URL; });
  document.querySelectorAll("[data-catalog]").forEach((link) => { link.href = CATALOG_URL; });

  $("#outcomes-grid").innerHTML = list(product.outcomes, ([title, copy], index) => `
    <article class="content-card"><span>${String(index + 1).padStart(2, "0")}</span><h3>${title}</h3><p>${copy}</p></article>
  `);
  $("#contents-grid").innerHTML = list(product.contents, ([title, copy]) => `
    <article class="list-card"><strong>${title}</strong><p>${copy}</p></article>
  `);

  const commonFaq = [
    ["¿Cómo ingreso después de comprar?", "Crea o abre tu cuenta en kinecheck.cl/academy utilizando exactamente el mismo correo asociado a la compra en Hotmart."],
    ["¿Cuándo comienza la vigencia?", `La vigencia de ${product.term} comienza cuando el pago queda aprobado. Las compras activas anteriores a la política vigente conservan sus condiciones aplicables.`],
    ["¿Puedo compartir mi acceso?", "No. La licencia es personal e intransferible. No compartas correo, contraseña, capturas ni contenidos protegidos."],
    ["¿Debo instalar una aplicación?", "No. KineCheck funciona desde un navegador moderno en computador, tablet o teléfono. Algunas tareas extensas son más cómodas en una pantalla mayor."],
  ];
  $("#faq-grid").innerHTML = list([...product.faq, ...commonFaq], ([question, answer]) => `
    <details><summary>${question}</summary><p>${answer}</p></details>
  `);

  $("#related-grid").innerHTML = list(relatedSlugs, (item) => {
    const related = PRODUCTS[item];
    return `<a class="related-card" href="./?producto=${item}"><small>${related.family.toUpperCase()} · ${related.type.toUpperCase()}</small><strong>${related.name}</strong><span>${related.subtitle}</span></a>`;
  });

  $("#current-year").textContent = String(new Date().getFullYear());
})();
