(() => {
  "use strict";

  const SESSION_KEY = "kinecheck_secure_session_v1";
  const ACTIVITY_KEY = "kinecheck_session_activity_v1";
  const FAILURES_KEY = "kinecheck_login_failures_v1";
  const LOCK_KEY = "kinecheck_login_lock_until_v1";
  const IDLE_LIMIT_MS = 30 * 60 * 1000;
  const LOCK_TIME_MS = 15 * 60 * 1000;
  const MAX_FAILURES = 5;
  const ACTIVITY_WRITE_INTERVAL_MS = 60 * 1000;
  const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
  const ANON_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";

  const nativeGetItem = Storage.prototype.getItem;
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  const nativeFetch = window.fetch.bind(window);

  const getLocal = (key) => nativeGetItem.call(window.localStorage, key);
  const setLocal = (key, value) => nativeSetItem.call(window.localStorage, key, value);
  const removeLocal = (key) => nativeRemoveItem.call(window.localStorage, key);
  const getSession = (key) => nativeGetItem.call(window.sessionStorage, key);
  const setSession = (key, value) => nativeSetItem.call(window.sessionStorage, key, value);
  const removeSession = (key) => nativeRemoveItem.call(window.sessionStorage, key);

  function migrateLegacySession() {
    const legacy = getLocal(SESSION_KEY);
    if (legacy && !getSession(SESSION_KEY)) {
      setSession(SESSION_KEY, legacy);
    }
    removeLocal(SESSION_KEY);
  }

  migrateLegacySession();

  Storage.prototype.getItem = function secureGetItem(key) {
    if (this === window.localStorage && key === SESSION_KEY) {
      return getSession(key);
    }
    return nativeGetItem.call(this, key);
  };

  Storage.prototype.setItem = function secureSetItem(key, value) {
    if (this === window.localStorage && key === SESSION_KEY) {
      setSession(key, String(value));
      setSession(ACTIVITY_KEY, String(Date.now()));
      removeLocal(key);
      return;
    }
    return nativeSetItem.call(this, key, value);
  };

  Storage.prototype.removeItem = function secureRemoveItem(key) {
    if (this === window.localStorage && key === SESSION_KEY) {
      removeSession(key);
      removeSession(ACTIVITY_KEY);
      removeLocal(key);
      return;
    }
    return nativeRemoveItem.call(this, key);
  };

  function clearPlatformSession() {
    removeSession(SESSION_KEY);
    removeSession(ACTIVITY_KEY);
    removeLocal(SESSION_KEY);
  }

  function readSessionObject() {
    try {
      const value = JSON.parse(getSession(SESSION_KEY) || "null");
      return value?.access_token ? value : null;
    } catch {
      return null;
    }
  }

  function sessionExists() {
    return Boolean(getSession(SESSION_KEY));
  }

  function sessionExpired(now = Date.now()) {
    const last = Number(getSession(ACTIVITY_KEY) || 0);
    return sessionExists() && (!last || now - last > IDLE_LIMIT_MS);
  }

  let lastActivityWrite = 0;
  function markActivity(force = false) {
    if (!sessionExists()) return;
    const now = Date.now();
    if (!force && now - lastActivityWrite < ACTIVITY_WRITE_INTERVAL_MS) return;
    lastActivityWrite = now;
    setSession(ACTIVITY_KEY, String(now));
  }

  function enforceIdleLimit() {
    if (!sessionExpired()) return;
    clearPlatformSession();
    const url = new URL(location.href);
    url.searchParams.set("session", "expired");
    url.hash = "";
    location.replace(url.toString());
  }

  if (sessionExists() && !getSession(ACTIVITY_KEY)) markActivity(true);
  enforceIdleLimit();

  ["pointerdown", "keydown", "touchstart", "scroll"].forEach((eventName) => {
    window.addEventListener(eventName, () => markActivity(false), { passive: true, capture: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      enforceIdleLimit();
      markActivity(true);
    }
  });
  window.setInterval(enforceIdleLimit, 60 * 1000);

  function readLockUntil() {
    return Number(getLocal(LOCK_KEY) || 0);
  }

  function clearLoginFailures() {
    removeLocal(FAILURES_KEY);
    removeLocal(LOCK_KEY);
  }

  function registerLoginFailure() {
    const current = Number(getLocal(FAILURES_KEY) || 0) + 1;
    if (current >= MAX_FAILURES) {
      setLocal(LOCK_KEY, String(Date.now() + LOCK_TIME_MS));
      removeLocal(FAILURES_KEY);
      return;
    }
    setLocal(FAILURES_KEY, String(current));
  }

  async function proxyPasswordLogin(requestUrl, init = {}) {
    const sourceHeaders = new Headers(init.headers || {});
    const apikey = sourceHeaders.get("apikey") || "";
    const rawBody = typeof init.body === "string" ? init.body : "{}";
    const credentials = JSON.parse(rawBody || "{}");
    const endpoint = new URL("/functions/v1/platform-login", requestUrl).toString();

    return await nativeFetch(endpoint, {
      method: "POST",
      cache: "no-store",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Info": "kinecheck-platform/5.1",
        ...(apikey ? { apikey } : {}),
      },
      body: JSON.stringify({
        email: String(credentials.email || "").trim(),
        password: String(credentials.password || ""),
      }),
    });
  }

  async function sha256(value) {
    try {
      const bytes = new TextEncoder().encode(String(value || ""));
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
    } catch {
      return null;
    }
  }

  async function authenticatedRequest(path, accessToken, options = {}) {
    return await nativeFetch(`${SUPABASE_URL}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  }

  async function recordLegalAcceptance(accessToken, source = "platform_login") {
    const userAgentHash = await sha256(navigator.userAgent);
    const response = await authenticatedRequest("/rest/v1/rpc/kinecheck_accept_current_legal", accessToken, {
      method: "POST",
      body: JSON.stringify({ p_source: source, p_user_agent_hash: userAgentHash }),
    });
    if (!response.ok) throw new Error("No fue posible registrar la aceptación legal.");
    return await response.json().catch(() => 0);
  }

  function installLegalConsentField() {
    const form = document.querySelector("#login-form");
    const submit = document.querySelector("#login-submit");
    if (!form || !submit || document.querySelector("#legal-consent-login")) return;

    const label = document.createElement("label");
    label.className = "legal-consent-login";
    label.innerHTML = `
      <input id="legal-consent-login" type="checkbox" required>
      <span>Acepto los <a href="../legal/terminos.html" target="_blank" rel="noopener">Términos</a> y la <a href="../legal/privacidad.html" target="_blank" rel="noopener">Política de privacidad</a>.</span>`;
    submit.before(label);

    form.addEventListener("submit", (event) => {
      const checkbox = document.querySelector("#legal-consent-login");
      if (checkbox?.checked) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const message = document.querySelector("#auth-message");
      if (message) {
        message.textContent = "Debes aceptar los Términos y la Política de privacidad para ingresar.";
        message.classList.add("error");
        message.hidden = false;
      }
      checkbox?.focus();
    }, true);
  }

  function installAutomationStyles() {
    if (document.querySelector("#kinecheck-automation-styles")) return;
    const style = document.createElement("style");
    style.id = "kinecheck-automation-styles";
    style.textContent = `
      .legal-consent-login{display:flex;gap:.65rem;align-items:flex-start;margin:.9rem 0 1rem;font-size:.82rem;line-height:1.4;color:var(--muted,#536970)}
      .legal-consent-login input{margin-top:.15rem;flex:0 0 auto}.legal-consent-login a{font-weight:700;color:inherit}
      .kc-legal-dialog{border:0;border-radius:24px;padding:0;max-width:620px;width:calc(100% - 28px);box-shadow:0 30px 90px rgba(2,24,31,.35)}
      .kc-legal-dialog::backdrop{background:rgba(2,18,24,.72);backdrop-filter:blur(5px)}
      .kc-legal-card{padding:28px;background:#fff;color:#12313a}.kc-legal-card h2{margin:.2rem 0 .7rem}.kc-legal-card p{color:#526a72;line-height:1.55}
      .kc-legal-list{display:grid;gap:.65rem;margin:1.1rem 0}.kc-legal-list a{padding:.8rem 1rem;border:1px solid #cfe2df;border-radius:12px;color:#17434b;font-weight:700;text-decoration:none}
      .kc-legal-check{display:flex;gap:.65rem;align-items:flex-start;margin:1rem 0}.kc-legal-accept{width:100%;border:0;border-radius:12px;padding:.9rem 1rem;background:#087f85;color:#fff;font-weight:800;cursor:pointer}
      .kc-notifications{position:fixed;right:18px;bottom:18px;z-index:1000;width:min(380px,calc(100% - 28px));display:grid;gap:10px}
      .kc-notification{background:#fff;color:#12313a;border:1px solid #cfe2df;border-radius:16px;padding:14px 16px;box-shadow:0 18px 50px rgba(2,24,31,.2)}
      .kc-notification strong{display:block;margin-bottom:4px}.kc-notification p{margin:0 0 9px;color:#526a72;font-size:.88rem;line-height:1.4}.kc-notification button{border:0;background:transparent;color:#087f85;font-weight:800;cursor:pointer;padding:0}
    `;
    document.head.appendChild(style);
  }

  function replaceSupportLinks() {
    document.querySelectorAll('a[href^="mailto:soporte.kinecheck@gmail.com"]').forEach((link) => {
      link.href = "../soporte/";
      link.removeAttribute("target");
    });
  }

  function loadOnboarding() {
    if (document.querySelector('script[data-kinecheck-onboarding]')) return;
    const script = document.createElement("script");
    script.src = "./onboarding.js?v=20260805-1";
    script.defer = true;
    script.dataset.kinecheckOnboarding = "true";
    document.head.appendChild(script);
  }

  async function fetchMissingLegal(accessToken) {
    const response = await authenticatedRequest("/rest/v1/rpc/kinecheck_missing_legal_acceptances", accessToken, {
      method: "POST",
      body: "{}",
    });
    if (!response.ok) return [];
    return await response.json().catch(() => []);
  }

  async function showLegalGateIfNeeded(accessToken) {
    const missing = await fetchMissingLegal(accessToken);
    if (!Array.isArray(missing) || !missing.length || document.querySelector("#kc-legal-dialog")) return;

    const dialog = document.createElement("dialog");
    dialog.id = "kc-legal-dialog";
    dialog.className = "kc-legal-dialog";
    dialog.innerHTML = `
      <div class="kc-legal-card">
        <small>ACTUALIZACIÓN OBLIGATORIA</small>
        <h2>Revisa y acepta los documentos vigentes</h2>
        <p>Necesitamos registrar qué versión aceptaste y cuándo. Esto protege tus derechos y deja trazabilidad contractual.</p>
        <div class="kc-legal-list">${missing.map((item) => `<a href="..${String(item.url).replace(/[^a-zA-Z0-9_\-./]/g, "")}" target="_blank" rel="noopener">${String(item.title).replace(/[<>]/g, "")}</a>`).join("")}</div>
        <label class="kc-legal-check"><input type="checkbox" id="kc-legal-gate-check"><span>Declaro que leí y acepto los documentos indicados.</span></label>
        <button type="button" class="kc-legal-accept" id="kc-legal-accept">Aceptar y continuar</button>
        <p id="kc-legal-error" hidden></p>
      </div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener("cancel", (event) => event.preventDefault());
    dialog.querySelector("#kc-legal-accept")?.addEventListener("click", async () => {
      const check = dialog.querySelector("#kc-legal-gate-check");
      const button = dialog.querySelector("#kc-legal-accept");
      const error = dialog.querySelector("#kc-legal-error");
      if (!check?.checked) {
        error.textContent = "Marca la casilla para continuar.";
        error.hidden = false;
        return;
      }
      button.disabled = true;
      button.textContent = "Registrando…";
      try {
        await recordLegalAcceptance(accessToken, "platform_gate");
        dialog.close();
        dialog.remove();
      } catch (cause) {
        error.textContent = cause?.message || "No fue posible registrar la aceptación.";
        error.hidden = false;
        button.disabled = false;
        button.textContent = "Aceptar y continuar";
      }
    });
    dialog.showModal();
  }

  async function markNotificationRead(accessToken, id, card) {
    const response = await authenticatedRequest(`/rest/v1/kinecheck_notifications?id=eq.${encodeURIComponent(id)}`, accessToken, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    });
    if (response.ok) card.remove();
  }

  async function showNotifications(accessToken) {
    if (document.querySelector("#kc-notifications")) return;
    const response = await authenticatedRequest("/rest/v1/kinecheck_notifications?select=id,title,body,action_url,action_label,created_at&read_at=is.null&available_at=lte.now()&order=created_at.desc&limit=3", accessToken);
    if (!response.ok) return;
    const rows = await response.json().catch(() => []);
    if (!Array.isArray(rows) || !rows.length) return;

    const container = document.createElement("section");
    container.id = "kc-notifications";
    container.className = "kc-notifications";
    container.setAttribute("aria-label", "Notificaciones de tu cuenta");
    rows.forEach((item) => {
      const card = document.createElement("article");
      card.className = "kc-notification";
      card.innerHTML = `<strong>${String(item.title || "Aviso").replace(/[<>]/g, "")}</strong><p>${String(item.body || "").replace(/[<>]/g, "")}</p><button type="button">Marcar como leído</button>`;
      card.querySelector("button")?.addEventListener("click", () => markNotificationRead(accessToken, item.id, card));
      container.appendChild(card);
    });
    document.body.appendChild(container);
  }

  async function initializeAuthenticatedAutomation() {
    const session = readSessionObject();
    if (!session?.access_token) return;
    await showLegalGateIfNeeded(session.access_token).catch(() => {});
    await showNotifications(session.access_token).catch(() => {});
  }

  window.fetch = async (input, init) => {
    const requestUrl = typeof input === "string" ? input : String(input?.url || "");
    const isPasswordLogin = requestUrl.includes("/auth/v1/token") && requestUrl.includes("grant_type=password");

    if (isPasswordLogin) {
      const lockUntil = readLockUntil();
      if (lockUntil > Date.now()) {
        const minutes = Math.max(1, Math.ceil((lockUntil - Date.now()) / 60000));
        return new Response(JSON.stringify({
          error_description: `Demasiados intentos fallidos. Espera ${minutes} minuto${minutes === 1 ? "" : "s"} antes de volver a intentar.`,
        }), {
          status: 429,
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
        });
      }
      if (lockUntil) clearLoginFailures();
    }

    let response;
    try {
      response = isPasswordLogin
        ? await proxyPasswordLogin(requestUrl, init)
        : await nativeFetch(input, init);
    } catch (error) {
      if (isPasswordLogin) registerLoginFailure();
      throw error;
    }

    if (isPasswordLogin) {
      if (response.ok) {
        clearLoginFailures();
        const consentChecked = Boolean(document.querySelector("#legal-consent-login")?.checked);
        if (consentChecked) {
          response.clone().json().then((data) => {
            if (data?.access_token) recordLegalAcceptance(data.access_token, "platform_login").catch(() => {});
          }).catch(() => {});
        }
      } else if ([400, 401, 403, 422, 429].includes(response.status)) {
        registerLoginFailure();
      }
    }

    return response;
  };

  document.addEventListener("DOMContentLoaded", () => {
    installAutomationStyles();
    installLegalConsentField();
    replaceSupportLinks();
    loadOnboarding();
    initializeAuthenticatedAutomation();
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      replaceSupportLinks();
      const session = readSessionObject();
      const appVisible = document.querySelector("#app-view") && !document.querySelector("#app-view").hidden;
      if (session?.access_token && appVisible) {
        window.clearInterval(timer);
        initializeAuthenticatedAutomation();
      } else if (attempts >= 30) {
        window.clearInterval(timer);
      }
    }, 1000);
  });

  window.__KINECHECK_SECURITY__ = Object.freeze({
    sessionStorageOnly: true,
    idleLimitMinutes: IDLE_LIMIT_MS / 60000,
    maxLoginFailures: MAX_FAILURES,
    loginLockMinutes: LOCK_TIME_MS / 60000,
    serverRateLimit: true,
    legalAcceptanceVersioned: true,
    automatedNotifications: true,
    smartSupportRouting: true,
    firstUseOnboarding: true,
  });
})();