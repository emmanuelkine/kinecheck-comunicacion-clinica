const COURSE_SESSION_PREFIX = "kinecheck_course_session_v2:";
const LEGACY_COURSE_SESSION_PREFIX = "kinecheck_course_session_v1:";
const SHARED_SESSION_KEY = "kinecheck_secure_session_v1";
const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
const HANDOFF_MAX_AGE_MS = 120000;

function courseSessionKey(product) {
  const slug = String(product || "curso").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  return `${COURSE_SESSION_PREFIX}${slug || "curso"}`;
}

function legacyCourseSessionKey(product) {
  const slug = String(product || "curso").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  return `${LEGACY_COURSE_SESSION_PREFIX}${slug || "curso"}`;
}

function safeJson(value) {
  try {
    return JSON.parse(value || "null");
  } catch {
    return null;
  }
}

function normalizeSession(value) {
  if (!value?.access_token) return null;
  return {
    ...value,
    access_token: String(value.access_token),
    expires_at: Number(value.expires_at || 0) || null,
    expires_in: Number(value.expires_in || 0) || null,
    token_type: value.token_type || "bearer",
  };
}

function storageRead(storage, key) {
  try {
    return normalizeSession(safeJson(storage.getItem(key)));
  } catch {
    return null;
  }
}

function storageWrite(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function storageRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // Limpieza de mejor esfuerzo.
  }
}

