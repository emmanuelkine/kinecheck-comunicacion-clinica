(() => {
  const CONFIG = window.KINECHECK_ACADEMY_CONFIG;
  if (!CONFIG) return;

  const SESSION_KEY = "kinecheck_secure_session_v1";
  const STAGE_KEY_PREFIX = "kinecheck_learning_stage_v1";
  const PATH_ORDER = ["student", "intern", "professional"];

  const STAGES = Object.freeze({
    student: {
      label: "Estudiante",
      shortLabel: "Etapa estudiante",
      number: "01",
      hero: "Aprende con una ruta clara.",
      welcome: "KineCheck prioriza fundamentos, evaluación guiada, comunicación y razonamiento clínico para ayudarte a construir una base sólida.",
      focusTitle: "Construye fundamentos antes de acelerar",
      focusCopy: "Avanza desde la evaluación paso a paso hacia la comprensión del dolor, la comunicación y el uso crítico de evidencia.",
      appsTitle: "Aplicaciones para aprender con estructura",
      coursesTitle: "Cursos recomendados para construir tu base clínica",
      libraryTitle: "Recursos para estudiar, practicar y comprender",
      toolsTitle: "Herramientas para aprender haciendo",
      toolsCopy: "Utiliza guías, casos, escalas y apoyos que te permitan comprender el proceso antes de memorizar respuestas.",
      recommendations: [
        "kinecheck-estudiante",
        "comunicacion-clinica",
        "mas-alla-del-dolor",
        "evidencia-aplicada",
        "traumatologia-ortopedia-clinica"
      ]
    },
    intern: {
      label: "Internado",
      shortLabel: "Etapa de internado",
      number: "02",
      hero: "Conecta teoría y práctica clínica.",
      welcome: "KineCheck reorganiza tus contenidos para ayudarte a evaluar, comunicar, justificar decisiones y desenvolverte con mayor seguridad en escenarios reales.",
      focusTitle: "Integra conocimientos en decisiones reales",
      focusCopy: "Prioriza razonamiento clínico, seguridad, comunicación con pacientes, evidencia aplicada y casos que exijan justificar cada decisión.",
      appsTitle: "Aplicaciones para organizar tu práctica formativa",
      coursesTitle: "Cursos para consolidar el paso a la clínica real",
      libraryTitle: "Evidencia y recursos para preparar tus casos",
      toolsTitle: "Herramientas para el razonamiento en internado",
      toolsCopy: "Practica con casos, plantillas y recursos que conectan la evaluación con decisiones seguras, comunicación y seguimiento.",
      recommendations: [
        "mas-alla-del-dolor",
        "traumatologia-ortopedia-clinica",
        "comunicacion-clinica",
        "evidencia-aplicada",
        "kinecheck-estudiante",
        "kinecheck-lab-clinico"
      ]
    },
    professional: {
      label: "Profesional",
      shortLabel: "Etapa profesional",
      number: "03",
      hero: "Decide, registra y evoluciona.",
      welcome: "KineCheck prioriza herramientas para la práctica clínica, actualización continua, comunicación, registro y toma de decisiones basada en evidencia.",
      focusTitle: "Fortalece tu práctica y mantente actualizado",
      focusCopy: "Integra registro profesional, evidencia semanal, comunicación clínica, seguridad y recursos aplicables al trabajo cotidiano.",
      appsTitle: "Aplicaciones para tu práctica profesional",
      coursesTitle: "Formación continua para decisiones clínicas más sólidas",
      libraryTitle: "Actualización clínica y recursos para aplicar",
      toolsTitle: "Herramientas para decidir, registrar y seguir",
      toolsCopy: "Accede a aplicaciones, escalas, plantillas, calculadoras y casos diseñados para apoyar la práctica sin sustituir el juicio profesional.",
      recommendations: [
        "kinecheck-clinico",
        "evidencia-aplicada",
        "comunicacion-clinica",
        "traumatologia-ortopedia-clinica",
        "mas-alla-del-dolor",
        "kinecheck-lab-clinico"
      ]
    },
    patient: {
      label: "Paciente",
      shortLabel: "Próximamente",
      number: "R",
      hero: "KineCheck Recupera estará disponible próximamente.",
      welcome: "La aplicación permanece bloqueada mientras se revisan privacidad, protección de datos y seguridad.",
      focusTitle: "Registro temporalmente deshabilitado",
      focusCopy: "No ingreses información de salud: KineCheck Recupera todavía no está disponible.",
      appsTitle: "Aplicación en preparación",
      coursesTitle: "Recursos disponibles en tu cuenta",
      libraryTitle: "Materiales para comprender y comunicar tu progreso",
      toolsTitle: "Herramientas para tu seguimiento",
      toolsCopy: "KineCheck Recupera no admite registros mientras permanece Próximamente.",
      recommendations: []
    }
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let activeStage = "";
  let renderTimer = 0;
  let decorating = false;

  function currentSession() {
    const provided = window.KINECHECK_ACADEMY_SESSION?.get?.();
    if (provided?.access_token) return provided;
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function storageScope() {
    const current = currentSession();
    return String(current?.user?.email || current?.user?.id || "anonymous").trim().toLowerCase();
  }

  function storageKey() {
    return `${STAGE_KEY_PREFIX}:${storageScope()}`;
  }

  function readSavedStage() {
    const value = String(localStorage.getItem(storageKey()) || "");
    return STAGES[value] ? value : "";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function productStatus(course) {
    const card = document.querySelector(`[data-card-course="${CSS.escape(course.slug)}"]`);
    const button = card?.querySelector(`[data-course="${CSS.escape(course.slug)}"]`);
    const badge = card?.querySelector(".status-badge")?.textContent?.trim().toLowerCase() || "";
    if (button && !button.disabled) return "owned";
    if (badge.includes("próximamente")) return "preparing";
    if (badge.includes("verificando")) return "checking";
    return "locked";
  }

  function inferStage() {
    const owned = new Set(CONFIG.courses.filter((course) => productStatus(course) === "owned").map((course) => course.slug));
    const nonPatientOwned = [...owned].some((slug) => slug !== "kinecheck-recupera");
    if (owned.has("kinecheck-recupera") && !nonPatientOwned) return "patient";
    if (owned.has("kinecheck-clinico")) return "professional";
    if (owned.has("kinecheck-estudiante")) return "student";
    return "student";
  }

  function currentProfile() {
    return STAGES[activeStage] || STAGES.student;
  }

  function displayName() {
    const email = String(currentSession()?.user?.email || "").trim().toLowerCase();
    if (email.includes("emmanuel")) return "Emmanuel";
    const local = email.split("@")[0].split(/[+._-]/)[0] || "";
    return local ? `${local.charAt(0).toUpperCase()}${local.slice(1)}` : "Bienvenido";
  }

  function showToast(text) {
    const toast = $("#kc-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3200);
  }

  function timelineMarkup(stage) {
    if (stage === "patient") {
      return `
        <div class="kc-patient-route">
          <span>R</span>
          <div><strong>Ruta de recuperación</strong><p>Seguimiento, adherencia y comunicación del progreso con tu profesional tratante.</p></div>
        </div>
      `;
    }

    const activeIndex = PATH_ORDER.indexOf(stage);
    return `
      <div class="kc-stage-timeline" aria-label="Ruta desde estudiante hasta profesional">
        ${PATH_ORDER.map((key, index) => {
          const profile = STAGES[key];
          const state = index < activeIndex ? "completed" : index === activeIndex ? "active" : "upcoming";
          return `
            <div class="kc-stage-step ${state}">
              <span>${profile.number}</span>
              <div><strong>${profile.label}</strong><small>${state === "active" ? "Tu etapa actual" : state === "completed" ? "Etapa recorrida" : "Siguiente etapa"}</small></div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function recommendationCard(course) {
    const status = productStatus(course);
    const owned = status === "owned";
    const preparing = status === "preparing";
    const action = owned
      ? `<button type="button" data-kc-path-open="${escapeHtml(course.slug)}">${course.kind === "course" ? "Continuar" : "Abrir"}</button>`
      : preparing
        ? '<button type="button" disabled>Próximamente</button>'
        : `<button type="button" class="secondary" data-kc-path-explore="${escapeHtml(course.slug)}">Conocer</button>`;
    return `
      <article class="kc-stage-recommendation-card">
        <div class="kc-stage-recommendation-top"><span>${escapeHtml(course.icon || "KC")}</span><small>${owned ? "Disponible" : preparing ? "En preparación" : "Recomendado"}</small></div>
        <h3>${escapeHtml(course.title)}</h3>
        <p>${escapeHtml(course.subtitle || "Producto KineCheck")}</p>
        ${action}
      </article>
    `;
  }

  function ensureLayout() {
    if (!$("#kc-learning-path")) {
      const section = document.createElement("section");
      section.id = "kc-learning-path";
      section.className = "kc-learning-path";
      section.dataset.kcSection = "inicio";
      section.setAttribute("aria-labelledby", "kc-learning-path-title");
      section.innerHTML = `
        <div class="kc-learning-path-head">
          <div><span class="eyebrow compact">TU RUTA KINECHECK</span><h2 id="kc-learning-path-title">Una experiencia para cada etapa</h2><p id="kc-learning-path-copy"></p></div>
          <button id="kc-change-stage" type="button">Cambiar etapa</button>
        </div>
        <div id="kc-stage-timeline"></div>
        <div class="kc-stage-focus">
          <div><span id="kc-stage-number"></span><div><small id="kc-stage-label"></small><h3 id="kc-stage-focus-title"></h3><p id="kc-stage-focus-copy"></p></div></div>
        </div>
        <div class="kc-stage-recommendation-heading"><strong>Recomendado para tu etapa</strong><span>Todos tus productos seguirán disponibles en Biblioteca y Herramientas.</span></div>
        <div id="kc-stage-recommendations" class="kc-stage-recommendations"></div>
      `;
      $("#inicio")?.insertAdjacentElement("afterend", section);
    }

    if (!$("#kc-profile-stage")) {
      const block = document.createElement("section");
      block.id = "kc-profile-stage";
      block.className = "kc-profile-stage";
      block.innerHTML = `
        <div><span id="kc-profile-stage-number"></span><div><small>MI ETAPA</small><h2 id="kc-profile-stage-label"></h2><p id="kc-profile-stage-copy"></p></div></div>
        <button id="kc-profile-stage-change" type="button">Cambiar etapa</button>
      `;
      $("#cuenta .kc-page-heading")?.insertAdjacentElement("afterend", block);
    }

    if (!$("#kc-sidebar-stage")) {
      const button = document.createElement("button");
      button.id = "kc-sidebar-stage";
      button.className = "kc-sidebar-stage";
      button.type = "button";
      button.innerHTML = '<span id="kc-sidebar-stage-number"></span><span><small>MI ETAPA</small><strong id="kc-sidebar-stage-label"></strong></span>';
      $(".sidebar-account")?.prepend(button);
    }

    if (!$("#kc-topbar-stage")) {
      const chip = document.createElement("button");
      chip.id = "kc-topbar-stage";
      chip.className = "kc-topbar-stage";
      chip.type = "button";
      $(".topbar-greeting")?.appendChild(chip);
    }

    if (!$("#kc-stage-modal")) {
      const modal = document.createElement("div");
      modal.id = "kc-stage-modal";
      modal.className = "kc-stage-modal";
      modal.hidden = true;
      modal.innerHTML = `
        <div class="kc-stage-dialog" role="dialog" aria-modal="true" aria-labelledby="kc-stage-dialog-title">
          <span class="eyebrow compact">PERSONALIZA TU EXPERIENCIA</span>
          <h2 id="kc-stage-dialog-title">¿En qué etapa estás?</h2>
          <p>KineCheck no bloqueará contenidos. Solo reorganizará las recomendaciones y herramientas para acompañarte mejor.</p>
          <div class="kc-stage-choice-grid">
            <button type="button" data-kc-stage-choice="student"><span>01</span><strong>Estudiante</strong><small>Fundamentos, evaluación guiada y aprendizaje clínico.</small></button>
            <button type="button" data-kc-stage-choice="intern"><span>02</span><strong>Internado</strong><small>Integración, casos reales, seguridad y decisiones justificadas.</small></button>
            <button type="button" data-kc-stage-choice="professional"><span>03</span><strong>Profesional</strong><small>Práctica clínica, registro, evidencia y actualización continua.</small></button>
          </div>
          <button class="kc-patient-choice" type="button" data-kc-stage-choice="patient"><span>R</span><span><strong>Soy paciente</strong><small>Seguimiento y comunicación de mi recuperación.</small></span></button>
          <button id="kc-stage-suggested" class="kc-stage-suggested" type="button"></button>
        </div>
      `;
      document.body.appendChild(modal);
    }
  }

  function renderRecommendations() {
    const container = $("#kc-stage-recommendations");
    if (!container) return;
    const profile = currentProfile();
    const courses = profile.recommendations
      .map((slug) => CONFIG.courses.find((course) => course.slug === slug))
      .filter(Boolean)
      .slice(0, activeStage === "patient" ? 1 : 4);
    container.innerHTML = courses.map(recommendationCard).join("");
  }

  function updateCopy() {
    const profile = currentProfile();
    const name = displayName();
    const eyebrow = $(".kc-home-hero .eyebrow");
    const heroTitle = $(".kc-home-hero h1");
    if (eyebrow) eyebrow.textContent = `TU RUTA KINECHECK · ${profile.shortLabel.toUpperCase()}`;
    if (heroTitle) heroTitle.innerHTML = `<span id="kc-welcome-name">Bienvenido, ${escapeHtml(name)}</span>.<br><em>${escapeHtml(profile.hero)}</em>`;
    if ($("#welcome")) $("#welcome").textContent = profile.welcome;
    if ($("#home-apps-title")) $("#home-apps-title").textContent = profile.appsTitle;
    if ($("#home-courses-title")) $("#home-courses-title").textContent = profile.coursesTitle;
    if ($("#home-library-title")) $("#home-library-title").textContent = profile.libraryTitle;
    if ($("#tools-title")) $("#tools-title").textContent = profile.toolsTitle;
    const toolsCopy = $("#herramientas .kc-page-heading p");
    if (toolsCopy) toolsCopy.textContent = profile.toolsCopy;
  }

  function renderStage() {
    const profile = currentProfile();
    document.body.dataset.kcStage = activeStage;
    if ($("#kc-learning-path-copy")) $("#kc-learning-path-copy").textContent = `KineCheck adapta el orden y las recomendaciones a tu ${profile.shortLabel.toLowerCase()}, sin modificar tus licencias.`;
    if ($("#kc-stage-timeline")) $("#kc-stage-timeline").innerHTML = timelineMarkup(activeStage);
    if ($("#kc-stage-number")) $("#kc-stage-number").textContent = profile.number;
    if ($("#kc-stage-label")) $("#kc-stage-label").textContent = profile.shortLabel;
    if ($("#kc-stage-focus-title")) $("#kc-stage-focus-title").textContent = profile.focusTitle;
    if ($("#kc-stage-focus-copy")) $("#kc-stage-focus-copy").textContent = profile.focusCopy;
    if ($("#kc-profile-stage-number")) $("#kc-profile-stage-number").textContent = profile.number;
    if ($("#kc-profile-stage-label")) $("#kc-profile-stage-label").textContent = profile.label;
    if ($("#kc-profile-stage-copy")) $("#kc-profile-stage-copy").textContent = profile.focusCopy;
    if ($("#kc-sidebar-stage-number")) $("#kc-sidebar-stage-number").textContent = profile.number;
    if ($("#kc-sidebar-stage-label")) $("#kc-sidebar-stage-label").textContent = profile.label;
    if ($("#kc-topbar-stage")) $("#kc-topbar-stage").textContent = profile.label;
    updateCopy();
    renderRecommendations();
    decorateProductGrids();
  }

  function courseFromCard(card) {
    const title = card.querySelector("h3")?.textContent?.trim();
    return CONFIG.courses.find((course) => course.title === title) || null;
  }

  function reorderGrid(selector) {
    const container = $(selector);
    if (!container) return;
    const priorities = new Map(currentProfile().recommendations.map((slug, index) => [slug, index]));
    const cards = [...container.children].filter((element) => element.matches("article"));
    const ordered = cards.slice().sort((a, b) => {
      const first = courseFromCard(a);
      const second = courseFromCard(b);
      return (priorities.get(first?.slug) ?? 99) - (priorities.get(second?.slug) ?? 99);
    });
    const changed = ordered.some((card, index) => card !== cards[index]);
    if (changed) ordered.forEach((card) => container.appendChild(card));
  }

  function decorateProductGrids() {
    if (decorating) return;
    decorating = true;
    try {
      reorderGrid("#home-app-grid");
      reorderGrid("#home-course-grid");
      const recommended = new Set(currentProfile().recommendations.slice(0, 4));
      $$("#home-app-grid article, #home-course-grid article").forEach((card) => {
        const course = courseFromCard(card);
        let badge = card.querySelector(".kc-stage-card-badge");
        if (course && recommended.has(course.slug)) {
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "kc-stage-card-badge";
            card.prepend(badge);
          }
          badge.textContent = `Recomendado · ${currentProfile().label}`;
        } else {
          badge?.remove();
        }
      });
    } finally {
      decorating = false;
    }
  }

  function openProduct(slug) {
    const button = document.querySelector(`#course-grid [data-course="${CSS.escape(slug)}"]`);
    if (button && !button.disabled) {
      button.click();
      return;
    }
    document.querySelector('[data-kc-view-link="explorar"]')?.click();
    showToast("Este producto todavía no está activo en tu cuenta. Puedes conocerlo en Explorar KineCheck.");
  }

  function openModal() {
    const modal = $("#kc-stage-modal");
    if (!modal) return;

    // Mi KineCheck infiere el perfil desde los productos activos y oculta este
    // selector legado. No debe abrirse en segundo plano: además de quedar
    // invisible, su clase de modal bloqueaba el desplazamiento de toda Academy.
    if (window.__MI_KINECHECK_SIMPLIFY_V2__ === true) {
      closeModal();
      return;
    }

    modal.removeAttribute("inert");
    modal.removeAttribute("aria-hidden");
    const suggested = inferStage();
    const suggestedButton = $("#kc-stage-suggested");
    if (suggestedButton) {
      suggestedButton.dataset.kcStageChoice = suggested;
      suggestedButton.textContent = `Usar etapa sugerida: ${STAGES[suggested].label}`;
    }
    modal.hidden = false;
    document.body.classList.add("kc-stage-modal-open");
  }

  function closeModal() {
    const modal = $("#kc-stage-modal");
    if (modal && !modal.hidden) modal.hidden = true;
    document.body.classList.remove("kc-stage-modal-open");
  }

  function scheduleStageChooser() {
    if (readSavedStage() || window.__MI_KINECHECK_SIMPLIFY_V2__ === true) {
      closeModal();
      return;
    }

    window.setTimeout(() => {
      if (!readSavedStage()) openModal();
    }, 350);
  }

  function selectStage(stage, notify = true) {
    if (!STAGES[stage]) return;
    activeStage = stage;
    localStorage.setItem(storageKey(), stage);
    closeModal();
    renderStage();
    if (notify) showToast(`KineCheck ahora está organizado para tu etapa: ${STAGES[stage].label}.`);
  }

  function wireEvents() {
    document.addEventListener("click", (event) => {
      const choice = event.target.closest("[data-kc-stage-choice]");
      if (choice) {
        selectStage(choice.dataset.kcStageChoice);
        return;
      }
      if (event.target.closest("#kc-change-stage, #kc-profile-stage-change, #kc-sidebar-stage, #kc-topbar-stage")) {
        openModal();
        return;
      }
      const open = event.target.closest("[data-kc-path-open]");
      if (open) {
        openProduct(open.dataset.kcPathOpen);
        return;
      }
      const explore = event.target.closest("[data-kc-path-explore]");
      if (explore) {
        document.querySelector('[data-kc-view-link="explorar"]')?.click();
      }
    });
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderStage, 80);
  }

  function observePlatform() {
    const grid = $("#course-grid");
    if (grid) {
      new MutationObserver(scheduleRender).observe(grid, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled", "class"]
      });
    }
    ["#home-app-grid", "#home-course-grid"].forEach((selector) => {
      const container = $(selector);
      if (container) new MutationObserver(scheduleRender).observe(container, { childList: true, subtree: true });
    });
    const dashboard = $("#dashboard-view");
    if (dashboard) {
      new MutationObserver(() => {
        if (!dashboard.hidden) {
          activeStage = readSavedStage() || inferStage();
          renderStage();
          scheduleStageChooser();
        }
      }).observe(dashboard, { attributes: true, attributeFilter: ["hidden"] });
    }
  }

  function init() {
    ensureLayout();
    wireEvents();
    observePlatform();
    activeStage = readSavedStage() || inferStage();
    renderStage();
    if (!$("#dashboard-view")?.hidden) scheduleStageChooser();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
