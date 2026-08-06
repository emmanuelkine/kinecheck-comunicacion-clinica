(() => {
  "use strict";

  const BRAND_NAME = "KineCheck Ecosistema Clínico";
  const BRAND_DESCRIPTOR = "ECOSISTEMA CLÍNICO";

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
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
        "KineCheck Ecosistema Clínico: aplicaciones, cursos, evidencia y herramientas para kinesiología en una sola plataforma.",
      );
    }

    setText(".login-showcase .brand > div > span", "Ecosistema Clínico · aprendizaje, práctica y seguimiento");
    setText(".login-showcase > .eyebrow", "KINECHECK ECOSISTEMA CLÍNICO");

    const loginTitle = document.querySelector("#login-title");
    if (loginTitle) loginTitle.innerHTML = "Tu ecosistema clínico.<br><em>En un solo lugar.</em>";

    setText(".mobile-brand > div > span", "Ecosistema Clínico · acceso protegido");
    setText(".sidebar-brand > div > span", BRAND_DESCRIPTOR);
    setText(".topbar-brand > div > span", BRAND_DESCRIPTOR);
    setText(".kc-home-hero > .eyebrow", "TU ECOSISTEMA CLÍNICO");

    const topbarBrand = document.querySelector(".topbar-brand");
    if (topbarBrand) topbarBrand.setAttribute("aria-label", `${BRAND_NAME}, inicio`);

    const footerCopyright = document.querySelector(".academy-footer > span:first-child");
    if (footerCopyright) {
      const year = document.querySelector("#current-year")?.textContent || String(new Date().getFullYear());
      footerCopyright.innerHTML = `© <span id="current-year">${year}</span> ${BRAND_NAME}`;
    }
  }

  loadScript("./academy-open-v6.js", "data-kc-open-v6", "20260806-final4");
  loadScript("./academy-clinico-course-v1.js", "data-kc-clinico-course", "20260806-final4");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyIdentity, { once: true });
  } else {
    applyIdentity();
  }
})();
