(() => {
  "use strict";

  const CONFIG = window.KINECHECK_ACADEMY_CONFIG;
  if (!CONFIG || window.__KINECHECK_ACCESS_RECOVERY_V1__) return;
  window.__KINECHECK_ACCESS_RECOVERY_V1__ = true;

  const LOCKED_LABEL = "No disponible en tu cuenta";
  const RETRY_LABEL = "Verificar acceso";
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const LOGIN_RELOAD_GUARD_KEY = "kinecheck_login_reload_once_v1";
  const SSO_ENDPOINT = `${String(CONFIG.appSso?.baseUrl || "https://kinecheck-clinico.emmanuelkine.chatgpt.site").replace(/\/$/, "")}${CONFIG.appSso?.postPath || "/api/license/sso"}`;
  const SSO_HANDOFF_TYPE = CONFIG.appSso?.handoffType || "kinecheck-sso-v3-access-only";

  const PREPARING_PRODUCTS = Object.freeze({
    "ejercicio-terapeutico": Object.freeze({
      badge: "PRÓXIMAMENTE",
      meta: "Próximo lanzamiento · curso en revisión",
      lockedLabel: "Próximamente",
      reviewLabel: "Abrir versión de revisión",
    }),
    "banderas-clinicas": Object.freeze({
      badge: "EN CONSTRUCCIÓN",
      meta: "Próximo lanzamiento · contenido en desarrollo",
      lockedLabel: "En construcción",
      reviewLabel: "Abrir versión de revisión",
    }),
  });

  const CATALOG_EXTENSION = Object.freeze([
    Object.freeze({
      slug: "dolor-lumbar-persistente",
      icon: "DL",
      title: "Dolor Lumbar Persistente",
      status: "Disponible",
      summary: "Razonamiento clínico, PROMs, evidencia, casos y progresión.",
      href: "../productos/dolor-lumbar-persistente/",
    }),
    Object.freeze({
      slug: "dolor-musculoesqueletico",
      icon: "DM",
      title: "Dolor Musculoesquelético",
      status: "Disponible",
      summary: "Ciencia del dolor, fenotipos, evaluación, PROMs y decisión clínica.",
      href: "../productos/dolor-musculoesqueletico/",
    }),
    Object.freeze({
      slug: "banderas-clinicas",
      icon: "BC",
      title: "KineCheck Banderas Clínicas",
      status: "En construcción",
      summary: "Screening, riesgo, banderas clínicas y toma de decisiones musculoesqueléticas.",
      href: "../productos/banderas-clinicas/",
    }),
  ]);

  let readinessFrame = 0;

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

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function setAttributeIfChanged(node, name, value) {
    if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
  }

  function showLibraryMessage(text, error = false) {
    const message = document.querySelector("#library-message");
    if (!message) return;
    setText(message, text);
    const className = error ? "notice error" : "notice";
    if (message.className !== className) message.className = className;
    if (message.hidden) message.hidden = false;
    message.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function submitSsoAccess(session, product) {
    const accessToken = String(session?.access_token || "");
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = accessTokenExpiry(accessToken) || Number(session?.expires_at || 0);
    if (!accessToken || expiresAt <= issuedAt) {
      throw new Error("La sesión venció. Ingresa nuevamente para abrir esta aplicación.");
    }

    const form = document.createElement("form");
    form.method = "post";
    form.action = SSO_ENDPOINT;
    form.enctype = "application/x-www-form-urlencoded";
    form.hidden = true;

    const fields = {
      product,
      access_token: accessToken,
      expires_at: String(expiresAt),
      issued_at: String(issuedAt),
      handoff_type: SSO_HANDOFF_TYPE,
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  function decoratePreparingProducts(root = document) {
    Object.entries(PREPARING_PRODUCTS).forEach(([slug, readiness]) => {
      const card = root.querySelector?.(`[data-card-course="${slug}"]`);
      if (!card) return;

      const badge = card.querySelector(".status-badge");
      if (badge && /verificando/i.test(String(badge.textContent || ""))) return;

      if (badge) {
        setText(badge, readiness.badge);
        if (!badge.classList.contains("preparing")) badge.classList.add("preparing");
      }

      setText(card.querySelector(".course-meta"), readiness.meta);

      const button = card.querySelector(`button[data-course="${slug}"]`);
      if (!button) return;

      const retry = button.nextElementSibling?.matches?.("[data-kc-retry-access]")
        ? button.nextElementSibling
        : null;
      if (retry) retry.remove();

      if (button.hidden) button.hidden = false;
      const label = button.disabled ? readiness.lockedLabel : readiness.reviewLabel;
      setText(button, label);
      if (button.dataset.kcReadiness !== "preparing") button.dataset.kcReadiness = "preparing";
      setAttributeIfChanged(button, "aria-label", `${card.querySelector("h3")?.textContent || slug}: ${label}`);
    });
  }

  function installRetryButtons(root = document) {
    decoratePreparingProducts(root);

    root.querySelectorAll?.("button[data-course][disabled]").forEach((original) => {
      const slug = String(original.dataset.course || "").trim();
      if (PREPARING_PRODUCTS[slug]) return;
      if (original.textContent.trim() !== LOCKED_LABEL) return;
      if (original.nextElementSibling?.matches?.("[data-kc-retry-access]")) return;

      if (!original.hidden) original.hidden = true;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = original.className;
      retry.dataset.kcRetryAccess = original.dataset.course;
      retry.textContent = RETRY_LABEL;
      original.insertAdjacentElement("afterend", retry);
    });
  }

  function scheduleReadiness(grid) {
    if (readinessFrame) return;
    readinessFrame = window.requestAnimationFrame(() => {
      readinessFrame = 0;
      installRetryButtons(grid);
    });
  }

  function installCatalogStyles() {
    if (document.querySelector("#kc-catalog-extension-styles")) return;
    const style = document.createElement("style");
    style.id = "kc-catalog-extension-styles";
    style.textContent = `
      .kc-catalog-extension{margin-top:18px;padding:18px;border:1px solid rgba(23,107,91,.18);border-radius:22px;background:rgba(255,255,255,.04)}
      .kc-catalog-extension-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px}
      .kc-catalog-extension-head span{color:#6fd9cf;font-size:.7rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      .kc-catalog-extension-head h3{margin:4px 0 0;color:inherit;font-size:1.05rem}
      .kc-catalog-extension-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .kc-catalog-extension-card{display:flex;flex-direction:column;gap:8px;min-height:150px;padding:14px;border:1px solid rgba(113,226,214,.16);border-radius:16px;background:rgba(5,32,40,.48);color:#eef8f9;text-decoration:none}
      .kc-catalog-extension-card:hover{border-color:rgba(113,226,214,.42);transform:translateY(-1px)}
      .kc-catalog-extension-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .kc-catalog-extension-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#53dbd5,#72d9ba);color:#052a31;font-size:.7rem;font-weight:950}
      .kc-catalog-extension-status{padding:5px 8px;border-radius:999px;background:rgba(97,218,204,.1);border:1px solid rgba(97,218,204,.18);color:#8fe7dc;font-size:.65rem;font-weight:850}
      .kc-catalog-extension-card strong{font-size:.87rem;line-height:1.2}
      .kc-catalog-extension-card p{margin:0;color:#a9c1c6;font-size:.76rem;line-height:1.45}
      .kc-catalog-extension-card em{margin-top:auto;color:#7de1d5;font-size:.7rem;font-style:normal;font-weight:850}
      @media(max-width:760px){.kc-catalog-extension-grid{grid-template-columns:1fr}.kc-catalog-extension-card{min-height:0}}
    `;
    document.head.appendChild(style);
  }

  function installCatalogExtension() {
    if (document.querySelector("[data-kc-catalog-extension]")) return true;
    const explorer = document.querySelector(".kc-home-product-explorer");
    if (!explorer) return false;

    installCatalogStyles();
    const section = document.createElement("section");
    section.className = "kc-catalog-extension";
    section.dataset.kcCatalogExtension = "true";
    section.setAttribute("aria-label", "Nuevos productos KineCheck");
    section.innerHTML = `
      <div class="kc-catalog-extension-head">
        <div><span>NUEVOS EN KINECHECK</span><h3>También forman parte del ecosistema</h3></div>
      </div>
      <div class="kc-catalog-extension-grid">
        ${CATALOG_EXTENSION.map((product) => `
          <a class="kc-catalog-extension-card" href="${product.href}" data-kc-catalog-product="${product.slug}">
            <div class="kc-catalog-extension-top">
              <span class="kc-catalog-extension-icon" aria-hidden="true">${product.icon}</span>
              <span class="kc-catalog-extension-status">${product.status}</span>
            </div>
            <strong>${product.title}</strong>
            <p>${product.summary}</p>
            <em>Ver detalle →</em>
          </a>
        `).join("")}
      </div>
    `;
    explorer.insertAdjacentElement("afterend", section);
    return true;
  }

  async function retryAccess(button) {
    const slug = String(button.dataset.kcRetryAccess || "").trim();
    const course = CONFIG.courses.find((item) => item.slug === slug);
    if (!course) {
      showLibraryMessage("No fue posible identificar el producto solicitado.", true);
      return;
    }

    const previousLabel = button.textContent;
    button.disabled = true;
    setText(button, "Verificando acceso…");

    try {
      const sessionApi = window.KINECHECK_ACADEMY_SESSION;
      const refreshed = typeof sessionApi?.refresh === "function"
        ? await sessionApi.refresh().catch(() => null)
        : null;
      const session = refreshed || sessionApi?.get?.();
      if (!session?.access_token) {
        throw new Error("Tu sesión terminó. Ingresa nuevamente a KineCheck.");
      }

      if (course.ssoProduct) {
        submitSsoAccess(session, course.ssoProduct);
        return;
      }

      if (typeof window.openCourse !== "function") {
        throw new Error("No fue posible iniciar la verificación del producto.");
      }

      await window.openCourse(slug);
    } catch (error) {
      button.disabled = false;
      setText(button, previousLabel);
      showLibraryMessage(error?.message || "No fue posible verificar el acceso.", true);
    }
  }

  function installAuthStallGuard() {
    const authForm = document.querySelector("#auth-form");
    const progress = document.querySelector("#auth-progress");
    const message = document.querySelector("#auth-message");
    const dashboard = document.querySelector("#dashboard-view");
    if (!authForm || !progress || !message) return;

    let transitionTimer = 0;

    function freshStoredSession() {
      try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        const token = String(session?.access_token || "");
        const expiresAt = accessTokenExpiry(token) || Number(session?.expires_at || 0);
        if (!token || expiresAt <= Math.floor(Date.now() / 1000) + 30) return null;
        return session;
      } catch {
        return null;
      }
    }

    function recoverTransition() {
      window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(() => {
        if (progress.hidden || !authForm.hidden) return;

        if (freshStoredSession() && sessionStorage.getItem(LOGIN_RELOAD_GUARD_KEY) !== "1") {
          sessionStorage.setItem(LOGIN_RELOAD_GUARD_KEY, "1");
          window.location.replace("./#biblioteca");
          return;
        }

        progress.hidden = true;
        authForm.hidden = false;
        setText(message, "El ingreso está tardando más de lo normal. Revisa tu conexión y vuelve a pulsar Ingresar; no necesitas cambiar tu contraseña.");
        if (message.className !== "notice error") message.className = "notice error";
        if (message.hidden) message.hidden = false;
      }, 13000);
    }

    authForm.addEventListener("submit", () => {
      window.setTimeout(recoverTransition, 0);
    }, true);

    const observer = new MutationObserver(() => {
      if (!progress.hidden && authForm.hidden) recoverTransition();
      if (dashboard && !dashboard.hidden) {
        window.clearTimeout(transitionTimer);
        sessionStorage.removeItem(LOGIN_RELOAD_GUARD_KEY);
      }
    });
    observer.observe(progress, { attributes: true, attributeFilter: ["hidden"] });
    observer.observe(authForm, { attributes: true, attributeFilter: ["hidden"] });
    if (dashboard) observer.observe(dashboard, { attributes: true, attributeFilter: ["hidden"] });
  }

  function init() {
    installAuthStallGuard();

    const grid = document.querySelector("#course-grid");
    if (grid) {
      installRetryButtons(grid);
      new MutationObserver((records) => {
        const relevant = records.some((record) => (
          record.type === "childList"
          || (record.type === "attributes" && record.attributeName === "disabled")
        ));
        if (relevant) scheduleReadiness(grid);
      }).observe(grid, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled"],
      });

      grid.addEventListener("click", (event) => {
        const button = event.target.closest("[data-kc-retry-access]");
        if (!button) return;
        event.preventDefault();
        retryAccess(button);
      });
    }

    if (!installCatalogExtension()) {
      const catalogObserver = new MutationObserver(() => {
        if (installCatalogExtension()) catalogObserver.disconnect();
      });
      catalogObserver.observe(document.documentElement, { childList: true, subtree: true });
      window.setTimeout(() => catalogObserver.disconnect(), 10000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();