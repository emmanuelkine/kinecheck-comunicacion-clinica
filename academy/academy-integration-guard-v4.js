(() => {
  const CONFIG = window.KINECHECK_ACADEMY_CONFIG || {};
  const APPLICATIONS = new Set([
    "kinecheck-clinico",
    "kinecheck-estudiante",
    "kinecheck-recupera",
  ]);
  const INTEGRATION_SUFFIX = " Acceso único en integración; tu licencia se conserva.";
  const ssoEnabled = Boolean(CONFIG.appSso?.enabled);
  let applying = false;

  function cleanText(value) {
    return String(value || "").replace(INTEGRATION_SUFFIX, "").trim();
  }

  function cleanEnabledPresentation() {
    (CONFIG.courses || []).forEach((course) => {
      if (!APPLICATIONS.has(course.slug)) return;
      course.integrationPending = false;
      course.subtitle = cleanText(course.subtitle);

      document.querySelectorAll(`[data-card-course="${CSS.escape(course.slug)}"] p`).forEach((paragraph) => {
        paragraph.textContent = cleanText(paragraph.textContent);
      });

      document.querySelectorAll(`[data-kc-path-open="${CSS.escape(course.slug)}"], [data-kc-path-explore="${CSS.escape(course.slug)}"]`).forEach((button) => {
        const paragraph = button.closest("article")?.querySelector("p");
        if (paragraph) paragraph.textContent = cleanText(paragraph.textContent);
      });
    });
  }

  function markButton(button) {
    const slug = button?.dataset?.course;
    if (!APPLICATIONS.has(slug)) return;

    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    button.title = "Tu licencia está activa. El acceso único de esta aplicación todavía está en integración.";
    if (button.textContent.trim() !== "Acceso único en integración") {
      button.textContent = "Acceso único en integración";
    }

    const card = button.closest("article");
    const status = card?.querySelector(".status-badge, .kc-status");
    if (status && status.textContent.trim() !== "En integración") {
      status.textContent = "En integración";
      status.classList.add("preparing");
    }

    const meta = card?.querySelector(".course-meta");
    if (meta && meta.textContent.trim() !== "Licencia activa · acceso único en integración") {
      meta.textContent = "Licencia activa · acceso único en integración";
    }
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
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
        if (button.textContent.trim() !== "En integración") button.textContent = "En integración";
      });

      const continueButton = document.querySelector("#continue-button");
      if (continueButton && APPLICATIONS.has(continueButton.dataset.course)) {
        continueButton.hidden = true;
        continueButton.removeAttribute("data-course");
        const heading = document.querySelector("#continue-heading");
        const copy = document.querySelector("#continue-copy");
        if (heading) heading.textContent = "Elige un contenido disponible";
        if (copy) {
          copy.textContent = "Tus licencias se conservan. Las aplicaciones Clínico, Estudiante y Recupera se habilitarán aquí cuando finalice su integración al acceso único.";
        }
      }
    } finally {
      applying = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyIntegrationState, { once: true });
  } else {
    applyIntegrationState();
  }

  new MutationObserver(applyIntegrationState).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled", "data-course", "data-kc-path-open"],
  });
})();
