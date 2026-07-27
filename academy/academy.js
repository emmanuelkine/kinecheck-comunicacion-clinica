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
const welcome = $("#welcome");
const accountEmail = $("#account-email");
const activeCount = $("#active-count");
let mode = "login";
let currentFilter = "all";

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

function courseType(course) {
  if (course.slug.includes("comunicacion") || course.slug.includes("dolor")) return "CURSO / MASTERCLASS";
  return "APLICACIÓN KINECHECK";
}

function renderCourses() {
  const courses = CONFIG.courses.filter((course) => {
    if (currentFilter === "active") return course.status === "active";
    if (currentFilter === "preparing") return course.status !== "active";
    return true;
  });

  grid.innerHTML = courses.map((course) => {
    const available = course.status === "active" && course.url;
    return `
      <article class="course-card">
        <div class="course-top">
          <span class="course-icon" aria-hidden="true">${course.icon}</span>
          <span class="status-badge ${available ? "" : "preparing"}">${available ? "Disponible" : "Próximamente"}</span>
        </div>
        <div class="course-type">${courseType(course)}</div>
        <h3>${course.title}</h3>
        <p>${course.subtitle}</p>
        <div class="course-meta">Producto Hotmart ${course.productId}</div>
        <button class="course-button" type="button" data-course="${course.slug}" ${available ? "" : "disabled"}>
          ${available ? "Abrir producto" : "En integración"}
        </button>
      </article>
    `;
  }).join("");
}

function renderLibrary(session) {
  loginView.hidden = true;
  dashboardView.hidden = false;
  const userEmail = session.user?.email || "tu cuenta";
  welcome.textContent = `Sesión iniciada como ${userEmail}. Tus productos disponibles se abren con esta misma cuenta.`;
  accountEmail.textContent = userEmail;
  activeCount.textContent = String(CONFIG.courses.filter((course) => course.status === "active" && course.url).length);
  renderCourses();
}

function openCourse(slug) {
  libraryMessage.hidden = true;
  const course = CONFIG.courses.find((item) => item.slug === slug);
  if (!course?.url) {
    showLibraryMessage("Este producto todavía está siendo integrado a KineCheck Academy.");
    return;
  }
  window.location.href = course.url;
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
  if (button && !button.disabled) openCourse(button.dataset.course);
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
    renderCourses();
  });
});

signOut.addEventListener("click", async () => {
  const session = readSession();
  if (session?.access_token) {
    await request("/auth/v1/logout", { method: "POST", token: session.access_token }).catch(() => {});
  }
  clearSession();
  location.reload();
});

(async () => {
  const session = await validSession();
  if (session) renderLibrary(session);
})();