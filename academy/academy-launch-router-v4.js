(() => {
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const HANDOFF_TYPE = "kinecheck-sso-v2";

  const COURSE_ROUTES = Object.freeze({
    "comunicacion-clinica": () => `${location.origin}/?course=comunicacion-clinica&v=20260731-sso2`,
    "traumatologia-ortopedia-clinica": () => `${location.origin}/traumatologia/?course=traumatologia-ortopedia-clinica&v=20260731-sso2`,
    "mas-alla-del-dolor": () => "https://emmanuelkine.github.io/mas-alla-del-dolor/?course=mas-alla-del-dolor&v=20260731-sso2",
    "evidencia-aplicada": () => "https://emmanuelkine.github.io/kinecheck-evidencia-aplicada/?v=20260731-sso2",
  });

  const LEGACY_APPLICATIONS = new Set([
    "kinecheck-clinico",
    "kinecheck-estudiante",
    "kinecheck-recupera",
  ]);

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function transferableSession(session) {
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
    };
  }

  function encodeSession(session) {
    const bytes = new TextEncoder().encode(JSON.stringify(transferableSession(session)));
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary)
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/g, "");
  }

  function showToast(text) {
    const toast = document.querySelector("#kc-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function openCourse(slug) {
    const session = readSession();
    if (!session?.access_token || !session?.refresh_token) {
      showToast("Tu sesión venció. Ingresa nuevamente para abrir este curso.");
      return;
    }

    const url = new URL(COURSE_ROUTES[slug]());
    const transfer = transferableSession(session);

    window.name = JSON.stringify({
      type: HANDOFF_TYPE,
      issuedAt: Date.now(),
      session: transfer,
    });

    url.hash = new URLSearchParams({
      kc_session: encodeSession(session),
      kc_return: `${location.origin}/academy/`,
    }).toString();

    location.assign(url.toString());
  }

  function blockLegacyApplication(slug) {
    const names = {
      "kinecheck-clinico": "KineCheck Clínico",
      "kinecheck-estudiante": "KineCheck Estudiante",
      "kinecheck-recupera": "KineCheck Recupera",
    };
    showToast(`${names[slug]} está siendo integrado al acceso único de KineCheck 4.0. No vuelvas a ingresar correo ni código de transacción en la página antigua.`);
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
    const button = event.target.closest("[data-course]");
    const slug = button?.dataset.course;
    if (!button || button.disabled || !slug) return;

    if (COURSE_ROUTES[slug]) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openCourse(slug);
      return;
    }

    if (LEGACY_APPLICATIONS.has(slug)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      blockLegacyApplication(slug);
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", clarifyPendingButtons, { once: true });
  } else {
    clarifyPendingButtons();
  }
})();
