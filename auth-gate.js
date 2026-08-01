const SESSION_KEY = "kinecheck_secure_session_v1";
const HANDOFF_TYPES = new Set([
  "kinecheck-sso-v3-access-only",
  "kinecheck-sso-v2",
]);
const HANDOFF_MAX_AGE_MS = 120000;

function earlyReadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function normalizeHandoffSession(handoff) {
  const candidate = handoff?.session?.access_token
    ? handoff.session
    : handoff;

  if (!candidate?.access_token) return null;

  const existing = earlyReadSession();
  const sameAccessToken = existing?.access_token === candidate.access_token;

  return {
    ...(sameAccessToken ? existing : {}),
    access_token: candidate.access_token,
    expires_at: candidate.expires_at,
    expires_in: candidate.expires_in,
    token_type: candidate.token_type || "bearer",
    handoff_access_only: !candidate.refresh_token,
    ...(candidate.refresh_token ? { refresh_token: candidate.refresh_token } : {}),
  };
}

function acceptKineCheckHandoff() {
  if (!window.name) return null;

  try {
    const handoff = JSON.parse(window.name);
    const issuedAt = Number(handoff?.issuedAt);
    const fresh = Number.isFinite(issuedAt)
      && Math.abs(Date.now() - issuedAt) <= HANDOFF_MAX_AGE_MS;

    if (!HANDOFF_TYPES.has(handoff?.type) || !fresh) return null;

    const session = normalizeHandoffSession(handoff);
    if (!session) return null;

    window.__KINECHECK_HANDOFF_PRODUCT__ = String(handoff.product || "").trim();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch {
    return null;
  } finally {
    window.name = "";
  }
}

function waitForConfig(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (window.KINECHECK_CONFIG?.supabaseUrl) {
        resolve(window.KINECHECK_CONFIG);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("No fue posible cargar la configuración de KineCheck."));
        return;
      }
      window.setTimeout(check, 20);
    };
    check();
  });
}

acceptKineCheckHandoff();

