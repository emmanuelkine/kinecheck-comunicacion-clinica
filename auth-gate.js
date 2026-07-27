const CONFIG = window.KINECHECK_CONFIG || {};
const SESSION_KEY = "kinecheck_secure_session_v1";
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

function resolvedCourseSlug() {
  const querySlug = new URLSearchParams(location.search).get("course");
  return querySlug || CONFIG.courseSlug || "comunicacion-clinica";
}

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
    const error = new Error(data.message || data.error_description || data.msg || data.error || "Solicitud rechazada");
    error.status = response.status;
    throw error;
  }
  return data;
}

function showMessage(text, error = false) {
  message.textContent = text;
  message.className = error ? "notice notice-error" : "notice";
  message.hidden = false;
}

function setBusy(busy, text = "Verificando tu acceso…") {
  form.hidden = busy;
  progress.hidden = !busy;
  const paragraph = progress.querySelector("p");
  if (paragraph) paragraph.textContent = text;
}

function saveSession(session) {
  session.expires_at = session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

async function validSession() {
  let session = readSession();
  if (!session) return null;
  if (Number(session.expires_at || 0) <= Math.floor(Date.now() / 1000) + 60) {
    try {
      session = await api("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      saveSession(session);
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }
  return session;
}

async function fetchCourse(token) {
  const courseSlug = resolvedCourseSlug();
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
  return response.text();
}

async function launchCourse(source) {
  root.hidden = false;
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  try {
    await import(url);
    shell.hidden = true;
    signOut.hidden = false;
  } catch (error) {
    root.hidden = true;
    shell.hidden = false;
    signOut.hidden = true;
    throw new Error(`El contenido no pudo iniciarse: ${error.message}`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function authorize(session) {
  setBusy(true, "Validando tu acceso en KineCheck Academy…");
  message.hidden = true;
  try {
    const source = await fetchCourse(session.access_token);
    await launchCourse(source);
  } catch (error) {
    setBusy(false);
    if (error.status === 401) localStorage.removeItem(SESSION_KEY);
    showMessage(`${error.message} Si necesitas ayuda, escribe a ${CONFIG.supportEmail}.`, true);
  }
}

function setMode(next) {
  mode = next;
  loginTab.classList.toggle("active", mode === "login");
  signupTab.classList.toggle("active", mode === "signup");
  submit.textContent = mode === "login" ? "Ingresar al curso" : "Crear mi cuenta";
  passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";
  message.hidden = true;
}

loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.hidden = true;
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  if (!email || password.length < 8) return showMessage("Ingresa un correo válido y una contraseña de al menos 8 caracteres.", true);
  try {
    const session = mode === "login"
      ? await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) })
      : await api("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password }) });
    if (!session.access_token) {
      setMode("login");
      return showMessage("Cuenta creada. Revisa tu correo y confirma la dirección antes de ingresar.");
    }
    saveSession(session);
    await authorize(session);
  } catch (error) {
    setBusy(false);
    showMessage(error.message, true);
  }
});

signOut.addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  location.reload();
});

(async () => {
  const session = await validSession();
  if (session) await authorize(session);
})();