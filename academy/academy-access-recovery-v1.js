(() => {
  const CONFIG = window.KINECHECK_ACADEMY_CONFIG;
  if (!CONFIG || window.__KINECHECK_ACCESS_RECOVERY_V1__) return;
  window.__KINECHECK_ACCESS_RECOVERY_V1__ = true;

  const LOCKED_LABEL = "No disponible en tu cuenta";
  const RETRY_LABEL = "Verificar acceso";
  const SSO_ENDPOINT = `${String(CONFIG.appSso?.baseUrl || "https://kinecheck-clinico.emmanuelkine.chatgpt.site").replace(/\/$/, "")}${CONFIG.appSso?.postPath || "/api/license/sso"}`;
  const SSO_HANDOFF_TYPE = CONFIG.appSso?.handoffType || "kinecheck-sso-v3-access-only";

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

  function showLibraryMessage(text, error = false) {
    const message = document.querySelector("#library-message");
    if (!message) return;
    message.textContent = text;
    message.className = error ? "notice error" : "notice";
    message.hidden = false;
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

  function installRetryButtons(root = document) {
    root.querySelectorAll?.("#course-grid button[data-course][disabled]").forEach((original) => {
      if (original.textContent.trim() !== LOCKED_LABEL) return;
      if (original.nextElementSibling?.matches?.("[data-kc-retry-access]")) return;

      original.hidden = true;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = original.className;
      retry.dataset.kcRetryAccess = original.dataset.course;
      retry.textContent = RETRY_LABEL;
      original.insertAdjacentElement("afterend", retry);
    });
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
    button.textContent = "Verificando acceso…";

    try {
      const sessionApi = window.KINECHECK_ACADEMY_SESSION;
      const session = await sessionApi?.refresh?.().catch(() => null) || sessionApi?.get?.();
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
      button.textContent = previousLabel;
      showLibraryMessage(error?.message || "No fue posible verificar el acceso.", true);
    }
  }

  function init() {
    const grid = document.querySelector("#course-grid");
    if (!grid) return;

    installRetryButtons(grid);
    new MutationObserver(() => installRetryButtons(grid)).observe(grid, {
      childList: true,
      subtree: true,
    });

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-kc-retry-access]");
      if (!button) return;
      event.preventDefault();
      retryAccess(button);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