(async () => {
  const CONFIG = await waitForConfig().catch((error) => {
    console.error("KineCheck config", error);
    return null;
  });
  if (!CONFIG) return;

  const requestedProduct = String(window.__KINECHECK_HANDOFF_PRODUCT__ || "").trim();
  if (requestedProduct && requestedProduct !== String(CONFIG.courseSlug || "").trim()) {
    localStorage.removeItem(SESSION_KEY);
  }
  delete window.__KINECHECK_HANDOFF_PRODUCT__;

  const $ = (selector) => document.querySelector(selector);
  const shell = $("#access-shell");
  const root = $("#root");
  const form = $("#auth-form");
  const emailInput = $("#email");
  const passwordInput = $("#password");
  const message = $("#auth-message");
  const progress = $("#access-progress");
  const signOut = $("#sign-out");
  const loginTab = $("#login-tab");
  const signupTab = $("#signup-tab");
  const submit = $("#auth-submit");
  let mode = "login";

  function headers(token) {
    const value = {
      apikey: CONFIG.supabaseAnonKey,
      "Content-Type": "application/json",
    };
    if (token) value.Authorization = `Bearer ${token}`;
    return value;
  }

  async function api(path, options = {}) {
    const response = await fetch(`${CONFIG.supabaseUrl}${path}`, {
      ...options,
      headers: { ...headers(options.token), ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        data.message || data.error_description || data.msg || data.error || "Solicitud rechazada",
      );
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function saveSession(session) {
    const expiresAt = session.expires_at
      || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, expires_at: expiresAt }));
  }

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function showMessage(text, error = false) {
    if (!message) return;
    message.textContent = text;
    message.className = error ? "notice notice-error" : "notice";
    message.hidden = false;
  }

  function setBusy(busy, text = "Verificando tu acceso…") {
    if (form) form.hidden = busy;
    if (progress) {
      progress.hidden = !busy;
      const paragraph = progress.querySelector("p") || progress.querySelector("#progress-message");
      if (paragraph) paragraph.textContent = text;
    }
  }

  async function validateIdentity(session) {
    const user = await api("/auth/v1/user", {
      method: "GET",
      token: session.access_token,
    });
    const verified = { ...session, user };
    saveSession(verified);
    return verified;
  }

  async function refreshSession(session) {
    if (!session?.refresh_token) throw new Error("La sesión temporal debe renovarse desde KineCheck.");
    const refreshed = await api("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    saveSession(refreshed);
    return refreshed;
  }

  async function validSession() {
    let session = readSession();
    if (!session?.access_token) return null;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = Number(session.expires_at || 0);

    try {
      if (expiresAt && expiresAt <= now) {
        if (!session.refresh_token) throw new Error("La sesión temporal venció.");
        session = await refreshSession(session);
      } else if (expiresAt && expiresAt <= now + 60 && session.refresh_token) {
        session = await refreshSession(session);
      }
      return await validateIdentity(session);
    } catch {
      if (session.refresh_token) {
        try {
          session = await refreshSession(session);
          return await validateIdentity(session);
        } catch {
          // Continúa con la limpieza segura.
        }
      }
      clearSession();
      return null;
    }
  }

  async function fetchCourse(token) {
    const courseSlug = String(CONFIG.courseSlug || "").trim();
    if (!courseSlug) throw new Error("No fue posible identificar el curso solicitado.");

    const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/${CONFIG.courseKeyFunction}`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ courseSlug }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(data.message || "No encontramos una compra activa asociada a este correo.");
      error.status = response.status;
      throw error;
    }

    return { courseSlug, source: await response.text() };
  }

  async function launchCourse(source, session, courseSlug) {
    if (!root || !shell) throw new Error("La pantalla del curso no está disponible.");
    root.hidden = false;
    const moduleUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));

    try {
      await import(moduleUrl);
      if (!window.KineCheckWatermark) {
        throw new Error("No fue posible activar la protección de uso personal.");
      }
      await window.KineCheckWatermark.showVerifiedBuyer({
        user: session.user,
        licenseScopes: [courseSlug],
      });
      shell.hidden = true;
      if (signOut) signOut.hidden = false;
    } catch (error) {
      window.KineCheckWatermark?.hide();
      root.hidden = true;
      shell.hidden = false;
      if (signOut) signOut.hidden = true;
      throw new Error(`El contenido no pudo iniciarse: ${error.message}`);
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }
  }

  async function authorize(session) {
    setBusy(true, "Validando tu licencia en KineCheck…");
    if (message) message.hidden = true;
    try {
      const course = await fetchCourse(session.access_token);
      await launchCourse(course.source, session, course.courseSlug);
    } catch (error) {
      window.KineCheckWatermark?.hide();
      setBusy(false);
      if (error.status === 401) clearSession();
      showMessage(`${error.message} Si necesitas ayuda, escribe a ${CONFIG.supportEmail}.`, true);
    }
  }

  function setMode(next) {
    mode = next;
    loginTab?.classList.toggle("active", mode === "login");
    signupTab?.classList.toggle("active", mode === "signup");
    if (submit) submit.textContent = mode === "login" ? "Ingresar al curso" : "Crear mi cuenta";
    if (passwordInput) passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";
    if (message) message.hidden = true;
  }

  loginTab?.addEventListener("click", () => setMode("login"));
  signupTab?.addEventListener("click", () => setMode("signup"));

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (message) message.hidden = true;
    const email = emailInput?.value.trim().toLowerCase() || "";
    const password = passwordInput?.value || "";
    if (!email || password.length < 8) {
      showMessage("Ingresa un correo válido y una contraseña de al menos 8 caracteres.", true);
      return;
    }

    try {
      let session = mode === "login"
        ? await api("/auth/v1/token?grant_type=password", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          })
        : await api("/auth/v1/signup", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });

      if (!session.access_token) {
        setMode("login");
        showMessage("Cuenta creada. Revisa tu correo y confirma la dirección antes de ingresar.");
        return;
      }

      saveSession(session);
      session = await validateIdentity(session);
      await authorize(session);
    } catch (error) {
      setBusy(false);
      showMessage(error.message, true);
    }
  });

  signOut?.addEventListener("click", () => {
    window.KineCheckWatermark?.hide();
    clearSession();
    location.reload();
  });

  const session = await validSession();
  if (session) await authorize(session);
})();
