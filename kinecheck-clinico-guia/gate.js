(() => {
  "use strict";

  const CONFIG = window.KINECHECK_GUIDE_CONFIG;
  if (!CONFIG) return;

  const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
  const HANDOFF_MAX_AGE_MS = 120000;
  const SESSION_KEY = "kinecheck_guide_session_v1";
  const SHARED_SESSION_KEY = "kinecheck_secure_session_v1";

  const shell = document.querySelector("#access-shell");
  const app = document.querySelector("#guide-app");
  const progress = document.querySelector("#access-progress");
  const message = document.querySelector("#access-message");

  function showError(text) {
    progress.hidden = true;
    message.textContent = text;
    message.className = "notice error";
    message.hidden = false;
  }

  function normalizeSession(value) {
    if (!value?.access_token) return null;
    const expiresAt = Number(value.expires_at || 0);
    if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 15) return null;
    return {
      access_token: value.access_token,
      expires_at: expiresAt || null,
      token_type: value.token_type || "bearer",
    };
  }

  function consumeHandoff() {
    if (!window.name) return null;
    try {
      const handoff = JSON.parse(window.name);
      const issuedAt = Number(handoff?.issuedAt || 0);
      if (handoff?.type !== HANDOFF_TYPE || Math.abs(Date.now() - issuedAt) > HANDOFF_MAX_AGE_MS) return null;
      const product = String(handoff?.product || "");
      if (product !== CONFIG.accessSlug) return null;
      return normalizeSession(handoff.session || handoff);
    } catch {
      return null;
    } finally {
      window.name = "";
    }
  }

  function readStoredSession() {
    for (const key of [SESSION_KEY, SHARED_SESSION_KEY]) {
      try {
        const session = normalizeSession(JSON.parse(sessionStorage.getItem(key) || "null"));
        if (session) return session;
      } catch {
        // Continúa con la siguiente fuente segura.
      }
    }
    return null;
  }

  function saveSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async function verifyIdentity(session) {
    const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
        "Cache-Control": "no-store",
      },
    });
    if (!response.ok) throw new Error("Tu sesión terminó. Vuelve a abrir la guía desde KineCheck.");
    const user = await response.json();
    if (!user?.email) throw new Error("No fue posible verificar la identidad de la cuenta.");
    return user;
  }

  async function verifyLicense(session) {
    const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/${CONFIG.courseKeyFunction}`, {
      method: "POST",
      headers: {
        apikey: CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ courseSlug: CONFIG.accessSlug }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.active !== true) {
      throw new Error(payload.message || "No encontramos una licencia activa de KineCheck Clínico.");
    }
    return payload;
  }

  async function openGuide() {
    const session = consumeHandoff() || readStoredSession();
    if (!session) throw new Error("Abre esta guía desde tu biblioteca KineCheck para transferir una sesión segura.");
    progress.textContent = "Verificando identidad y licencia…";
    const [user] = await Promise.all([verifyIdentity(session), verifyLicense(session)]);
    saveSession(session);
    if (window.KineCheckWatermark) {
      await window.KineCheckWatermark.showVerifiedBuyer({ user, licenseScopes: [CONFIG.accessSlug] });
    }
    shell.hidden = true;
    app.hidden = false;
    window.KineCheckClinicoGuide?.start?.();
  }

  openGuide().catch((error) => {
    sessionStorage.removeItem(SESSION_KEY);
    showError(error instanceof Error ? error.message : "No fue posible abrir la guía complementaria.");
  });
})();
