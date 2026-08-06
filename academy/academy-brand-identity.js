(() => {
  "use strict";

  const BRAND_NAME = "Mi KineCheck";
  const BRAND_DESCRIPTOR = "UN SOLO ACCESO";

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element && element.textContent !== value) element.textContent = value;
  }

  function loadScript(path, marker, version) {
    if (document.querySelector(`script[${marker}]`)) return;
    const script = document.createElement("script");
    script.src = `${path}?v=${version}`;
    script.async = false;
    script.setAttribute(marker, "true");
    document.head.appendChild(script);
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

    const footerCopyright = document.querySelector(".academy-footer > span:first-child");
    if (footerCopyright) {
      const year = document.querySelector("#current-year")?.textContent || String(new Date().getFullYear());
      const copy = `© <span id="current-year">${year}</span> KineCheck`;
      if (footerCopyright.innerHTML !== copy) footerCopyright.innerHTML = copy;
    }
  }

  loadScript("../metrics-v1.js", "data-kc-launch-metrics", "20260806-launch-metrics1");
  loadScript("./mi-kinecheck-v1.js", "data-mi-kinecheck", "20260806-unified1");
  loadScript("./mi-kinecheck-card-copy-v1.js", "data-mi-kinecheck-card-copy", "20260806-unified1");
  loadScript("./mi-kinecheck-simplify-v2.js", "data-mi-kinecheck-simplify-v2", "20260806-simplified3");

  // El controlador de recomendaciones se registra primero para que los botones
  // dinámicos no dependan de clics simulados sobre tarjetas ocultas.
  loadScript("./academy-recommended-buttons-fix.js", "data-kc-recommended-buttons-fix", "20260806-final5");
  loadScript("./academy-open-v6.js", "data-kc-open-v6", "20260806-final5");
  loadScript("./academy-clinico-course-v1.js", "data-kc-clinico-course", "20260806-final5");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyIdentity, { once: true });
  } else {
    applyIdentity();
  }
})();
