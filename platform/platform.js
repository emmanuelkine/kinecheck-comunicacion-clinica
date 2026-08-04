(() => {
  "use strict";

  const CONFIG = Object.freeze({
    supabaseUrl: "https://eqhcdclyeoapmqtlduwf.supabase.co",
    anonKey: "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_",
    sessionKey: "kinecheck_secure_session_v1",
    supportEmail: "soporte.kinecheck@gmail.com",
    products: [
      { slug: "kinecheck-clinico", title: "KineCheck Clínico", subtitle: "Evaluación, registro y razonamiento profesional.", icon: "CL", kind: "application", workspace: "clinical" },
      { slug: "kinecheck-estudiante", title: "KineCheck Estudiante", subtitle: "Evaluación y razonamiento clínico guiado.", icon: "KE", kind: "application", workspace: "student" },
      { slug: "kinecheck-recupera", title: "KineCheck Recupera", subtitle: "Ejercicios, síntomas y seguimiento personal.", icon: "KR", kind: "application", workspace: "patient" },
      { slug: "comunicacion-clinica", title: "Comunicación Clínica", subtitle: "El arte de comunicar en salud.", icon: "CC", kind: "course", workspace: "clinical" },
      { slug: "mas-alla-del-dolor", title: "Más allá del dolor", subtitle: "Evaluación musculoesquelética integral.", icon: "MD", kind: "course", workspace: "clinical" },
      { slug: "evidencia-aplicada", title: "Evidencia Aplicada", subtitle: "Razonamiento clínico con evidencia.", icon: "EA", kind: "course", workspace: "clinical" },
      { slug: "traumatologia-ortopedia-clinica", title: "Traumatología y Ortopedia Clínica", subtitle: "Del mecanismo lesional a la decisión segura.", icon: "TO", kind: "course", workspace: "clinical" }
    ]
  });

  const WORKSPACES = Object.freeze({
    clinical: { label: "Clínico", icon: "CL", description: "Síntesis, evaluación y decisiones profesionales." },
    student: { label: "Estudiante", icon: "ES", description: "Práctica guiada, preguntas y retroalimentación." },
    teaching: { label: "Docencia", icon: "DO", description: "Clases, casos, evaluaciones y rúbricas." },
    patient: { label: "Recuperación", icon: "PA", description: "Ejercicios y seguimiento con máxima claridad." },
    general: { label: "General", icon: "KC", description: "Cursos, recursos y actividad de tu cuenta." }
  });

  const CASE_TYPES = Object.freeze({
    clinical: { label: "Caso clínico", icon: "CL", workspace: "clinical", caseType: "clinical", description: "Organiza evaluación, hallazgos y plan." },
    student_practice: { label: "Práctica guiada", icon: "ES", workspace: "student", caseType: "student_practice", description: "Construye razonamiento paso a paso." },
    teaching: { label: "Material docente", icon: "DO", workspace: "teaching", caseType: "teaching", description: "Diseña una clase, evaluación o rúbrica." },
    patient_followup: { label: "Seguimiento", icon: "PA", workspace: "patient", caseType: "patient_followup", description: "Registra objetivos y evolución personal." },
    general: { label: "Proyecto general", icon: "KC", workspace: "general", caseType: "general", description: "Guarda una tarea o proyecto KineCheck." }
  });

  const VIEW_META = Object.freeze({
    home: ["INICIO", "Tu espacio KineCheck"],
    workspace: ["MI ESPACIO", "Trabajo y actividad"],
    cases: ["CASOS", "Flujos y proyectos"],
    library: ["BIBLIOTECA", "Productos y evidencia"],
    settings: ["CONFIGURACIÓN", "Cuenta y preferencias"]
  });

  const state = {
    session: null,
    user: null,
    activeSlugs: new Set(),
    accessMetadata: new Map(),
    capabilities: new Set(),
    preferences: { active_workspace: "general", theme: "system", preferences: {} },
    cases: [],
    caseFilter: "all",
    libraryFilter: "all",
    view: "home",
    wizardStep: 1,
    selectedCaseType: "general"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  function apiHeaders(extra = {}) {
    return {
      apikey: CONFIG.anonKey,
      Authorization: `Bearer ${state.session?.access_token || ""}`,
      "Content-Type": "application/json",
      ...extra
    };
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; }, 3500);
  }

  function setNotice(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.hidden = !message;
  }

  function readSession() {
    try {
      const value = JSON.parse(localStorage.getItem(CONFIG.sessionKey) || "null");
      if (!value?.access_token) return null;
      return value;
    } catch {
      return null;
    }
  }

  function saveSession(value) {
    state.session = value;
    localStorage.setItem(CONFIG.sessionKey, JSON.stringify(value));
  }

  async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function refreshSession() {
    if (!state.session?.refresh_token) return false;
    const response = await fetchWithTimeout(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: CONFIG.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: state.session.refresh_token })
    }).catch(() => null);
    if (!response?.ok) return false;
    const data = await response.json();
    saveSession(data);
    return true;
  }

  async function resolveUser() {
    if (!state.session?.access_token) return false;
    let response = await fetchWithTimeout(`${CONFIG.supabaseUrl}/auth/v1/user`, { headers: apiHeaders() }).catch(() => null);
    if (response?.status === 401 && await refreshSession()) {
      response = await fetchWithTimeout(`${CONFIG.supabaseUrl}/auth/v1/user`, { headers: apiHeaders() }).catch(() => null);
    }
    if (!response?.ok) return false;
    state.user = await response.json();
    return Boolean(state.user?.id && state.user?.email);
  }

  async function login(email, password) {
    const response = await fetchWithTimeout(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: CONFIG.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error_description || data?.msg || "No fue posible iniciar sesión.");
    saveSession(data);
    state.user = data.user;
  }

  async function logout() {
    try {
      await fetchWithTimeout(`${CONFIG.supabaseUrl}/auth/v1/logout`, { method: "POST", headers: apiHeaders() });
    } catch { }
    localStorage.removeItem(CONFIG.sessionKey);
    state.session = null;
    state.user = null;
    location.hash = "";
    location.reload();
  }

  function displayName() {
    const metadataName = String(state.user?.user_metadata?.full_name || state.user?.user_metadata?.name || "").trim();
    if (metadataName) return metadataName.split(/\s+/)[0];
    const email = String(state.user?.email || "").toLowerCase();
    if (email.includes("emmanuel")) return "Emmanuel";
    const local = email.split("@")[0].split(/[+._-]/)[0] || "KineCheck";
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  async function loadAccess() {
    const response = await fetchWithTimeout(`${CONFIG.supabaseUrl}/functions/v1/platform-context`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || "No fue posible verificar tus licencias.");
    state.activeSlugs = new Set(data.activeCourseSlugs || []);
    state.accessMetadata = new Map((data.activeAccesses || []).map((item) => [item.courseSlug, item]));
    state.capabilities = new Set(data.capabilities || ["course_access"]);
  }

  function availableWorkspaces() {
    const result = ["general"];
    if (state.capabilities.has("clinical_workspace")) result.unshift("clinical");
    if (state.capabilities.has("student_tutor")) result.push("student");
    if (state.capabilities.has("teaching_studio")) result.push("teaching");
    if (state.capabilities.has("patient_program")) result.push("patient");
    return [...new Set(result)];
  }

  function defaultWorkspace() {
    const allowed = availableWorkspaces();
    const stored = state.preferences.active_workspace;
    if (allowed.includes(stored)) return stored;
    return allowed.find((item) => item !== "general") || "general";
  }

  async function loadPreferences() {
    const response = await fetchWithTimeout(`${CONFIG.supabaseUrl}/rest/v1/platform_user_preferences?user_id=eq.${encodeURIComponent(state.user.id)}&select=*`, {
      headers: apiHeaders()
    });
    if (!response.ok) return;
    const rows = await response.json();
    if (rows[0]) state.preferences = rows[0];
    else await savePreferences({ active_workspace: "general", theme: localStorage.getItem("kinecheck_platform_theme") || "system", preferences: {} });
  }

  async function savePreferences(patch) {
    state.preferences = { ...state.preferences, ...patch };
    const payload = {
      user_id: state.user.id,
      active_workspace: state.preferences.active_workspace || "general",
      theme: state.preferences.theme || "system",
      preferences: state.preferences.preferences || {}
    };
    const response = await fetchWithTimeout(`${CONFIG.supabaseUrl}/rest/v1/platform_user_preferences`, {
      method: "POST",
      headers: apiHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("No fue posible guardar tus preferencias.");
    localStorage.setItem("kinecheck_platform_theme", payload.theme);
  }

  async function loadCases() {
    const response = await fetchWithTimeout(`${CONFIG.supabaseUrl}/rest/v1/platform_cases?select=*&order=updated_at.desc`, { headers: apiHeaders() });
    if (!response.ok) throw new Error("No fue posible cargar tus casos.");
    state.cases = await response.json();
  }

  async function createCase(payload) {
    const response = await fetchWithTimeout(`${CONFIG.supabaseUrl}/rest/v1/platform_cases`, {
      method: "POST",
      headers: apiHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify({
        owner_id: state.user.id,
        workspace: payload.workspace,
        case_type: payload.caseType,
        title: payload.title,
        status: "active",
        progress: 25,
        current_step: 1,
        summary: { context: payload.context, details: payload.details, source: "platform_v5" }
      })
    });
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error(data?.message || data?.hint || "No fue posible guardar el caso.");
    state.cases.unshift(data[0]);
    return data[0];
  }

  function applyTheme(theme) {
    const normalized = ["system", "light", "dark"].includes(theme) ? theme : "system";
    document.body.dataset.theme = normalized;
    $$('[data-theme-choice]').forEach((button) => button.classList.toggle("active", button.dataset.themeChoice === normalized));
  }

  function capabilityLabels() {
    const labels = [];
    if (state.capabilities.has("clinical_workspace")) labels.push("Práctica clínica");
    if (state.capabilities.has("student_tutor")) labels.push("Tutor estudiante");
    if (state.capabilities.has("teaching_studio")) labels.push("Estudio docente");
    if (state.capabilities.has("patient_program")) labels.push("Seguimiento personal");
    if (state.capabilities.has("evidence_library")) labels.push("Biblioteca de evidencia");
    if (!labels.length) labels.push("Biblioteca KineCheck");
    return labels;
  }

  function taskDefinitions() {
    const tasks = [];
    if (state.capabilities.has("clinical_workspace")) {
      tasks.push(
        { icon: "CL", title: "Evaluar un caso", copy: "Organiza contexto, hallazgos y próximos pasos.", action: () => openCaseDialog("clinical") },
        { icon: "≋", title: "Sintetizar hallazgos", copy: "Convierte información dispersa en una estructura clara.", action: () => openCaseDialog("clinical") }
      );
    }
    if (state.capabilities.has("student_tutor")) {
      tasks.push(
        { icon: "ES", title: "Resolver un caso guiado", copy: "Practica tu razonamiento paso a paso.", action: () => openCaseDialog("student_practice") },
        { icon: "?", title: "Revisar mis errores", copy: "Organiza una sesión de práctica y retroalimentación.", action: () => activateView("cases") }
      );
    }
    if (state.capabilities.has("teaching_studio")) {
      tasks.push(
        { icon: "DO", title: "Crear material académico", copy: "Inicia una clase, caso, evaluación o rúbrica.", action: () => openCaseDialog("teaching") },
        { icon: "✓", title: "Diseñar una evaluación", copy: "Define propósito, nivel y criterios de calidad.", action: () => openCaseDialog("teaching") }
      );
    }
    if (state.capabilities.has("patient_program")) {
      tasks.push(
        { icon: "PA", title: "Ver mis ejercicios", copy: "Abre tu programa y revisa lo indicado para hoy.", action: () => openProduct("kinecheck-recupera") },
        { icon: "↗", title: "Registrar mi progreso", copy: "Anota síntomas, función y cumplimiento.", action: () => openProduct("kinecheck-recupera") }
      );
    }
    if (state.capabilities.has("evidence_library")) {
      tasks.push({ icon: "EA", title: "Consultar evidencia", copy: "Revisa cursos y recursos asociados a tu cuenta.", action: () => activateView("library") });
    }
    if (!tasks.length) tasks.push({ icon: "▤", title: "Abrir mi biblioteca", copy: "Revisa los productos asociados a tu cuenta.", action: () => activateView("library") });
    return tasks.slice(0, 6);
  }

  function renderHeader() {
    const name = displayName();
    $("#greeting").textContent = `Hola, ${name}`;
    $("#account-name").textContent = name;
    $("#account-email").textContent = state.user.email;
    $("#account-avatar").textContent = name.charAt(0).toUpperCase();
    $("#active-license-count").textContent = String(state.activeSlugs.size);
    $("#summary-copy").textContent = state.activeSlugs.size
      ? "Tus productos activos se organizan automáticamente según el trabajo que puedes realizar."
      : "No encontramos productos activos. Revisa que estés usando el correo de tu compra.";
    $("#capability-pills").innerHTML = capabilityLabels().map((label) => `<span>${escapeHtml(label)}</span>`).join("");
  }

  function renderTasks() {
    const tasks = taskDefinitions();
    $("#task-grid").innerHTML = tasks.map((task, index) => `
      <button class="task-card" type="button" data-task-index="${index}">
        <span class="task-arrow">↗</span>
        <span class="task-icon">${escapeHtml(task.icon)}</span>
        <strong>${escapeHtml(task.title)}</strong>
        <p>${escapeHtml(task.copy)}</p>
      </button>
    `).join("");
    $$('[data-task-index]').forEach((button) => {
      button.addEventListener("click", () => tasks[Number(button.dataset.taskIndex)]?.action());
    });
  }

  function caseLabel(item) {
    return CASE_TYPES[item.case_type]?.label || "Caso";
  }

  function formatDate(value) {
    try { return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
    catch { return ""; }
  }

  function caseMarkup(item, compact = false) {
    const type = CASE_TYPES[item.case_type] || CASE_TYPES.general;
    return `
      <article class="case-card" data-case-id="${escapeHtml(item.id)}">
        <span class="case-icon">${escapeHtml(type.icon)}</span>
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="case-meta"><span>${escapeHtml(caseLabel(item))}</span><span>${escapeHtml(WORKSPACES[item.workspace]?.label || "General")}</span><span>${escapeHtml(formatDate(item.updated_at))}</span></div>
        </div>
        ${compact ? "" : `<div class="case-progress" style="--progress:${Number(item.progress) || 0}%"><span></span><small>${Number(item.progress) || 0}% completado</small></div>`}
      </article>
    `;
  }

  function renderContinue() {
    const recent = state.cases.find((item) => item.status !== "archived");
    $("#continue-content").innerHTML = recent ? `
      <div class="continue-item">
        <span class="item-icon">${escapeHtml(CASE_TYPES[recent.case_type]?.icon || "KC")}</span>
        <div><strong>${escapeHtml(recent.title)}</strong><small>${escapeHtml(caseLabel(recent))} · ${Number(recent.progress) || 0}% completado</small></div>
        <button class="button secondary" type="button" data-view-link="cases">Continuar</button>
      </div>
    ` : `<div class="empty-inline">Aún no tienes casos guardados. <button class="text-button" type="button" data-new-case>Crear el primero →</button></div>`;
    bindDynamicActions($("#continue-content"));
  }

  function renderWorkspaces() {
    const allowed = availableWorkspaces();
    $("#workspace-grid").innerHTML = allowed.map((key) => {
      const item = WORKSPACES[key];
      const count = state.cases.filter((caseItem) => caseItem.workspace === key && caseItem.status !== "archived").length;
      return `<article class="workspace-card"><span class="workspace-icon">${item.icon}</span><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.description)}</p><button class="text-button" type="button" data-workspace-open="${key}">${count} ${count === 1 ? "elemento" : "elementos"} →</button></article>`;
    }).join("");
    $("#workspace-recent").innerHTML = state.cases.length ? state.cases.slice(0, 4).map((item) => caseMarkup(item, true)).join("") : `<div class="empty-state"><strong>Tu espacio está listo</strong>Crea un caso para comenzar a construir tu historial de trabajo.</div>`;
    $$('[data-workspace-open]').forEach((button) => button.addEventListener("click", async () => {
      state.preferences.active_workspace = button.dataset.workspaceOpen;
      await savePreferences({ active_workspace: button.dataset.workspaceOpen }).catch(() => {});
      renderWorkspaceSelect();
      activateView("cases");
    }));
  }

  function renderCases() {
    const query = String($("#case-search")?.value || "").trim().toLowerCase();
    const filtered = state.cases.filter((item) => {
      const statusMatch = state.caseFilter === "all" || item.status === state.caseFilter;
      const text = `${item.title} ${JSON.stringify(item.summary || {})}`.toLowerCase();
      return statusMatch && (!query || text.includes(query));
    });
    $("#case-list").innerHTML = filtered.length ? filtered.map((item) => caseMarkup(item)).join("") : `<div class="empty-state"><strong>No hay casos en esta vista</strong>Crea un caso o cambia los filtros para continuar.</div>`;
  }

  function renderLibrary() {
    const query = String($("#library-search")?.value || "").trim().toLowerCase();
    const products = CONFIG.products.filter((product) => {
      const filterMatch = state.libraryFilter === "all" || product.kind === state.libraryFilter;
      return filterMatch && (!query || `${product.title} ${product.subtitle}`.toLowerCase().includes(query));
    });
    $("#library-grid").innerHTML = products.map((product) => {
      const active = state.activeSlugs.has(product.slug);
      const metadata = state.accessMetadata.get(product.slug);
      const expiry = metadata?.accessExpiresAt ? `Vigente hasta ${formatDate(metadata.accessExpiresAt)}` : (active ? "Acceso activo" : "No adquirido");
      return `<article class="library-card ${active ? "" : "locked"}"><div class="library-top"><span class="library-icon">${product.icon}</span><span class="status-badge ${active ? "active" : ""}">${active ? "ACTIVO" : "BLOQUEADO"}</span></div><small>${product.kind === "course" ? "Curso" : "Aplicación"}</small><h3>${escapeHtml(product.title)}</h3><p>${escapeHtml(product.subtitle)}<br>${escapeHtml(expiry)}</p>${active ? `<button class="button primary" type="button" data-open-product="${product.slug}">Abrir</button>` : `<a class="button secondary" href="../#productos">Conocer producto</a>`}</article>`;
    }).join("");
    $$('[data-open-product]').forEach((button) => button.addEventListener("click", () => openProduct(button.dataset.openProduct)));
  }

  function renderWorkspaceSelect() {
    const select = $("#workspace-select");
    const allowed = availableWorkspaces();
    const active = defaultWorkspace();
    state.preferences.active_workspace = active;
    select.innerHTML = allowed.map((key) => `<option value="${key}" ${key === active ? "selected" : ""}>${escapeHtml(WORKSPACES[key].label)}</option>`).join("");
    $("#sidebar-workspace").textContent = WORKSPACES[active]?.label || "General";
  }

  function renderLicenses() {
    const activeProducts = CONFIG.products.filter((product) => state.activeSlugs.has(product.slug));
    $("#license-list").innerHTML = activeProducts.length ? activeProducts.map((product) => {
      const metadata = state.accessMetadata.get(product.slug);
      const detail = metadata?.daysRemaining != null ? `${metadata.daysRemaining} días restantes` : "Sin vencimiento registrado";
      return `<div class="license-row"><span><strong>${escapeHtml(product.title)}</strong><small>${escapeHtml(detail)}</small></span><b>ACTIVA</b></div>`;
    }).join("") : `<div class="empty-inline">No encontramos licencias activas para este correo.</div>`;
  }

  function renderAll() {
    renderHeader();
    renderTasks();
    renderContinue();
    renderWorkspaces();
    renderCases();
    renderLibrary();
    renderWorkspaceSelect();
    renderLicenses();
    applyTheme(state.preferences.theme || "system");
  }

  function normalizedView(value) {
    const raw = String(value || "").replace(/^#/, "").toLowerCase();
    return Object.hasOwn(VIEW_META, raw) ? raw : "home";
  }

  function activateView(view, updateHash = true) {
    const next = normalizedView(view);
    state.view = next;
    document.body.dataset.view = next;
    $$('.view').forEach((section) => section.classList.toggle("active", section.dataset.view === next));
    $$('[data-view-link]').forEach((link) => link.classList.toggle("active", link.dataset.viewLink === next));
    const [kicker, title] = VIEW_META[next];
    $("#view-kicker").textContent = kicker;
    $("#view-title").textContent = title;
    if (updateHash) history.replaceState(null, "", `#${next}`);
    closeMobileMenu();
    $("#main-content").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bindNavigation() {
    document.addEventListener("click", (event) => {
      const viewLink = event.target.closest('[data-view-link]');
      if (viewLink) {
        event.preventDefault();
        activateView(viewLink.dataset.viewLink);
      }
      const createButton = event.target.closest('[data-new-case]');
      if (createButton) {
        event.preventDefault();
        openCaseDialog();
      }
    });
    window.addEventListener("hashchange", () => activateView(location.hash, false));
  }

  function openProduct(slug) {
    const product = CONFIG.products.find((item) => item.slug === slug);
    if (!product || !state.activeSlugs.has(slug)) {
      showToast("Este producto no está activo en tu cuenta.");
      return;
    }
    const target = product.kind === "application" ? "../academy/#herramientas" : "../academy/#biblioteca";
    location.href = target;
  }

  function renderCaseTypeOptions() {
    const allowed = new Set(["general"]);
    if (state.capabilities.has("clinical_workspace")) allowed.add("clinical");
    if (state.capabilities.has("student_tutor")) allowed.add("student_practice");
    if (state.capabilities.has("teaching_studio")) allowed.add("teaching");
    if (state.capabilities.has("patient_program")) allowed.add("patient_followup");
    $("#case-type-options").innerHTML = [...allowed].map((key) => {
      const item = CASE_TYPES[key];
      return `<button class="option-card ${state.selectedCaseType === key ? "active" : ""}" type="button" data-case-type="${key}"><span>${item.icon}</span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.description)}</small></button>`;
    }).join("");
    $$('[data-case-type]').forEach((button) => button.addEventListener("click", () => {
      state.selectedCaseType = button.dataset.caseType;
      renderCaseTypeOptions();
    }));
  }

  function openCaseDialog(type) {
    state.wizardStep = 1;
    const allowedType = type && CASE_TYPES[type] ? type : defaultCaseTypeForWorkspace(defaultWorkspace());
    state.selectedCaseType = allowedType;
    $("#case-form").reset();
    setNotice($("#case-form-message"), "");
    renderCaseTypeOptions();
    updateWizard();
    $("#case-dialog").showModal();
  }

  function defaultCaseTypeForWorkspace(workspace) {
    return ({ clinical: "clinical", student: "student_practice", teaching: "teaching", patient: "patient_followup" })[workspace] || "general";
  }

  function closeCaseDialog() {
    $("#case-dialog").close();
  }

  function updateWizard() {
    $$('[data-form-step]').forEach((step) => step.classList.toggle("active", Number(step.dataset.formStep) === state.wizardStep));
    $$('[data-step-indicator]').forEach((indicator) => {
      const step = Number(indicator.dataset.stepIndicator);
      indicator.classList.toggle("active", step === state.wizardStep);
      indicator.classList.toggle("complete", step < state.wizardStep);
    });
    $("#dialog-progress").style.width = `${state.wizardStep * 25}%`;
    $("#case-back").hidden = state.wizardStep === 1;
    $("#case-next").hidden = state.wizardStep === 4;
    $("#case-save").hidden = state.wizardStep !== 4;
    if (state.wizardStep === 4) renderCaseReview();
  }

  function validateWizardStep() {
    if (state.wizardStep === 1 && !$("#case-title").value.trim()) {
      setNotice($("#case-form-message"), "Escribe un título breve para continuar.", true);
      $("#case-title").focus();
      return false;
    }
    setNotice($("#case-form-message"), "");
    return true;
  }

  function renderCaseReview() {
    const type = CASE_TYPES[state.selectedCaseType] || CASE_TYPES.general;
    $("#case-review").innerHTML = `
      <div class="review-row"><small>Tipo</small><strong>${escapeHtml(type.label)}</strong></div>
      <div class="review-row"><small>Título</small><strong>${escapeHtml($("#case-title").value.trim())}</strong></div>
      <div class="review-row"><small>Contexto</small><p>${escapeHtml($("#case-context").value.trim() || "Sin contexto adicional")}</p></div>
      <div class="review-row"><small>Información inicial</small><p>${escapeHtml($("#case-details").value.trim() || "Sin información adicional")}</p></div>`;
  }

  async function submitCase(event) {
    event.preventDefault();
    if (!$("#case-confirm").checked) {
      setNotice($("#case-form-message"), "Confirma que la información está anonimizada.", true);
      return;
    }
    const type = CASE_TYPES[state.selectedCaseType] || CASE_TYPES.general;
    const button = $("#case-save");
    button.disabled = true;
    button.textContent = "Guardando…";
    try {
      await createCase({
        workspace: type.workspace,
        caseType: type.caseType,
        title: $("#case-title").value.trim(),
        context: $("#case-context").value.trim(),
        details: $("#case-details").value.trim()
      });
      closeCaseDialog();
      renderContinue();
      renderWorkspaces();
      renderCases();
      activateView("cases");
      showToast("Caso guardado correctamente.");
    } catch (error) {
      setNotice($("#case-form-message"), error.message || "No fue posible guardar el caso.", true);
    } finally {
      button.disabled = false;
      button.textContent = "Guardar caso";
    }
  }

  function openMobileMenu() {
    $("#sidebar").classList.add("open");
    $("#mobile-overlay").hidden = false;
    $("#menu-toggle").setAttribute("aria-expanded", "true");
  }

  function closeMobileMenu() {
    $("#sidebar").classList.remove("open");
    $("#mobile-overlay").hidden = true;
    $("#menu-toggle").setAttribute("aria-expanded", "false");
  }

  function bindDynamicActions(root = document) {
    $$('[data-view-link]', root).forEach((button) => button.addEventListener("click", (event) => {
      event.preventDefault();
      activateView(button.dataset.viewLink);
    }));
    $$('[data-new-case]', root).forEach((button) => button.addEventListener("click", () => openCaseDialog()));
  }

  function bindEvents() {
    bindNavigation();
    $("#login-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = $("#login-email").value.trim().toLowerCase();
      const password = $("#login-password").value;
      const button = $("#login-submit");
      setNotice($("#auth-message"), "");
      button.disabled = true;
      button.textContent = "Verificando…";
      try {
        await login(email, password);
        await launchApp();
      } catch (error) {
        setNotice($("#auth-message"), error.message || "No fue posible ingresar.", true);
      } finally {
        button.disabled = false;
        button.textContent = "Ingresar a KineCheck";
      }
    });
    $("#logout-button").addEventListener("click", logout);
    $("#theme-toggle").addEventListener("click", async () => {
      const next = document.body.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      await savePreferences({ theme: next }).catch(() => showToast("La apariencia cambió solo en este dispositivo."));
    });
    $$('[data-theme-choice]').forEach((button) => button.addEventListener("click", async () => {
      applyTheme(button.dataset.themeChoice);
      await savePreferences({ theme: button.dataset.themeChoice }).catch((error) => showToast(error.message));
    }));
    $("#workspace-select").addEventListener("change", async (event) => {
      await savePreferences({ active_workspace: event.target.value }).catch((error) => showToast(error.message));
      renderWorkspaceSelect();
      renderTasks();
      showToast(`Espacio ${WORKSPACES[event.target.value]?.label || "General"} seleccionado.`);
    });
    $("#quick-create").addEventListener("click", () => openCaseDialog());
    $("#menu-toggle").addEventListener("click", () => $("#sidebar").classList.contains("open") ? closeMobileMenu() : openMobileMenu());
    $("#mobile-overlay").addEventListener("click", closeMobileMenu);
    $("#case-search").addEventListener("input", renderCases);
    $("#library-search").addEventListener("input", renderLibrary);
    $$('[data-case-filter]').forEach((button) => button.addEventListener("click", () => {
      state.caseFilter = button.dataset.caseFilter;
      $$('[data-case-filter]').forEach((item) => item.classList.toggle("active", item === button));
      renderCases();
    }));
    $$('[data-library-filter]').forEach((button) => button.addEventListener("click", () => {
      state.libraryFilter = button.dataset.libraryFilter;
      $$('[data-library-filter]').forEach((item) => item.classList.toggle("active", item === button));
      renderLibrary();
    }));
    $("#case-next").addEventListener("click", () => {
      if (!validateWizardStep()) return;
      state.wizardStep = Math.min(4, state.wizardStep + 1);
      updateWizard();
    });
    $("#case-back").addEventListener("click", () => { state.wizardStep = Math.max(1, state.wizardStep - 1); updateWizard(); });
    $$('[data-dialog-close]').forEach((button) => button.addEventListener("click", closeCaseDialog));
    $("#case-form").addEventListener("submit", submitCase);
  }

  async function launchApp() {
    if (!state.user && !await resolveUser()) throw new Error("Tu sesión expiró. Ingresa nuevamente.");
    await Promise.all([
      loadAccess(),
      loadPreferences(),
      loadCases()
    ]);
    state.preferences.active_workspace = defaultWorkspace();
    $("#auth-view").hidden = true;
    $("#app-view").hidden = false;
    renderAll();
    activateView(location.hash || "home", false);
  }

  async function init() {
    bindEvents();
    state.session = readSession();
    const fallbackTheme = localStorage.getItem("kinecheck_platform_theme") || "system";
    applyTheme(fallbackTheme);
    if (!state.session) return;
    try {
      if (!await resolveUser()) throw new Error("Sesión vencida");
      await launchApp();
    } catch {
      localStorage.removeItem(CONFIG.sessionKey);
      state.session = null;
      state.user = null;
      setNotice($("#auth-message"), "Tu sesión anterior finalizó. Ingresa nuevamente.");
    }
  }

  init();
})();
