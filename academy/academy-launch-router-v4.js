(() => {
  if (window.__KINECHECK_LAUNCH_ROUTER_V4__) return;
  window.__KINECHECK_LAUNCH_ROUTER_V4__ = true;

  const CONFIG = window.KINECHECK_ACADEMY_CONFIG || {};
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const DEFAULT_HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
  const APP_SSO = CONFIG.appSso || Object.freeze({
    enabled: true,
    baseUrl: "https://kinecheck-clinico.emmanuelkine.chatgpt.site",
    handoffType: DEFAULT_HANDOFF_TYPE,
    transport: "form-post",
    postPath: "/api/license/sso",
    routes: Object.freeze({
      "kinecheck-clinico": "/sso.html?product=kinecheck-clinico",
      "kinecheck-estudiante": "/sso.html?product=kinecheck-estudiante",
      "kinecheck-recupera": "/sso.html?product=kinecheck-recupera",
    }),
  });

  const EXTERNAL_COURSES = Object.freeze({
    "mas-alla-del-dolor": "https://emmanuelkine.github.io/mas-alla-del-dolor/?course=mas-alla-del-dolor&v=20260801-sso4",
    "evidencia-aplicada": "https://emmanuelkine.github.io/kinecheck-evidencia-aplicada/?v=20260801-sso4",
  });

  const SAME_ORIGIN_COURSES = new Set([
    "comunicacion-clinica",
    "traumatologia-ortopedia-clinica",
  ]);

  const APPLICATIONS = new Set([
    "kinecheck-clinico",
    "kinecheck-estudiante",
    "kinecheck-recupera",
  ]);

  let navigating = false;

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function showToast(text) {
    const toast = document.querySelector("#kc-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function validTransferSession() {
    const session = readSession();
    const expiresAt = Number(session?.expires_at || 0);
    const now = Math.floor(Date.now() / 1000);

    if (!session?.access_token || (expiresAt && expiresAt <= now + 30)) {
      showToast("Tu sesión necesita renovarse. Actualiza KineCheck e ingresa nuevamente antes de abrir este producto.");
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

  function writeCourseHandoff(session, product) {
    window.name = "";
    window.name = JSON.stringify({
      type: DEFAULT_HANDOFF_TYPE,
      issuedAt: Date.now(),
      product,
      session: accessOnlySession(session),
    });
  }

  function writeApplicationHandoff(session, product) {
    const accessOnly = accessOnlySession(session);
    window.name = "";
    window.name = JSON.stringify({
      type: APP_SSO.handoffType || DEFAULT_HANDOFF_TYPE,
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
    if (slug === "comunicacion-clinica") {
      return `${location.origin}${base}/?course=comunicacion-clinica&v=20260801-sso4`;
    }
    if (slug === "traumatologia-ortopedia-clinica") {
      return `${location.origin}${base}/traumatologia/?course=traumatologia-ortopedia-clinica&v=20260801-sso4`;
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
    window.setTimeout(() => {
      navigating = false;
      if (button) {
        button.removeAttribute("aria-busy");
        button.style.pointerEvents = "";
      }
    }, 5000);
    return true;
  }

  function resetNavigation(button) {
    navigating = false;
    button?.removeAttribute("aria-busy");
    if (button) button.style.pointerEvents = "";
  }

  function openCourse(slug, destination, button) {
    if (!startNavigation(button)) return;
    const session = validTransferSession();
    if (!session) {
      resetNavigation(button);
      return;
    }
    writeCourseHandoff(session, slug);
    location.assign(destination);
  }

  function applicationUrl(slug) {
    const route = APP_SSO.routes?.[slug];
    if (!APP_SSO.baseUrl || !route) return "";
    return new URL(route, APP_SSO.baseUrl).toString();
  }

  function submitApplicationPost(session, product) {
    writeApplicationHandoff(session, product);
    location.assign("./app-sso-relay.html?v=20260801-sso8");
  }

  function openApplication(slug, button) {
    if (!APP_SSO.enabled) {
      showToast("Tu licencia se conserva activa. El acceso único de esta aplicación todavía no ha sido habilitado en producción.");
      return;
    }

    if (!startNavigation(button)) return;
    const session = validTransferSession();
    if (!session) {
      resetNavigation(button);
      return;
    }

    try {
      if (APP_SSO.transport === "form-post") {
        submitApplicationPost(session, slug);
        return;
      }

      const destination = applicationUrl(slug);
      if (!destination) throw new Error("La ruta de acceso único todavía no está configurada para esta aplicación.");
      writeApplicationHandoff(session, slug);
      location.assign(destination);
    } catch (error) {
      resetNavigation(button);
      showToast(error instanceof Error ? error.message : "No fue posible abrir la aplicación.");
    }
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
    const button = event.target.closest("[data-course], [data-kc-path-open]");
    const slug = button?.dataset.course || button?.dataset.kcPathOpen;
    if (!button || button.disabled || !slug) return;

    if (EXTERNAL_COURSES[slug]) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openCourse(slug, EXTERNAL_COURSES[slug], button);
      return;
    }

    if (SAME_ORIGIN_COURSES.has(slug)) {
      const destination = sameOriginCourseUrl(slug);
      if (!destination) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openCourse(slug, destination, button);
      return;
    }

    if (APPLICATIONS.has(slug)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openApplication(slug, button);
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", clarifyPendingButtons, { once: true });
  } else {
    clarifyPendingButtons();
  }
})();
