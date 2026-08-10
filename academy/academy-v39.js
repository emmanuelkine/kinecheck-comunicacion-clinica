const CONFIG = window.KINECHECK_ACADEMY_CONFIG;
const SESSION_KEY = "kinecheck_secure_session_v1";
const LAST_PRODUCT_KEY = "kinecheck_last_product_v1";
const COURSE_PROGRESS_KEY = "kinecheck_academy_progress_v1";
const ACCESS_HISTORY_KEY = "kinecheck_academy_history_v1";
const CONTRAST_KEY = "kinecheck_academy_high_contrast_v1";
const POST_PURCHASE_RETRIES = 4;
const POST_PURCHASE_DELAY_MS = 5000;
const SSO_ENDPOINT = "https://kinecheck-clinico.emmanuelkine.chatgpt.site/api/license/sso";
const SSO_HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
const SSO_PRODUCTS = new Set([
  "kinecheck-clinico",
  "kinecheck-estudiante",
  "kinecheck-recupera",
]);

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
const onboarding = $("#onboarding");
const onboardingAction = $("#onboarding-action");
const profileEmail = $("#profile-email");
const profileAccess = $("#profile-access");
const accessHistory = $("#access-history");
const contrastToggle = $("#contrast-toggle");
const accountAvatar = $("#account-avatar");
const supportPanel = $("#support-panel");
const supportLauncher = $("#support-launcher");

let mode = "login";
let currentFilter = "all";
let searchQuery = "";
let licenseState = new Map();
let ownerMode = false;
let betaMode = false;
let betaState = { recognized: false, active: false, expiresAt: null, daysRemaining: 0 };
let activeStorageScope = "anonymous";
let transientSession = null;
let nativeSessionActivation = null;

window.KINECHECK_ACADEMY_SESSION = Object.freeze({
  get() {
    if (transientSession?.access_token) return transientSession;
    return readSession();
  },
  async refresh() {
    return validSession();
  },
});

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
  transientSession = null;
  try {
    delete window.__KINECHECK_NATIVE_ACCESS_TOKEN__;
  } catch {
    window.__KINECHECK_NATIVE_ACCESS_TOKEN__ = "";
  }
}

function readStoredJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function scopedStorageKey(baseKey) {
  return `${baseKey}:${activeStorageScope}`;
}

function readProgressState() {
  const stored = readStoredJson(scopedStorageKey(COURSE_PROGRESS_KEY), {});
  return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
}

function courseProgress(course) {
  const record = readProgressState()[course.slug] || {};
  const percent = clampPercent(record.percent);
  const started = percent > 0 || Boolean(record.startedAt || record.lastOpenedAt);
  const totalModules = Math.max(0, Number(record.totalModules || course.modules || 0));
  const completedModules = Math.min(
    totalModules,
    Math.max(0, Number(record.completedModules || 0)),
  );
  const minutesRemaining = Math.max(0, Number(record.minutesRemaining || 0));

  return {
    ...record,
    percent: started && percent === 0 ? 1 : percent,
    started,
    totalModules,
    completedModules,
    minutesRemaining,
  };
}

function writeProgress(slug, update) {
  const state = readProgressState();
  const current = state[slug] || {};
  state[slug] = { ...current, ...update };
  localStorage.setItem(scopedStorageKey(COURSE_PROGRESS_KEY), JSON.stringify(state));
}

function readAccessHistory() {
  const history = readStoredJson(scopedStorageKey(ACCESS_HISTORY_KEY), []);
  return Array.isArray(history) ? history : [];
}

function writeAccessHistory(course, openedAt) {
  const history = readAccessHistory().filter((item) => item.slug !== course.slug);
  history.unshift({ slug: course.slug, title: course.title, openedAt });
  localStorage.setItem(scopedStorageKey(ACCESS_HISTORY_KEY), JSON.stringify(history.slice(0, 6)));
}

function formatShortDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMinutes(value) {
  const minutes = Math.max(0, Number(value) || 0);
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
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

async function validateIdentity(session, persist = true) {
  const user = await request("/auth/v1/user", {
    method: "GET",
    token: session.access_token,
  });
  const verified = { ...session, user };
  if (persist) saveSession(verified);
  return verified;
}

async function validSession() {
  if (transientSession?.access_token) {
    if (Number(transientSession.expires_at || 0) <= Math.floor(Date.now() / 1000) + 30) {
      transientSession = null;
      return null;
    }
    try {
      transientSession = await validateIdentity(transientSession, false);
      return transientSession;
    } catch {
      transientSession = null;
      return null;
    }
  }

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

function accessTokenExpiry(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9._~-]{20,8192}$/.test(token)) return 0;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return 0;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const claims = JSON.parse(atob(padded));
    const expiresAt = Number(claims?.exp);
    return Number.isFinite(expiresAt) ? Math.floor(expiresAt) : 0;
  } catch {
    return 0;
  }
}

function consumeNativeAccessToken() {
  const token = typeof window.__KINECHECK_NATIVE_ACCESS_TOKEN__ === "string"
    ? window.__KINECHECK_NATIVE_ACCESS_TOKEN__
    : "";
  try {
    delete window.__KINECHECK_NATIVE_ACCESS_TOKEN__;
  } catch {
    window.__KINECHECK_NATIVE_ACCESS_TOKEN__ = "";
  }
  return /^[A-Za-z0-9._~-]{20,8192}$/.test(token) ? token : "";
}

