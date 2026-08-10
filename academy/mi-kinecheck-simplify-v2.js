(() => {
  "use strict";

  if (window.__MI_KINECHECK_SIMPLIFY_V2__) return;
  window.__MI_KINECHECK_SIMPLIFY_V2__ = true;

  const VERSION = "20260810-interactionfix1";
  const STUDENT_ORDER = [
    "kinecheck-estudiante",
    "mas-alla-del-dolor",
    "comunicacion-clinica",
    "evidencia-aplicada",
    "traumatologia-ortopedia-clinica",
  ];

  let timer = 0;

  function loadStyles() {
    if (document.querySelector("link[data-mi-kinecheck-simplify-v2]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `./mi-kinecheck-simplify-v2.css?v=${VERSION}`;
    link.dataset.miKinecheckSimplifyV2 = "true";
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

  function hide(node, value = true) {
    if (!node) return;
    node.classList.toggle("mi-kc-simplified-hidden", value);
    node.setAttribute("aria-hidden", value ? "true" : "false");
    if (value) node.setAttribute("tabindex", "-1");
    else node.removeAttribute("tabindex");
  }

  function hideAll(selector, value = true) {
    document.querySelectorAll(selector).forEach((node) => hide(node, value));
  }

  function labelView(view, label, hidden = false) {
    document.querySelectorAll(`[data-kc-view-link="${view}"]`).forEach((node) => {
      if (node.matches(".topbar-brand,.sidebar-brand,.mobile-brand")) return;
      if (node.closest(".kc-home-actions,.kc-section-heading")) return;
      const textNode = node.querySelector("span:last-child") || node;
      if (textNode.textContent !== label) textNode.textContent = label;
      hide(node, hidden);
    });
  }

  function activeButton(slug) {
    return [...document.querySelectorAll(`[data-course="${CSS.escape(slug)}"]`)]
      .find((button) => !button.disabled) || null;
  }

  function activeSlugs() {
    return new Set(
      [...document.querySelectorAll("button[data-course]:not([disabled])")]
        .map((button) => String(button.dataset.course || "").trim())
        .filter(Boolean),
    );
  }

  function role() {
    if (document.body.dataset.kcExperience) return document.body.dataset.kcExperience;
    const slugs = activeSlugs();
    const nonPatient = [...slugs].filter((slug) => slug !== "kinecheck-recupera");
    if (slugs.has("kinecheck-recupera") && nonPatient.length === 0) return "patient";
    if (slugs.has("kinecheck-estudiante") && !slugs.has("kinecheck-clinico") && !slugs.has("kinecheck-clinico-curso")) return "student";
    return "professional";
  }

  function resetSimplifiedVisibility() {
    document.querySelectorAll(".mi-kc-simplified-hidden").forEach((node) => hide(node, false));
    document.body.classList.remove("mi-kc-focused-student", "mi-kc-focused-patient");
  }

  function releaseStaleInteractionLocks() {
    const stageModal = document.querySelector("#kc-stage-modal");
    if (stageModal) {
      if (!stageModal.hidden) stageModal.hidden = true;
      if (stageModal.getAttribute("aria-hidden") !== "true") stageModal.setAttribute("aria-hidden", "true");
      if (!stageModal.hasAttribute("inert")) stageModal.setAttribute("inert", "");
    }

    // Recupera sesiones que quedaron congeladas por el selector legado oculto.
    document.body.classList.remove("kc-stage-modal-open");

    // Una evaluación cerrada tampoco debe conservar su bloqueo de scroll al
    // volver desde el historial o restaurar una pestaña.
    const reviewModal = document.querySelector("#review-modal");
    if (!reviewModal || reviewModal.hidden) document.body.classList.remove("review-open");
  }

  function removeStageChooser() {
    releaseStaleInteractionLocks();

    hideAll("#kc-learning-path,#kc-profile-stage,#kc-sidebar-stage,#kc-topbar-stage,#kc-stage-modal", true);
    hideAll("#kc-change-stage,#kc-profile-stage-change,[data-kc-stage-choice],#kc-stage-suggested", true);
    document.documentElement.classList.add("mi-kc-stage-inferred");
  }

  function hideHomeSectionsByHeading(selectors) {
    selectors.forEach((selector) => {
      const heading = document.querySelector(selector);
      hide(heading?.closest(".kc-home-section"), true);
    });
  }

  function firstStudentProduct() {
    return STUDENT_ORDER.find((slug) => activeButton(slug)) || "";
  }

  function installStudentFooter(section) {
    if (!section || section.querySelector(".mi-kc-student-footer")) return;
    const footer = document.createElement("div");
    footer.className = "mi-kc-student-footer";
    footer.innerHTML = `
      <p><strong>Tu inicio siempre será esta ruta.</strong> “Mis productos” reúne todo lo comprado; “Recursos” contiene material complementario.</p>
      <div>
        <button type="button" data-mi-kc-view="biblioteca">Ver todos mis productos</button>
        <button type="button" class="secondary" data-mi-kc-view="herramientas">Abrir recursos</button>
      </div>
    `;
    section.appendChild(footer);
  }

  function installPatientHelp(section) {
    if (!section || section.querySelector(".mi-kc-patient-help")) return;
    const help = document.createElement("aside");
    help.className = "mi-kc-patient-help";
    help.innerHTML = `
      <div><strong>¿Algo no funciona?</strong><span>Revisa la ayuda o contacta soporte. No envíes información clínica identificable.</span></div>
      <a href="../ayuda/">Abrir ayuda</a>
    `;
    section.appendChild(help);
  }

  function simplifyStudent() {
    document.body.dataset.kcExperience = "student";
    document.body.classList.add("mi-kc-focused-student");

    labelView("inicio", "Mi ruta");
    labelView("biblioteca", "Mis productos");
    labelView("herramientas", "Recursos");
    labelView("perfil", "Cuenta y ayuda");

    hide(document.querySelector(".continue-panel"), true);
    hide(document.querySelector("#onboarding"), true);
    hide(document.querySelector(".kc-explore-link"), true);
    hideAll('.kc-home-actions [data-kc-view-link="explorar"]', true);
    hideHomeSectionsByHeading(["#home-apps-title", "#home-courses-title", "#home-library-title", "#home-news-title"]);

    setText(".kc-home-hero .eyebrow", "MI RUTA DE APRENDIZAJE");
    setHtml(".kc-home-hero h1", "Empieza por una cosa.<br><em>Avanza con sentido.</em>");
    setText("#welcome", "La página de inicio muestra únicamente el orden recomendado. Tus demás productos permanecen en “Mis productos”.");
    setText("#kc-home-continue", "Continuar el siguiente paso");

    const guided = document.querySelector("#kc-guided-experience.student");
    if (guided) {
      document.querySelector("#inicio")?.insertAdjacentElement("afterend", guided);
      setText("#kc-guided-experience .kc-guided-heading > span", "TU SECUENCIA PRINCIPAL");
      setText("#kc-guided-experience .kc-guided-heading h2", "Qué hacer primero y qué dejar para después.");
      setText("#kc-guided-experience .kc-guided-heading p", "La ruta usa únicamente los productos activos de tu cuenta y evita que tengas que elegir entre muchas puertas.");
      const items = [...guided.querySelectorAll(".kc-student-path > li:not(.empty)")];
      items.forEach((item, index) => {
        let badge = item.querySelector(".mi-kc-step-status");
        if (!badge) {
          badge = document.createElement("small");
          badge.className = "mi-kc-step-status";
          item.querySelector("div")?.prepend(badge);
        }
        badge.textContent = index === 0 ? "PASO RECOMENDADO AHORA" : `DESPUÉS · PASO ${index + 1}`;
      });
      installStudentFooter(guided);
    }

    const count = document.querySelector(".access-summary span");
    if (count) count.textContent = "productos activos";
  }

  function simplifyPatient() {
    document.body.dataset.kcExperience = "patient";
    document.body.classList.add("mi-kc-focused-patient");

    labelView("inicio", "Hoy");
    labelView("biblioteca", "Mi plan", true);
    labelView("herramientas", "Recursos", true);
    labelView("perfil", "Ayuda");

    hide(document.querySelector(".continue-panel"), true);
    hide(document.querySelector("#onboarding"), true);
    hide(document.querySelector(".kc-explore-link"), true);
    hideAll('.kc-home-actions [data-kc-view-link="explorar"]', true);
    hideHomeSectionsByHeading(["#home-apps-title", "#home-courses-title", "#home-library-title", "#home-news-title"]);
    hide(document.querySelector(".access-summary"), true);

    setText(".kc-home-hero .eyebrow", "MI RECUPERACIÓN");
    setHtml(".kc-home-hero h1", "Lo de hoy.<br><em>Sin menús complicados.</em>");
    setText("#welcome", "Abre tu plan, registra cómo estás y revisa tu avance. No necesitas navegar cursos ni herramientas clínicas.");
    setText("#kc-home-continue", "Abrir mi plan de hoy");

    const guided = document.querySelector("#kc-guided-experience.patient");
    if (guided) {
      document.querySelector("#inicio")?.insertAdjacentElement("afterend", guided);
      setText("#kc-guided-experience .kc-guided-heading > span", "HOY");
      setText("#kc-guided-experience .kc-guided-heading h2", "Tres acciones. Nada más.");
      setText("#kc-guided-experience .kc-guided-heading p", "La información está pensada para acompañar tu plan y conversar con tu profesional, no para que interpretes datos clínicos.");
      installPatientHelp(guided);
    }

    setText("#sidebar-access", "Plan activo");
  }

  function simplifyProfessional() {
    labelView("inicio", "Inicio");
    labelView("biblioteca", "Mis productos");
    labelView("herramientas", "Recursos");
    labelView("perfil", "Cuenta y ayuda");
  }

  function apply() {
    loadStyles();
    if (document.querySelector("#dashboard-view")?.hidden) {
      removeStageChooser();
      return;
    }
    resetSimplifiedVisibility();
    removeStageChooser();
    const currentRole = role();
    if (currentRole === "student") simplifyStudent();
    else if (currentRole === "patient") simplifyPatient();
    else simplifyProfessional();
  }

  // Este módulo queda exclusivamente visual. La navegación y apertura pertenecen al controlador global de Academy.
  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, 100);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();

  window.addEventListener("pageshow", () => {
    releaseStaleInteractionLocks();
    schedule();
  });

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden", "disabled", "data-kc-experience"],
  });
})();
