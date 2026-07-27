const CONFIG = window.KINECHECK_ACADEMY_CONFIG;
const SESSION_KEY = "kinecheck_secure_session_v1";

const $ = (selector) => document.querySelector(selector);
const loginView = $("#login-view");
const dashboardView = $("#dashboard-view");
const form = $("#auth-form");
const emailInput = $("#email");
const passwordInput = $("#password");
const message = $("#auth-message");
const progress = $("#auth-progress");
const loginTab = $("#login-tab");
const signupTab = $("#signup-tab");
const submit = $("#auth-submit");
const signOut = $("#sign-out");
const grid = $("#course-grid");
const libraryMessage = $("#library-message");
const courseRoot = $("#course-root");
const returnLibrary = $("#return-library");
const welcome = $("#welcome");
let mode = "login";

function authHeaders(token) {
  const headers = { apikey: CONFIG.supabaseAnonKey, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(path, options = {}) {
  const response = await fetch(`${CONFIG.supabaseUrl}${path}`, {
    ...options,
    headers: { ...authHeaders(options.token), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error_description || data.msg || data.error || "Solicitud rechazada");
    error.status = response.status;
    throw error;
  }
  return data;
}

function saveSession(session) {
  const expiresAt = session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, expires_at: expiresAt }));
}

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

function clearSession() { localStorage.removeItem(SESSION_KEY); }

async function validSession() {
  let session = readSession();
  if (!session) return null;
  if (Number(session.expires_at || 0) <= Math.floor(Date.now() / 1000) + 60) {
    try {
      session = await request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      saveSession(session);
    } catch {
      clearSession();
      return null;
    }
  }
  return session;
}

function showAuthMessage(text, error = false) {
  message.textContent = text;
  message.className = error ? "notice error" : "notice";
  message.hidden = false;
}

function showLibraryMessage(text, error = false) {
  libraryMessage.textContent = text;
  libraryMessage.className = error ? "notice error" : "notice";
  libraryMessage.hidden = false;
}

function setMode(next) {
  mode = next;
  loginTab.classList.toggle("active", mode === "login");
  signupTab.classList.toggle("active", mode === "signup");
  submit.textContent = mode === "login" ? "Ingresar a KineCheck" : "Crear mi cuenta";
  passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";
  message.hidden = true;
}

function setBusy(busy, text = "Verificando tu cuenta…") {
  form.hidden = busy;
  progress.hidden = !busy;
  progress.textContent = text;
}

function renderLibrary(session) {
  loginView.hidden = true;
  dashboardView.hidden = false;
  const userEmail = session.user?.email || "tu cuenta";
  welcome.textContent = `Sesión iniciada como ${userEmail}. Abre un producto para validar tu licencia Hotmart.`;
  grid.innerHTML = CONFIG.courses.map((course) => `
    <article class="course-card">
      <span class="course-icon" aria-hidden="true">${course.icon}</span>
      <h2>${course.title}</h2>
      <p>${course.subtitle}</p>
      <div class="course-meta">PRODUCTO HOTMART ${course.productId}</div>
      <button class="course-button" type="button" data-course="${course.slug}">Validar y abrir</button>
    </article>
  `).join("");
}

async function fetchCourse(token, slug) {
  const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/${CONFIG.courseKeyFunction}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ courseSlug: slug }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.message || "No encontramos una compra activa asociada a este producto.");
    error.status = response.status;
    throw error;
  }
  return response.text();
}

async function openCourse(slug, button) {
  libraryMessage.hidden = true;
  const session = await validSession();
  if (!session) {
    dashboardView.hidden = true;
    loginView.hidden = false;
    showAuthMessage("Tu sesión venció. Ingresa nuevamente.", true);
    return;
  }
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Validando licencia…";
  try {
    const source = await fetchCourse(session.access_token, slug);
    dashboardView.hidden = true;
    courseRoot.hidden = false;
    returnLibrary.hidden = false;
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    try { await import(url); }
    finally { URL.revokeObjectURL(url); }
  } catch (error) {
    showLibraryMessage(`${error.message} Si necesitas ayuda, escribe a ${CONFIG.supportEmail}.`, true);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.hidden = true;
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  if (!email || password.length < 8) {
    showAuthMessage("Ingresa un correo válido y una contraseña de al menos 8 caracteres.", true);
    return;
  }
  setBusy(true, mode === "login" ? "Iniciando sesión…" : "Creando tu cuenta…");
  try {
    const session = mode === "login"
      ? await request("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) })
      : await request("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password, data: { source: "kinecheck-academy" } }) });
    if (!session.access_token) {
      setBusy(false);
      setMode("login");
      emailInput.value = email;
      showAuthMessage("Cuenta creada. Revisa tu correo y confirma la dirección antes de ingresar.");
      return;
    }
    saveSession(session);
    renderLibrary(session);
  } catch (error) {
    setBusy(false);
    showAuthMessage(error.message, true);
  }
});

grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-course]");
  if (button) openCourse(button.dataset.course, button);
});

signOut.addEventListener("click", async () => {
  const session = readSession();
  if (session?.access_token) {
    await request("/auth/v1/logout", { method: "POST", token: session.access_token }).catch(() => {});
  }
  clearSession();
  location.reload();
});

returnLibrary.addEventListener("click", () => location.reload());

(async () => {
  const session = await validSession();
  if (session) renderLibrary(session);
})();