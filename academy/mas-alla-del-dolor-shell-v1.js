const SESSION_KEY = "kinecheck_secure_session_v1";
const COURSE_SLUG = "mas-alla-del-dolor";
const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";
const COURSE_KEY_FUNCTION = "course-key";

const accessShell = document.querySelector("#kc-access");
const status = document.querySelector("#kc-status");
const statusCopy = document.querySelector("#kc-status-copy");
const errorBox = document.querySelector("#kc-error");
const actions = document.querySelector("#kc-actions");
const retry = document.querySelector("#kc-retry");
const root = document.querySelector("#root");
let running = false;

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!session?.access_token) return null;
    const expiresAt = Number(session.expires_at || 0);
    if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 15) return null;
    return session;
  } catch {
    return null;
  }
}

function headers(token) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, cache: "no-store", signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function setStatus(copy) {
  if (statusCopy) statusCopy.textContent = copy;
  if (status) status.hidden = false;
  if (errorBox) errorBox.hidden = true;
  if (actions) actions.hidden = true;
}

function showError(copy, allowRetry = true) {
  if (status) status.hidden = true;
  if (errorBox) {
    errorBox.textContent = copy;
    errorBox.hidden = false;
  }
  if (actions) actions.hidden = false;
  if (retry) retry.hidden = !allowRetry;
}

async function validateIdentity(token) {
  const response = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    const error = new Error("Tu sesión de KineCheck terminó. Vuelve a iniciar sesión desde Academy.");
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function fetchCourseSource(token) {
  const response = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/${COURSE_KEY_FUNCTION}`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ courseSlug: COURSE_SLUG }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.message || "Tu cuenta no tiene una licencia activa de Más allá del dolor.");
    error.status = response.status;
    throw error;
  }
  return response.text();
}

async function launch(source, user) {
  if (!root) throw new Error("No encontramos el contenedor del curso.");
  root.hidden = false;
  const moduleUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  try {
    await import(moduleUrl);
    if (accessShell) accessShell.hidden = true;
    window.dispatchEvent(new CustomEvent("kinecheck:course-authorized", {
      detail: { courseSlug: COURSE_SLUG, email: user?.email || "" },
    }));
  } catch (error) {
    root.hidden = true;
    throw new Error(`El contenido protegido no pudo iniciarse: ${error.message}`);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}

async function start() {
  if (running) return;
  running = true;
  setStatus("Validando tu sesión dentro de KineCheck…");

  try {
    const session = readSession();
    if (!session) {
      showError("No encontramos una sesión activa de KineCheck en este dispositivo. Vuelve a tu Biblioteca e ingresa nuevamente.", false);
      return;
    }

    const user = await validateIdentity(session.access_token);
    setStatus("Verificando tu licencia de Más allá del dolor…");
    const source = await fetchCourseSource(session.access_token);
    setStatus("Preparando el curso…");
    await launch(source, user);
  } catch (error) {
    if (Number(error?.status) === 401) {
      try { localStorage.removeItem(SESSION_KEY); } catch { /* mejor esfuerzo */ }
      showError("Tu sesión terminó. Vuelve a KineCheck e inicia sesión nuevamente.", false);
    } else if (Number(error?.status) === 403) {
      showError(`${error.message} Vuelve a tu Biblioteca para revisar tus productos activos.`, false);
    } else if (error?.name === "AbortError") {
      showError("La conexión tardó demasiado. Revisa tu señal o Wi-Fi y vuelve a intentarlo.", true);
    } else {
      showError(error?.message || "No fue posible abrir el curso. Vuelve a intentarlo.", true);
    }
  } finally {
    running = false;
  }
}

retry?.addEventListener("click", start);
start();
