(() => {
  const rootMetricsSource = new URL("../metrics-v1.js?v=20260806-launch-metrics1", location.href).toString();
  if (![...document.scripts].some((script) => script.src === rootMetricsSource)) {
    const metricsScript = document.createElement("script");
    metricsScript.src = rootMetricsSource;
    metricsScript.async = false;
    document.head.appendChild(metricsScript);
  }

  const priceSource = new URL("./product-price-v1.js?v=20260806-commercial-proof1", location.href).toString();
  if (![...document.scripts].some((script) => script.src === priceSource)) {
    const priceScript = document.createElement("script");
    priceScript.src = priceSource;
    priceScript.async = false;
    document.head.appendChild(priceScript);
  }

  const experienceSource = new URL("./product-experience-unification-v1.js?v=20260806-unified1", location.href).toString();
  if (![...document.scripts].some((script) => script.src === experienceSource)) {
    const experienceScript = document.createElement("script");
    experienceScript.src = experienceSource;
    experienceScript.async = false;
    document.head.appendChild(experienceScript);
  }

  const slug = new URLSearchParams(location.search).get("producto") || "kinecheck-clinico";
  if (slug !== "kinecheck-clinico") return;

  const $ = (selector) => document.querySelector(selector);
  const outcomes = [
    ["Razonamiento clínico explícito", "Conecta historia, seguridad, examen, medición, hipótesis y decisiones revisables."],
    ["Evaluación segura", "Prioriza triage, banderas clínicas, deterioro neurológico y criterios de derivación."],
    ["Medición defendible", "Estandariza movilidad, fuerza, desempeño y resultados informados por la persona."],
    ["Integración biopsicosocial", "Relaciona función, participación, contexto, expectativas y factores modificadores."],
    ["Decisiones probabilísticas", "Interpreta pruebas, clusters e imagen sin convertir hallazgos aislados en certezas."],
    ["Aplicación mediante guía", "Utiliza la guía complementaria para revisar omisiones sin reemplazar la ficha institucional."],
  ];
  const contents = [
    ["Curso profesional central", "10 módulos, 30 experiencias clínicas, casos, comprobaciones y progreso guardado."],
    ["1. Estándar profesional", "Alcance de la guía, protección de datos, anonimización y razonamiento explícito."],
    ["2. Seguridad y triage", "Banderas rojas, examen neurológico y marco cervical IFOMPT."],
    ["3. Historia e irritabilidad", "ALICIA, cronología, SINS y mecanismos de dolor como hipótesis."],
    ["4. Persona y contexto", "Factores psicosociales, sueño, trabajo, metas y decisiones compartidas."],
    ["5–7. Examen y medición", "Movimiento, palpación, goniometría, fuerza, desempeño, examen neurológico y neurodinámica."],
    ["8–10. Integración", "Pruebas especiales, CIF, hipótesis, pronóstico, PROMs, reevaluación y síntesis final."],
    ["Guía digital adjunta", "Apoyo para revisar preguntas, hallazgos e hipótesis. No es una ficha clínica oficial ni un repositorio de pacientes."],
  ];
  const faq = [
    ["¿Qué es ahora KineCheck Clínico?", "Es principalmente un curso avanzado para profesionales. La guía digital es una herramienta adjunta para aplicar el método aprendido."],
    ["¿La guía reemplaza la ficha clínica de mi centro?", "No. Debes documentar la atención en el sistema oficial de tu institución y respetar sus exigencias legales, éticas y de seguridad."],
    ["¿Debo ingresar pacientes reales en la guía?", "No es necesario ni recomendado. Utiliza casos simulados, anonimizados o resúmenes sin datos identificables."],
    ["¿La misma compra incluye curso y guía?", "Sí. La licencia de KineCheck Clínico activa ambos componentes durante la vigencia informada."],
    ["¿El curso entrega diagnósticos o protocolos automáticos?", "No. Enseña a razonar, justificar decisiones, reconocer límites y reevaluar. La responsabilidad clínica permanece en el profesional."],
    ["¿Qué evidencia utiliza?", "Integra guías de alta calidad, OMS, marco IFOMPT y revisiones sobre seguridad, pruebas diagnósticas, dinamometría, resultados y educación del razonamiento clínico."],
  ];

  document.title = "KineCheck Clínico | Curso profesional y guía complementaria";
  document.querySelector('meta[name="description"]')?.setAttribute("content", "Curso profesional de evaluación, seguridad y razonamiento musculoesquelético con guía digital complementaria.");
  $("#product-type").textContent = "CURSO PROFESIONAL + GUÍA COMPLEMENTARIA";
  $("#product-term").textContent = "12 MESES";
  $("#product-title").innerHTML = "<em>KineCheck</em> Clínico";
  $("#product-subtitle").textContent = "Evaluación, seguridad y razonamiento musculoesquelético";
  $("#product-description").textContent = "Formación avanzada para kinesiólogos y profesionales de rehabilitación. El curso es el centro del producto; la guía digital adjunta ayuda a revisar el proceso sin competir con la ficha clínica institucional.";
  $("#breadcrumb-name").textContent = "Clínico";
  $("#fact-term").textContent = "12 meses desde la aprobación";
  $("#story-copy").textContent = "Aprende a transformar datos clínicos en decisiones seguras, justificadas y revisables. Después utiliza la guía complementaria para ordenar el proceso, detectar omisiones y preparar la reevaluación.";
  $("#audience-copy").textContent = "Kinesiólogos titulados y profesionales de rehabilitación musculoesquelética que buscan profundizar su evaluación y razonamiento clínico.";
  $("#audience-pills").innerHTML = "<span>Kinesiólogos</span><span>Profesionales MSK</span><span>Docentes clínicos</span>";
  $("#outcomes-grid").innerHTML = outcomes.map(([title, copy], index) => `<article class="content-card"><span>${String(index + 1).padStart(2, "0")}</span><h3>${title}</h3><p>${copy}</p></article>`).join("");
  $("#contents-grid").innerHTML = contents.map(([title, copy]) => `<article class="list-card"><strong>${title}</strong><p>${copy}</p></article>`).join("");
  $("#faq-grid").innerHTML = faq.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join("");
  $("#disclaimer").textContent = "Producto educativo para profesionales. La guía complementaria no reemplaza el registro clínico institucional, no debe utilizarse como repositorio de datos identificables y no sustituye el juicio profesional, la normativa local ni la derivación oportuna.";
})();