function consumeKineCheckHandoff() {
  if (!window.name) return null;
  try {
    const handoff = safeJson(window.name);
    const issuedAt = Number(handoff?.issuedAt || 0);
    const fresh = Number.isFinite(issuedAt) && Math.abs(Date.now() - issuedAt) <= HANDOFF_MAX_AGE_MS;
    if (handoff?.type !== HANDOFF_TYPE || !fresh) return null;
    const session = normalizeSession(handoff?.session?.access_token ? handoff.session : handoff);
    const product = String(handoff?.product || "").trim();
    return session && product ? { session, product, source: null } : null;
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

(async () => {
  const CONFIG = await waitForConfig().catch((error) => {
    console.error("KineCheck config", error);
    return null;
  });
  if (!CONFIG) return;

  const COURSE_KEY = courseSessionKey(CONFIG.courseSlug);
  const LEGACY_COURSE_KEY = legacyCourseSessionKey(CONFIG.courseSlug);
  const handoff = consumeKineCheckHandoff();

  const $ = (selector) => document.querySelector(selector);
  const shell = $("#access-shell");
  const root = $("#root");
  const message = $("#auth-message");
  const progress = $("#access-progress");
  const ecosystemEntry = $("#ecosystem-entry");
  const signOut = $("#sign-out");

  function headers(token) {
    const value = {
      apikey: CONFIG.supabaseAnonKey,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    };
    if (token) value.Authorization = `Bearer ${token}`;
    return value;
  }

  async function api(path, options = {}) {
    const response = await fetch(`${CONFIG.supabaseUrl}${path}`, {
      ...options,
      cache: "no-store",
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

  function showMessage(text, error = false) {
    if (!message) return;
    message.textContent = text;
    message.className = error ? "notice notice-error" : "notice";
    message.hidden = false;
  }

  function setProgress(visible, text = "Recuperando tu sesión de KineCheck…") {
    if (!progress) return;
    progress.hidden = !visible;
    const paragraph = progress.querySelector("p") || progress.querySelector("#progress-message");
    if (paragraph) paragraph.textContent = text;
  }

  function showEcosystemEntry(text = "Inicia sesión una sola vez en el ecosistema KineCheck y abre el curso desde tu biblioteca.") {
    setProgress(false);
    if (message) message.hidden = true;
    if (ecosystemEntry) {
      const copy = ecosystemEntry.querySelector("p");
      if (copy) copy.textContent = text;
      ecosystemEntry.hidden = false;
    }
    if (shell) shell.hidden = false;
    if (root) root.hidden = true;
    if (signOut) signOut.hidden = true;
  }

  function candidateSessions() {
    const candidates = [];
    if (handoff?.session) candidates.push({ session: handoff.session, source: null, product: handoff.product });

    const sources = [
      { storage: sessionStorage, key: COURSE_KEY, label: "course-session" },
      { storage: sessionStorage, key: SHARED_SESSION_KEY, label: "ecosystem-session-tab" },
      { storage: localStorage, key: SHARED_SESSION_KEY, label: "ecosystem-session" },
      { storage: localStorage, key: LEGACY_COURSE_KEY, label: "legacy-course-session" },
    ];

    for (const source of sources) {
      const session = storageRead(source.storage, source.key);
      if (session) candidates.push({ session, source });
    }
    return candidates;
  }

  function persistCourseSession(session) {
    const safeSession = normalizeSession(session);
    if (!safeSession) return;
    storageWrite(sessionStorage, COURSE_KEY, safeSession);
    storageRemove(localStorage, LEGACY_COURSE_KEY);
  }

  function persistSourceSession(record, session) {
    if (!record?.source?.storage || !record?.source?.key) return;
    storageWrite(record.source.storage, record.source.key, session);
  }

  function clearCourseSession() {
    storageRemove(sessionStorage, COURSE_KEY);
    storageRemove(localStorage, LEGACY_COURSE_KEY);
  }

  function clearAllKineCheckSessions() {
    clearCourseSession();
    storageRemove(sessionStorage, SHARED_SESSION_KEY);
    storageRemove(localStorage, SHARED_SESSION_KEY);
  }

  async function validateIdentity(session) {
    const user = await api("/auth/v1/user", {
      method: "GET",
      token: session.access_token,
    });
    return { ...session, user };
  }

  async function refreshSession(session) {
    if (!session?.refresh_token) throw new Error("La sesión temporal venció.");
    return await api("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
  }

  async function validEcosystemSession() {
    const candidates = candidateSessions();
    for (const record of candidates) {
      let session = normalizeSession(record.session);
      if (!session) continue;

      if (record.product && record.product !== CONFIG.courseSlug) continue;

      try {
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = Number(session.expires_at || 0);
        if (expiresAt && expiresAt <= now + 45) {
          session = await refreshSession(session);
          persistSourceSession(record, session);
        }
        const verified = await validateIdentity(session);
        persistCourseSession(verified);
        return verified;
      } catch {
        if (record.source?.storage && record.source?.key) {
          storageRemove(record.source.storage, record.source.key);
        }
      }
    }
    clearCourseSession();
    return null;
  }

  async function fetchCourse(token) {
    const courseSlug = String(CONFIG.courseSlug || "").trim();
    if (!courseSlug) throw new Error("No fue posible identificar el curso solicitado.");

    const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/${CONFIG.courseKeyFunction}`, {
      method: "POST",
      cache: "no-store",
      headers: headers(token),
      body: JSON.stringify({ courseSlug }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(data.message || "No encontramos una licencia activa asociada a esta cuenta.");
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
    setProgress(true, "Validando tu licencia en KineCheck…");
    if (ecosystemEntry) ecosystemEntry.hidden = true;
    if (message) message.hidden = true;
    try {
      const course = await fetchCourse(session.access_token);
      await launchCourse(course.source, session, course.courseSlug);
    } catch (error) {
      window.KineCheckWatermark?.hide();
      setProgress(false);
      if (error.status === 401) clearCourseSession();
      showMessage(`${error.message} Abre nuevamente el curso desde tu biblioteca KineCheck.`, true);
      if (ecosystemEntry) ecosystemEntry.hidden = false;
    }
  }

  signOut?.addEventListener("click", () => {
    window.KineCheckWatermark?.hide();
    clearAllKineCheckSessions();
    location.replace("../academy/");
  });

  setProgress(true);
  const session = await validEcosystemSession();
  if (session) {
    await authorize(session);
  } else {
    showEcosystemEntry();
  }
})();
