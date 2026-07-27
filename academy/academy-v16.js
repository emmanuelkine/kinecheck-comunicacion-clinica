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
let licenseState = new Map();
let ownerMode = false;
let betaMode = false;
let betaState = { recognized: false, active: false, expiresAt: null, daysRemaining: 0 };

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

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
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

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

function isOwnerEmail(email) {
  const owners = (CONFIG.ownerEmails || []).map(normalizeEmail);
  return owners.includes(normalizeEmail(email));
}

function getBetaState(session) {
  const email = normalizeEmail(session?.user?.email);
  const betaEmails = (CONFIG.betaTesterEmails || []).map(normalizeEmail);
  const recognized = betaEmails.includes(email);

  if (!recognized) {
    return { recognized: false, active: false, expiresAt: null, daysRemaining: 0 };
  }

  const trialDays = Math.max(1, Number(CONFIG.betaTrialDays || 5));
  const createdAt = new Date(session?.user?.created_at || 0);
  if (Number.isNaN(createdAt.getTime())) {
    return { recognized: true, active: false, expiresAt: null, daysRemaining: 0 };
  }

  const expiresAt = new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const remainingMs = expiresAt.getTime() - Date.now();
  const active = remainingMs > 0;
  const daysRemaining = active ? Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))) : 0;

  return { recognized: true, active, expiresAt, daysRemaining };
}

function hasFullAccess() {
  return ownerMode || betaMode;
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "fecha no disponible";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  if (course.slug.includes("lab")) return "SIMULADOR CLÍNICO";
  return "APLICACIÓN KINECHECK";
}

async function validateCourseLicense(token, slug) {
  if (hasFullAccess()) return true;

  const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/${CONFIG.courseKeyFunction}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ courseSlug: slug }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.message || "No encontramos una compra activa para este producto.");
    error.status = response.status;
    throw error;
  }

  return true;
}

async function loadLicenses(session) {
  const availableCourses = CONFIG.courses.filter((course) => course.url && (hasFullAccess() || course.status === "active"));
  licenseState = new Map(availableCourses.map((course) => [course.slug, hasFullAccess() ? "owned" : "checking"]));
  renderCourses();

  if (!hasFullAccess()) {
    await Promise.all(availableCourses.map(async (course) => {
      try {
        await validateCourseLicense(session.access_token, course.slug);
        licenseState.set(course.slug, "owned");
      } catch {
        licenseState.set(course.slug, "locked");
      }
    }));
  }

  activeCount.textContent = String([...licenseState.values()].filter((state) => state === "owned").length);
  renderCourses();
}

function courseAccess(course) {
  if (hasFullAccess() && course.url) return "owned";
  if (course.status !== "active" || !course.url) return "preparing";
  return licenseState.get(course.slug) || "checking";
}

function accessBadge(owned, checking, preparing) {
  if (owned && ownerMode) return "Acceso propietario";
  if (owned && betaMode) return `Prueba · ${betaState.daysRemaining} día${betaState.daysRemaining === 1 ? "" : "s"}`;
  if (owned) return "Disponible";
  if (checking) return "Verificando";
  if (preparing) return "Próximamente";
  return "No adquirido";
}

function renderCourses() {
  const courses = CONFIG.courses.filter((course) => {
    const access = courseAccess(course);
    if (currentFilter === "active") return access === "owned";
    if (currentFilter === "preparing") return access === "preparing";
    return true;
  });

  grid.innerHTML = courses.map((course) => {
    const access = courseAccess(course);
    const owned = access === "owned";
    const checking = access === "checking";
    const preparing = access === "preparing";
    const badge = accessBadge(owned, checking, preparing);
    const buttonText = owned ? "Abrir producto" : checking ? "Validando compra…" : preparing ? "En integración" : "Sin acceso";
    const badgeClass = owned ? "" : "preparing";
    const productLabel = course.productId === "PROPIETARIO" ? "Versión de desarrollo" : `Producto Hotmart ${course.productId}`;

    return `
      <article class="course-card">
        <div class="course-top">
          <span class="course-icon" aria-hidden="true">${course.icon}</span>
          <span class="status-badge ${badgeClass}">${badge}</span>
        </div>
        <div class="course-type">${courseType(course)}</div>
        <h3>${course.title}</h3>
        <p>${course.subtitle}</p>
        <div class="course-meta">${productLabel}</div>
        <button class="course-button" type="button" data-course="${course.slug}" ${owned ? "" : "disabled"}>
          ${buttonText}
        </button>
      </article>
    `;
  }).join("");
}

