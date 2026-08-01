(() => {
  if (window.__KINECHECK_INTEGRATION_GUARD_V4__) return;
  window.__KINECHECK_INTEGRATION_GUARD_V4__ = true;

  const CONFIG = window.KINECHECK_ACADEMY_CONFIG || {};
  const APPLICATIONS = new Set([
    "kinecheck-clinico",
    "kinecheck-estudiante",
    "kinecheck-recupera",
  ]);
  const INTEGRATION_SUFFIX = " Acceso único en integración; tu licencia se conserva.";
  const ssoEnabled = CONFIG.appSso ? Boolean(CONFIG.appSso.enabled) : true;
  let applying = false;

  function cleanText(value) {
    return String(value || "").replace(INTEGRATION_SUFFIX, "").trim();
  }

  function setTextIfChanged(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function closeMobileNavigation() {
    document.querySelector("#academy-sidebar")?.classList.remove("open");
    const overlay = document.querySelector("#sidebar-overlay");
    if (overlay) overlay.hidden = true;
    document.querySelector("#mobile-menu")?.setAttribute("aria-expanded", "false");
  }

  function openLibrary(scrollTarget = "") {
    document.body.dataset.kcView = "biblioteca";

    document.querySelectorAll("[data-kc-view-link]").forEach((link) => {
      link.classList.toggle("active", link.dataset.kcViewLink === "biblioteca");
    });

    const evidence = document.querySelector("#evidencia-semanal");
    if (evidence) evidence.dataset.kcSection = "biblioteca";

    history.replaceState(null, "", "#biblioteca");
    closeMobileNavigation();

    window.requestAnimationFrame(() => {
      const target = scrollTarget ? document.getElementById(scrollTarget) : null;
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function installStableButtonHandlers() {
    if (window.__KINECHECK_STABLE_BUTTON_HANDLERS__) return;
    window.__KINECHECK_STABLE_BUTTON_HANDLERS__ = true;

    document.addEventListener("click", (event) => {
      const onboarding = event.target.closest("#onboarding-action");
      if (onboarding) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openLibrary("productos");
        return;
      }

      const libraryLink = event.target.closest('[data-kc-view-link="biblioteca"]');
      if (libraryLink) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openLibrary(libraryLink.dataset.kcScrollTarget || "");
        return;
      }

      const libraryScroll = event.target.closest("[data-kc-scroll-target]");
      if (libraryScroll) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openLibrary(libraryScroll.dataset.kcScrollTarget || "");
      }
    }, true);

    // Respaldo para botones de recomendación. El enrutador SSO principal
    // los intercepta primero; este controlador solo actúa si aquel no lo hizo.
    document.addEventListener("click", (event) => {
      const recommendation = event.target.closest("[data-kc-path-open]");
      if (!recommendation || event.defaultPrevented) return;

      const slug = String(recommendation.dataset.kcPathOpen || "").trim();
      if (!slug) return;

      const canonicalButton = document.querySelector(
        `#course-grid [data-course="${CSS.escape(slug)}"]`,
      );

      if (canonicalButton && !canonicalButton.disabled) {
        event.preventDefault();
        event.stopPropagation();
        canonicalButton.click();
      }
    });
  }

  function cleanEnabledPresentation() {
    (CONFIG.courses || []).forEach((course) => {
      if (!APPLICATIONS.has(course.slug)) return;

      course.integrationPending = false;
      const cleanSubtitle = cleanText(course.subtitle);
      if (course.subtitle !== cleanSubtitle) course.subtitle = cleanSubtitle;

      document.querySelectorAll(`[data-card-course="${CSS.escape(course.slug)}"] p`).forEach((paragraph) => {
        const cleaned = cleanText(paragraph.textContent);
        setTextIfChanged(paragraph, cleaned);
      });

      document.querySelectorAll(`[data-kc-path-open="${CSS.escape(course.slug)}"], [data-kc-path-explore="${CSS.escape(course.slug)}"]`).forEach((button) => {
        const paragraph = button.closest("article")?.querySelector("p");
        if (!paragraph) return;
        const cleaned = cleanText(paragraph.textContent);
        setTextIfChanged(paragraph, cleaned);
      });
    });
  }

  function markButton(button) {
    const slug = button?.dataset?.course;
    if (!APPLICATIONS.has(slug)) return;

    if (!button.disabled) button.disabled = true;
    if (button.getAttribute("aria-disabled") !== "true") button.setAttribute("aria-disabled", "true");
    const title = "Tu licencia está activa. El acceso único de esta aplicación todavía está en integración.";
    if (button.title !== title) button.title = title;
    setTextIfChanged(button, "Acceso único en integración");

    const card = button.closest("article");
    const status = card?.querySelector(".status-badge, .kc-status");
    if (status) {
      setTextIfChanged(status, "En integración");
      if (!status.classList.contains("preparing")) status.classList.add("preparing");
    }

    const meta = card?.querySelector(".course-meta");
    setTextIfChanged(meta, "Licencia activa · acceso único en integración");
  }

  function applyIntegrationState() {
    if (applying) return;
    applying = true;
    try {
      if (ssoEnabled) {
        cleanEnabledPresentation();
        return;
      }

      document.querySelectorAll("[data-course]").forEach(markButton);

      document.querySelectorAll("[data-kc-path-open]").forEach((button) => {
        if (!APPLICATIONS.has(button.dataset.kcPathOpen)) return;
        if (!button.disabled) button.disabled = true;
        if (button.getAttribute("aria-disabled") !== "true") button.setAttribute("aria-disabled", "true");
        setTextIfChanged(button, "En integración");
      });

      const continueButton = document.querySelector("#continue-button");
      if (continueButton && APPLICATIONS.has(continueButton.dataset.course)) {
        continueButton.hidden = true;
        continueButton.removeAttribute("data-course");
        setTextIfChanged(document.querySelector("#continue-heading"), "Elige un contenido disponible");
        setTextIfChanged(
          document.querySelector("#continue-copy"),
          "Tus licencias se conservan. Las aplicaciones Clínico, Estudiante y Recupera se habilitarán aquí cuando finalice su integración al acceso único.",
        );
      }
    } finally {
      applying = false;
    }
  }

  function start() {
    installStableButtonHandlers();
    applyIntegrationState();

    if (ssoEnabled) {
      // Reintentos finitos para cubrir el render inicial sin mantener un observador permanente.
      window.setTimeout(applyIntegrationState, 150);
      window.setTimeout(applyIntegrationState, 700);
      return;
    }

    const observer = new MutationObserver(applyIntegrationState);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "data-course", "data-kc-path-open"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
