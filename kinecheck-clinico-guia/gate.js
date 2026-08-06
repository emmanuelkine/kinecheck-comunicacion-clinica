(() => {
  "use strict";

  const CONFIG = window.KINECHECK_GUIDE_CONFIG;
  if (!CONFIG) return;

  const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
  const HANDOFF_MAX_AGE_MS = 120000;
  const SESSION_KEY = "kinecheck_guide_session_v2";
  const LEGACY_SESSION_KEY = "kinecheck_guide_session_v1";
  const SHARED_SESSION_KEY = "kinecheck_secure_session_v1";
  const REQUEST_TIMEOUT_MS = 15000;

  const shell = document.querySelector("#access-shell");
  const app = document.querySelector("#guide-app");
  const progress = document.querySelector("#access-progress");
  const message = document.querySelector("#access-message");
  const retry = document.querySelector("#retry-guide-access");
  const back = document.querySelector("#guide-back-to-ecosystem");

  function showError(text, { retryVisible = false, backVisible = true } = {}) {
    if (progress) progress.hidden = true;
    if (message) {
      message.textContent = text;
      message.className = "notice error";
      message.hidden = false;
    }
    if (retry) retry.hidden = !retryVisible;
    if (back) back.hidden = !backVisible;
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

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function request(url, init = {}) {
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } catch (error) {
        lastError = error;
        if (attempt === 1) await delay(350);
      } finally {
        window.clearTimeout(timer);
      }
    }
    const error = new Error("No pudimos conectar con el servicio de acceso de KineCheck.");
    error.code = "NETWORK_ERROR";
    error.cause = lastError;
    throw error;
  }

  async function verifyIdentity(session) {
    const response = await request(`${CONFIG.supabaseUrl}/auth/v1/user`, {
      cache: "no-store",
      headers: {
        apikey: CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (!response.ok) {
      const error = new Error("Tu sesión terminó. Vuelve a abrir la guía desde KineCheck.");
      error.status = response.status;
      throw error;
    }
    const user = await response.json();
    if (!user?.email) throw new Error("No fue posible verificar la identidad de la cuenta.");
    return user;
  }

  async function verifyLicense(session) {
    const response = await request(`${CONFIG.supabaseUrl}/functions/v1/${CONFIG.courseKeyFunction}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseSlug: CONFIG.accessSlug }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.active !== true) {
      const error = new Error(payload.message || "No encontramos una licencia activa de KineCheck Clínico.");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function openGuide() {
    if (message) message.hidden = true;
    if (retry) retry.hidden = true;
    if (progress) {
      progress.hidden = false;
      progress.textContent = "Verificando identidad y licencia…";
    }

    const session = consumeHandoff() || readStoredSession();
    if (!session) {
      const error = new Error("Inicia sesión una sola vez en el ecosistema KineCheck y abre la guía desde tu biblioteca.");
      error.status = 401;
      throw error;
    }

    const [user] = await Promise.all([verifyIdentity(session), verifyLicense(session)]);
    saveSession(session);
    if (window.KineCheckWatermark) {
      await window.KineCheckWatermark.showVerifiedBuyer({ user, licenseScopes: [CONFIG.accessSlug] });
    }
    if (shell) shell.hidden = true;
    if (app) app.hidden = false;
    window.KineCheckClinicoGuide?.start?.();
  }

  function handleError(error) {
    if (error?.code === "NETWORK_ERROR") {
      showError(
        "No pudimos conectar con el validador. Tu sesión sigue activa; reintenta aquí sin volver al ecosistema.",
        { retryVisible: true, backVisible: false },
      );
      return;
    }

    if (error?.status === 401) {
      storageRemove(sessionStorage, SESSION_KEY);
      showError(error.message, { retryVisible: false, backVisible: true });
      return;
    }

    if (error?.status === 403) {
      showError(error.message, { retryVisible: false, backVisible: true });
      return;
    }

    showError(
      `${error instanceof Error ? error.message : "No fue posible abrir la guía complementaria."} Reintenta sin salir de esta pantalla.`,
      { retryVisible: true, backVisible: false },
    );
  }

  retry?.addEventListener("click", () => {
    openGuide().catch(handleError);
  });

  openGuide().catch(handleError);
})();