async function renderLibrary(session) {
  loginView.hidden = true;
  dashboardView.hidden = false;

  const userEmail = session.user?.email || "tu cuenta";
  ownerMode = isOwnerEmail(userEmail);
  betaState = getBetaState(session);
  betaMode = !ownerMode && betaState.active;

  if (ownerMode) {
    welcome.textContent = `Sesión de propietario iniciada como ${userEmail}. Tienes acceso completo a todos los productos y versiones en desarrollo.`;
    accountEmail.textContent = `${userEmail} · Propietario`;
  } else if (betaMode) {
    welcome.textContent = `Prueba Beta activa para ${userEmail}. Acceso completo hasta el ${formatDate(betaState.expiresAt)}.`;
    accountEmail.textContent = `${userEmail} · Beta ${betaState.daysRemaining}d`;
  } else if (betaState.recognized) {
    welcome.textContent = `La prueba Beta asociada a ${userEmail} terminó. Los productos comprados en Hotmart seguirán disponibles.`;
    accountEmail.textContent = `${userEmail} · Prueba vencida`;
  } else {
    welcome.textContent = `Sesión iniciada como ${userEmail}. Solo se habilitan los productos comprados con este correo en Hotmart.`;
    accountEmail.textContent = userEmail;
  }

  activeCount.textContent = "0";
  await loadLicenses(session);
}

async function openCourse(slug) {
  libraryMessage.hidden = true;
  const course = CONFIG.courses.find((item) => item.slug === slug);

  if (!course?.url) {
    showLibraryMessage("Este producto todavía está siendo integrado a KineCheck Academy.");
    return;
  }

  const session = await validSession();
  if (!session) {
    dashboardView.hidden = true;
    loginView.hidden = false;
    showAuthMessage("Tu sesión venció. Ingresa nuevamente.", true);
    return;
  }

  ownerMode = isOwnerEmail(session.user?.email);
  betaState = getBetaState(session);
  betaMode = !ownerMode && betaState.active;

  try {
    await validateCourseLicense(session.access_token, slug);
    window.location.href = course.url;
  } catch (error) {
    licenseState.set(slug, "locked");
    renderCourses();
    showLibraryMessage(`${error.message} El acceso corresponde únicamente al producto comprado con este correo.`, true);
  }
}

loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.hidden = true;

  const email = normalizeEmail(emailInput.value);
  const password = passwordInput.value;

  if (!email || password.length < 8) {
    showAuthMessage("Ingresa un correo válido y una contraseña de al menos 8 caracteres.", true);
    return;
  }

  setBusy(true, mode === "login" ? "Iniciando sesión…" : "Creando tu cuenta…");

  try {
    const session = mode === "login"
      ? await request("/auth/v1/token?grant_type=password", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        })
      : await request("/auth/v1/signup", {
          method: "POST",
          body: JSON.stringify({ email, password, data: { source: "kinecheck-academy" } }),
        });

    if (!session.access_token) {
      setBusy(false);
      setMode("login");
      emailInput.value = email;
      showAuthMessage("Cuenta creada. Revisa tu correo y confirma la dirección antes de ingresar.");
      return;
    }

    saveSession(session);
    await renderLibrary(session);
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
  if (session) await renderLibrary(session);
})();
