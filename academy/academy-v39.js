const CONFIG = window.KINECHECK_ACADEMY_CONFIG;
const SESSION_KEY = "kinecheck_secure_session_v1";
const LAST_PRODUCT_KEY = "kinecheck_last_product_v1";
const POST_PURCHASE_RETRIES = 4;
const POST_PURCHASE_DELAY_MS = 5000;

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
const accountGreeting = $("#account-greeting");
const activeCount = $("#active-count");
const sidebarAccess = $("#sidebar-access");
const sidebarEmail = $("#sidebar-email");
const searchInput = $("#course-search");
const continueHeading = $("#continue-heading");
const continueCopy = $("#continue-copy");
const continueButton = $("#continue-button");
const currentYear = $("#current-year");
const sidebar = $("#academy-sidebar");
const sidebarOverlay = $("#sidebar-overlay");
const mobileMenu = $("#mobile-menu");

let mode = "login";
let currentFilter = "all";
let searchQuery = "";
let licenseState = new Map();
let ownerMode = false;
let betaMode = false;
let betaState = { recognized: false, active: false, expiresAt: null, daysRemaining: 0 };

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function authHeaders(token) {
  const headers = {
    apikey: CONFIG.supabaseAnonKey,
    "Content-Type": "application/json",
  };
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

async function refreshSession(session) {
  if (!session?.refresh_token) throw new Error("No existe una sesión renovable.");
  const refreshed = await request("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  saveSession(refreshed);
  return refreshed;
}

async function validateIdentity(session) {
  const user = await request("/auth/v1/user", {
    method: "GET",
    token: session.access_token,
  });
  const verified = { ...session, user };
  saveSession(verified);
  return verified;
}

async function validSession() {
  let session = readSession();
  if (!session?.access_token) return null;

  try {
    if (Number(session.expires_at || 0) <= Math.floor(Date.now() / 1000) + 60) {
      session = await refreshSession(session);
    }
    return await validateIdentity(session);
  } catch {
    try {
      session = await refreshSession(session);
      return await validateIdentity(session);
    } catch {
      clearSession();
      return null;
    }
  }
}

function isOwnerEmail(email) {
  return (CONFIG.ownerEmails || []).map(normalizeEmail).includes(normalizeEmail(email));
}

function getBetaState(session) {
  const email = normalizeEmail(session?.user?.email);
  const recognized = (CONFIG.betaTesterEmails || []).map(normalizeEmail).includes(email);
  if (!recognized) return { recognized: false, active: false, expiresAt: null, daysRemaining: 0 };

  const trialDays = Math.max(1, Number(CONFIG.betaTrialDays || 5));
  const createdAt = new Date(session?.user?.created_at || 0);
  if (Number.isNaN(createdAt.getTime())) {
    return { recognized: true, active: false, expiresAt: null, daysRemaining: 0 };
  }

  const expiresAt = new Date(createdAt.getTime() + trialDays * 86400000);
  const remainingMs = expiresAt.getTime() - Date.now();
  return {
    recognized: true,
    active: remainingMs > 0,
    expiresAt,
    daysRemaining: remainingMs > 0 ? Math.max(1, Math.ceil(remainingMs / 86400000)) : 0,
  };
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

function displayName(email) {
  const normalized = normalizeEmail(email);
  if (normalized.includes("emmanuel")) return "Emmanuel";
  const local = normalized.split("@")[0].split(/[+._-]/)[0] || "";
  return local ? `${local.charAt(0).toUpperCase()}${local.slice(1)}` : "Bienvenido";
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

function courseAccess(course) {
  if (course.status !== "active" || !course.url) return "preparing";
  if (hasFullAccess()) return "owned";
  return licenseState.get(course.slug) || "checking";
}

function accessBadge(access) {
  if (access === "owned" && ownerMode) return "Acceso propietario";
  if (access === "owned" && betaMode) {
    return `Prueba · ${betaState.daysRemaining} día${betaState.daysRemaining === 1 ? "" : "s"}`;
  }
  if (access === "owned") return "Disponible";
  if (access === "checking") return "Verificando";
  if (access === "preparing") return "Próximamente";
  return "No adquirido";
}

function courseTypeLabel(course) {
  if (course.kind === "course") return "CURSO CLÍNICO";
  if (course.kind === "tool") return "SIMULADOR CLÍNICO";
  return "APLICACIÓN KINECHECK";
}

function courseActionLabel(course, access) {
  if (access === "checking") return "Validando acceso…";
  if (access === "preparing") return "Próximamente";
  if (access !== "owned") return "No disponible en tu cuenta";
  if (course.kind === "course") return "Continuar curso";
  if (course.kind === "tool") return "Abrir simulador";
  return "Abrir aplicación";
}

function audienceClass(course) {
  const audience = String(course.audience || "").toLowerCase();
  if (audience.includes("estudiante")) return "audience-students";
  if (audience.includes("paciente")) return "audience-patients";
  if (audience.includes("profesional")) return "audience-professionals";
  return "";
}

function filteredCourses() {
  return CONFIG.courses.filter((course) => {
    const access = courseAccess(course);
    const matchesFilter = currentFilter === "all"
      || (currentFilter === "available" && access === "owned")
      || currentFilter === course.kind;

    if (!matchesFilter) return false;
    if (!searchQuery) return true;

    return [course.title, course.subtitle, course.audience, course.kind]
      .join(" ")
      .toLowerCase()
      .includes(searchQuery);
  });
}

function renderCourses() {
  const courses = filteredCourses();
  if (!courses.length) {
    grid.innerHTML = '<div class="empty-catalog">No encontramos productos para este filtro o búsqueda.</div>';
    return;
  }

  grid.innerHTML = courses.map((course) => {
    const access = courseAccess(course);
    const owned = access === "owned";
    const productLabel = course.productId === "PROPIETARIO"
      ? "Versión en desarrollo"
      : `Producto Hotmart ${course.productId}`;

    return `
      <article class="course-card kind-${course.kind || "application"} ${audienceClass(course)}" data-card-course="${course.slug}">
        <div class="course-top">
          <span class="course-icon" aria-hidden="true">${course.icon}</span>
          <span class="status-badge ${owned ? "" : "preparing"}">${accessBadge(access)}</span>
        </div>
        <div class="course-type">${courseTypeLabel(course)} · ${course.audience}</div>
        <h3>${course.title}</h3>
        <p>${course.subtitle}</p>
        <div class="course-meta">${productLabel}</div>
        <button class="course-button" type="button" data-course="${course.slug}" ${owned ? "" : "disabled"}>
          ${courseActionLabel(course, access)}
        </button>
      </article>
    `;
  }).join("");
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

async function checkLicenses(session, courses) {
  await Promise.allSettled(courses.map(async (course) => {
    try {
      await validateCourseLicense(session.access_token, course.slug);
      licenseState.set(course.slug, "owned");
    } catch {
      licenseState.set(course.slug, "locked");
    }
  }));
}

async function loadLicenses(session) {
  const activeCourses = CONFIG.courses.filter((course) => course.status === "active" && course.url);
  licenseState = new Map(activeCourses.map((course) => [course.slug, hasFullAccess() ? "owned" : "checking"]));
  renderCourses();

  if (!hasFullAccess()) await checkLicenses(session, activeCourses);

  activeCount.textContent = String([...licenseState.values()].filter((state) => state === "owned").length);
  renderCourses();
  updateContinuePanel();

  const params = new URLSearchParams(window.location.search);
  if (params.get("purchase") === "approved" && !hasFullAccess()) {
    await retryPostPurchaseLicenses(session, activeCourses);
  }
}

async function retryPostPurchaseLicenses(session, courses) {
  let locked = courses.filter((course) => licenseState.get(course.slug) !== "owned");
  if (!locked.length) {
    showLibraryMessage("Compra aprobada y acceso habilitado correctamente.");
    return;
  }

  showLibraryMessage("Compra aprobada. Hotmart está sincronizando tu acceso; verificaremos nuevamente durante los próximos segundos.");

  for (let attempt = 1; attempt <= POST_PURCHASE_RETRIES && locked.length; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, POST_PURCHASE_DELAY_MS));
    await checkLicenses(session, locked);
    locked = locked.filter((course) => licenseState.get(course.slug) !== "owned");
    activeCount.textContent = String([...licenseState.values()].filter((state) => state === "owned").length);
    renderCourses();
    updateContinuePanel();
  }

  if (locked.length) {
    showLibraryMessage(
      "La compra fue aprobada, pero la licencia todavía no aparece. Espera uno o dos minutos y vuelve a ingresar. Si continúa, contacta soporte indicando el correo de compra.",
      true,
    );
  } else {
    showLibraryMessage("Acceso sincronizado correctamente. Ya puedes abrir tu producto.");
  }
}

function readLastProduct() {
  try {
    return JSON.parse(localStorage.getItem(LAST_PRODUCT_KEY) || "null");
  } catch {
    return null;
  }
}

function saveLastProduct(course) {
  localStorage.setItem(LAST_PRODUCT_KEY, JSON.stringify({
    slug: course.slug,
    title: course.title,
    openedAt: new Date().toISOString(),
  }));
}

function updateContinuePanel() {
  const last = readLastProduct();
  const course = last ? CONFIG.courses.find((item) => item.slug === last.slug) : null;

  if (!course || courseAccess(course) !== "owned") {
    continueHeading.textContent = "Explora tu biblioteca";
    continueCopy.textContent = "Tus aplicaciones y cursos disponibles están organizados en un solo lugar.";
    continueButton.hidden = true;
    continueButton.removeAttribute("data-course");
    return;
  }

  continueHeading.textContent = course.title;
  continueCopy.textContent = course.kind === "course"
    ? "Retoma el curso desde el producto que utilizaste más recientemente."
    : "Vuelve directamente a la herramienta que utilizaste más recientemente.";
  continueButton.textContent = course.kind === "course" ? "Continuar curso" : "Abrir nuevamente";
  continueButton.dataset.course = course.slug;
  continueButton.hidden = false;
}

function updateAccountPresentation(session) {
  const userEmail = session.user?.email || "tu cuenta";
  ownerMode = isOwnerEmail(userEmail);
  betaState = getBetaState(session);
  betaMode = !ownerMode && betaState.active;

  accountGreeting.textContent = `Hola, ${displayName(userEmail)}`;
  sidebarEmail.textContent = userEmail;

  if (ownerMode) {
    welcome.textContent = "Tienes acceso propietario a todos los productos publicados. Las versiones en preparación permanecen bloqueadas hasta estar listas.";
    accountEmail.textContent = `${userEmail} · Propietario`;
    sidebarAccess.textContent = "Acceso propietario";
  } else if (betaMode) {
    welcome.textContent = `Tu prueba Beta está activa hasta el ${formatDate(betaState.expiresAt)}.`;
    accountEmail.textContent = `${userEmail} · Beta ${betaState.daysRemaining}d`;
    sidebarAccess.textContent = `Prueba Beta · ${betaState.daysRemaining}d`;
  } else if (betaState.recognized) {
    welcome.textContent = "La prueba Beta terminó. Los productos comprados con este correo continúan disponibles.";
    accountEmail.textContent = `${userEmail} · Prueba vencida`;
    sidebarAccess.textContent = "Prueba vencida";
  } else {
    welcome.textContent = "Se muestran únicamente los productos asociados a tu correo de compra en Hotmart.";
    accountEmail.textContent = userEmail;
    sidebarAccess.textContent = "Cuenta activa";
  }
}

async function renderLibrary(session) {
  loginView.hidden = true;
  dashboardView.hidden = false;
  updateAccountPresentation(session);
  activeCount.textContent = "0";
  await loadLicenses(session);
}

async function openCourse(slug) {
  libraryMessage.hidden = true;
  const course = CONFIG.courses.find((item) => item.slug === slug);

  if (!course || course.status !== "active" || !course.url) {
    showLibraryMessage("Este producto todavía está siendo preparado y no puede abrirse aún.");
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
    saveLastProduct(course);
    window.location.assign(course.url);
  } catch (error) {
    licenseState.set(slug, "locked");
    renderCourses();
    updateContinuePanel();
    showLibraryMessage(`${error.message} El acceso corresponde al producto comprado con este correo.`, true);
  }
}

function toggleSidebar(force) {
  const open = typeof force === "boolean" ? force : !sidebar.classList.contains("open");
  sidebar.classList.toggle("open", open);
  sidebarOverlay.hidden = !open;
  mobileMenu.setAttribute("aria-expanded", String(open));
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
    let session = mode === "login"
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
    session = await validateIdentity(session);
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

continueButton.addEventListener("click", () => {
  if (continueButton.dataset.course) openCourse(continueButton.dataset.course);
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderCourses();
  });
});

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  renderCourses();
});

mobileMenu.addEventListener("click", () => toggleSidebar());
sidebarOverlay.addEventListener("click", () => toggleSidebar(false));
document.querySelectorAll(".sidebar-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    if (window.innerWidth <= 980) toggleSidebar(false);
  });
});

signOut.addEventListener("click", () => clearSession());
currentYear.textContent = String(new Date().getFullYear());

window.addEventListener("unhandledrejection", (event) => {
  console.error("KineCheck Academy unhandled rejection", event.reason);
});

(async () => {
  const session = await validSession();
  if (session) await renderLibrary(session);
})();
