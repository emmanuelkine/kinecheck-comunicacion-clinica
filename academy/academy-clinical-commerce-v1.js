(() => {
  "use strict";

  if (window.__KINECHECK_CLINICAL_COMMERCE_V1__) return;
  window.__KINECHECK_CLINICAL_COMMERCE_V1__ = true;

  const PRODUCTS = Object.freeze({
    "kc-scales-library": Object.freeze({
      slug: "kinecheck-escalas",
      name: "Escalas Clínicas",
      price: 5000,
      label: "RECURSO CLÍNICO",
      icon: "EC",
      audience: "Profesionales y estudiantes",
      description: "PROMs e instrumentos organizados por región y propósito.",
      benefits: [
        "PROMs organizados por región y propósito",
        "Interpretación, población y dirección del puntaje",
        "Fuentes científicas y límites de uso clínico",
      ],
    }),
    "kc-special-tests-library": Object.freeze({
      slug: "kinecheck-pruebas-especiales",
      name: "Pruebas Especiales",
      price: 5000,
      label: "RECURSO CLÍNICO",
      icon: "PE",
      audience: "Profesionales y estudiantes",
      description: "Pruebas y clusters con utilidad diagnóstica contextualizada.",
      benefits: [
        "Pruebas y clusters organizados por región",
        "Sensibilidad, especificidad y LR cuando corresponde",
        "Interpretación contextualizada y limitaciones",
      ],
    }),
  });

  const ACCESS = new Map(Object.values(PRODUCTS).map((product) => [product.slug, false]));
  const VERIFY_RETRIES = 4;
  const VERIFY_DELAY_MS = 5000;

  function money(value) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function checkoutFor(product) {
    return String(window.KINECHECK_CLINICAL_CHECKOUTS?.[product.slug] || "").trim();
  }

  function showToast(text) {
    const toast = document.querySelector("#kc-toast");
    if (toast) {
      toast.textContent = text;
      toast.hidden = false;
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 4200);
      return;
    }

    const notice = document.querySelector("#library-message");
    if (notice) {
      notice.textContent = text;
      notice.hidden = false;
    }
  }

  function injectStyles() {
    if (document.querySelector("#kc-clinical-commerce-styles")) return;
    const style = document.createElement("style");
    style.id = "kc-clinical-commerce-styles";
    style.textContent = `
      #kc-scales-library:not([data-kc-paid-access="true"]),
      #kc-special-tests-library:not([data-kc-paid-access="true"]){display:none!important}

      body[data-kc-view="biblioteca"] #productos{
        position:relative;isolation:isolate;overflow:hidden;
        padding:clamp(22px,3vw,38px)!important;border:1px solid rgba(77,220,216,.22);
        border-radius:28px;background:
          radial-gradient(circle at 92% 4%,rgba(46,210,207,.16),transparent 25rem),
          radial-gradient(circle at 4% 28%,rgba(88,167,255,.10),transparent 22rem),
          linear-gradient(145deg,#061923 0%,#082a34 50%,#061a24 100%)!important;
        box-shadow:0 28px 80px rgba(3,22,29,.24)
      }
      body[data-kc-view="biblioteca"] #productos::before{
        content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
        background:linear-gradient(180deg,rgba(255,255,255,.025),transparent 34%)
      }
      body[data-kc-view="biblioteca"] #productos .section-heading h2,
      body[data-kc-view="biblioteca"] #productos .course-group-heading h3{
        color:#fff!important
      }
      body[data-kc-view="biblioteca"] #productos .section-heading p,
      body[data-kc-view="biblioteca"] #productos .search-box span,
      body[data-kc-view="biblioteca"] #productos .course-group-heading p{
        color:#bfd4d8!important
      }
      body[data-kc-view="biblioteca"] #productos .eyebrow{
        color:#61e0da!important
      }
      body[data-kc-view="biblioteca"] #productos .search-box input{
        border:1px solid rgba(111,221,220,.28)!important;background:#0a2530!important;
        color:#fff!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.02)
      }
      body[data-kc-view="biblioteca"] #productos .search-box input::placeholder{color:#95adb3!important}
      body[data-kc-view="biblioteca"] #productos .kc-library-shortcuts button{
        border-color:rgba(116,210,211,.24)!important;background:rgba(255,255,255,.055)!important;
        color:#eefafa!important
      }
      body[data-kc-view="biblioteca"] #productos .kc-library-shortcuts button:hover{
        background:rgba(46,210,207,.12)!important;border-color:rgba(83,223,218,.48)!important
      }
      body[data-kc-view="biblioteca"] #productos .filter-tabs{
        border-color:rgba(95,211,211,.22)!important;background:#0a2530!important
      }
      body[data-kc-view="biblioteca"] #productos .filter-tabs .filter{
        color:#d8e9eb!important
      }
      body[data-kc-view="biblioteca"] #productos .filter-tabs .filter.active{
        background:#155665!important;color:#fff!important;border-color:rgba(64,222,216,.42)!important
      }
      body[data-kc-view="biblioteca"] #productos .course-group-count{
        border-color:rgba(91,213,212,.26)!important;background:rgba(255,255,255,.04)!important;
        color:#cde3e6!important
      }
      body[data-kc-view="biblioteca"] #productos .course-group{
        min-width:0
      }
      body[data-kc-view="biblioteca"] #productos #course-grid{
        display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:28px!important
      }
      body[data-kc-view="biblioteca"] #productos .course-rail,
      body[data-kc-view="biblioteca"] #productos .kc-clinical-featured-rail{
        display:grid!important;grid-template-columns:repeat(auto-fit,minmax(270px,1fr))!important;
        grid-auto-flow:row!important;grid-auto-columns:unset!important;gap:18px!important;
        overflow:visible!important;scroll-snap-type:none!important;padding:0!important
      }
      body[data-kc-view="biblioteca"] #productos .course-card{
        width:auto!important;max-width:none!important;min-width:0!important;height:100%;
        scroll-snap-align:none!important
      }
      .kc-clinical-featured-group{
        margin:28px 0 30px;padding:20px;border:1px solid rgba(97,224,218,.18);border-radius:22px;
        background:linear-gradient(135deg,rgba(12,52,62,.82),rgba(7,33,43,.76));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.03)
      }
      .kc-clinical-featured-group .course-group-heading{margin-bottom:16px}
      .kc-clinical-catalog-card{
        --card-accent:#2ed2cf!important;min-height:390px!important
      }
      .kc-clinical-catalog-card[data-kc-clinical-owned="false"] .status-badge{
        border-color:rgba(46,210,207,.34)!important;background:rgba(46,210,207,.12)!important;
        color:#8ef1eb!important
      }
      .kc-clinical-catalog-card[data-kc-clinical-owned="true"] .status-badge{
        border-color:rgba(110,231,176,.38)!important;background:rgba(52,211,153,.13)!important;
        color:#a7f3d0!important
      }
      .kc-clinical-catalog-card .course-meta{min-height:24px}
      .kc-clinical-catalog-card .course-progress{
        margin-top:auto
      }
      .kc-clinical-catalog-card .course-button{
        min-height:54px!important
      }

      .kc-clinical-category-trigger[data-kc-clinical-product]{
        position:relative;overflow:hidden;isolation:isolate;min-height:350px;padding:24px;
        border:1px solid rgba(14,116,120,.18);border-radius:24px;
        box-shadow:0 18px 46px rgba(5,47,55,.09);transform:none!important;
      }
      .kc-clinical-category-trigger[data-kc-clinical-product]::before{
        content:"";position:absolute;z-index:-1;width:210px;height:210px;border-radius:50%;
        right:-72px;top:-82px;filter:blur(2px);opacity:.8;pointer-events:none;
      }
      .kc-clinical-category-trigger[data-kc-clinical-target="kc-scales-library"]{
        background:linear-gradient(155deg,#ffffff 0%,#f2fbf8 62%,#e6f6f1 100%);
      }
      .kc-clinical-category-trigger[data-kc-clinical-target="kc-scales-library"]::before{
        background:radial-gradient(circle,#7dd3c7 0%,rgba(125,211,199,0) 70%);
      }
      .kc-clinical-category-trigger[data-kc-clinical-target="kc-special-tests-library"]{
        background:linear-gradient(155deg,#ffffff 0%,#f3f7fb 62%,#e7f0f8 100%);
      }
      .kc-clinical-category-trigger[data-kc-clinical-target="kc-special-tests-library"]::before{
        background:radial-gradient(circle,#9fc7e5 0%,rgba(159,199,229,0) 70%);
      }
      .kc-clinical-category-trigger[data-kc-clinical-product]:hover{
        border-color:rgba(14,116,120,.3);box-shadow:0 22px 52px rgba(5,47,55,.12);transform:none!important;
      }
      .kc-clinical-category-trigger[data-kc-clinical-product]>span{
        width:54px;height:54px;border-radius:16px;font-size:1.2rem;box-shadow:0 8px 20px rgba(15,109,114,.12)
      }
      .kc-clinical-category-trigger[data-kc-clinical-product]>strong{
        margin-top:14px;font-size:1.2rem;line-height:1.15;letter-spacing:-.015em
      }
      .kc-clinical-category-trigger[data-kc-clinical-product]>p{
        margin-top:8px;max-width:36rem;font-size:.9rem;line-height:1.5
      }
      .kc-clinical-product-label{
        display:inline-flex;margin-top:16px;color:#0f6d72;font-size:.68rem;font-weight:900;
        letter-spacing:.12em;text-transform:uppercase
      }
      .kc-clinical-product-points{
        width:100%;display:grid;gap:7px;margin:12px 0 0;padding:0;list-style:none
      }
      .kc-clinical-product-points li{
        position:relative;padding-left:20px;color:#4f6871;font-size:.78rem;line-height:1.4
      }
      .kc-clinical-product-points li::before{
        content:"✓";position:absolute;left:0;top:0;color:#0f7a70;font-weight:900
      }
      .kc-clinical-price{
        display:inline-flex;align-items:baseline;gap:.35rem;margin:16px 0 8px;padding:7px 11px;
        border-radius:12px;background:#fff;color:#083d45;border:1px solid rgba(15,109,114,.16);
        box-shadow:0 6px 18px rgba(8,61,69,.06);font-size:1.08rem;font-weight:900
      }
      .kc-clinical-price::after{
        content:"Acceso individual";font-size:.66rem;font-weight:800;color:#6b7f86;letter-spacing:.02em
      }
      .kc-clinical-category-trigger[data-kc-clinical-owned="true"] .kc-clinical-price{
        background:#ecfdf5;color:#0f766e;border-color:#bdebdc
      }
      .kc-clinical-category-trigger[data-kc-clinical-owned="true"] .kc-clinical-price::after{
        content:"Licencia verificada";color:#307665
      }
      .kc-clinical-category-trigger[data-kc-clinical-product] b{
        width:100%;min-height:46px;display:flex;align-items:center;justify-content:center;margin-top:auto;padding:0 16px;
        border-radius:14px;background:linear-gradient(135deg,#0f777b,#0b5f66);color:#fff!important;
        box-shadow:0 10px 24px rgba(11,95,102,.18);font-size:.84rem;font-weight:900
      }
      .kc-clinical-category-trigger[data-kc-clinical-owned="true"] b{
        background:linear-gradient(135deg,#0f766e,#115e59)
      }
      .kc-clinical-category-trigger[data-kc-checkout-ready="false"]{cursor:pointer}
      .kc-clinical-category-trigger[aria-busy="true"],
      .kc-clinical-catalog-card [aria-busy="true"]{opacity:.72;cursor:progress}

      @media(max-width:760px){
        body[data-kc-view="biblioteca"] #productos{
          margin:16px!important;padding:18px!important;border-radius:22px
        }
        body[data-kc-view="biblioteca"] #productos .course-rail,
        body[data-kc-view="biblioteca"] #productos .kc-clinical-featured-rail{
          grid-template-columns:minmax(0,1fr)!important
        }
        .kc-clinical-featured-group{padding:14px;border-radius:18px}
        .kc-clinical-catalog-card{min-height:360px!important}
      }
      @media(max-width:620px){
        .kc-clinical-category-trigger[data-kc-clinical-product]{min-height:330px;padding:20px;border-radius:20px}
        .kc-clinical-category-trigger[data-kc-clinical-product]>strong{font-size:1.12rem}
        .kc-clinical-product-points li{font-size:.76rem}
        .kc-clinical-price{font-size:1rem}
      }
      @media(prefers-reduced-motion:reduce){
        .kc-clinical-category-trigger[data-kc-clinical-product]{transition:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function setSectionAccess(targetId, allowed) {
    const section = document.getElementById(targetId);
    if (!section) return;
    if (allowed) section.dataset.kcPaidAccess = "true";
    else section.removeAttribute("data-kc-paid-access");
  }

  function triggerFor(targetId) {
    return document.querySelector(`.kc-clinical-category-trigger[data-kc-clinical-target="${CSS.escape(targetId)}"]`);
  }

  function catalogCardsFor(targetId) {
    return [...document.querySelectorAll(`[data-kc-clinical-catalog-card="${CSS.escape(targetId)}"]`)];
  }

  function ensureProductPresentation(button, product) {
    let label = button.querySelector(".kc-clinical-product-label");
    if (!label) {
      label = document.createElement("span");
      label.className = "kc-clinical-product-label";
      const copy = button.querySelector("p");
      if (copy) copy.insertAdjacentElement("afterend", label);
      else button.appendChild(label);
    }
    label.textContent = product.label;

    let points = button.querySelector(".kc-clinical-product-points");
    if (!points) {
      points = document.createElement("ul");
      points.className = "kc-clinical-product-points";
      label.insertAdjacentElement("afterend", points);
    }
    points.innerHTML = product.benefits.map((benefit) => `<li>${benefit}</li>`).join("");
  }

  function catalogCardMarkup(targetId, product) {
    return `
      <article class="course-card kind-course audience-professionals kc-clinical-catalog-card" data-kc-clinical-catalog-card="${targetId}" data-kc-clinical-owned="false">
        <div class="course-top">
          <span class="course-icon" aria-hidden="true">${product.icon}</span>
          <span class="status-badge">Disponible</span>
        </div>
        <div class="course-type">${product.label} · ${product.audience}</div>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="course-meta">Compra individual · ${money(product.price)} CLP</div>
        <div class="course-progress course-activity">
          <div class="course-progress-copy">
            <span>Acceso individual</span>
            <strong>${money(product.price)}</strong>
          </div>
          <span class="course-progress-detail">Pago único en Hotmart</span>
        </div>
        <button class="course-button" type="button" data-kc-clinical-target="${targetId}">Comprar</button>
      </article>
    `;
  }

  function installFeaturedCatalogCards() {
    const grid = document.querySelector("#course-grid");
    if (!grid || document.querySelector("#kc-clinical-featured-products")) return;

    const group = document.createElement("section");
    group.id = "kc-clinical-featured-products";
    group.className = "course-group kc-clinical-featured-group";
    group.setAttribute("aria-labelledby", "kc-clinical-featured-title");
    group.innerHTML = `
      <div class="course-group-heading">
        <div>
          <h3 id="kc-clinical-featured-title">Recursos clínicos</h3>
          <p>Compra individual o abre directamente tu biblioteca si ya tienes una licencia activa.</p>
        </div>
        <span class="course-group-count">2 productos</span>
      </div>
      <div class="course-rail kc-clinical-featured-rail">
        ${Object.entries(PRODUCTS).map(([targetId, product]) => catalogCardMarkup(targetId, product)).join("")}
      </div>
    `;
    grid.before(group);
  }

  function syncCatalogCard(targetId) {
    const product = PRODUCTS[targetId];
    if (!product) return;

    const owned = ACCESS.get(product.slug) === true;
    const checkoutReady = Boolean(checkoutFor(product));

    catalogCardsFor(targetId).forEach((card) => {
      card.dataset.kcClinicalOwned = String(owned);
      card.dataset.kcCheckoutReady = String(checkoutReady);

      const badge = card.querySelector(".status-badge");
      if (badge) badge.textContent = owned ? "Acceso verificado" : "Disponible";

      const meta = card.querySelector(".course-meta");
      if (meta) meta.textContent = owned
        ? "Licencia verificada · Acceso activo"
        : `Compra individual · ${money(product.price)} CLP`;

      const accessLabel = card.querySelector(".course-progress-copy span");
      if (accessLabel) accessLabel.textContent = owned ? "Tu acceso" : "Acceso individual";

      const value = card.querySelector(".course-progress-copy strong");
      if (value) value.textContent = owned ? "Activo" : money(product.price);

      const detail = card.querySelector(".course-progress-detail");
      if (detail) detail.textContent = owned ? "Tu licencia está activa" : "Pago único en Hotmart";

      const action = card.querySelector("[data-kc-clinical-target]");
      if (action) {
        action.textContent = owned ? "Abrir biblioteca" : "Comprar";
        action.title = owned
          ? `Abrir ${product.name}`
          : checkoutReady
            ? `Comprar ${product.name} en Hotmart por ${money(product.price)}`
            : `${product.name}: checkout Hotmart no disponible.`;
      }
    });
  }

  function syncButton(targetId) {
    const product = PRODUCTS[targetId];
    const button = triggerFor(targetId);
    if (!product || !button) return;

    const owned = ACCESS.get(product.slug) === true;
    const checkoutReady = Boolean(checkoutFor(product));
    button.dataset.kcClinicalProduct = product.slug;
    button.dataset.kcClinicalOwned = String(owned);
    button.dataset.kcCheckoutReady = String(checkoutReady);

    ensureProductPresentation(button, product);

    let price = button.querySelector(".kc-clinical-price");
    if (!price) {
      price = document.createElement("span");
      price.className = "kc-clinical-price";
      const points = button.querySelector(".kc-clinical-product-points");
      if (points) points.insertAdjacentElement("afterend", price);
      else button.appendChild(price);
    }
    price.textContent = owned ? "Acceso activo" : `${money(product.price)} CLP`;

    const status = button.querySelector("b");
    if (status) status.textContent = owned ? "Abrir biblioteca →" : "Comprar";

    button.title = owned
      ? `Abrir ${product.name}`
      : checkoutReady
        ? `Comprar ${product.name} en Hotmart por ${money(product.price)}`
        : `${product.name}: ${money(product.price)}. Checkout Hotmart pendiente de configuración.`;

    setSectionAccess(targetId, owned);
  }

  function syncAll() {
    Object.keys(PRODUCTS).forEach((targetId) => {
      syncButton(targetId);
      syncCatalogCard(targetId);
    });
  }

  async function verifyAccess() {
    const session = window.KINECHECK_ACADEMY_SESSION?.get?.();
    const token = String(session?.access_token || "").trim();
    if (!token) {
      ACCESS.forEach((_, slug) => ACCESS.set(slug, false));
      syncAll();
      return false;
    }

    const config = window.KINECHECK_ACADEMY_CONFIG;
    if (!config?.supabaseUrl || !config?.courseKeyFunction || !config?.supabaseAnonKey) {
      syncAll();
      return false;
    }

    try {
      const response = await fetch(`${config.supabaseUrl}/functions/v1/${config.courseKeyFunction}`, {
        method: "POST",
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseSlugs: Object.values(PRODUCTS).map((product) => product.slug) }),
      });

      if (!response.ok) {
        ACCESS.forEach((_, slug) => ACCESS.set(slug, false));
        syncAll();
        return false;
      }

      const payload = await response.json().catch(() => ({}));
      const active = new Set(Array.isArray(payload.activeCourseSlugs) ? payload.activeCourseSlugs : []);
      ACCESS.forEach((_, slug) => ACCESS.set(slug, active.has(slug)));
      syncAll();
      return true;
    } catch {
      syncAll();
      return false;
    }
  }

  function revealOwnedLibrary(targetId) {
    const reveal = () => {
      const section = document.getElementById(targetId);
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      section?.querySelector("summary")?.focus?.({ preventScroll: true });
    };

    if (document.body.dataset.kcView !== "herramientas") {
      const resourcesLink = document.querySelector('[data-kc-view-link="herramientas"]');
      resourcesLink?.click();
      window.setTimeout(reveal, 100);
      return;
    }

    reveal();
  }

  async function openOrBuy(targetId, button) {
    const product = PRODUCTS[targetId];
    if (!product) return;

    button?.setAttribute("aria-busy", "true");
    await verifyAccess();
    button?.removeAttribute("aria-busy");

    if (ACCESS.get(product.slug) === true) {
      setSectionAccess(targetId, true);
      revealOwnedLibrary(targetId);
      return;
    }

    const checkout = checkoutFor(product);
    if (checkout) {
      window.location.assign(checkout);
      return;
    }

    showToast(`${product.name}: ${money(product.price)} CLP. El checkout oficial de Hotmart aún no está configurado; no se realizará ningún cobro.`);
  }

  function installCaptureGuard() {
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest?.("[data-kc-clinical-target]");
      if (!button) return;

      const targetId = String(button.dataset.kcClinicalTarget || "").trim();
      if (!PRODUCTS[targetId]) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void openOrBuy(targetId, button);
    }, true);
  }

  function loadLibraryAssets() {
    if (!document.querySelector('link[data-kc-clinical-library]')) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "./academy-clinical-library-v1.css?v=20260810-paid2";
      style.dataset.kcClinicalLibrary = "styles";
      document.head.appendChild(style);
    }

    if (document.querySelector('script[data-kc-clinical-library]')) {
      window.setTimeout(syncAll, 0);
      return;
    }

    const script = document.createElement("script");
    script.src = "./academy-clinical-library-v1.js?v=20260810-paid2";
    script.async = false;
    script.dataset.kcClinicalLibrary = "script";
    script.addEventListener("load", () => {
      syncAll();
      window.setTimeout(syncAll, 80);
    }, { once: true });
    document.head.appendChild(script);
  }

  function postPurchaseRefresh() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") !== "approved") return;

    let attempt = 0;
    const retry = async () => {
      attempt += 1;
      await verifyAccess();
      const complete = [...ACCESS.values()].some(Boolean);
      if (!complete && attempt < VERIFY_RETRIES) window.setTimeout(retry, VERIFY_DELAY_MS);
    };
    void retry();
  }

  function start() {
    injectStyles();
    installFeaturedCatalogCards();
    installCaptureGuard();
    loadLibraryAssets();
    syncAll();
    void verifyAccess();
    postPurchaseRefresh();
    window.setTimeout(syncAll, 250);
    window.setTimeout(syncAll, 900);
  }

  window.KINECHECK_CLINICAL_COMMERCE = Object.freeze({
    products: PRODUCTS,
    refresh: verifyAccess,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
