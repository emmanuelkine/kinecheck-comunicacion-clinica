(() => {
  "use strict";

  if (window.__KINECHECK_METRICS_V1__) return;
  window.__KINECHECK_METRICS_V1__ = true;

  const ENDPOINT = "https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1/metric-event";
  const SESSION_KEY = "kc_metric_session_v1";
  const AUTH_SESSION_KEY = "kinecheck_secure_session_v1";
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

  function decodeJwtClaims(token) {
    try {
      const parts = String(token || "").split(".");
      if (parts.length !== 3) return null;
      const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  function readCachedAuthSession() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function bearerFromHeaders(headers) {
    try {
      if (headers instanceof Headers) return String(headers.get("Authorization") || headers.get("authorization") || "");
      if (Array.isArray(headers)) {
        const found = headers.find(([key]) => String(key).toLowerCase() === "authorization");
        return found ? String(found[1] || "") : "";
      }
      if (headers && typeof headers === "object") {
        const key = Object.keys(headers).find((item) => item.toLowerCase() === "authorization");
        return key ? String(headers[key] || "") : "";
      }
    } catch {}
    return "";
  }

  function installAuthIdentityFastPath() {
    if (window.__KINECHECK_AUTH_IDENTITY_FASTPATH__) return;
    window.__KINECHECK_AUTH_IDENTITY_FASTPATH__ = true;
    const previousFetch = window.fetch.bind(window);

    window.fetch = function kinecheckFastFetch(input, init = {}) {
      try {
        const url = typeof input === "string" ? input : String(input?.url || "");
        const method = String(init.method || (typeof input !== "string" ? input?.method : "GET") || "GET").toUpperCase();
        if (method === "GET" && /\.supabase\.co\/auth\/v1\/user(?:\?|$)/.test(url)) {
          const session = readCachedAuthSession();
          const authHeader = bearerFromHeaders(init.headers || (typeof input !== "string" ? input?.headers : null));
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          const claims = decodeJwtClaims(token);
          const user = session?.user;
          const exp = Number(claims?.exp || 0);
          const sameToken = Boolean(token && session?.access_token === token);
          const sameUser = Boolean(user?.id && claims?.sub && String(user.id) === String(claims.sub));
          const stillValid = exp > Math.floor(Date.now() / 1000) + 20;
          if (sameToken && sameUser && stillValid) {
            return Promise.resolve(new Response(JSON.stringify(user), {
              status: 200,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "private, no-store, max-age=0",
                "X-KineCheck-Fast-Path": "cached-auth-identity",
              },
            }));
          }
        }
      } catch {
        // Ante cualquier duda se conserva la validación normal de Supabase.
      }
      return previousFetch(input, init);
    };
  }

  installAuthIdentityFastPath();

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

  function authAccessToken() {
    try {
      const session = window.KINECHECK_ACADEMY_SESSION?.get?.();
      if (session?.access_token) return String(session.access_token);
    } catch {
      // Fallback al storage compartido de Academy.
    }

    try {
      const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
      return session?.access_token ? String(session.access_token) : null;
    } catch {
      return null;
    }
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

    const headers = { "Content-Type": "application/json" };
    const token = authAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(ENDPOINT, {
      method: "POST",
      headers,
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

  // El bridge de Academy captura en window y puede detener propagación antes de document.
  // Escuchar aquí garantiza que los toques de tarjetas proxy queden observables.
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialEvent, { once: true });
    document.addEventListener("DOMContentLoaded", cleanAcademyTrackingParams, { once: true });
  } else {
    initialEvent();
    cleanAcademyTrackingParams();
  }
})();
