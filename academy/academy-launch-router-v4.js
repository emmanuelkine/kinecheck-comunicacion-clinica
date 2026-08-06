(() => {
  "use strict";

  if (window.__KINECHECK_LAUNCH_ROUTER_V5__) return;
  window.__KINECHECK_LAUNCH_ROUTER_V5__ = true;

  const CONFIG = window.KINECHECK_ACADEMY_CONFIG || {};
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
  const APP_SSO = CONFIG.appSso || Object.freeze({
    enabled: true,
    baseUrl: "https://kinecheck-clinico.emmanuelkine.chatgpt.site",
    handoffType: HANDOFF_TYPE,
    transport: "form-post",
    postPath: "/api/license/sso",
    routes: Object.freeze({
      "kinecheck-estudiante": "/sso.html?product=kinecheck-estudiante",
      "kinecheck-recupera": "/sso.html?product=kinecheck-recupera",
    }),
  });

  const EXTERNAL_COURSES = Object.freeze({
    "mas-alla-del-dolor": "https://emmanuelkine.github.io/mas-alla-del-dolor/?course=mas-alla-del-dolor&v=20260806-direct1",
    "evidencia-aplicada": "https://emmanuelkine.github.io/kinecheck-evidencia-aplicada/?v=20260806-direct1",
  });

  const SAME_ORIGIN_COURSES = new Set([
    "kinecheck-clinico",
    "kinecheck-clinico-curso",
    "comunicacion-clinica",
    "traumatologia-ortopedia-clinica",
  ]);

  const APPLICATIONS = new Set([
    "kinecheck-estudiante",
    "kinecheck-recupera",
  ]);

  const KNOWN_PRODUCTS = new Set([
    ...Object.keys(EXTERNAL_COURSES),
    ...SAME_ORIGIN_COURSES,
    ...APPLICATIONS,
  ]);

  let navigating = false;

  function parseSession(storage) {
    try {
      const value = JSON.parse(storage.getItem(SESSION_KEY) || "null");
      return value?.access_token ? value : null;
    } catch {
      return null;
    }
  }

  function readSession() {
    const provided = window.KINECHECK_ACADEMY_SESSION?.get?.();
    if (provided?.access_token) return provided;
    return parseSession(sessionStorage) || parseSession(localStorage);
  }

  function showToast(text) {
    const toast = document.querySelector("#kc-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 4200);
  }

  async function validTransferSession() {
    let session = readSession();
    let expiresAt = Number(session?.expires_at || 0);
    const now = Math.floor(Date.now() / 1000);

    if ((!session?.access_token || (expiresAt && expiresAt <= now + 60))
      && typeof window.KINECHECK_ACADEMY_SESSION?.refresh === "function") {
      session = await window.KINECHECK_ACADEMY_SESSION.refresh().catch(() => null);
      expiresAt = Number(session?.expires_at || 0);
    }

    if (!session?.access_token || (expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 30)) {
      showToast("Tu sesión terminó. Ingresa nuevamente una sola vez en KineCheck.");
      return null;
    }
    return session;
  }

  function accessOnlySession(session) {
    return {
      access_token: session.access_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type || "bearer",
      handoff_access_only: true,
    };
  }

  function handoff(session, product) {
    if (!KNOWN_PRODUCTS.has(product)) throw new Error("El producto solicitado no pertenece al catálogo protegido.");
    return {
      type: HANDOFF_TYPE,
      issuedAt: Date.now(),
      product,
      session: accessOnlySession(session),
    };
  }

  function writeHandoff(session, product) {
    window.name = JSON.stringify(handoff(session, product));
  }

  function writeApplicationHandoff(session, product) {
    if (!APPLICATIONS.has(product)) throw new Error("La aplicación solicitada no está habilitada para SSO.");
    const accessOnly = accessOnlySession(session);
    window.name = JSON.stringify({
      type: APP_SSO.handoffType || HANDOFF_TYPE,
      issuedAt: Date.now(),
      product,
      access_token: accessOnly.access_token,
      expires_at: accessOnly.expires_at,
      session: {
        access_token: accessOnly.access_token,
        expires_at: accessOnly.expires_at,
      },
    });
  }

  function repositoryBasePath() {
    return location.hostname.endsWith("github.io")
      ? "/kinecheck-comunicacion-clinica"
      : "";
  }

  function sameOriginCourseUrl(slug) {
    const base = repositoryBasePath();
    if (slug === "kinecheck-clinico") {
      return `${location.origin}${base}/kinecheck-clinico-guia/?product=kinecheck-clinico&v=20260806-fetchfix1`;
    }
    if (slug === "kinecheck-clinico-curso") {
      return `${location.origin}${base}/kinecheck-clinico-curso/?course=kinecheck-clinico-curso&v=20260806-fetchfix1`;
    }
    if (slug === "comunicacion-clinica") {
      return `${location.origin}${base}/comunicacion-clinica.html?course=comunicacion-clinica&v=20260806-fetchfix1`;
    }
    if (slug === "traumatologia-ortopedia-clinica") {
      return `${location.origin}${base}/traumatologia/?course=traumatologia-ortopedia-clinica&v=20260806-fetchfix1`;
    }
    return "";
  }

  function startNavigation(button) {
    if (navigating) return false;
    navigating = true;
    if (button) {
      button.setAttribute("aria-busy", "true");
      button.style.pointerEvents = "none";
    }
    window.setTimeout(() => resetNavigation(button), 10000);
    return true;
  }

  function resetNavigation(button) {
    navigating = false;
    button?.removeAttribute("aria-busy");
    if (button) button.style.pointerEvents = "";
  }

  async function openCourse(slug, destination, button) {
    if (!startNavigation(button)) return;
    const session = await validTransferSession();
    if (!session) {
      resetNavigation(button);
      return;
    }
    try {
      writeHandoff(session, slug);
      location.assign(destination);
    } catch (error) {
      resetNavigation(button);
      showToast(error instanceof Error ? error.message : "No fue posible abrir el producto.");
    }
  }

  function submitApplicationPost(session, product) {
    writeApplicationHandoff(session, product);
    location.assign("./app-sso-relay.html?v=20260806-direct1");
  }

  async function openApplication(slug, button) {
    if (!APPLICATIONS.has(slug)) {
      showToast("La aplicación solicitada no pertenece a los accesos externos activos.");
      return;
    }
    if (!APP_SSO.enabled) {
      showToast("El acceso único de esta aplicación todavía no está habilitado.");
      return;
    }
    if (!startNavigation(button)) return;

    const session = await validTransferSession();
    if (!session) {
      resetNavigation(button);
      return;
    }

    try {
      if (APP_SSO.transport === "form-post") {
        submitApplicationPost(session, slug);
        return;
      }
      const route = APP_SSO.routes?.[slug];
      if (!APP_SSO.baseUrl || !route) throw new Error("La ruta de acceso único no está configurada para esta aplicación.");
      writeApplicationHandoff(session, slug);
      location.assign(new URL(route, APP_SSO.baseUrl).toString());
    } catch (error) {
      resetNavigation(button);
      showToast(error instanceof Error ? error.message : "No fue posible abrir la aplicación.");
    }
  }

  function destinationFor(slug) {
    if (EXTERNAL_COURSES[slug]) return EXTERNAL_COURSES[slug];
    if (SAME_ORIGIN_COURSES.has(slug)) return sameOriginCourseUrl(slug);
    return "";
  }

  function clarifyPendingButtons() {
    document.querySelectorAll("[data-kc-coming-soon]").forEach((button) => {
      const label = button.textContent.trim();
      if (!label.includes("Próximamente")) button.textContent = `${label} · Próximamente`;
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.title = "Esta función todavía está en preparación.";
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-course], [data-kc-path-open], [data-kc-open-product]");
    const slug = button?.dataset.course || button?.dataset.kcPathOpen || button?.dataset.kcOpenProduct;
    if (!button || button.disabled || !slug || !KNOWN_PRODUCTS.has(slug)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (APPLICATIONS.has(slug)) {
      openApplication(slug, button);
      return;
    }

    const destination = destinationFor(slug);
    if (!destination) {
      showToast("No fue posible encontrar la ruta de este producto.");
      return;
    }
    openCourse(slug, destination, button);
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", clarifyPendingButtons, { once: true });
  } else {
    clarifyPendingButtons();
  }
})();