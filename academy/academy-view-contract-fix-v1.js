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
  let resourcesFrame = 0;

  function normalizeView(value) {
    const raw = String(value || "").replace(/^#/, "").trim().toLowerCase();
    const mapped = VIEW_ALIASES[raw] || raw;
    return VIEWS.has(mapped) ? mapped : "inicio";
  }

  function ensureSharedStyles() {
    if (document.querySelector('link[data-kc-shared-view-contract]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./academy-shared-view-contract-v1.css?v=20260902-repair2";
    link.dataset.kcSharedViewContract = "v1";
    document.head.appendChild(link);
  }

  function fixBrandAndNavigationStructure() {
    const topbarDescriptor = document.querySelector(".topbar-brand > div > span");
    if (topbarDescriptor) topbarDescriptor.textContent = "ECOSISTEMA";

    const sidebarDescriptor = document.querySelector(".sidebar-brand > div > span");
    if (sidebarDescriptor) sidebarDescriptor.textContent = "ECOSISTEMA";

    const labels = Object.freeze({
      inicio: ["⌂", "Inicio"],
      biblioteca: ["▤", "Biblioteca"],
      herramientas: ["✚", "Recursos"],
      perfil: ["○", "Cuenta"],
    });
    const bottom = document.querySelector("#kc-bottom-nav");
    if (bottom) {
      bottom.querySelectorAll("[data-kc-view-link]").forEach((link) => {
        const data = labels[link.dataset.kcViewLink];
        if (!data) return;
        const hasExpectedStructure = link.querySelector("span") && link.querySelector("small");
        if (!hasExpectedStructure) {
          link.innerHTML = `<span aria-hidden="true">${data[0]}</span><small>${data[1]}</small>`;
        } else {
          link.querySelector("span").textContent = data[0];
          link.querySelector("small").textContent = data[1];
        }
      });
    }
  }

  function normalizeResourceCopy() {
    const section = document.querySelector("#herramientas");
    if (!section) return;
    const eyebrow = section.querySelector(":scope > .section-heading .eyebrow");
    const title = section.querySelector(":scope > .section-heading h1");
    const copy = section.querySelector(":scope > .section-heading p");
    if (eyebrow) eyebrow.textContent = "RECURSOS KINECHECK";
    if (title) title.textContent = "Recursos para aprender y decidir mejor";
    if (copy) copy.textContent = "Accede a tus aplicaciones activas y consulta las herramientas y recursos que se incorporan al ecosistema.";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function isOwned(course) {
    const slug = String(course?.slug || "").trim();
    if (!slug) return false;
    const safe = window.CSS?.escape ? CSS.escape(slug) : slug.replace(/[^a-zA-Z0-9_-]/g, "");
    const card = document.querySelector(`[data-card-course="${safe}"]`);
    const button = card?.querySelector("[data-course]");
    return Boolean(button && !button.disabled && button.getAttribute("aria-disabled") !== "true");
  }

  function renderResourceApplications() {
    const container = document.querySelector("#apps-grid");
    const courses = window.KINECHECK_ACADEMY_CONFIG?.courses;
    if (!container || !Array.isArray(courses)) return;

    const activeApps = courses.filter((course) => (
      course?.kind === "application"
      && course?.status === "active"
      && isOwned(course)
    ));

    if (!activeApps.length) {
      container.replaceChildren();
      return;
    }

    container.innerHTML = activeApps.map((course) => `
      <article class="kc-resource-app-card">
        <div class="kc-resource-app-top">
          <span class="kc-resource-app-icon" aria-hidden="true">${escapeHtml(course.icon || "KC")}</span>
          <span class="kc-resource-app-status">Activo</span>
        </div>
        <small>Aplicación</small>
        <h3>${escapeHtml(course.title || "KineCheck")}</h3>
        <p>${escapeHtml(course.subtitle || "Aplicación incluida en tu cuenta KineCheck.")}</p>
        <button type="button" data-kc-open-product="${escapeHtml(course.slug)}">Abrir</button>
      </article>
    `).join("");
  }

  function scheduleResourceRender() {
    if (resourcesFrame) return;
    resourcesFrame = window.requestAnimationFrame(() => {
      resourcesFrame = 0;
      renderResourceApplications();
    });
  }

  function observeResourceState() {
    const grid = document.querySelector("#course-grid");
    if (!grid || grid.dataset.kcResourceObserver === "true") return;
    grid.dataset.kcResourceObserver = "true";
    const observer = new MutationObserver(scheduleResourceRender);
    observer.observe(grid, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled", "class"],
    });
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

    if (next === "herramientas") scheduleResourceRender();
    return next;
  }

  function currentView() {
    const hash = String(location.hash || "").replace(/^#/, "");
    if (hash && !/[=&]/.test(hash)) return normalizeView(hash);
    return normalizeView(document.body.dataset.kcView || "inicio");
  }

  function init() {
    ensureSharedStyles();
    fixBrandAndNavigationStructure();
    normalizeResourceCopy();
    observeResourceState();
    scheduleResourceRender();
    applyView(currentView());

    const bodyObserver = new MutationObserver(() => {
      applyView(document.body.dataset.kcView || currentView());
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["data-kc-view"] });
  }

  // This listener is intentionally registered before the legacy bridge. It only
  // repairs which view is visible; product opening remains in the licensed opener.
  window.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest?.("[data-kc-view-link]");
    if (!link) return;
    applyView(link.dataset.kcViewLink || "inicio");
  }, true);

  window.addEventListener("popstate", () => applyView(currentView()));
  window.addEventListener("hashchange", () => applyView(currentView()));
  window.addEventListener("pageshow", () => {
    fixBrandAndNavigationStructure();
    normalizeResourceCopy();
    scheduleResourceRender();
    applyView(currentView());
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
