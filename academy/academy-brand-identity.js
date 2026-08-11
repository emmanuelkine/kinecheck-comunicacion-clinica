(() => {
  "use strict";

  const BRAND_NAME = "Mi KineCheck";
  const BRAND_DESCRIPTOR = "UN SOLO ACCESO";

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element && element.textContent !== value) element.textContent = value;
  }

  function setNavigationLabels() {
    document.querySelectorAll('[data-kc-view-link="inicio"]').forEach((item) => {
      const label = item.querySelector("b") || item.querySelector("span:last-child") || item;
      if (label && label.textContent.trim() !== "Inicio") label.textContent = "Inicio";
    });
    document.querySelectorAll('[data-kc-view-link="biblioteca"]').forEach((item) => {
      const label = item.querySelector("b") || item.querySelector("span:last-child") || item;
      if (label && !item.hasAttribute("data-kc-scroll-target")) label.textContent = "Biblioteca";
    });
    document.querySelectorAll('[data-kc-view-link="herramientas"]').forEach((item) => {
      const label = item.querySelector("b") || item.querySelector("span:last-child") || item;
      if (label) label.textContent = "Recursos";
    });
    document.querySelectorAll('[data-kc-view-link="perfil"]').forEach((item) => {
      const label = item.querySelector("b") || item.querySelector("span:last-child") || item;
      if (label) label.textContent = "Cuenta y ayuda";
    });
  }

  function activateInicioAfterLogin() {
    const previousUrl = window.location.href;
    const nextUrl = new URL(previousUrl);
    nextUrl.hash = "inicio";

    try {
      window.history.replaceState(window.history.state, "", nextUrl.href);
    } catch {
      window.location.hash = "inicio";
      return;
    }

    // Fallback visual inmediato; el controlador principal confirma el estado
    // al recibir hashchange y conserva toda la navegación nativa de Academy.
    document.body.dataset.kcView = "inicio";
    document.querySelectorAll("[data-kc-view-link]").forEach((item) => {
      item.classList.toggle("active", item.dataset.kcViewLink === "inicio");
    });

    try {
      window.dispatchEvent(new HashChangeEvent("hashchange", {
        oldURL: previousUrl,
        newURL: nextUrl.href,
      }));
    } catch {
      window.dispatchEvent(new Event("hashchange"));
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function wireLoginHomeRedirect() {
    if (window.__KINECHECK_LOGIN_HOME_REDIRECT__) return;
    window.__KINECHECK_LOGIN_HOME_REDIRECT__ = true;

    const form = document.querySelector("#auth-form");
    const dashboard = document.querySelector("#dashboard-view");
    if (!form || !dashboard) return;

    let explicitLoginPending = false;

    // Solo un envío explícito del formulario activa esta regla. Entrar después
    // mediante enlaces directos o recargar una vista interna conserva su hash.
    form.addEventListener("submit", () => {
      explicitLoginPending = true;
    }, { capture: true });

    const observer = new MutationObserver(() => {
      if (!explicitLoginPending || dashboard.hidden) return;
      explicitLoginPending = false;
      activateInicioAfterLogin();
    });

    observer.observe(dashboard, {
      attributes: true,
      attributeFilter: ["hidden"],
    });
  }

  function applyIdentity() {
    document.title = BRAND_NAME;

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        "content",
        "Mi KineCheck: una sola entrada para acceder a tus cursos y herramientas activas.",
      );
    }

    setText(".login-showcase .brand > div > span", "UNA CUENTA · UN ACCESO");
    setText(".login-showcase > .eyebrow", "MI KINECHECK");

    const loginTitle = document.querySelector("#login-title");
    const loginHtml = "Entra una vez.<br><em>Continúa desde aquí.</em>";
    if (loginTitle && loginTitle.innerHTML !== loginHtml) loginTitle.innerHTML = loginHtml;

    setText(".mobile-brand > div > span", "UN SOLO ACCESO");
    setText(".sidebar-brand > div > span", BRAND_DESCRIPTOR);
    setText(".topbar-brand > div > span", BRAND_DESCRIPTOR);
    setText(".kc-home-hero > .eyebrow", "MI KINECHECK");
    setNavigationLabels();
    wireLoginHomeRedirect();

    const topbarBrand = document.querySelector(".topbar-brand");
    if (topbarBrand) topbarBrand.setAttribute("aria-label", `${BRAND_NAME}, inicio`);

    const onboardingAction = document.querySelector("#onboarding-action");
    if (onboardingAction) {
      onboardingAction.setAttribute("data-kc-view-link", "biblioteca");
      onboardingAction.setAttribute("aria-label", "Ver biblioteca");
      onboardingAction.textContent = "Ver biblioteca";
    }

    const catalogButton = document.querySelector(".kc-catalog-button");
    if (catalogButton) catalogButton.setAttribute("href", "../#productos");

    document.querySelectorAll('a[hidden][aria-hidden="true"]:empty').forEach((anchor) => anchor.remove());

    const loginCard = document.querySelector(".login-card");
    if (loginCard && !document.querySelector("#purchase-access-help")) {
      const help = document.createElement("details");
      help.id = "purchase-access-help";
      help.className = "kc-purchase-access-help";
      help.innerHTML = `
        <summary>Compré y todavía no aparece mi acceso</summary>
        <div>
          <p>Primero confirma que estás usando el mismo correo utilizado en Hotmart. La activación puede tardar unos minutos mientras se procesa la compra.</p>
          <p>Si el acceso sigue sin aparecer, contacta a soporte e incluye el correo de compra y el código de transacción de Hotmart.</p>
          <p><strong>No envíes contraseñas, datos clínicos ni información sensible.</strong></p>
          <a href="mailto:soporte.kinecheck@gmail.com?subject=Compra%20Hotmart%20sin%20acceso%20en%20KineCheck">Contactar soporte por una compra</a>
        </div>
      `;
      const support = loginCard.querySelector(".support-link");
      if (support) support.before(help);
      else loginCard.appendChild(help);
    }

    const footerCopyright = document.querySelector(".academy-footer > span:first-child");
    if (footerCopyright) {
      const year = document.querySelector("#current-year")?.textContent || String(new Date().getFullYear());
      const copy = `© <span id="current-year">${year}</span> KineCheck`;
      if (footerCopyright.innerHTML !== copy) footerCopyright.innerHTML = copy;
    }
  }

  // Estabilidad primero: Academy ya incluye su núcleo funcional en index.html.
  // No se inyectan aquí routers, observers, capas visuales ni controladores
  // adicionales que puedan competir por los mismos clics o bloquear el scroll.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyIdentity, { once: true });
  } else {
    applyIdentity();
  }
})();
