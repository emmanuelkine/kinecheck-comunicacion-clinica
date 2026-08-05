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
        "X-Client-Info": "kinecheck-platform/5.0",
        ...(apikey ? { apikey } : {}),
      },
      body: JSON.stringify({
        email: String(credentials.email || "").trim(),
        password: String(credentials.password || ""),
      }),
    });
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
      if (response.ok) clearLoginFailures();
      else if ([400, 401, 403, 422, 429].includes(response.status)) registerLoginFailure();
    }

    return response;
  };

  window.__KINECHECK_SECURITY__ = Object.freeze({
    sessionStorageOnly: true,
    idleLimitMinutes: IDLE_LIMIT_MS / 60000,
    maxLoginFailures: MAX_FAILURES,
    loginLockMinutes: LOCK_TIME_MS / 60000,
    serverRateLimit: true,
  });
})();
