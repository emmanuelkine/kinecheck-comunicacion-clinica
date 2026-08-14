(() => {
  "use strict";

  const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
  const ANON_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";
  const SESSION_KEY = "kinecheck_admin_session_v1";

  const state = { session: null, data: null };
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  }

  function saveSession(value) {
    state.session = value;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    state.session = null;
  }

  function headers() {
    return {
      apikey: ANON_KEY,
      Authorization: `Bearer ${state.session?.access_token || ""}`,
      "Content-Type": "application/json",
    };
  }

  function formatDate(value) {
    if (!value) return "—";
    try { return new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
    catch { return String(value); }
  }

  function setMessage(message, isError = false) {
    const node = $("#action-message");
    node.textContent = message;
    node.style.background = isError ? "#fff0f0" : "#e9f6f3";
    node.style.color = isError ? "#8b3131" : "#17564f";
    node.hidden = !message;
  }

  async function login(email, password) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/platform-login`, {
      method: "POST",
      cache: "no-store",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error_description || data?.message || "No fue posible ingresar.");
    saveSession(data);
  }

  async function fetchStatus() {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/automation-status`, {
      method: "POST",
      cache: "no-store",
      headers: headers(),
      body: "{}",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || "No fue posible cargar el panel.");
    state.data = data;
    return data;
  }

  async function runAction(action, extra = {}) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/automation-control`, {
      method: "POST",
      cache: "no-store",
      headers: headers(),
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || "No fue posible ejecutar la acción.");
    return data;
  }

  function renderMetrics(data) {
    const metrics = data.metrics?.payload || {};
    const cards = [
      ["Visitas públicas hoy", metrics.public_page_views ?? 0],
      ["Vistas de productos", metrics.product_views ?? 0],
      ["Inicios de checkout", metrics.checkout_starts ?? 0],
      ["Aperturas Academy", metrics.academy_opens ?? 0],
      ["Aperturas de cursos", metrics.course_opens ?? 0],
      ["Compras comerciales aprobadas hoy", metrics.commercial_purchase_approvals_today ?? "—"],
      ["Revocaciones comerciales hoy", metrics.commercial_revocation_events_today ?? "—"],
      ["Postulaciones beta hoy", metrics.beta_submissions_today ?? 0],
      ["Soporte creado hoy", metrics.support_submissions_today ?? 0],
      ["Licencias activas", metrics.active_licenses ?? 0],
      ["Vencen en 30 días", metrics.expiring_30_days ?? 0],
      ["Soporte abierto", metrics.open_support ?? data.supportRequests.length],
      ["Beta nuevas", metrics.beta_new ?? data.betaApplications.length],
      ["Incidencias", metrics.open_reconciliation_issues ?? data.reconciliationIssues.length],
      ["Correos en cola", data.queuedOutbox ?? 0],
      ["Avisos sin leer", data.unreadNotifications ?? 0],
      ["Aceptaciones legales", data.legalAcceptances ?? 0],
      ["Compras comerciales activas", metrics.commercial_active_purchases ?? "—"],
      ["Compras comerciales revocadas", metrics.commercial_revoked_purchases ?? "—"],
      ["Compras QA activas", metrics.qa_active_purchases ?? "—"],
      ["Compras QA revocadas", metrics.qa_revoked_purchases ?? "—"],
      ["Compras sin clasificar", metrics.unclassified_purchases ?? "—"],
      ["Compras totales (incluye QA)", metrics.active_purchases ?? 0],
      ["Beta alta prioridad", metrics.beta_high_score ?? 0],
      ["Soporte urgente", metrics.urgent_support ?? 0],
    ];
    $("#metric-grid").innerHTML = cards.map(([label, value]) => `<article class="metric"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></article>`).join("");
  }

  function renderRuns(data) {
    const rows = data.automationRuns || [];
    $("#runs-body").innerHTML = rows.length ? rows.map((run) => `
      <tr>
        <td><strong>${escapeHtml(run.job_name)}</strong><br><small>${escapeHtml(run.source)}</small></td>
        <td>${escapeHtml(formatDate(run.started_at))}</td>
        <td><span class="status ${escapeHtml(run.status)}">${escapeHtml(run.status)}</span></td>
        <td><small>${escapeHtml(run.error_message || JSON.stringify(run.metrics || {}).slice(0, 180))}</small></td>
      </tr>`).join("") : `<tr><td colspan="4" class="empty">Aún no existen ejecuciones registradas.</td></tr>`;
  }

  function supportOptions(current) {
    return ["open","in_progress","waiting_user","resolved","closed","spam"].map((value) => `<option value="${value}" ${value === current ? "selected" : ""}>${value}</option>`).join("");
  }

  function betaOptions(current) {
    return ["new","shortlisted","invited","active","completed","declined"].map((value) => `<option value="${value}" ${value === current ? "selected" : ""}>${value}</option>`).join("");
  }

  function renderSupport(data) {
    const rows = data.supportRequests || [];
    $("#support-list").innerHTML = rows.length ? rows.map((item) => `
      <article class="item">
        <div class="item-head"><strong>${escapeHtml(item.category)} · ${escapeHtml(item.product_slug || "general")}</strong><span class="status ${item.priority === "urgent" ? "failed" : item.priority === "high" ? "warning" : ""}">${escapeHtml(item.priority)}</span></div>
        <p>${escapeHtml(item.email)}<br>${escapeHtml(item.automated_diagnosis?.initialMessage || item.automated_diagnosis?.code || "Sin diagnóstico")}</p>
        <small>${escapeHtml(formatDate(item.created_at))}</small><br>
        <select data-support-id="${escapeHtml(item.id)}">${supportOptions(item.status)}</select>
      </article>`).join("") : `<div class="empty">No hay solicitudes abiertas.</div>`;
  }

  function renderBeta(data) {
    const rows = data.betaApplications || [];
    $("#beta-list").innerHTML = rows.length ? rows.map((item) => `
      <article class="item">
        <div class="item-head"><strong>${escapeHtml(item.full_name)}</strong><span class="status ${item.triage_band === "high" ? "" : item.triage_band === "medium" ? "warning" : ""}">${escapeHtml(item.triage_band)} · ${escapeHtml(item.triage_score)}</span></div>
        <p>${escapeHtml(item.email)}<br>${escapeHtml(item.role)} · ${escapeHtml(item.product_interest)} · ${escapeHtml(item.device)}</p>
        <select data-beta-id="${escapeHtml(item.id)}">${betaOptions(item.status)}</select>
      </article>`).join("") : `<div class="empty">No hay postulaciones activas.</div>`;
  }

  function renderIssues(data) {
    const rows = data.reconciliationIssues || [];
    $("#issues-list").innerHTML = rows.length ? rows.map((item) => `
      <article class="item">
        <div class="item-head"><strong>${escapeHtml(item.issue_type)}</strong><span class="status ${item.severity === "critical" ? "failed" : item.severity === "high" ? "warning" : ""}">${escapeHtml(item.severity)}</span></div>
        <p>${escapeHtml(item.course_slug || "Sin curso")} · ${escapeHtml(item.transaction_id || "Sin transacción")}</p>
        <small>Última detección: ${escapeHtml(formatDate(item.last_seen_at))}</small>
      </article>`).join("") : `<div class="empty">No hay incidencias abiertas.</div>`;
  }

  function renderRestore(data) {
    const item = data.latestRestore;
    $("#restore-card").innerHTML = item ? `<strong>${escapeHtml(item.status.toUpperCase())}</strong><p>Prueba #${escapeHtml(item.id)} · ${escapeHtml(item.scope)}</p><small>${escapeHtml(formatDate(item.created_at))}</small>` : `<div class="empty">Aún no hay evidencia de restauración.</div>`;
  }

  function bindRowControls() {
    document.querySelectorAll("[data-support-id]").forEach((select) => select.addEventListener("change", async () => {
      try {
        await runAction("support_status", { id: select.dataset.supportId, status: select.value });
        setMessage("Estado de soporte actualizado.");
        await loadDashboard();
      } catch (error) { setMessage(error.message, true); }
    }));
    document.querySelectorAll("[data-beta-id]").forEach((select) => select.addEventListener("change", async () => {
      try {
        await runAction("beta_status", { id: select.dataset.betaId, status: select.value });
        setMessage("Estado beta actualizado.");
        await loadDashboard();
      } catch (error) { setMessage(error.message, true); }
    }));
  }

  function render(data) {
    $("#admin-account").textContent = data.email;
    $("#generated-at").textContent = `Actualizado: ${formatDate(data.generatedAt)}`;
    renderMetrics(data);
    renderRuns(data);
    renderSupport(data);
    renderBeta(data);
    renderIssues(data);
    renderRestore(data);
    bindRowControls();
  }

  async function loadDashboard() {
    const data = await fetchStatus();
    $("#login-view").hidden = true;
    $("#dashboard-view").hidden = false;
    render(data);
  }

  $("#admin-login")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("#admin-login-button");
    const message = $("#admin-login-message");
    message.hidden = true;
    button.disabled = true;
    button.textContent = "Verificando…";
    try {
      await login($("#admin-email").value.trim().toLowerCase(), $("#admin-password").value);
      await loadDashboard();
    } catch (error) {
      clearSession();
      message.textContent = error.message;
      message.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = "Ingresar";
    }
  });

  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", async () => {
    const action = button.dataset.action;
    button.disabled = true;
    setMessage("Ejecutando proceso…");
    try {
      await runAction(action);
      setMessage("Proceso completado correctamente.");
      await loadDashboard();
    } catch (error) {
      setMessage(error.message, true);
    } finally {
      button.disabled = false;
    }
  }));

  $("#refresh-button")?.addEventListener("click", () => loadDashboard().catch((error) => setMessage(error.message, true)));
  $("#logout-button")?.addEventListener("click", () => { clearSession(); location.reload(); });

  state.session = readSession();
  if (state.session?.access_token) loadDashboard().catch(() => clearSession());
})();
