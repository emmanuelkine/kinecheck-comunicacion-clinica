(() => {
  "use strict";

  if (window.__KINECHECK_METRICS_V1__) return;
  window.__KINECHECK_METRICS_V1__ = true;

  const ENDPOINT = "https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1/metric-event";
  const SESSION_KEY = "kc_metric_session_v1";
  const ALLOWED_PRODUCTS = new Set([
    "kinecheck-clinico",
    "kinecheck-estudiante",
    "kinecheck-recupera",
    "comunicacion-clinica",
    "mas-alla-del-dolor",
    "evidencia-aplicada",
    "traumatologia-ortopedia-clinica",
    "pack-estudiante",
  ]);

  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const value = Math.random() * 16 | 0;
      return (char === "x" ? value : (value & 0x3 | 0x8)).toString(16);
    });
  }

  function sessionId() {
    try {
      let value = sessionStorage.getItem(SESSION_KEY);
      if (!value) {
        value = uuid();
        sessionStorage.setItem(SESSION_KEY, value);
      }
      return value;
    } catch {
      return null;
    }
  }

  function deviceClass() {
    const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    if (width <= 700) return "mobile";
    if (width <= 1100) return "tablet";
    return "desktop";
  }

  function referrerHost() {
    try {
      return document.referrer ? new URL(document.referrer).hostname.slice(0, 160) : null;
    } catch {
      return null;
    }
  }

  function cleanProduct(value) {
    const slug = String(value || "").trim();
    return ALLOWED_PRODUCTS.has(slug) ? slug : null;
  }

  function send(eventName, options = {}) {
    const payload = {
      eventId: uuid(),
      eventName,
      path: `${location.pathname}${location.search}`.slice(0, 300),
      productSlug: cleanProduct(options.productSlug),
      sessionId: sessionId(),
      referrerHost: referrerHost(),
      deviceClass: deviceClass(),
      metadata: options.metadata && typeof options.metadata === "object" ? options.metadata : {},
    };

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
    }).catch(() => {});
  }

  function currentProduct() {
    const params = new URLSearchParams(location.search);
    return cleanProduct(params.get("producto") || params.get("course"));
  }

  function initialEvent() {
    const path = location.pathname;
    const product = currentProduct();
    send("page_view", { productSlug: product });
    if (path.startsWith("/productos/") && product) send("product_view", { productSlug: product });
    if (path.startsWith("/beta/")) send("beta_view");
    if (path.startsWith("/soporte/")) send("support_view");
    if (path.startsWith("/platform/")) send("platform_login_view");
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("a,button") : null;
    if (!target) return;

    const card = target.closest("[data-product-card]");
    const slug = cleanProduct(
      card?.getAttribute("data-course")
      || target.getAttribute("data-course")
      || target.getAttribute("data-kc-path-open")
      || target.getAttribute("data-kc-open-product")
      || target.getAttribute("data-kc-open-owned")
      || currentProduct(),
    );
    const href = target instanceof HTMLAnchorElement ? target.href : "";

    if (href && /pay\.hotmart\.com/i.test(href)) {
      send("checkout_start", { productSlug: slug });
      return;
    }

    if (href && /\/academy\//i.test(new URL(href, location.href).pathname)) {
      send("academy_open", { productSlug: slug });
      return;
    }

    if (slug && (
      target.hasAttribute("data-course")
      || target.hasAttribute("data-kc-path-open")
      || target.hasAttribute("data-kc-open-product")
      || target.hasAttribute("data-kc-open-owned")
    )) {
      send("course_open", { productSlug: slug });
    }
  }, { capture: true });

  window.KINECHECK_METRIC = (eventName, options = {}) => send(String(eventName || ""), options);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialEvent, { once: true });
  else initialEvent();
})();
