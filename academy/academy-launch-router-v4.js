(() => {
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const EXTERNAL_COURSES = Object.freeze({
    "mas-alla-del-dolor": "https://emmanuelkine.github.io/mas-alla-del-dolor/?course=mas-alla-del-dolor&v=20260731-sso1",
    "evidencia-aplicada": "https://emmanuelkine.github.io/kinecheck-evidencia-aplicada/?v=20260731-sso1",
  });

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function encodeSession(session) {
    const transferable = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: session.user,
    };
    const bytes = new TextEncoder().encode(JSON.stringify(transferable));
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
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3800);
  }

  function openExternalCourse(slug) {
    const session = readSession();
    if (!session?.access_token || !session?.refresh_token) {
      showToast("Tu sesión venció. Ingresa nuevamente para abrir este curso.");
      return;
    }

    const url = new URL(EXTERNAL_COURSES[slug]);
    url.hash = new URLSearchParams({
      kc_session: encodeSession(session),
      kc_return: `${location.origin}/academy/`,
    }).toString();
    location.assign(url.toString());
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
    if (!button || button.disabled || !EXTERNAL_COURSES[slug]) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openExternalCourse(slug);
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", clarifyPendingButtons, { once: true });
  } else {
    clarifyPendingButtons();
  }
})();