async function receiveNativeSession() {
  const accessToken = consumeNativeAccessToken();
  if (!accessToken) return false;
  if (transientSession?.access_token === accessToken) return true;
  if (nativeSessionActivation) return nativeSessionActivation;

  nativeSessionActivation = (async () => {
    const expiresAt = accessTokenExpiry(accessToken);
    if (expiresAt <= Math.floor(Date.now() / 1000) + 30) {
      throw new Error("La sesión de KineCheck App venció. Vuelve a abrir esta sección desde la aplicación.");
    }
    setBusy(true, "Abriendo tu cuenta sin volver a pedir la contraseña…");
    transientSession = await validateIdentity({ access_token: accessToken, expires_at: expiresAt }, false);
    await renderLibrary(transientSession);
    return true;
  })();

  try {
    return await nativeSessionActivation;
  } catch (error) {
    transientSession = null;
    setBusy(false);
    showAuthMessage(error.message || "No fue posible recuperar la sesión de KineCheck App.", true);
    return false;
  } finally {
    nativeSessionActivation = null;
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
  if (course.kind === "course") {
    return courseProgress(course).started ? "Continuar curso" : "Comenzar curso";
  }
  if (course.kind === "tool") return "Abrir simulador";
  return "Abrir aplicación";
}

function audienceKeys(course) {
  if (Array.isArray(course.audiences) && course.audiences.length) {
    return course.audiences.map((item) => String(item).toLowerCase());
  }

  const audience = String(course.audience || "").toLowerCase();
  if (audience.includes("estudiante")) return ["students"];
  if (audience.includes("paciente")) return ["patients"];
  if (audience.includes("profesional")) return ["professionals"];
  if (course.kind === "course" || course.kind === "tool") return ["professionals", "students"];
  return ["professionals"];
}

function audienceClass(course) {
  const primary = String(course.audienceKey || audienceKeys(course)[0]);
  if (primary === "students") return "audience-students";
  if (primary === "patients") return "audience-patients";
  return "audience-professionals";
}

function filteredCourses() {
  return CONFIG.courses.filter((course) => {
    const matchesFilter = currentFilter === "all"
      || audienceKeys(course).includes(currentFilter);

    if (!matchesFilter) return false;
    if (!searchQuery) return true;

    return [course.title, course.subtitle, course.audience, course.kind, ...audienceKeys(course)]
      .join(" ")
      .toLowerCase()
      .includes(searchQuery);
  });
}

function progressDetail(course, state) {
  if (!state.started) return course.kind === "course" ? "Aún no iniciado" : "Aún no abierto";

  if (state.totalModules) {
    const remaining = Math.max(0, state.totalModules - state.completedModules);
    const parts = [`${remaining} módulo${remaining === 1 ? "" : "s"} por completar`];
    if (state.minutesRemaining) parts.push(`${formatMinutes(state.minutesRemaining)} aprox.`);
    return parts.join(" · ");
  }

  const lastOpened = formatShortDate(state.lastOpenedAt || state.startedAt);
  if (course.kind === "course") {
    return lastOpened ? `Inicio registrado · último acceso ${lastOpened}` : "Inicio registrado";
  }
  return lastOpened ? `Último acceso ${lastOpened}` : "Producto abierto";
}

function progressMarkup(course, state) {
  if (course.kind !== "course") {
    return `
      <div class="course-progress course-activity">
        <div class="course-progress-copy">
          <span>Actividad</span>
          <strong>${state.started ? "En uso" : "Sin iniciar"}</strong>
        </div>
        <span class="course-progress-detail">${progressDetail(course, state)}</span>
      </div>
    `;
  }

  return `
    <div class="course-progress" aria-label="Progreso ${state.percent}%">
      <div class="course-progress-copy">
        <span>Progreso del curso</span>
        <strong>${state.percent}%</strong>
      </div>
      <div class="progress-track" aria-hidden="true">
        <div class="progress-fill" style="--progress:${state.percent}%"></div>
      </div>
      <span class="course-progress-detail">${progressDetail(course, state)}</span>
    </div>
  `;
}

function courseCardMarkup(course) {
  const access = courseAccess(course);
  const owned = access === "owned";
  const state = courseProgress(course);
  const status = owned && state.started && course.kind === "course"
    ? "En progreso"
    : accessBadge(access);
  const productLabel = course.productId === "PROPIETARIO"
    ? "Versión en desarrollo"
    : (owned ? "Acceso verificado" : "Licencia asociada a la compra");

  return `
    <article class="course-card kind-${course.kind || "application"} ${audienceClass(course)}" data-card-course="${course.slug}">
      <div class="course-top">
        <span class="course-icon" aria-hidden="true">${course.icon}</span>
        <span class="status-badge ${owned ? "" : "preparing"}">${status}</span>
      </div>
      <div class="course-type">${courseTypeLabel(course)} · ${course.audience}</div>
      <h3>${course.title}</h3>
      <p>${course.subtitle}</p>
      <div class="course-meta">${productLabel}</div>
      ${progressMarkup(course, state)}
      <button class="course-button" type="button" data-course="${course.slug}" ${owned ? "" : "disabled"}>
        ${courseActionLabel(course, access)}
      </button>
    </article>
  `;
}

function courseGroupMarkup(id, title, description, courses) {
  if (!courses.length) return "";
  return `
    <section class="course-group" data-course-group="${id}">
      <div class="course-group-heading">
        <div><h3>${title}</h3><p>${description}</p></div>
        <span class="course-group-count">${courses.length} ${courses.length === 1 ? "producto" : "productos"}</span>
      </div>
      <div class="course-rail">${courses.map(courseCardMarkup).join("")}</div>
    </section>
  `;
}

function updateOnboardingVisibility(courses) {
  if (!onboarding) return;
  const checking = courses.some((course) => courseAccess(course) === "checking");
  const owned = courses.filter((course) => courseAccess(course) === "owned");
  const hasStarted = owned.some((course) => courseProgress(course).started);
  onboarding.hidden = checking || !owned.length || hasStarted;
}

function renderCourses() {
  const courses = filteredCourses();
  if (!courses.length) {
    grid.innerHTML = '<div class="empty-catalog">No encontramos productos para este filtro o búsqueda.</div>';
    updateOnboardingVisibility(CONFIG.courses);
    return;
  }

  const started = courses.filter((course) => (
    courseAccess(course) === "owned" && courseProgress(course).started
  ));
  const notStarted = courses.filter((course) => !started.includes(course));

  grid.innerHTML = [
    courseGroupMarkup(
      "started",
      "Continúa donde quedaste",
      "Productos que ya abriste, ordenados para retomar sin buscar.",
      started,
    ),
    courseGroupMarkup(
      "not-started",
      started.length ? "Aún no iniciados" : "Tu biblioteca",
      started.length
        ? "Cursos y herramientas disponibles para comenzar cuando quieras."
        : "Explora tus cursos, aplicaciones y herramientas disponibles.",
      notStarted,
    ),
  ].join("");

  updateOnboardingVisibility(CONFIG.courses);
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

async function syncBuyerWatermark(session) {
  const watermark = window.KineCheckWatermark;
  if (!watermark) return;

  const verifiedLicenseScopes = CONFIG.courses
    .filter((course) => hasFullAccess() || licenseState.get(course.slug) === "owned")
    .map((course) => course.slug);

  if (!verifiedLicenseScopes.length) {
    watermark.hide();
    return;
  }

  try {
    await watermark.showVerifiedBuyer({
      user: session.user,
      licenseScopes: ["academy", ...verifiedLicenseScopes],
      accessLabel: ownerMode ? "PROPIETARIO" : (betaMode ? "PRUEBA" : ""),
    });
  } catch (error) {
    watermark.hide();
    console.error("KineCheck Academy watermark", error);
  }
}

async function loadLicenses(session) {
  const activeCourses = CONFIG.courses.filter((course) => course.status === "active" && course.url);
  licenseState = new Map(activeCourses.map((course) => [course.slug, hasFullAccess() ? "owned" : "checking"]));
  renderCourses();

  if (!hasFullAccess()) await checkLicenses(session, activeCourses);

  activeCount.textContent = String([...licenseState.values()].filter((state) => state === "owned").length);
  renderCourses();
  updateContinuePanel();
  await syncBuyerWatermark(session);

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
    await syncBuyerWatermark(session);
  }

  if (locked.length) {
    showLibraryMessage(
      "La compra fue aprobada, pero la licencia todavía no aparece. Espera uno o dos minutos y vuelve a ingresar. Si continúa, contacta soporte indicando el correo de compra.",
      true,
    );
  } else {
    showLibraryMessage("Acceso sincronizado correctamente. Ya puedes abrir tu producto.");
  }
  await syncBuyerWatermark(session);
}

function readLastProduct() {
  try {
    return JSON.parse(localStorage.getItem(scopedStorageKey(LAST_PRODUCT_KEY)) || "null");
  } catch {
    return null;
  }
}

function saveLastProduct(course) {
  const openedAt = new Date().toISOString();
  localStorage.setItem(scopedStorageKey(LAST_PRODUCT_KEY), JSON.stringify({
    slug: course.slug,
    title: course.title,
    openedAt,
  }));
  const current = courseProgress(course);
  writeProgress(course.slug, {
    percent: current.started ? current.percent : 1,
    startedAt: current.startedAt || openedAt,
    lastOpenedAt: openedAt,
  });
  writeAccessHistory(course, openedAt);
}

function renderAccessHistory() {
  if (!accessHistory) return;
  const history = readAccessHistory();
  if (!history.length) {
    accessHistory.innerHTML = "<li>Aún no hay accesos registrados.</li>";
    return;
  }
  accessHistory.innerHTML = history.slice(0, 4).map((item) => (
    `<li><strong>${item.title}</strong><br><span>${formatShortDate(item.openedAt)}</span></li>`
  )).join("");
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
  const state = courseProgress(course);
  continueCopy.textContent = course.kind === "course"
    ? `Retoma el curso desde tu último acceso${state.percent ? ` · ${state.percent}% registrado` : ""}.`
    : "Vuelve directamente a la herramienta que utilizaste más recientemente.";
  continueButton.textContent = course.kind === "course" ? "Continuar curso" : "Abrir nuevamente";
  continueButton.dataset.course = course.slug;
  continueButton.hidden = false;
}

function updateAccountPresentation(session) {
  const userEmail = session.user?.email || "tu cuenta";
  activeStorageScope = normalizeEmail(userEmail) || String(session.user?.id || "anonymous");
  ownerMode = isOwnerEmail(userEmail);
  betaState = getBetaState(session);
  betaMode = !ownerMode && betaState.active;

  const name = displayName(userEmail);
  accountGreeting.textContent = `Hola, ${name}`;
  sidebarEmail.textContent = userEmail;
  if (accountAvatar) accountAvatar.textContent = name.charAt(0).toUpperCase() || "K";
  if (profileEmail) profileEmail.textContent = userEmail;

  if (ownerMode) {
    welcome.textContent = "Tienes acceso propietario a todos los productos publicados. Las versiones en preparación permanecen bloqueadas hasta estar listas.";
    accountEmail.textContent = `${userEmail} · Propietario`;
    sidebarAccess.textContent = "Acceso propietario";
    if (profileAccess) profileAccess.textContent = "Acceso propietario a todos los productos publicados.";
  } else if (betaMode) {
    welcome.textContent = `Tu prueba Beta está activa hasta el ${formatDate(betaState.expiresAt)}.`;
    accountEmail.textContent = `${userEmail} · Beta ${betaState.daysRemaining}d`;
    sidebarAccess.textContent = `Prueba Beta · ${betaState.daysRemaining}d`;
    if (profileAccess) profileAccess.textContent = `Prueba Beta activa por ${betaState.daysRemaining} día${betaState.daysRemaining === 1 ? "" : "s"}.`;
  } else if (betaState.recognized) {
    welcome.textContent = "La prueba Beta terminó. Los productos comprados con este correo continúan disponibles.";
    accountEmail.textContent = `${userEmail} · Prueba vencida`;
    sidebarAccess.textContent = "Prueba vencida";
    if (profileAccess) profileAccess.textContent = "La prueba terminó; tus compras activas continúan disponibles.";
  } else {
    welcome.textContent = "Se muestran únicamente los productos asociados a tu correo de compra en Hotmart.";
    accountEmail.textContent = userEmail;
    sidebarAccess.textContent = "Cuenta activa";
    if (profileAccess) profileAccess.textContent = "Las licencias se verifican antes de abrir cada producto.";
  }
  renderAccessHistory();
}

async function renderLibrary(session) {
  loginView.hidden = true;
  dashboardView.hidden = false;
  updateAccountPresentation(session);
  activeCount.textContent = "0";
  await loadLicenses(session);
}

function submitSsoAccess(session, product) {
  if (!SSO_PRODUCTS.has(product)) throw new Error("La aplicación solicitada no es válida.");
  const accessToken = String(session?.access_token || "");
  const expiresAt = accessTokenExpiry(accessToken);
  const issuedAt = Math.floor(Date.now() / 1000);
  if (!accessToken || expiresAt <= issuedAt) {
    throw new Error("La sesión venció. Ingresa nuevamente para abrir esta aplicación.");
  }

  const ssoForm = document.createElement("form");
  ssoForm.method = "post";
  ssoForm.action = SSO_ENDPOINT;
  ssoForm.enctype = "application/x-www-form-urlencoded";
  ssoForm.hidden = true;
  const fields = {
    product,
    access_token: accessToken,
    expires_at: String(expiresAt),
    issued_at: String(issuedAt),
    handoff_type: SSO_HANDOFF_TYPE,
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    ssoForm.appendChild(input);
  }
  document.body.appendChild(ssoForm);
  ssoForm.submit();
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
    window.KineCheckWatermark?.hide();
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
    if (course.ssoProduct) {
      submitSsoAccess(session, course.ssoProduct);
      return;
    }
    window.location.assign(course.url);
  } catch (error) {
    licenseState.set(slug, "locked");
    renderCourses();
    updateContinuePanel();
    showLibraryMessage(`${error.message} El acceso corresponde al producto comprado con este correo.`, true);
  }
}

