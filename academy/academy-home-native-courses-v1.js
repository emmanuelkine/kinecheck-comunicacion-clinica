(() => {
  "use strict";

  if (window.__KINECHECK_HOME_STABLE_V1__) return;
  window.__KINECHECK_HOME_STABLE_V1__ = true;

  let preferredLibraryApplied = false;

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

  function preferLibraryOnEntry() {
    if (preferredLibraryApplied) return;
    const dashboard = document.querySelector("#dashboard-view");
    if (!dashboard || dashboard.hidden) return;

    const current = String(location.hash || "").replace(/^#/, "").toLowerCase();
    if (current && current !== "inicio") {
      preferredLibraryApplied = true;
      return;
    }

    const libraryLink = document.querySelector('[data-kc-view-link="biblioteca"]');
    preferredLibraryApplied = true;
    if (libraryLink instanceof HTMLElement) {
      libraryLink.click();
    } else {
      history.replaceState(null, "", "#biblioteca");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  function watchPreferredLanding() {
    const dashboard = document.querySelector("#dashboard-view");
    if (!dashboard) return;
    preferLibraryOnEntry();
    if (preferredLibraryApplied) return;

    const observer = new MutationObserver(() => {
      preferLibraryOnEntry();
      if (preferredLibraryApplied) observer.disconnect();
    });
    observer.observe(dashboard, { attributes: true, attributeFilter: ["hidden"] });
  }

  function loadClinicalCommerce() {
    if (document.querySelector('script[data-kc-clinical-commerce]')) return;

    const loadCommerce = () => {
      if (document.querySelector('script[data-kc-clinical-commerce]')) return;
      const script = document.createElement("script");
      script.src = "./academy-clinical-commerce-v1.js?v=20260810-library4";
      script.async = false;
      script.dataset.kcClinicalCommerce = "v1";
      document.head.appendChild(script);
    };

    const existingCheckoutConfig = document.querySelector('script[data-kc-clinical-checkouts]');
    if (existingCheckoutConfig) {
      if (window.KINECHECK_CLINICAL_CHECKOUTS) loadCommerce();
      else existingCheckoutConfig.addEventListener("load", loadCommerce, { once: true });
      return;
    }

    const checkoutConfig = document.createElement("script");
    checkoutConfig.src = "./academy-clinical-checkouts-v1.js?v=20260810-checkout2";
    checkoutConfig.async = false;
    checkoutConfig.dataset.kcClinicalCheckouts = "v1";
    checkoutConfig.addEventListener("load", loadCommerce, { once: true });
    document.head.appendChild(checkoutConfig);
  }

  function loadClinicalCardDetails() {
    if (document.querySelector('script[data-kc-clinical-card-details]')) return;
    const script = document.createElement("script");
    script.src = "./academy-clinical-card-details-v1.js?v=20260810-prof1";
    script.async = false;
    script.dataset.kcClinicalCardDetails = "v1";
    document.head.appendChild(script);
  }

  function loadClinicalInterior() {
    if (!document.querySelector('link[data-kc-clinical-interior]')) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "./academy-clinical-interior-v1.css?v=20260810-pro2";
      style.dataset.kcClinicalInterior = "styles";
      document.head.appendChild(style);
    }

    if (document.querySelector('script[data-kc-clinical-interior]')) return;
    const script = document.createElement("script");
    script.src = "./academy-clinical-interior-v1.js?v=20260810-pro2";
    script.async = false;
    script.dataset.kcClinicalInterior = "script";
    document.head.appendChild(script);
  }

  function initialize() {
    simplifyHome();
    watchPreferredLanding();
    loadClinicalCommerce();
    loadClinicalCardDetails();
    loadClinicalInterior();
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
