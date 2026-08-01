(() => {
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";

  const EXTERNAL_COURSES = Object.freeze({
    "mas-alla-del-dolor": "https://emmanuelkine.github.io/mas-alla-del-dolor/?course=mas-alla-del-dolor&v=20260731-sso3",
    "evidencia-aplicada": "https://emmanuelkine.github.io/kinecheck-evidencia-aplicada/?v=20260731-sso3",
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

  function accessOnlySession(session) {
    return {
      access_token: session.access_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type || "bearer",
      handoff_access_only: true,
    };
  }

  function showToast(text) {
    const toast = document.querySelector("#kc-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function openExternalCourse(slug) {
    const session = readSession();
    const expiresAt = Number(session?.expires_at || 0);
    const now = Math.floor(Date.now() / 1000);

    if (!session?.access_token || (expiresAt && expiresAt <= now + 30)) {
      showToast("Tu sesión necesita renovarse. Actualiza KineCheck e ingresa nuevamente antes de abrir este curso.");
      return;
    }

    window.name = JSON.stringify({
      type: HANDOFF_TYPE,
      issuedAt: Date.now(),
      session: accessOnlySession(session),
    });

    location.assign(EXTERNAL_COURSES[slug]);
  }

  function blockLegacyApplication(slug) {
    const names = {
      "kinecheck-clinico": "KineCheck Clínico",
      "kinecheck-estudiante": "KineCheck Estudiante",
      "kinecheck-recupera": "KineCheck Recupera",
    };
    showToast(`${names[slug]} conserva su licencia activa, pero su acceso único todavía está en integración.`);
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

    if (EXTERNAL_COURSES[slug]) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openExternalCourse(slug);
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