window.KineCheckAcademyLauncher = Object.freeze({
  open(slug) {
    const course = CONFIG.courses.find((item) => item.slug === slug);
    if (!course || courseAccess(course) !== "owned") {
      showLibraryMessage("Este producto no está disponible en tu cuenta.", true);
      return false;
    }
    openCourse(slug);
    return true;
  },
});

function toggleSidebar(force) {
  const open = typeof force === "boolean" ? force : !sidebar.classList.contains("open");
  sidebar.classList.toggle("open", open);
  sidebarOverlay.hidden = !open;
  mobileMenu.setAttribute("aria-expanded", String(open));
}

function toggleSupport(force) {
  if (!supportPanel || !supportLauncher) return;
  const open = typeof force === "boolean" ? force : supportPanel.hidden;
  supportPanel.hidden = !open;
  supportLauncher.setAttribute("aria-expanded", String(open));
  if (open) supportPanel.querySelector("a")?.focus();
}

function setHighContrast(enabled) {
  document.body.classList.toggle("high-contrast", enabled);
  contrastToggle?.setAttribute("aria-pressed", String(enabled));
  if (contrastToggle) {
    contrastToggle.textContent = enabled ? "Desactivar alto contraste" : "Activar alto contraste";
  }
  localStorage.setItem(CONTRAST_KEY, String(enabled));
}

