(() => {
  "use strict";
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const CFG = window.KINECHECK_BANDERAS_CONFIG;
  const shell = document.getElementById("access-shell");
  const app = document.getElementById("course-content");
  const status = document.getElementById("access-status");
  const errorBox = document.getElementById("access-error");
  const retry = document.getElementById("retry-access");

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  }
  function saveSession(session) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  }
  async function request(path, options = {}) {
    const headers = { apikey: CFG.supabaseAnonKey, "Content-Type": "application/json", ...(options.headers || {}) };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    const response = await fetch(`${CFG.supabaseUrl}${path}`, { ...options, cache: "no-store", headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.message || data.error_description || data.error || "Solicitud rechazada");
      err.status = response.status; throw err;
    }
    return data;
  }
  async function validSession() {
    let session = readSession();
    if (!session?.access_token) return null;
    const now = Math.floor(Date.now() / 1000);
    if (Number(session.expires_at || 0) <= now + 45 && session.refresh_token) {
      session = await request("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) });
      saveSession(session);
    }
    const user = await request("/auth/v1/user", { method: "GET", token: session.access_token });
    return { ...session, user };
  }
  async function validateLicense(session) {
    await request(`/functions/v1/${CFG.courseKeyFunction}`, {
      method: "POST", token: session.access_token, body: JSON.stringify({ courseSlug: CFG.courseSlug })
    });
  }
  async function open() {
    errorBox.hidden = true;
    status.hidden = false;
    status.textContent = "Validando acceso…";
    try {
      const session = await validSession();
      if (!session) throw Object.assign(new Error("Inicia sesión en KineCheck y abre este curso desde tu biblioteca."), { status: 401 });
      await validateLicense(session);
      status.textContent = "Acceso verificado.";
      if (window.KineCheckWatermark) {
        await window.KineCheckWatermark.showVerifiedBuyer({ user: session.user, licenseScopes: [CFG.courseSlug] }).catch(() => {});
      }
      shell.hidden = true;
      app.hidden = false;
      window.dispatchEvent(new CustomEvent("kinecheck:banderas-ready"));
    } catch (error) {
      status.hidden = true;
      errorBox.hidden = false;
      errorBox.textContent = error?.status === 403
        ? "Tu cuenta está activa, pero Banderas Clínicas todavía no está incluido en tus licencias vigentes."
        : (error.message || "No fue posible verificar tu acceso.");
    }
  }
  retry?.addEventListener("click", open);
  open();
})();
