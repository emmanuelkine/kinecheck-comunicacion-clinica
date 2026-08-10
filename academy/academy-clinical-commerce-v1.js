(() => {
  "use strict";

  if (window.__KINECHECK_CLINICAL_COMMERCE_V1__) return;
  window.__KINECHECK_CLINICAL_COMMERCE_V1__ = true;

  const PRODUCTS = Object.freeze({
    "kc-scales-library": Object.freeze({
      slug: "kinecheck-escalas",
      name: "Escalas clínicas",
      price: 5000,
      label: "BIBLIOTECA CLÍNICA",
      benefits: [
        "PROMs organizados por región y propósito",
        "Interpretación, población y dirección del puntaje",
        "Fuentes científicas y límites de uso clínico",
      ],
    }),
    "kc-special-tests-library": Object.freeze({
      slug: "kinecheck-pruebas-especiales",
      name: "Pruebas especiales",
      price: 5000,
      label: "RAZONAMIENTO DIAGNÓSTICO",
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
      .kc-clinical-category-trigger[aria-busy="true"]{opacity:.72;cursor:progress}

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
    return document.querySelector(`[data-kc-clinical-target="${CSS.escape(targetId)}"]`);
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
    Object.keys(PRODUCTS).forEach(syncButton);
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

  async function openOrBuy(targetId, button) {
    const product = PRODUCTS[targetId];
    if (!product) return;

    button?.setAttribute("aria-busy", "true");
    await verifyAccess();
    button?.removeAttribute("aria-busy");

    if (ACCESS.get(product.slug) === true) {
      setSectionAccess(targetId, true);
      const section = document.getElementById(targetId);
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      section?.querySelector("summary")?.focus?.({ preventScroll: true });
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
    installCaptureGuard();
    loadLibraryAssets();
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
