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
