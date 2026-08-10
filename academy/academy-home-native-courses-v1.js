(() => {
  "use strict";

  if (window.__KINECHECK_HOME_STABLE_V1__) return;
  window.__KINECHECK_HOME_STABLE_V1__ = true;

  function stableLibraryCard() {
    return `
      <article class="kc-summary-card kc-home-stable-card">
        <div class="kc-summary-top">
          <span class="kc-summary-icon" aria-hidden="true">KC</span>
          <span class="kc-status">Acceso directo</span>
        </div>
        <div>
          <small>MIS PRODUCTOS</small>
          <h3>Tus cursos están en un solo lugar</h3>
        </div>
        <p>Abre la biblioteca estable para comenzar o continuar cualquiera de tus cursos.</p>
        <a href="#biblioteca" data-kc-view-link="biblioteca">Ver mis productos</a>
      </article>
    `;
  }

  function simplifyHome() {
    // Las aplicaciones Estudiante y Recupera ya existen en Mis productos.
    // Se elimina la copia de Inicio para evitar botones duplicados y render extra.
    const appGrid = document.querySelector("#home-app-grid");
    if (appGrid) {
      appGrid.removeAttribute("id");
      const section = appGrid.closest(".kc-home-section");
      if (section) section.hidden = true;
    }

    // Inicio no replica ni mueve #course-grid. Solo entrega un acceso directo.
    // Los botones reales permanecen una sola vez en Mis productos.
    const courseGrid = document.querySelector("#home-course-grid");
    if (courseGrid) {
      courseGrid.removeAttribute("id");
      courseGrid.className = "kc-product-grid kc-home-stable-grid";
      courseGrid.innerHTML = stableLibraryCard();

      const section = courseGrid.closest(".kc-home-section");
      const heading = section?.querySelector("#home-courses-title");
      if (heading) heading.textContent = "Tus cursos";
      const shortcut = section?.querySelector('.kc-section-heading [data-kc-view-link="biblioteca"]');
      if (shortcut) shortcut.textContent = "Ver mis productos →";
    }

    // El antiguo botón "Ver mi actividad" dependía de otro controlador.
    // Se sustituye por navegación simple a la biblioteca nativa.
    const oldActivity = document.querySelector("#kc-home-continue");
    if (oldActivity) {
      const replacement = oldActivity.cloneNode(false);
      replacement.removeAttribute("id");
      replacement.type = "button";
      replacement.textContent = "Ver mis productos";
      replacement.setAttribute("data-kc-view-link", "biblioteca");
      oldActivity.replaceWith(replacement);
    }

    // El panel global Continuar duplicaba el mismo destino y podía competir por el clic.
    const continuePanel = document.querySelector(".continue-panel");
    if (continuePanel) continuePanel.hidden = true;

    // Garantiza que un lock antiguo no deje congelada la página en móvil.
    document.body.classList.remove("kc-stage-modal-open", "review-open");
    if (document.body.style.overflow === "hidden") document.body.style.removeProperty("overflow");
    if (document.documentElement.style.overflow === "hidden") document.documentElement.style.removeProperty("overflow");
  }

  function loadClinicalCommerce() {
    if (document.querySelector('script[data-kc-clinical-commerce]')) return;
    const script = document.createElement("script");
    script.src = "./academy-clinical-commerce-v1.js?v=20260810-paid1";
    script.async = false;
    script.dataset.kcClinicalCommerce = "v1";
    document.head.appendChild(script);
  }

  function initialize() {
    simplifyHome();
    loadClinicalCommerce();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.addEventListener("pageshow", () => {
    document.body.classList.remove("kc-stage-modal-open");
    if (document.body.style.overflow === "hidden") document.body.style.removeProperty("overflow");
  });
})();
