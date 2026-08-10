(() => {
  "use strict";

  if (window.__KINECHECK_CLINICAL_COMMERCE_V1__) return;
  window.__KINECHECK_CLINICAL_COMMERCE_V1__ = true;

  const PRODUCTS = Object.freeze({
    "kc-scales-library": Object.freeze({
      slug: "kinecheck-escalas",
      name: "Escalas clínicas",
      price: 5000,
    }),
    "kc-special-tests-library": Object.freeze({
      slug: "kinecheck-pruebas-especiales",
      name: "Pruebas especiales",
      price: 5000,
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
      .kc-clinical-price{display:inline-flex;align-items:center;gap:.35rem;margin:.45rem 0 .2rem;padding:.28rem .55rem;border-radius:999px;background:#ecfdf5;color:#0f766e;font-size:.82rem;font-weight:800}
      .kc-clinical-category-trigger[data-kc-clinical-owned="false"] b{color:#0f766e}
      .kc-clinical-category-trigger[data-kc-checkout-ready="false"]{cursor:pointer}
      .kc-clinical-category-trigger[aria-busy="true"]{opacity:.72;cursor:progress}
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

  function syncButton(targetId) {
    const product = PRODUCTS[targetId];
    const button = triggerFor(targetId);
    if (!product || !button) return;

    const owned = ACCESS.get(product.slug) === true;
    const checkoutReady = Boolean(checkoutFor(product));
    button.dataset.kcClinicalProduct = product.slug;
    button.dataset.kcClinicalOwned = String(owned);
    button.dataset.kcCheckoutReady = String(checkoutReady);

    let price = button.querySelector(".kc-clinical-price");
    if (!price) {
      price = document.createElement("span");
      price.className = "kc-clinical-price";
      const copy = button.querySelector("p");
      if (copy) copy.insertAdjacentElement("afterend", price);
      else button.appendChild(price);
    }
    price.textContent = owned ? "Acceso activo" : `${money(product.price)} CLP`;

    const status = button.querySelector("b");
    if (status) status.textContent = owned ? "Abrir →" : "Comprar";

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
      style.href = "./academy-clinical-library-v1.css?v=20260810-paid1";
      style.dataset.kcClinicalLibrary = "styles";
      document.head.appendChild(style);
    }

    if (document.querySelector('script[data-kc-clinical-library]')) {
      window.setTimeout(syncAll, 0);
      return;
    }

    const script = document.createElement("script");
    script.src = "./academy-clinical-library-v1.js?v=20260810-paid1";
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
