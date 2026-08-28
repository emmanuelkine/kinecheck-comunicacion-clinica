(() => {
  const CONFIG = window.KINECHECK_ACADEMY_CONFIG;
  if (!CONFIG) return;

  const SESSION_KEY = "kinecheck_secure_session_v1";
  const VIEW_NAMES = new Set(["inicio", "biblioteca", "herramientas", "perfil", "explorar"]);
  const accessCache = new Map();
  let pendingScrollTarget = "";
  let recoveryToken = "";
  let renderTimer = 0;
  let lastHandledLocation = "";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function session() {
    const provided = window.KINECHECK_ACADEMY_SESSION?.get?.();
    if (provided?.access_token) return provided;
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function productType(course) {
    if (course.kind === "course") return "Curso";
    if (course.kind === "tool") return "Herramienta";
    return "Aplicación";
  }

  function statusFromCard(course) {
    const card = document.querySelector(`[data-card-course="${CSS.escape(course.slug)}"]`);
    if (!card) return accessCache.get(course.slug) || "checking";
    const button = card.querySelector("[data-course]");
    const badge = card.querySelector(".status-badge")?.textContent?.trim().toLowerCase() || "";
    let status = "locked";
    if (button && !button.disabled) status = "owned";
    else if (badge.includes("verificando")) status = "checking";
    else if (badge.includes("próximamente")) status = "preparing";
    accessCache.set(course.slug, status);
    return status;
  }

  function statusLabel(status) {
    if (status === "owned") return "Activo";
    if (status === "preparing") return "Próximamente";
    if (status === "checking") return "Verificando";
    return "No adquirido";
  }

  function displayName() {
    const email = String(session()?.user?.email || "").trim().toLowerCase();
    if (email.includes("emmanuel")) return "Emmanuel";
    const local = email.split("@")[0].split(/[+._-]/)[0] || "";
    return local ? `${local.charAt(0).toUpperCase()}${local.slice(1)}` : "Bienvenido";
  }

  function showToast(text) {
    const toast = $("#kc-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3200);
  }

  function normalizedView(value) {
    const raw = String(value || "").replace(/^#/, "").toLowerCase();
    if (["productos", "recursos", "evidencia-semanal", "mis-cursos"].includes(raw)) return "biblioteca";
    if (["cuenta", "mi-cuenta"].includes(raw)) return "perfil";
    return VIEW_NAMES.has(raw) ? raw : "inicio";
  }

  function isAuthFragment(value = "") {
    const fragment = String(value || "").replace(/^#/, "");
    if (!fragment) return false;
    const params = new URLSearchParams(fragment);
    return params.has("access_token")
      || params.has("refresh_token")
      || params.has("error")
      || params.has("error_description")
      || params.get("type") === "recovery";
  }

  function currentLocationKey() {
  return `${location.pathname}${location.search}${location.hash}`;
}

function markLocationHandled() {
  lastHandledLocation = currentLocationKey();
}

function applyHash(next, historyMode = "replace") {
  const targetHash = `#${next}`;
  if (location.hash === targetHash) {
    markLocationHandled();
    return;
  }
  if (historyMode === "push") {
    history.pushState(null, "", targetHash);
  } else {
    history.replaceState(null, "", targetHash);
  }
  markLocationHandled();
}

  function activateView(view, options = {}) {
    const next = normalizedView(view);
    document.body.dataset.kcView = next;
    $$('[data-kc-view-link]').forEach((link) => {
      link.classList.toggle("active", link.dataset.kcViewLink === next);
    });

    if (options.updateHash !== false) {
      applyHash(next, options.historyMode || "replace");
    }

    if (next === "biblioteca") {
      markEvidenceSection();
    }

    window.requestAnimationFrame(() => {
      if (pendingScrollTarget) {
        document.getElementById(pendingScrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
        pendingScrollTarget = "";
      } else if (options.scroll !== false) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  function restoreViewFromLocation(options = {}) {
  const currentHash = String(location.hash || "");
  if (isAuthFragment(currentHash)) {
    markLocationHandled();
    return;
  }

  const raw = currentHash.replace(/^#/, "").toLowerCase();
  const legacyAliases = new Set(["productos", "recursos", "evidencia-semanal", "mis-cursos", "cuenta", "mi-cuenta"]);
  const isValidHash = VIEW_NAMES.has(raw) || legacyAliases.has(raw);

  if (!isValidHash) {
    if (location.hash !== "#inicio") {
      history.replaceState(null, "", "#inicio");
    }
    activateView("inicio", { ...options, updateHash: false, historyMode: options.historyMode || "replace" });
    markLocationHandled();
    return;
  }

  const next = normalizedView(currentHash);
  const targetHash = `#${next}`;
  if (location.hash !== targetHash) {
    history.replaceState(null, "", targetHash);
  }

  activateView(next, { ...options, updateHash: false, historyMode: options.historyMode || "replace" });
  markLocationHandled();
}

function handleLocationNavigation(source) {
  if (currentLocationKey() === lastHandledLocation) return;
  if (!parseRecoveryCallback()) {
    restoreViewFromLocation({ updateHash: false, source });
  } else {
    markLocationHandled();
  }
}

  function markEvidenceSection() {
    const evidence = $("#evidencia-semanal");
    if (evidence) evidence.dataset.kcSection = "biblioteca";
  }

  function proxyCardMarkup(course, status, compact = false) {
    const owned = status === "owned";
    const action = owned
      ? `<button type="button" data-kc-open-product="${escapeHtml(course.slug)}">${course.kind === "course" ? "Continuar" : "Abrir"}</button>`
      : status === "preparing"
        ? '<button type="button" class="secondary" disabled>Próximamente</button>'
        : `<button type="button" class="secondary" data-kc-explore-product="${escapeHtml(course.slug)}">Conocer</button>`;
    return `
      <article class="kc-summary-card ${compact ? "compact" : ""}">
        <div class="kc-summary-top">
          <span class="kc-summary-icon">${escapeHtml(course.icon || "KC")}</span>
          <span class="kc-status ${status}">${statusLabel(status)}</span>
        </div>
        <div><small>${escapeHtml(productType(course))}</small><h3>${escapeHtml(course.title)}</h3></div>
        <p>${escapeHtml(course.subtitle || "Producto KineCheck")}</p>
        ${action}
      </article>
    `;
  }

  function renderHomeApplications() {
    const container = $("[data-kc-home-apps-grid]");
    if (!container) return;
    const applications = CONFIG.courses.filter((course) => course.kind === "application");
    const owned = applications.filter((course) => statusFromCard(course) === "owned");
    const checking = applications.some((course) => statusFromCard(course) === "checking");
    if (checking && !owned.length) {
      container.innerHTML = '<div class="kc-empty-state">Verificando tus aplicaciones…</div>';
      return;
    }
    container.innerHTML = owned.length
      ? owned.map((course) => proxyCardMarkup(course, "owned", true)).join("")
      : '<div class="kc-empty-state">Aún no tienes aplicaciones activas. <button type="button" data-kc-view-link="explorar">Explorar KineCheck</button></div>';
  }

  function renderHomeCourses() {
    const container = $("[data-kc-home-courses-grid]");
    if (!container) return;
    const courses = CONFIG.courses.filter((course) => course.kind === "course");
    const owned = courses.filter((course) => statusFromCard(course) === "owned");
    const checking = courses.some((course) => statusFromCard(course) === "checking");
    if (checking && !owned.length) {
      container.innerHTML = '<div class="kc-empty-state">Verificando tus cursos…</div>';
      return;
    }
    container.innerHTML = owned.length
      ? owned.slice(0, 6).map((course) => proxyCardMarkup(course, "owned", true)).join("")
      : '<div class="kc-empty-state">Aún no tienes cursos activos. <button type="button" data-kc-view-link="explorar">Explorar cursos</button></div>';
  }

  function renderTools() {
    const container = $("#tools-grid");
    if (!container) return;
    const tools = CONFIG.courses.filter((course) => course.kind === "application" || course.kind === "tool");
    container.innerHTML = tools.map((course) => proxyCardMarkup(course, statusFromCard(course))).join("");
  }

  function renderLicenses() {
    const licenses = $("#license-grid");
    const purchases = $("#purchase-grid");
    if (!licenses || !purchases) return;
    const owned = CONFIG.courses.filter((course) => statusFromCard(course) === "owned");
    const checking = CONFIG.courses.some((course) => statusFromCard(course) === "checking");
    if (checking && !owned.length) {
      licenses.innerHTML = '<div class="kc-empty-state">Verificando licencias…</div>';
      purchases.innerHTML = '<div class="kc-empty-state">Verificando productos…</div>';
      return;
    }
    licenses.innerHTML = owned.length
      ? owned.map((course) => `
        <article class="kc-license-card">
          <span class="kc-status">Activa</span>
          <small>${escapeHtml(productType(course))}</small>
          <h3>${escapeHtml(course.title)}</h3>
          <p>${escapeHtml(course.subtitle || "Acceso KineCheck")}</p>
          <div class="kc-license-meta"><span>Vigencia</span><strong>Según tu compra</strong></div>
        </article>
      `).join("")
      : '<div class="kc-empty-state">No encontramos licencias activas para esta cuenta.</div>';
    purchases.innerHTML = owned.length
      ? owned.map((course) => `
        <article class="kc-purchase-card">
          <small>${escapeHtml(productType(course))}</small>
          <h3>${escapeHtml(course.title)}</h3>
          <p>Producto asociado a tu cuenta KineCheck.</p>
          <span class="kc-status">Acceso verificado</span>
        </article>
      `).join("")
      : '<div class="kc-empty-state">Tus productos comprados aparecerán aquí cuando Hotmart sincronice el acceso.</div>';
  }

  function renderExplore() {
    const container = $("#explore-grid");
    if (!container) return;
    const notOwned = CONFIG.courses.filter((course) => statusFromCard(course) !== "owned");
    container.innerHTML = notOwned.length
      ? notOwned.map((course) => proxyCardMarkup(course, statusFromCard(course))).join("")
      : '<div class="kc-empty-state">Ya tienes acceso a todos los productos publicados.</div>';
  }

  function refreshAll() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(() => {
      const welcome = $("#kc-welcome-name");
      if (welcome) welcome.textContent = `Bienvenido, ${displayName()}`;
      renderHomeApplications();
      renderHomeCourses();
      renderTools();
      renderLicenses();
      renderExplore();
      markEvidenceSection();
    }, 40);
  }

  function openProduct(slug) {
    const launcher = window.KineCheckAcademyLauncher;
    if (launcher?.open?.(slug)) return;
    showToast("No fue posible abrir este producto. Revisa tu licencia o vuelve a intentarlo.");
  }

  function showAuthPanel(name) {
    const panels = {
      default: $("#auth-default-panel"),
      request: $("#recovery-request-panel"),
      update: $("#recovery-update-panel"),
    };
    Object.entries(panels).forEach(([key, panel]) => {
      if (panel) panel.hidden = key !== name;
    });
  }

  function authHeaders(token = "") {
    const headers = {
      apikey: CONFIG.supabaseAnonKey,
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function sendRecovery(email) {
    const redirectTo = `${location.origin}${location.pathname}`;
    const url = new URL(`${CONFIG.supabaseUrl}/auth/v1/recover`);
    url.searchParams.set("redirect_to", redirectTo);
    const response = await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error_description || data.msg || data.message || "No fue posible enviar el enlace.");
  }

  function parseRecoveryCallback() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    if (params.get("type") !== "recovery" || !params.get("access_token")) return false;
    recoveryToken = params.get("access_token");
    showAuthPanel("update");
    return true;
  }

  async function updatePassword(password) {
    const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: authHeaders(recoveryToken),
      body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error_description || data.msg || data.message || "No fue posible actualizar la contraseña.");
    return data;
  }

  function wireRecovery() {
    $("#forgot-password")?.addEventListener("click", () => {
      const currentEmail = $("#email")?.value || session()?.user?.email || "";
      if ($("#recovery-email")) $("#recovery-email").value = currentEmail;
      showAuthPanel("request");
    });
    $$('[data-recovery-back]').forEach((button) => button.addEventListener("click", () => showAuthPanel("default")));

    $("#recovery-request-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = String($("#recovery-email")?.value || "").trim().toLowerCase();
      const message = $("#recovery-request-message");
      if (!email || !message) return;
      message.hidden = false;
      message.className = "notice";
      message.textContent = "Enviando enlace seguro…";
      try {
        await sendRecovery(email);
        message.textContent = "Revisa tu correo. Te enviamos un enlace para crear una nueva contraseña.";
      } catch (error) {
        message.className = "notice error";
        message.textContent = error.message;
      }
    });

    $("#recovery-update-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = String($("#new-password")?.value || "");
      const confirmation = String($("#new-password-confirm")?.value || "");
      const message = $("#recovery-update-message");
      if (!message) return;
      message.hidden = false;
      if (password.length < 8 || password !== confirmation) {
        message.className = "notice error";
        message.textContent = password.length < 8
          ? "La contraseña debe tener al menos 8 caracteres."
          : "Las contraseñas no coinciden.";
        return;
      }
      message.className = "notice";
      message.textContent = "Guardando nueva contraseña…";
      try {
        await updatePassword(password);
        recoveryToken = "";
        history.replaceState(null, "", location.pathname + location.search);
        showAuthPanel("default");
        const authMessage = $("#auth-message");
        if (authMessage) {
          authMessage.hidden = false;
          authMessage.className = "notice";
          authMessage.textContent = "Contraseña actualizada. Ya puedes ingresar a KineCheck.";
        }
      } catch (error) {
        message.className = "notice error";
        message.textContent = error.message;
      }
    });

    $("#profile-password-reset")?.addEventListener("click", async () => {
      const email = session()?.user?.email;
      if (!email) return;
      try {
        await sendRecovery(email);
        showToast("Enviamos un enlace de cambio de contraseña a tu correo.");
      } catch (error) {
        showToast(error.message);
      }
    });
  }

  function wireNavigation() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-kc-view-link]");
      if (link) {
        event.preventDefault();
        pendingScrollTarget = link.dataset.kcScrollTarget || "";
        activateView(link.dataset.kcViewLink, { historyMode: "push" });
        document.querySelector("#academy-sidebar")?.classList.remove("open");
        const overlay = $("#sidebar-overlay");
        if (overlay) overlay.hidden = true;
        $("#mobile-menu")?.setAttribute("aria-expanded", "false");
        return;
      }

      const scroll = event.target.closest("[data-kc-scroll-target]");
      if (scroll) {
        event.preventDefault();
        pendingScrollTarget = scroll.dataset.kcScrollTarget;
        activateView("biblioteca", { historyMode: "push" });
        return;
      }

      const open = event.target.closest("[data-kc-open-product]");
      if (open) {
        openProduct(open.dataset.kcOpenProduct);
        return;
      }

      const explore = event.target.closest("[data-kc-explore-product]");
      if (explore) {
        activateView("explorar", { historyMode: "push" });
        return;
      }

      const comingSoon = event.target.closest("[data-kc-coming-soon]");
      if (comingSoon) {
        showToast("Esta sección está preparada para una próxima actualización de KineCheck.");
      }
    });

    window.addEventListener("hashchange", () => {
    handleLocationNavigation("hashchange");
  });

  window.addEventListener("popstate", () => {
    handleLocationNavigation("popstate");
  });

    $("#kc-home-continue")?.addEventListener("click", () => {
      if (!$("#continue-button")?.hidden) $("#continue-button").click();
      else activateView("biblioteca", { historyMode: "push" });
    });
  }

  function observeCoreState() {
    const grid = $("#course-grid");
    if (grid) {
      new MutationObserver(refreshAll).observe(grid, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled", "class"],
      });
    }

    const dashboard = $("#dashboard-view");
    if (dashboard) {
      new MutationObserver(refreshAll).observe(dashboard, {
        attributes: true,
        attributeFilter: ["hidden"],
      });
    }

    const main = $("#contenido-principal");
    if (main) {
      new MutationObserver(() => {
        markEvidenceSection();
      }).observe(main, { childList: true });
    }
  }

  function init() {
    const isRecovery = parseRecoveryCallback();
    wireRecovery();
    wireNavigation();
    observeCoreState();
    if (!isRecovery) restoreViewFromLocation({ updateHash: false, scroll: false });
    refreshAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
