(() => {
  "use strict";

  const CONFIG = window.KINECHECK_GUIDE_CONFIG;
  if (!CONFIG) return;

  const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
  const HANDOFF_MAX_AGE_MS = 120000;
  const SESSION_KEY = "kinecheck_guide_session_v2";
  const LEGACY_SESSION_KEY = "kinecheck_guide_session_v1";
  const SHARED_SESSION_KEY = "kinecheck_secure_session_v1";

  const shell = document.querySelector("#access-shell");
  const app = document.querySelector("#guide-app");
  const progress = document.querySelector("#access-progress");
  const message = document.querySelector("#access-message");

  function showError(text) {
    if (progress) progress.hidden = true;
    if (message) {
      message.textContent = text;
      message.className = "notice error";
      message.hidden = false;
    }
  }

  function safeJson(value) {
    try {
      return JSON.parse(value || "null");
    } catch {
      return null;
    }
  }

  function normalizeSession(value) {
    if (!value?.access_token) return null;
    const expiresAt = Number(value.expires_at || 0);
    if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 15) return null;
    return {
      ...value,
      access_token: String(value.access_token),
      expires_at: expiresAt || null,
      token_type: value.token_type || "bearer",
    };
  }

  function storageRead(storage, key) {
    try {
      return normalizeSession(safeJson(storage.getItem(key)));
    } catch {
      return null;
    }
  }

  function storageWrite(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      // Sesión temporal de mejor esfuerzo.
    }
  }

  function storageRemove(storage, key) {
    try {
      storage.removeItem(key);
    } catch {
      // Limpieza de mejor esfuerzo.
    }
  }

  function consumeHandoff() {
    if (!window.name) return null;
    try {
      const handoff = safeJson(window.name);
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
    const sources = [
      [sessionStorage, SESSION_KEY],
      [sessionStorage, SHARED_SESSION_KEY],
      [localStorage, SHARED_SESSION_KEY],
      [sessionStorage, LEGACY_SESSION_KEY],
      [localStorage, LEGACY_SESSION_KEY],
    ];
    for (const [storage, key] of sources) {
      const session = storageRead(storage, key);
      if (session) return session;
    }
    return null;
  }

  function saveSession(session) {
    storageWrite(sessionStorage, SESSION_KEY, session);
    storageRemove(sessionStorage, LEGACY_SESSION_KEY);
    storageRemove(localStorage, LEGACY_SESSION_KEY);
  }

  async function verifyIdentity(session) {
    const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/user`, {
      cache: "no-store",
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
      cache: "no-store",
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
    if (!session) throw new Error("Inicia sesión una sola vez en el ecosistema KineCheck y abre la guía desde tu biblioteca.");
    if (progress) progress.textContent = "Verificando identidad y licencia…";
    const [user] = await Promise.all([verifyIdentity(session), verifyLicense(session)]);
    saveSession(session);
    if (window.KineCheckWatermark) {
      await window.KineCheckWatermark.showVerifiedBuyer({ user, licenseScopes: [CONFIG.accessSlug] });
    }
    if (shell) shell.hidden = true;
    if (app) app.hidden = false;
    window.KineCheckClinicoGuide?.start?.();
  }

  openGuide().catch((error) => {
    storageRemove(sessionStorage, SESSION_KEY);
    showError(error instanceof Error ? error.message : "No fue posible abrir la guía complementaria.");
  });
})();
