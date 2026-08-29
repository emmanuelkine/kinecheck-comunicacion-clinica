(() => {
  "use strict";

  if (window.__KINECHECK_METRICS_V1__) return;
  window.__KINECHECK_METRICS_V1__ = true;

  const ENDPOINT = "https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1/metric-event";
  const SESSION_KEY = "kc_metric_session_v1";
  const AUTH_SESSION_KEY = "kinecheck_secure_session_v1";
  const COURSE_SESSION_PREFIX = "kinecheck_course_session_v2:";
  const FUNNEL_ONCE_PREFIX = "kc_tf008_once:";
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

  function parseSession(raw) {
    try {
      const session = JSON.parse(raw || "null");
      return session?.access_token ? session : null;
    } catch {
      return null;
    }
  }

  function courseSessionRecord() {
    try {
      for (let index = 0; index < sessionStorage.length; index += 1) {
        const key = sessionStorage.key(index) || "";
        if (!key.startsWith(COURSE_SESSION_PREFIX)) continue;
        const session = parseSession(sessionStorage.getItem(key));
        const product = cleanProduct(key.slice(COURSE_SESSION_PREFIX.length));
        if (session?.access_token && product) return { session, product };
      }
    } catch {
      // Storage puede estar restringido; las métricas no deben interrumpir la aplicación.
    }
    return null;
  }

  function authAccessToken() {
    try {
      const session = window.KINECHECK_ACADEMY_SESSION?.get?.();
      if (session?.access_token) return String(session.access_token);
    } catch {
      // Fallback a storages compartidos.
    }

    try {
      const session = parseSession(localStorage.getItem(AUTH_SESSION_KEY));
      if (session?.access_token) return String(session.access_token);
    } catch {
      // Continuar al storage de curso.
    }

    return courseSessionRecord()?.session?.access_token
      ? String(courseSessionRecord().session.access_token)
      : null;
  }

  function send(eventName, options = {}) {
    const payload = {
      eventId: uuid(),
      eventName,
      // Privacidad TF-008: nunca enviar query string ni hash en métricas.
      path: String(location.pathname || "/").slice(0, 300),
      productSlug: cleanProduct(options.productSlug),
      sessionId: sessionId(),
      referrerHost: referrerHost(),
      deviceClass: deviceClass(),
      metadata: options.metadata && typeof options.metadata === "object" ? options.metadata : {},
    };

    const headers = { "Content-Type": "application/json" };
    const token = authAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    return fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
    }).catch(() => null);
  }

  function currentProduct() {
    const params = new URLSearchParams(location.search);
    const fromQuery = cleanProduct(params.get("producto") || params.get("course"));
    if (fromQuery) return fromQuery;

    const fromDom = cleanProduct(
      document.body?.getAttribute("data-course")
      || document.documentElement?.getAttribute("data-course")
      || document.querySelector("[data-course]")?.getAttribute("data-course"),
    );
    if (fromDom) return fromDom;

    return courseSessionRecord()?.product || null;
  }

  function onceKey(eventName, product = "") {
    return `${FUNNEL_ONCE_PREFIX}${eventName}:${product || "global"}:${location.pathname}`;
  }

  function markOnce(eventName, product = "") {
    try {
      const key = onceKey(eventName, product);
      if (sessionStorage.getItem(key) === "1") return false;
      sessionStorage.setItem(key, "1");
      return true;
    } catch {
      return true;
    }
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

  function cleanAcademyTrackingParams() {
    if (!location.pathname.startsWith("/academy/")) return;

    const url = new URL(location.href);
    const removableKeys = [];
    url.searchParams.forEach((_, key) => {
      const normalized = key.toLowerCase();
      if (normalized.startsWith("utm_") || ["gclid", "fbclid", "msclkid"].includes(normalized)) {
        removableKeys.push(key);
      }
    });

    if (!removableKeys.length) return;
    removableKeys.forEach((key) => url.searchParams.delete(key));

    try {
      history.replaceState(history.state, document.title, `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // No recargamos ni alteramos autenticación si History API no está disponible.
    }
  }

  function instrumentAuthenticatedAcademyOpen() {
    if (!location.pathname.startsWith("/academy/")) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (authAccessToken()) {
        window.clearInterval(timer);
        if (markOnce("academy_opened")) send("academy_opened");
        return;
      }
      if (attempts >= 50) window.clearInterval(timer);
    }, 400);
  }

  function activityRoot() {
    return document.querySelector("#root:not([hidden]), #app-view:not([hidden]), main") || document.body;
  }

  function instrumentAuthenticatedProductUse() {
    if (location.pathname.startsWith("/academy/")) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const product = currentProduct();
      const token = authAccessToken();
      const root = activityRoot();
      const explicitRoot = document.querySelector("#root");
      const ready = !explicitRoot || !explicitRoot.hidden;

      if (product && token && root && ready) {
        window.clearInterval(timer);
        if (markOnce("product_opened", product)) send("product_opened", { productSlug: product });

        let activitySent = false;
        const recordActivity = (event) => {
          if (activitySent || event?.isTrusted === false) return;
          activitySent = true;
          if (markOnce("first_activity", product)) send("first_activity", { productSlug: product });
          ["pointerdown", "keydown", "input", "change"].forEach((name) => root.removeEventListener(name, recordActivity, true));
        };
        ["pointerdown", "keydown", "input", "change"].forEach((name) => root.addEventListener(name, recordActivity, { capture: true, passive: true }));
        return;
      }

      if (attempts >= 75) window.clearInterval(timer);
    }, 400);
  }

  // El bridge de Academy captura en window y puede detener propagación antes de document.
  // Estos eventos históricos siguen siendo útiles como intención, pero no sustituyen
  // los estados autenticados TF-008 academy_opened/product_opened.
  window.addEventListener("click", (event) => {
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

  function init() {
    initialEvent();
    cleanAcademyTrackingParams();
    instrumentAuthenticatedAcademyOpen();
    instrumentAuthenticatedProductUse();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
