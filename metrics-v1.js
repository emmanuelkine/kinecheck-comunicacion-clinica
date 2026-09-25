(() => {
  "use strict";

  if (window.__KINECHECK_METRICS_V1__) return;
  window.__KINECHECK_METRICS_V1__ = true;

  const ENDPOINT = "https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1/metric-event";
  const SESSION_KEY = "kc_metric_session_v1";
  const AUTH_SESSION_KEY = "kinecheck_secure_session_v1";
  const COURSE_SESSION_PREFIX = "kinecheck_course_session_v2:";
  const FUNNEL_ONCE_PREFIX = "kc_tf008_once:";
  const METRICS_CHOICE_KEY = "kc_optional_metrics_choice_v1";
  let metricsChoice = null;
  let metricsStarted = false;
  try {
    const saved = localStorage.getItem(METRICS_CHOICE_KEY);
    if (saved === "yes" || saved === "no") metricsChoice = saved;
  } catch { /* Browsers may block optional storage. */ }

  const ALLOWED_PRODUCTS = new Set([
    "banderas-clinicas",
    "comunicacion-clinica",
    "dolor-lumbar-persistente",
    "dolor-musculoesqueletico",
    "evidencia-aplicada",
    "kinecheck-clinico",
    "kinecheck-estudiante",
    "kinecheck-recupera",
    "mas-alla-del-dolor",
    "pack-estudiante",
    "pack-kinecheck-estudiante",
    "traumatologia-ortopedia-clinica",
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
    if (metricsChoice !== "yes") return Promise.resolve(null);
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

    const pathMatch = String(location.pathname || "").match(/^\/productos\/([^/]+)(?:\/|$)/i);
    const fromPath = cleanProduct(pathMatch ? decodeURIComponent(pathMatch[1]) : "");
    if (fromPath) return fromPath;

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
      if (markOnce("buy_click", slug || "unknown")) send("buy_click", { productSlug: slug });
      if (markOnce("checkout_start", slug || "unknown")) send("checkout_start", { productSlug: slug });
      if (markOnce("hotmart_outbound", slug || "unknown")) send("hotmart_outbound", { productSlug: slug });
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

  function startMetrics() {
    if (metricsStarted || metricsChoice !== "yes") return;
    metricsStarted = true;
    initialEvent();
    instrumentAuthenticatedAcademyOpen();
    instrumentAuthenticatedProductUse();
  }

  function removeOptionalSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
        const key = sessionStorage.key(index);
        if (key && key.startsWith(FUNNEL_ONCE_PREFIX)) sessionStorage.removeItem(key);
      }
    } catch { /* Browser storage is optional. */ }
  }

  function setMetricsChoice(choice) {
    metricsChoice = choice;
    try { localStorage.setItem(METRICS_CHOICE_KEY, choice); } catch { /* In-memory fallback. */ }
    if (choice === "no") removeOptionalSession();
    const panel = document.querySelector("#kc-metrics-panel");
    const toggle = document.querySelector("#kc-metrics-toggle");
    if (panel) panel.hidden = true;
    if (toggle) toggle.hidden = false;
    if (choice === "yes") startMetrics();
  }

  function mountMetricsPreferences() {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/assets/metrics-privacy-v1.css?v=20260925-1";
    document.head.appendChild(css);

    const panel = document.createElement("section");
    panel.id = "kc-metrics-panel";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Preferencias de medición");
    panel.innerHTML = '<h2>Preferencias de medición</h2>'
      + '<p>El almacenamiento necesario mantiene tu sesión, seguridad y progreso. '
      + 'Las métricas opcionales nos ayudan a entender el uso del sitio: páginas visitadas, '
      + 'tipo de dispositivo, identificador aleatorio de sesión y, si iniciaste sesión, '
      + 'actividad asociada a tu cuenta. No incluyen el contenido de formularios ni datos clínicos.</p>'
      + '<p>Las métricas opcionales permanecen desactivadas hasta que las aceptes. '
      + 'Puedes cambiar tu elección cuando quieras. '
      + '<a href="/legal/privacidad.html#almacenamiento">Más información sobre privacidad y almacenamiento</a>.</p>'
      + '<div class="kc-metrics-actions">'
      + '<button type="button" data-kc-metrics="no">Rechazar métricas</button>'
      + '<button type="button" data-kc-metrics="yes">Aceptar métricas</button>'
      + '</div>';

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.id = "kc-metrics-toggle";
    toggle.textContent = "Preferencias de métricas";
    toggle.setAttribute("aria-controls", "kc-metrics-panel");
    toggle.setAttribute("aria-expanded", "false");
    toggle.hidden = true;
    const showPanel = () => {
      panel.hidden = false;
      toggle.hidden = true;
      toggle.setAttribute("aria-expanded", "true");
      panel.querySelector("button")?.focus();
    };
    toggle.addEventListener("click", showPanel);
    panel.addEventListener("click", (event) => {
      const button = event.target instanceof Element
        ? event.target.closest("button[data-kc-metrics]") : null;
      if (!button) return;
      setMetricsChoice(button.getAttribute("data-kc-metrics"));
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    });
    document.body.append(panel, toggle);
    if (metricsChoice === "yes" || metricsChoice === "no") {
      panel.hidden = true;
      toggle.hidden = false;
    }
    if (location.hash === "#preferencias-metricas") showPanel();
  }

  function init() {
    cleanAcademyTrackingParams();
    mountMetricsPreferences();
    startMetrics();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
