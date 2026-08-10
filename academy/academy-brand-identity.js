(() => {
  "use strict";

  const BRAND_NAME = "Mi KineCheck";
  const BRAND_DESCRIPTOR = "UN SOLO ACCESO";

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element && element.textContent !== value) element.textContent = value;
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

    const topbarBrand = document.querySelector(".topbar-brand");
    if (topbarBrand) topbarBrand.setAttribute("aria-label", `${BRAND_NAME}, inicio`);

    const onboardingAction = document.querySelector("#onboarding-action");
    if (onboardingAction) {
      onboardingAction.setAttribute("data-kc-view-link", "biblioteca");
      onboardingAction.setAttribute("aria-label", "Ver mis productos");
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyIdentity, { once: true });
  } else {
    applyIdentity();
  }
})();
