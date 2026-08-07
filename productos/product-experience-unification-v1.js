(() => {
  "use strict";

  if (window.__KC_PRODUCT_EXPERIENCE_V1__) return;
  window.__KC_PRODUCT_EXPERIENCE_V1__ = true;

  const VERSION = "20260807-unified2";
  const slug = new URLSearchParams(location.search).get("producto") || "kinecheck-clinico";
  const PRIVATE_URL = new URL("../academy/", location.href).toString();

  function loadStyles() {
    if (document.querySelector("link[data-kc-product-unified]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(`./product-experience-unification-v1.css?v=${VERSION}`, location.href).toString();
    link.dataset.kcProductUnified = "true";
    document.head.appendChild(link);
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node && node.textContent !== value) node.textContent = value;
  }

  function setHtml(selector, value) {
    const node = document.querySelector(selector);
    if (node && node.innerHTML !== value) node.innerHTML = value;
  }

  function rewriteAccess() {
    document.querySelectorAll("[data-access]").forEach((link) => {
      if (link.href !== PRIVATE_URL) link.href = PRIVATE_URL;
      const label = "Entrar a Mi KineCheck";
      if (link.textContent.trim() !== label) link.textContent = label;
      if (link.getAttribute("aria-label") !== label) link.setAttribute("aria-label", label);
    });
  }

  function insertBeforeOutcomes(node) {
    const title = document.querySelector("#outcomes-title");
    const section = title?.closest("section");
    if (section && !document.querySelector(`#${node.id}`)) section.before(node);
  }

  function studentRoute() {
    document.body.classList.add("kc-product-student");
    setText("#product-type", "APRENDIZAJE GUIADO · 12 MESES");
    setText("#product-subtitle", "Tu primer paso para aprender evaluación y razonamiento clínico");
    setText("#product-description", "Una experiencia guiada que te indica qué hacer primero, por qué hacerlo y qué revisar antes de avanzar a cursos clínicos más complejos.");
    setText("#story-copy", "Practica el proceso completo en un orden comprensible: historia, seguridad, observación, movimiento, medición, hipótesis y comunicación. La meta no es rellenar casillas, sino aprender a relacionar la información.");
    setText("#audience-copy", "Estudiantes de kinesiología que necesitan estructura para practicar evaluación clínica sin saltarse pasos importantes.");
    setHtml("#audience-pills", "<span>Estudiantes</span><span>Práctica inicial</span><span>Razonamiento guiado</span>");

    const route = document.createElement("section");
    route.id = "kc-student-learning-route";
    route.className = "section kc-guided-route";
    route.innerHTML = `
      <div class="kc-route-heading"><span>RUTA RECOMENDADA</span><h2>No estudies todo al mismo tiempo.</h2><p>Avanza desde la práctica guiada hacia la comprensión clínica y, después, a cursos específicos.</p></div>
      <ol class="kc-route-steps">
        <li class="active"><b>1</b><div><strong>KineCheck Estudiante</strong><span>Practica el orden de la evaluación y detecta lo que todavía no relacionas.</span></div></li>
        <li><b>2</b><div><strong>Más allá del dolor</strong><span>Comprende dolor, función y contexto para evitar conclusiones reduccionistas.</span></div></li>
        <li><b>3</b><div><strong>Cursos clínicos</strong><span>Profundiza en comunicación, evidencia y traumatología cuando la base esté consolidada.</span></div></li>
      </ol>
      <div class="kc-route-note"><strong>Objetivo de aprendizaje:</strong> poder explicar por qué haces cada paso y qué decisión cambia con el resultado.</div>
    `;
    insertBeforeOutcomes(route);

    document.querySelectorAll("[data-checkout]").forEach((button) => {
      if (!button.textContent.includes("$") && button.textContent !== "Comenzar mi ruta") button.textContent = "Comenzar mi ruta";
    });
  }

  function patientExperience() {
    document.body.classList.add("kc-product-patient");
    document.title = "KineCheck Recupera | Mi plan y mi avance";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "KineCheck Recupera: revisa tu plan, registra cómo te sientes y observa tu avance con una experiencia simple.");
    setText("#product-type", "MI RECUPERACIÓN · 3 MESES");
    setHtml("#product-title", "KineCheck <em>Recupera</em>");
    setText("#product-subtitle", "Tu plan, tu registro y tu avance");
    setText("#product-description", "Una herramienta simple para saber qué corresponde hacer hoy, registrar cómo te sientes y observar tu progreso. No necesitas conocimientos clínicos.");
    setText("#breadcrumb-name", "Recupera");
    setText("#story-copy", "Abre Recupera, revisa tu plan y responde preguntas breves. La información te ayuda a seguir el proceso y a conversar mejor con el profesional que te acompaña.");
    setText("#audience-copy", "Personas que están realizando un plan de recuperación indicado o supervisado por un profesional.");
    setHtml("#audience-pills", "<span>Lenguaje simple</span><span>Uso diario breve</span><span>Sin datos clínicos complejos</span>");

    setHtml("#outcomes-grid", `
      <article class="content-card"><span>01</span><h3>Hoy</h3><p>Revisa de forma clara qué actividad o ejercicio corresponde realizar.</p></article>
      <article class="content-card"><span>02</span><h3>Cómo me siento</h3><p>Registra dolor, función, sueño y cumplimiento mediante preguntas breves.</p></article>
      <article class="content-card"><span>03</span><h3>Mi avance</h3><p>Observa cambios a lo largo del tiempo sin tener que interpretar términos clínicos.</p></article>
    `);

    setHtml("#contents-grid", `
      <article class="list-card"><strong>Mi plan</strong><p>Las indicaciones y ejercicios que debes revisar.</p></article>
      <article class="list-card"><strong>Mi registro</strong><p>Una comprobación breve para contar cómo ha estado tu día.</p></article>
      <article class="list-card"><strong>Mi progreso</strong><p>Una lectura visual sencilla de tu evolución.</p></article>
      <article class="list-card"><strong>Ayuda</strong><p>Orientación para problemas de acceso o funcionamiento, sin reemplazar la atención de salud.</p></article>
    `);

    setHtml("#faq-grid", `
      <details><summary>¿Necesito conocimientos de salud?</summary><p>No. Recupera utiliza instrucciones breves y lenguaje cotidiano.</p></details>
      <details><summary>¿Quién define mis ejercicios?</summary><p>Tu plan debe provenir del profesional que te evalúa o acompaña. Recupera ayuda a seguirlo; no prescribe ni diagnostica.</p></details>
      <details><summary>¿Qué hago si empeoro o aparece algo preocupante?</summary><p>Suspende lo que estés haciendo y contacta al profesional o al servicio de salud correspondiente. Recupera no es un servicio de urgencia.</p></details>
      <details><summary>¿Puedo compartir mi progreso?</summary><p>Puedes utilizar el resumen para conversar sobre tu evolución, evitando enviar información sensible por canales inseguros.</p></details>
      <details><summary>¿Cuánto dura el acceso?</summary><p>La compra nueva incluye 3 meses desde la aprobación en Hotmart.</p></details>
    `);

    setText("#disclaimer", "Recupera es una herramienta de seguimiento. No diagnostica, no modifica tu tratamiento y no reemplaza la evaluación profesional ni la atención de urgencia.");

    const related = document.querySelector("#related-title")?.closest("section");
    if (related) related.hidden = true;

    const guide = document.createElement("section");
    guide.id = "kc-patient-simple-guide";
    guide.className = "section kc-guided-route patient";
    guide.innerHTML = `
      <div class="kc-route-heading"><span>ASÍ DE SIMPLE</span><h2>Tres acciones. Nada más.</h2><p>Recupera está pensada para acompañar tu día, no para convertirte en experto en salud.</p></div>
      <ol class="kc-route-steps">
        <li class="active"><b>1</b><div><strong>Revisa tu plan</strong><span>Mira qué corresponde hacer hoy.</span></div></li>
        <li><b>2</b><div><strong>Registra cómo estás</strong><span>Responde preguntas breves y comprensibles.</span></div></li>
        <li><b>3</b><div><strong>Observa tu avance</strong><span>Usa la información para conversar con tu profesional.</span></div></li>
      </ol>
    `;
    insertBeforeOutcomes(guide);

    document.querySelectorAll("[data-checkout]").forEach((button) => {
      if (!button.textContent.includes("$") && button.textContent !== "Comenzar con Recupera") button.textContent = "Comenzar con Recupera";
    });
  }

  function apply() {
    loadStyles();
    rewriteAccess();
    if (slug === "kinecheck-estudiante") studentRoute();
    if (slug === "kinecheck-recupera") patientExperience();
  }

  let applied = false;
  function runWhenReady() {
    if (applied || !document.querySelector("#product-title") || !document.querySelector("#outcomes-grid")) return;
    applied = true;
    apply();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", runWhenReady, { once: true });
  else runWhenReady();

  const observer = new MutationObserver(() => {
    runWhenReady();
    rewriteAccess();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
})();
