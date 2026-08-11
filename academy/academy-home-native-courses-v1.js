(() => {
  "use strict";

  if (window.__KINECHECK_HOME_STABLE_V1__) return;
  window.__KINECHECK_HOME_STABLE_V1__ = true;

  const PRODUCT_EXPLORER = Object.freeze([
    {
      slug: "kinecheck-clinico",
      icon: "KC",
      title: "KineCheck Clínico",
      audience: "Profesionales",
      type: "Curso + guía clínica",
      summary: "Un recorrido profesional para ordenar la evaluación musculoesquelética, integrar seguridad clínica y sostener decisiones con razonamiento estructurado.",
      points: ["Seguridad y banderas clínicas", "Evaluación y razonamiento MSK", "Reevaluación y toma de decisiones"],
      detailUrl: "../productos/kinecheck-clinico/",
    },
    {
      slug: "comunicacion-clinica",
      icon: "CC",
      title: "Comunicación Clínica",
      audience: "Profesionales y estudiantes",
      type: "Curso",
      summary: "Curso centrado en la comunicación en salud para mejorar la entrevista, la explicación clínica y la interacción con las personas atendidas.",
      points: ["Entrevista clínica", "Explicación comprensible", "Comunicación centrada en la persona"],
      detailUrl: "../productos/comunicacion-clinica/",
    },
    {
      slug: "kinecheck-estudiante",
      icon: "KE",
      title: "KineCheck Estudiante",
      audience: "Estudiantes",
      type: "Aplicación",
      summary: "Herramienta de apoyo para practicar evaluación y razonamiento clínico con una estructura pensada para la formación en kinesiología.",
      points: ["Organización de la evaluación", "Razonamiento clínico", "Apoyo al aprendizaje"],
      detailUrl: "../productos/kinecheck-estudiante/",
    },
    {
      slug: "kinecheck-recupera",
      icon: "KR",
      title: "KineCheck Recupera",
      audience: "Personas y pacientes",
      type: "Aplicación",
      summary: "Espacio personal para registrar evolución, seguir un plan y visualizar variables relevantes del proceso de recuperación sin sustituir la atención profesional.",
      points: ["Registro de evolución", "Plan y seguimiento", "Visualización del progreso"],
      detailUrl: "../productos/kinecheck-recupera/",
    },
    {
      slug: "mas-alla-del-dolor",
      icon: "MD",
      title: "Más allá del dolor",
      audience: "Estudiantes y profesionales",
      type: "Curso",
      summary: "Curso de evaluación musculoesquelética integral para ampliar el análisis clínico más allá de la intensidad del dolor y conectar hallazgos con función y contexto.",
      points: ["Evaluación MSK integral", "Función y contexto", "Interpretación clínica"],
      detailUrl: "../productos/mas-alla-del-dolor/",
    },
    {
      slug: "evidencia-aplicada",
      icon: "EA",
      title: "KineCheck Evidencia Aplicada",
      audience: "Profesionales y estudiantes",
      type: "Curso",
      summary: "Curso para fortalecer la lectura crítica y traducir la evidencia disponible a decisiones clínicas contextualizadas.",
      points: ["Lectura crítica", "Aplicación de evidencia", "Decisiones contextualizadas"],
      detailUrl: "../productos/evidencia-aplicada/",
    },
    {
      slug: "traumatologia-ortopedia-clinica",
      icon: "TO",
      title: "Traumatología y Ortopedia Clínica",
      audience: "Profesionales y estudiantes",
      type: "Curso",
      summary: "Recorrido desde el mecanismo lesional y la presentación clínica hasta una toma de decisiones más segura en traumatología y ortopedia.",
      points: ["Mecanismo lesional", "Presentación clínica", "Decisión clínica segura"],
      detailUrl: "../productos/traumatologia-ortopedia-clinica/",
    },
    {
      slug: "pack-estudiante",
      icon: "PK",
      title: "Pack KineCheck Estudiante",
      audience: "Estudiantes",
      type: "Pack",
      summary: "Combina KineCheck Estudiante y Más allá del dolor en una ruta orientada a practicar razonamiento, evaluación y análisis musculoesquelético.",
      points: ["KineCheck Estudiante", "Más allá del dolor", "Ruta combinada de aprendizaje"],
      detailUrl: "../productos/pack-estudiante/",
    },
  ]);

  const explorerState = {
    selectedSlug: PRODUCT_EXPLORER[0].slug,
    prices: null,
  };

  function loadPremiumTheme() {
    if (document.querySelector('link[data-kc-premium-theme]')) return;
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "./academy-premium-theme-v1.css?v=20260810-premium1";
    style.dataset.kcPremiumTheme = "v1";
    document.head.appendChild(style);
  }

  function injectExplorerStyles() {
    if (document.querySelector("#kc-home-product-explorer-styles")) return;
    const style = document.createElement("style");
    style.id = "kc-home-product-explorer-styles";
    style.textContent = `
      .kc-home-product-explorer{display:block!important;width:100%;}
      .kc-product-explorer{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(0,1.35fr);gap:18px;padding:18px;border:1px solid rgba(102,224,215,.17);border-radius:26px;background:linear-gradient(145deg,rgba(9,43,52,.88),rgba(4,25,32,.96));box-shadow:0 20px 55px rgba(0,0,0,.16);overflow:hidden;}
      .kc-explorer-picker{min-width:0;}
      .kc-explorer-kicker{display:block;margin:2px 0 8px;color:#73e2d5;font-size:.72rem;font-weight:900;letter-spacing:.15em;}
      .kc-explorer-picker h3{margin:0;color:#f6fbfc;font-size:clamp(1.25rem,2.2vw,1.75rem);line-height:1.12;}
      .kc-explorer-picker>p{margin:9px 0 17px;color:#b8cdd2;line-height:1.55;font-size:.92rem;}
      .kc-explorer-buttons{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
      .kc-explorer-product{display:flex;align-items:center;gap:10px;width:100%;min-height:56px;padding:10px 12px;border:1px solid rgba(119,224,211,.15);border-radius:15px;background:rgba(255,255,255,.035);color:#dcebed;text-align:left;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease;}
      .kc-explorer-product:hover{transform:translateY(-1px);border-color:rgba(104,221,211,.38);background:rgba(78,215,207,.08);}
      .kc-explorer-product[aria-selected="true"]{border-color:rgba(92,222,211,.72);background:linear-gradient(135deg,rgba(55,203,196,.17),rgba(82,165,230,.10));box-shadow:0 10px 28px rgba(0,0,0,.13);color:#fff;}
      .kc-explorer-product-icon{display:grid;place-items:center;flex:0 0 34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#53dbd5,#72d9ba);color:#052a31;font-size:.72rem;font-weight:950;}
      .kc-explorer-product-copy{display:block;min-width:0;}
      .kc-explorer-product-copy strong{display:block;color:inherit;font-size:.82rem;line-height:1.18;}
      .kc-explorer-product-copy small{display:block;margin-top:3px;color:#90afb5;font-size:.67rem;line-height:1.15;}
      .kc-explorer-detail{position:relative;display:flex;flex-direction:column;min-width:0;min-height:100%;padding:24px;border:1px solid rgba(110,224,216,.18);border-radius:22px;background:radial-gradient(circle at 92% 5%,rgba(88,188,244,.14),transparent 36%),linear-gradient(145deg,rgba(13,55,65,.96),rgba(5,31,38,.98));overflow:hidden;}
      .kc-explorer-detail-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
      .kc-explorer-detail-icon{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#50d9d5,#74ddb9);color:#052a31;font-size:.88rem;font-weight:950;box-shadow:0 10px 26px rgba(26,196,190,.13);}
      .kc-explorer-audience{display:inline-flex;align-items:center;min-height:30px;padding:6px 10px;border-radius:999px;border:1px solid rgba(114,226,212,.22);background:rgba(65,207,193,.08);color:#8fe7d9;font-size:.72rem;font-weight:850;}
      .kc-explorer-type{display:block;margin-top:20px;color:#71e1d3;font-size:.71rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;}
      .kc-explorer-detail h3{margin:6px 0 9px;color:#f7fbfc;font-size:clamp(1.4rem,2.8vw,2rem);line-height:1.08;}
      .kc-explorer-summary{margin:0;color:#c0d3d7;font-size:.96rem;line-height:1.58;max-width:68ch;}
      .kc-explorer-points{display:flex;flex-wrap:wrap;gap:8px;margin:17px 0 20px;padding:0;list-style:none;}
      .kc-explorer-points li{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);color:#d3e3e6;font-size:.74rem;font-weight:700;}
      .kc-explorer-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:auto;padding-top:5px;}
      .kc-explorer-price{display:flex;flex-direction:column;min-width:118px;}
      .kc-explorer-price strong{color:#fff;font-size:1.08rem;line-height:1;}
      .kc-explorer-price small{margin-top:4px;color:#8fafb5;font-size:.67rem;}
      .kc-explorer-actions{display:flex;gap:9px;flex:1 1 auto;justify-content:flex-end;flex-wrap:wrap;}
      .kc-explorer-actions a,.kc-explorer-actions button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 15px;border-radius:13px;font-size:.78rem;font-weight:900;text-decoration:none;cursor:pointer;}
      .kc-explorer-actions a{border:1px solid rgba(102,224,215,.24);background:rgba(255,255,255,.045);color:#eefafa;}
      .kc-explorer-actions button{border:0;background:linear-gradient(90deg,#50d6d4,#6bbbf5);color:#04252d;}
      .kc-explorer-actions a:hover,.kc-explorer-actions button:hover{filter:brightness(1.06);}
      @media(max-width:860px){.kc-product-explorer{grid-template-columns:1fr;}.kc-explorer-buttons{grid-template-columns:repeat(4,minmax(150px,1fr));overflow-x:auto;padding-bottom:5px;scrollbar-width:thin;}.kc-explorer-product{min-width:150px;}.kc-explorer-detail{min-height:350px;}}
      @media(max-width:620px){.kc-product-explorer{padding:12px;border-radius:20px;gap:12px;}.kc-explorer-picker{padding:4px 2px;}.kc-explorer-buttons{display:flex;gap:8px;margin-right:-10px;padding-right:10px;}.kc-explorer-product{flex:0 0 148px;min-height:58px;padding:9px 10px;}.kc-explorer-detail{padding:19px;border-radius:18px;min-height:365px;}.kc-explorer-detail h3{font-size:1.55rem;}.kc-explorer-summary{font-size:.9rem;}.kc-explorer-meta{align-items:stretch;}.kc-explorer-price{width:100%;padding-bottom:4px;}.kc-explorer-actions{width:100%;}.kc-explorer-actions a,.kc-explorer-actions button{flex:1 1 140px;}}
      @media(prefers-reduced-motion:reduce){.kc-explorer-product{transition:none!important;}}
    `;
    document.head.appendChild(style);
  }

  function productPrice(product) {
    const record = explorerState.prices?.[product.slug];
    if (!record) return { display: "Ver precio", term: "en la ficha del producto" };
    return { display: record.display || "Ver precio", term: record.term || "Acceso según producto" };
  }

  function renderExplorerDetail(container, slug) {
    const product = PRODUCT_EXPLORER.find((item) => item.slug === slug) || PRODUCT_EXPLORER[0];
    explorerState.selectedSlug = product.slug;
    const price = productPrice(product);
    const detail = container.querySelector("[data-kc-explorer-detail]");
    if (!detail) return;

    detail.innerHTML = `
      <div class="kc-explorer-detail-top">
        <span class="kc-explorer-detail-icon" aria-hidden="true">${product.icon}</span>
        <span class="kc-explorer-audience">${product.audience}</span>
      </div>
      <span class="kc-explorer-type">${product.type}</span>
      <h3>${product.title}</h3>
      <p class="kc-explorer-summary">${product.summary}</p>
      <ul class="kc-explorer-points">${product.points.map((point) => `<li>${point}</li>`).join("")}</ul>
      <div class="kc-explorer-meta">
        <div class="kc-explorer-price"><strong>${price.display}</strong><small>${price.term}</small></div>
        <div class="kc-explorer-actions">
          <a href="${product.detailUrl}">Conocer producto</a>
          <button type="button" data-kc-explorer-library="${product.slug}">Ver en mi Biblioteca</button>
        </div>
      </div>
    `;

    container.querySelectorAll("[data-kc-product-pick]").forEach((button) => {
      const selected = button.dataset.kcProductPick === product.slug;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
  }

  function explorerMarkup() {
    return `
      <div class="kc-product-explorer" data-kc-product-explorer>
        <div class="kc-explorer-picker">
          <span class="kc-explorer-kicker">ELIGE SEGÚN TU OBJETIVO</span>
          <h3>¿Qué producto KineCheck necesitas?</h3>
          <p>Toca un producto para ver en segundos qué es, para quién está pensado y qué encontrarás dentro.</p>
          <div class="kc-explorer-buttons" role="tablist" aria-label="Productos KineCheck">
            ${PRODUCT_EXPLORER.map((product, index) => `
              <button class="kc-explorer-product" type="button" role="tab" data-kc-product-pick="${product.slug}" aria-selected="${index === 0 ? "true" : "false"}" tabindex="${index === 0 ? "0" : "-1"}">
                <span class="kc-explorer-product-icon" aria-hidden="true">${product.icon}</span>
                <span class="kc-explorer-product-copy"><strong>${product.title}</strong><small>${product.type}</small></span>
              </button>
            `).join("")}
          </div>
        </div>
        <article class="kc-explorer-detail" data-kc-explorer-detail aria-live="polite"></article>
      </div>
    `;
  }

  function goToLibraryFor(slug) {
    const link = document.querySelector('[data-kc-view-link="biblioteca"]');
    if (link instanceof HTMLElement) link.click();
    else {
      history.replaceState(null, "", "#biblioteca");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    window.setTimeout(() => {
      const direct = document.querySelector(`[data-card-course="${slug}"]`);
      const fallback = document.querySelector("#productos");
      (direct || fallback)?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (direct) {
        direct.animate?.(
          [{ outline: "0 solid rgba(91,219,210,0)" }, { outline: "3px solid rgba(91,219,210,.7)" }, { outline: "0 solid rgba(91,219,210,0)" }],
          { duration: 1100, easing: "ease-out" },
        );
      }
    }, 220);
  }

  function wireExplorer(container) {
    container.addEventListener("click", (event) => {
      const pick = event.target.closest("[data-kc-product-pick]");
      if (pick) {
        renderExplorerDetail(container, pick.dataset.kcProductPick);
        return;
      }
      const library = event.target.closest("[data-kc-explorer-library]");
      if (library) goToLibraryFor(library.dataset.kcExplorerLibrary);
    });

    container.addEventListener("keydown", (event) => {
      const current = event.target.closest("[data-kc-product-pick]");
      if (!current || !["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      const buttons = [...container.querySelectorAll("[data-kc-product-pick]")];
      const currentIndex = buttons.indexOf(current);
      const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
      const next = buttons[(currentIndex + direction + buttons.length) % buttons.length];
      next.focus();
      renderExplorerDetail(container, next.dataset.kcProductPick);
    });
  }

  async function loadExplorerPrices(container) {
    try {
      const response = await fetch("../commercial-prices-cl.json?v=20260811", { cache: "no-cache" });
      if (!response.ok) return;
      const data = await response.json();
      explorerState.prices = data?.products || null;
      renderExplorerDetail(container, explorerState.selectedSlug);
    } catch {
      // El explorador sigue operativo aunque el precio no pueda cargarse.
    }
  }

  function simplifyHome() {
    // Las aplicaciones Estudiante y Recupera ya existen en Biblioteca.
    // Inicio presenta ahora un explorador informativo, sin duplicar botones de acceso/licencia.
    const appGrid = document.querySelector("#home-app-grid");
    if (appGrid) {
      appGrid.removeAttribute("id");
      const section = appGrid.closest(".kc-home-section");
      if (section) section.hidden = true;
    }

    const courseGrid = document.querySelector("#home-course-grid");
    if (courseGrid) {
      courseGrid.removeAttribute("id");
      courseGrid.className = "kc-home-product-explorer";
      courseGrid.innerHTML = explorerMarkup();

      const section = courseGrid.closest(".kc-home-section");
      const heading = section?.querySelector("#home-courses-title");
      if (heading) heading.textContent = "Explora los productos KineCheck";
      const eyebrow = section?.querySelector(".eyebrow.compact");
      if (eyebrow) eyebrow.textContent = "ECOSISTEMA KINECHECK";
      const shortcut = section?.querySelector('.kc-section-heading [data-kc-view-link="biblioteca"]');
      if (shortcut) shortcut.textContent = "Ver lo que ya tengo →";

      const explorer = courseGrid.querySelector("[data-kc-product-explorer]");
      if (explorer) {
        wireExplorer(explorer);
        renderExplorerDetail(explorer, PRODUCT_EXPLORER[0].slug);
        loadExplorerPrices(explorer);
      }
    }

    // Evidencia, recursos y novedades permanecen disponibles en sus vistas propias.
    ["home-library-title", "home-news-title"].forEach((id) => {
      const section = document.getElementById(id)?.closest(".kc-home-section");
      if (section) section.hidden = true;
    });

    // El antiguo botón "Ver mi actividad" dependía de otro controlador.
    // Se sustituye por navegación simple a la Biblioteca nativa.
    const oldActivity = document.querySelector("#kc-home-continue");
    if (oldActivity) {
      const replacement = oldActivity.cloneNode(false);
      replacement.removeAttribute("id");
      replacement.type = "button";
      replacement.textContent = "Abrir Biblioteca";
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
    loadPremiumTheme();
    injectExplorerStyles();
    simplifyHome();
    // Inicio permanece como portada después de autenticar; no se fuerza Biblioteca.
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