function applyProgressUpdate(slug, update = {}) {
  const course = CONFIG.courses.find((item) => item.slug === slug);
  if (!course) return false;

  const current = courseProgress(course);
  const next = {
    percent: clampPercent(update.percent ?? current.percent),
    completedModules: Math.max(0, Number(update.completedModules ?? current.completedModules) || 0),
    totalModules: Math.max(0, Number(update.totalModules ?? current.totalModules) || 0),
    minutesRemaining: Math.max(0, Number(update.minutesRemaining ?? current.minutesRemaining) || 0),
    startedAt: current.startedAt || update.startedAt || new Date().toISOString(),
    lastOpenedAt: update.lastOpenedAt || current.lastOpenedAt || new Date().toISOString(),
  };
  writeProgress(slug, next);
  renderCourses();
  updateContinuePanel();
  return true;
}

window.KineCheckAcademyProgress = Object.freeze({
  update(courseSlug, progressUpdate) {
    return applyProgressUpdate(courseSlug, progressUpdate);
  },
});

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

document.querySelectorAll(".topbar-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".topbar-nav a").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});

onboardingAction?.addEventListener("click", () => {
  document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelectorAll("[data-support-open]").forEach((button) => {
  button.addEventListener("click", () => toggleSupport(true));
});
document.querySelectorAll("[data-support-close]").forEach((button) => {
  button.addEventListener("click", () => toggleSupport(false));
});

contrastToggle?.addEventListener("click", () => {
  setHighContrast(!document.body.classList.contains("high-contrast"));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleSupport(false);
    if (sidebar?.classList.contains("open")) toggleSidebar(false);
  }
});

window.addEventListener("kinecheck:progress", (event) => {
  const detail = event.detail || {};
  if (detail.courseSlug) applyProgressUpdate(detail.courseSlug, detail);
});

window.addEventListener("storage", (event) => {
  if (event.key === scopedStorageKey(COURSE_PROGRESS_KEY)) {
    renderCourses();
    updateContinuePanel();
  }
});

signOut.addEventListener("click", () => clearSession());
currentYear.textContent = String(new Date().getFullYear());
setHighContrast(localStorage.getItem(CONTRAST_KEY) === "true");

window.addEventListener("kinecheck:native-session", () => {
  receiveNativeSession().catch((error) => {
    console.error("KineCheck native session", error);
  });
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("KineCheck Academy unhandled rejection", event.reason);
});

(async () => {
  if (await receiveNativeSession()) return;
  const session = await validSession();
  if (session) await renderLibrary(session);
})();
