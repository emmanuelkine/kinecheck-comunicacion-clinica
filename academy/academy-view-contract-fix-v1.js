(() => {
  "use strict";

  if (window.__KINECHECK_VIEW_CONTRACT_FIX_V1__) return;
  window.__KINECHECK_VIEW_CONTRACT_FIX_V1__ = true;

  const VIEW_ALIASES = Object.freeze({
    productos: "biblioteca",
    recursos: "biblioteca",
    "evidencia-semanal": "biblioteca",
    "mis-cursos": "biblioteca",
    cuenta: "perfil",
    "mi-cuenta": "perfil",
  });
  const VIEWS = new Set(["inicio", "biblioteca", "herramientas", "perfil", "explorar"]);

  function normalizeView(value) {
    const raw = String(value || "").replace(/^#/, "").trim().toLowerCase();
    const mapped = VIEW_ALIASES[raw] || raw;
    return VIEWS.has(mapped) ? mapped : "inicio";
  }

  function applyView(view) {
    const next = normalizeView(view);
    if (document.body.dataset.kcView !== next) document.body.dataset.kcView = next;

    document.querySelectorAll("[data-kc-section]").forEach((section) => {
      const sectionView = normalizeView(section.dataset.kcSection);
      section.hidden = sectionView !== next;
    });

    document.querySelectorAll(".kc-primary-view").forEach((section) => {
      section.hidden = next !== "inicio";
    });

    document.querySelectorAll("[data-kc-view-link]").forEach((link) => {
      link.classList.toggle("active", normalizeView(link.dataset.kcViewLink) === next);
    });

    return next;
  }

  function currentView() {
    const hash = String(location.hash || "").replace(/^#/, "");
    if (hash && !/[=&]/.test(hash)) return normalizeView(hash);
    return normalizeView(document.body.dataset.kcView || "inicio");
  }

  function init() {
    applyView(currentView());

    const bodyObserver = new MutationObserver(() => {
      applyView(document.body.dataset.kcView || currentView());
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["data-kc-view"] });
  }

  // This listener is intentionally registered before the legacy bridge. It only
  // repairs which view is visible; it does not open products or bypass licenses.
  window.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest?.("[data-kc-view-link]");
    if (!link) return;
    applyView(link.dataset.kcViewLink || "inicio");
  }, true);

  window.addEventListener("popstate", () => applyView(currentView()));
  window.addEventListener("hashchange", () => applyView(currentView()));
  window.addEventListener("pageshow", () => applyView(currentView()));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
