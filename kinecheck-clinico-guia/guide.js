(() => {
  "use strict";

  const SECTIONS = [
    {
      id: "proposito",
      title: "Propósito y marco del caso",
      copy: "Define qué necesitas revisar y evita convertir la guía en una ficha paralela.",
      fields: [
        { id: "case_code", label: "Código ficticio del caso", type: "text", placeholder: "Ej.: CASO-HOMBRO-01", help: "No uses iniciales, RUT, número de ficha ni datos que permitan identificar a una persona." },
        { id: "review_purpose", label: "Propósito de esta revisión", type: "select", options: ["Preparar evaluación", "Revisar omisiones", "Contrastar hipótesis", "Planificar reevaluación", "Discusión docente", "Caso simulado"] },
        { id: "main_problem", label: "Problema funcional principal", type: "textarea", full: true, placeholder: "Describe la actividad o participación limitada, no solo una estructura anatómica." },
        { id: "person_goal", label: "Meta expresada por la persona o meta del caso simulado", type: "textarea", full: true, placeholder: "¿Qué necesita volver a hacer y por qué es importante?" },
      ],
      decision: ["Diferencia motivo de consulta, problema funcional y objetivo.", "Confirma que el propósito de la guía es revisar el razonamiento, no documentar la atención."],
    },
    {
      id: "seguridad",
      title: "Seguridad, triage y alcance profesional",
      copy: "La seguridad precede a la clasificación musculoesquelética. Una bandera aislada no equivale a diagnóstico.",
      checks: [
        "Cambio sistémico o deterioro general no explicado",
        "Trauma relevante, fragilidad o riesgo de fractura",
        "Déficit neurológico progresivo o compromiso de esfínteres",
        "Síntomas vasculares, cardiopulmonares o viscerales potencialmente relevantes",
        "Dolor nocturno no mecánico o patrón clínico atípico",
        "Antecedentes de cáncer, infección, inmunosupresión o uso prolongado de corticoides",
        "Riesgo de daño, crisis de salud mental o vulnerabilidad social",
        "Medicamentos, comorbilidades o precauciones que modifican el examen",
      ],
      fields: [
        { id: "safety_pattern", label: "Patrón de seguridad observado", type: "textarea", full: true, placeholder: "Describe combinación, temporalidad, coherencia y evolución de las señales relevantes." },
        { id: "triage_decision", label: "Decisión de triage", type: "select", options: ["Sin señales actuales que modifiquen el manejo", "Evaluar con precauciones", "Consulta médica no urgente", "Derivación prioritaria", "Urgencia", "Información insuficiente"] },
        { id: "safety_action", label: "Acción y fundamento", type: "textarea", full: true, placeholder: "¿Qué harás, con qué urgencia y qué información sustenta esa decisión?" },
      ],
      decision: ["No normalices una presentación atípica solo porque existe dolor musculoesquelético.", "Registra la decisión definitiva en el sistema institucional correspondiente."],
    },
    {
      id: "entrevista",
      title: "Entrevista, temporalidad e irritabilidad",
      copy: "Organiza la historia para comprender comportamiento, carga, evolución y modificadores.",
      checks: [
        "Inicio, mecanismo y contexto temporal",
        "Localización, distribución y cualidad de síntomas",
        "Frecuencia, duración y evolución",
        "Factores agravantes y aliviantes",
        "Respuesta a carga, reposo y recuperación",
        "Irritabilidad: intensidad, facilidad de provocación y tiempo de recuperación",
        "Tratamientos previos y respuesta",
        "Expectativas, preocupaciones y explicación de la persona",
      ],
      fields: [
        { id: "symptom_behavior", label: "Comportamiento clínicamente relevante", type: "textarea", full: true, placeholder: "Resume relaciones entre actividad, síntomas, tiempo y recuperación." },
        { id: "sins", label: "Severidad, irritabilidad, naturaleza y etapa", type: "textarea", full: true, placeholder: "Explicita cómo estas dimensiones modifican tu examen y dosificación." },
      ],
      decision: ["Evita copiar una cronología extensa sin interpretar su relevancia.", "La irritabilidad debe modificar cuánto, cómo y cuándo examinas."],
    },
    {
      id: "contexto",
      title: "Función, contexto y factores psicosociales",
      copy: "Integra factores que pueden modificar discapacidad, recuperación, adherencia y comunicación.",
      checks: [
        "Trabajo, deporte, estudio y demandas del entorno",
        "Sueño y recuperación",
        "Actividad física y cambios recientes de carga",
        "Estrés, estado emocional y eventos relevantes",
        "Creencias sobre daño, movimiento y pronóstico",
        "Miedo, evitación, hipervigilancia o baja autoeficacia",
        "Apoyo social, barreras y recursos",
        "Preferencias, prioridades y decisiones compartidas",
      ],
      fields: [
        { id: "context_interpretation", label: "Factores que realmente modifican el caso", type: "textarea", full: true, placeholder: "Distingue presencia de un factor de su relevancia clínica y modificabilidad." },
        { id: "communication_need", label: "Necesidad comunicacional prioritaria", type: "textarea", full: true, placeholder: "¿Qué explicación, validación o acuerdo podría mejorar seguridad y participación?" },
      ],
      decision: ["No conviertas un factor psicosocial en explicación total del dolor.", "Describe interacción y consecuencias funcionales, no etiquetas sobre la persona."],
    },
    {
      id: "hipotesis",
      title: "Hipótesis antes del examen",
      copy: "Explicita qué necesitas confirmar, debilitar o descartar antes de seleccionar pruebas.",
      fields: [
        { id: "hypothesis_primary", label: "Hipótesis principal", type: "textarea", full: true, placeholder: "Incluye problema, mecanismo plausible, función y nivel de certeza." },
        { id: "hypothesis_alternatives", label: "Hipótesis alternativas", type: "textarea", full: true, placeholder: "¿Qué explicaciones competidoras siguen siendo plausibles?" },
        { id: "must_not_miss", label: "Hipótesis de seguridad que no debes perder", type: "textarea", full: true, placeholder: "Indica señales que aumentarían o disminuirían preocupación." },
        { id: "exam_question", label: "Pregunta que debe responder el examen", type: "textarea", full: true, placeholder: "Ej.: ¿La limitación de carga es concordante y reproducible sin señales neurológicas progresivas?" },
      ],
      decision: ["Una lista anatómica extensa no es una hipótesis útil.", "Define qué resultado cambiaría tu decisión; si ninguno la cambia, reconsidera la prueba."],
    },
    {
      id: "examen",
      title: "Examen físico orientado por hipótesis",
      copy: "Selecciona procedimientos por utilidad, seguridad y capacidad de modificar decisiones.",
      checks: [
        "Observación y tarea funcional concordante",
        "Movimiento activo y respuesta sintomática",
        "Movimiento pasivo cuando aporta a la pregunta clínica",
        "Fuerza o capacidad de generar fuerza",
        "Pruebas de desempeño funcional pertinentes",
        "Examen neurológico cuando está indicado",
        "Neurodinámica interpretada dentro del conjunto de hallazgos",
        "Palpación o pruebas accesorias solo si modifican la interpretación",
        "Pruebas especiales seleccionadas, no batería indiscriminada",
        "Medida basal reproducible para reevaluación",
      ],
      fields: [
        { id: "exam_selected", label: "Procedimientos seleccionados y por qué", type: "textarea", full: true, placeholder: "Relaciona cada procedimiento con una hipótesis o decisión." },
        { id: "concordant_findings", label: "Hallazgos concordantes", type: "textarea", full: true, placeholder: "¿Qué reprodujo o explicó de forma coherente el problema funcional?" },
        { id: "discordant_findings", label: "Hallazgos discordantes, negativos o inciertos", type: "textarea", full: true, placeholder: "Incluye lo que debilita hipótesis o exige cautela." },
      ],
      decision: ["Un resultado positivo aislado rara vez basta para concluir.", "Registra unidades, posición, instrucciones y condiciones cuando necesites comparar medidas."],
    },
    {
      id: "medicion",
      title: "Calidad de medición e interpretación",
      copy: "Distingue cambio observado, error de medición y cambio importante para la persona.",
      checks: [
        "Instrumento pertinente para el constructo",
        "Procedimiento estandarizado",
        "Unidad y lado claramente definidos",
        "Fiabilidad suficiente para el uso previsto",
        "Error estándar o cambio mínimo detectable considerado cuando está disponible",
        "Cambio importante interpretado junto con la meta de la persona",
        "PROM o prueba funcional coherente con el problema",
        "Misma condición de medición planificada para reevaluar",
      ],
      fields: [
        { id: "baseline_measure", label: "Medida basal prioritaria", type: "textarea", full: true, placeholder: "Indica constructo, instrumento, resultado, unidad y condiciones." },
        { id: "measurement_interpretation", label: "Cómo interpretarás el cambio", type: "textarea", full: true, placeholder: "Define qué magnitud, patrón o experiencia indicaría progreso, estabilidad o deterioro." },
      ],
      decision: ["Más decimales no garantizan una medición más útil.", "No confundas significación estadística, cambio detectable y cambio importante."],
    },
    {
      id: "sintesis",
      title: "Síntesis, CIF y nivel de certeza",
      copy: "Integra información relevante sin convertir la síntesis en inventario de hallazgos.",
      fields: [
        { id: "body_function", label: "Funciones y estructuras corporales relevantes", type: "textarea", full: true },
        { id: "activity_participation", label: "Actividad y participación", type: "textarea", full: true },
        { id: "contextual_factors", label: "Factores contextuales facilitadores y barreras", type: "textarea", full: true },
        { id: "clinical_synthesis", label: "Síntesis clínica integrada", type: "textarea", full: true, placeholder: "Problema funcional + hallazgos concordantes + factores modificadores + seguridad + incertidumbre." },
        { id: "certainty", label: "Nivel de certeza actual", type: "select", options: ["Alto", "Moderado", "Bajo", "Insuficiente para concluir"] },
        { id: "uncertainty", label: "Qué incertidumbre permanece", type: "textarea", full: true, placeholder: "¿Qué dato, evolución o respuesta al manejo podría cambiar la interpretación?" },
      ],
      decision: ["La CIF organiza el impacto funcional; no reemplaza la explicación clínica.", "Expresar incertidumbre de forma explícita mejora seguridad y reevaluación."],
    },
    {
      id: "plan",
      title: "Prioridades, objetivos y plan",
      copy: "Vincula el plan con los problemas modificables, preferencias y respuesta esperada.",
      fields: [
        { id: "priority_problems", label: "Problemas prioritarios", type: "textarea", full: true, placeholder: "Ordena por impacto, riesgo, modificabilidad y relevancia para la persona." },
        { id: "goals", label: "Objetivos funcionales y criterios de logro", type: "textarea", full: true, placeholder: "Incluye conducta o actividad, condición, plazo y forma de comprobarla." },
        { id: "initial_plan", label: "Plan inicial y dosificación razonada", type: "textarea", full: true, placeholder: "Educación, exposición, ejercicio, carga, autocuidado, coordinación o derivación." },
        { id: "shared_decision", label: "Acuerdos y preferencias incorporadas", type: "textarea", full: true },
      ],
      decision: ["No prescribas por diagnóstico nominal: vincula intervención con objetivo y respuesta.", "Define qué harás si la evolución no coincide con lo esperado."],
    },
    {
      id: "reevaluacion",
      title: "Reevaluación, pronóstico y reglas de decisión",
      copy: "Planifica antes de intervenir cómo reconocerás progreso, ausencia de respuesta o deterioro.",
      checks: [
        "Fecha o momento clínico de reevaluación definido",
        "Medida funcional prioritaria",
        "Respuesta sintomática relevante",
        "Tolerancia a carga o tarea significativa",
        "Adherencia, barreras y experiencia de la persona",
        "Señales de seguridad a vigilar",
        "Criterios para progresar",
        "Criterios para modificar, pausar o derivar",
      ],
      fields: [
        { id: "expected_course", label: "Evolución esperada y fundamento", type: "textarea", full: true },
        { id: "reassessment_plan", label: "Plan de reevaluación", type: "textarea", full: true, placeholder: "Qué medirás, cuándo, bajo qué condiciones y qué decisión dependerá del resultado." },
        { id: "decision_rules", label: "Reglas de decisión", type: "textarea", full: true, placeholder: "Si ocurre X, entonces progresar / ajustar / derivar / reevaluar seguridad." },
      ],
      decision: ["El pronóstico es una estimación revisable, no una promesa.", "Una ausencia de cambio exige revisar adherencia, dosis, hipótesis, contexto y seguridad."],
    },
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  function fieldMarkup(field) {
    const cls = field.full ? "field full" : "field";
    const help = field.help ? `<small>${escapeHtml(field.help)}</small>` : "";
    if (field.type === "textarea") return `<div class="${cls}"><label for="${field.id}">${escapeHtml(field.label)}</label>${help}<textarea id="${field.id}" name="${field.id}" placeholder="${escapeHtml(field.placeholder || "")}"></textarea></div>`;
    if (field.type === "select") return `<div class="${cls}"><label for="${field.id}">${escapeHtml(field.label)}</label>${help}<select id="${field.id}" name="${field.id}"><option value="">Selecciona una opción</option>${field.options.map((option) => `<option>${escapeHtml(option)}</option>`).join("")}</select></div>`;
    return `<div class="${cls}"><label for="${field.id}">${escapeHtml(field.label)}</label>${help}<input id="${field.id}" name="${field.id}" type="text" placeholder="${escapeHtml(field.placeholder || "")}"></div>`;
  }

  function sectionMarkup(section, index) {
    const checks = section.checks?.length ? `<div class="check-grid">${section.checks.map((label, itemIndex) => `<label class="check-item"><input type="checkbox" name="${section.id}_check_${itemIndex}" value="${escapeHtml(label)}"><span>${escapeHtml(label)}</span></label>`).join("")}</div>` : "";
    const fields = section.fields?.length ? `<div class="field-grid">${section.fields.map(fieldMarkup).join("")}</div>` : "";
    return `<section id="${section.id}" class="guide-section"><div class="section-head"><div><span class="eyebrow">DOMINIO ${String(index + 1).padStart(2, "0")}</span><h2>${escapeHtml(section.title)}</h2></div><span class="section-index">${String(index + 1).padStart(2, "0")}</span></div><p class="section-copy">${escapeHtml(section.copy)}</p>${checks}${fields}<div class="decision-box"><strong>Pausa de razonamiento</strong>${section.decision.map((item) => `<p>• ${escapeHtml(item)}</p>`).join("")}</div></section>`;
  }

  function textValue(id) { return String($(`#${CSS.escape(id)}`)?.value || "").trim(); }

  function buildSummary() {
    const lines = [
      "KINECHECK CLÍNICO — SÍNTESIS DE GUÍA COMPLEMENTARIA",
      "Documento de trabajo no identificable. No constituye ficha clínica ni registro institucional.",
      "",
    ];
    SECTIONS.forEach((section) => {
      const values = [];
      section.fields?.forEach((field) => {
        const value = textValue(field.id);
        if (value) values.push(`${field.label}: ${value}`);
      });
      const checked = $$(`input[name^="${CSS.escape(section.id)}_check_"]:checked`).map((input) => input.value);
      if (checked.length) values.push(`Aspectos revisados: ${checked.join("; ")}`);
      if (values.length) lines.push(section.title.toUpperCase(), ...values.map((value) => `- ${value}`), "");
    });
    lines.push("RECORDATORIO: trasladar solo la información pertinente al sistema institucional autorizado y eliminar este resumen cuando deje de ser necesario.");
    return lines.join("\n");
  }

  function updateSummary() { $("#summary-output").textContent = buildSummary(); }

  function updateProgress() {
    const controls = $$("#guide-form input[type=text], #guide-form textarea, #guide-form select, #guide-form input[type=checkbox]");
    const completed = controls.filter((control) => control.type === "checkbox" ? control.checked : String(control.value || "").trim()).length;
    const percent = controls.length ? Math.round((completed / controls.length) * 100) : 0;
    $("#progress-value").textContent = `${percent}%`;
    $("#progress-bar").style.width = `${percent}%`;
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; }, 3200);
  }

  async function copySummary() {
    const summary = buildSummary();
    try { await navigator.clipboard.writeText(summary); showToast("Síntesis copiada. Revísala antes de trasladarla."); }
    catch { showToast("No fue posible copiar automáticamente. Selecciona el texto de la síntesis."); }
  }

  function resetGuide() {
    if (!confirm("Se eliminará todo lo escrito en esta guía. Esta acción no modifica ninguna ficha institucional. ¿Continuar?")) return;
    $("#guide-form").reset();
    $("#anon-confirm").checked = false;
    updateProgress();
    updateSummary();
    showToast("La guía fue limpiada.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function enforceAnonymity() {
    const form = $("#guide-form");
    const enabled = $("#anon-confirm").checked;
    form.querySelectorAll("input,textarea,select").forEach((control) => { control.disabled = !enabled; });
    if (!enabled) showToast("Confirma el uso anonimizado para habilitar la guía.");
  }

  window.KineCheckClinicoGuide = Object.freeze({
    start() {
      $("#section-nav").innerHTML = SECTIONS.map((section, index) => `<a href="#${section.id}">${String(index + 1).padStart(2, "0")} · ${escapeHtml(section.title)}</a>`).join("");
      $("#guide-form").innerHTML = SECTIONS.map(sectionMarkup).join("");
      $("#guide-form").addEventListener("input", () => { updateProgress(); updateSummary(); });
      $("#anon-confirm").addEventListener("change", enforceAnonymity);
      $("#copy-summary").addEventListener("click", copySummary);
      $("#print-guide").addEventListener("click", () => window.print());
      $("#reset-guide").addEventListener("click", resetGuide);
      enforceAnonymity();
      updateProgress();
      updateSummary();
    },
  });
})();
