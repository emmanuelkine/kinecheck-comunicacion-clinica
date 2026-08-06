(() => {
  const BRAND_NAME = "KineCheck Ecosistema Clínico";
  const BRAND_DESCRIPTOR = "ECOSISTEMA CLÍNICO";

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
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

  function loadCurrentLaunchRouter() {
    if (document.querySelector('script[data-kc-current-launch-router]')) return;
    const script = document.createElement("script");
    script.src = "./academy-launch-router-v4.js?v=20260806-direct2";
    script.async = false;
    script.dataset.kcCurrentLaunchRouter = "true";
    document.head.appendChild(script);
  }

  function loadClinicoCourseIntegration() {
    if (document.querySelector('script[data-kc-clinico-course]')) return;
    const script = document.createElement("script");
    script.src = "./academy-clinico-course-v1.js?v=20260806-1";
    script.async = false;
    script.dataset.kcClinicoCourse = "true";
    document.head.appendChild(script);
  }

  // El router actual se carga desde un archivo que Academy ya incorpora al inicio.
  // Esto evita que handlers antiguos abran cursos con sesiones obsoletas o rutas en caché.
  loadCurrentLaunchRouter();
  loadClinicoCourseIntegration();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyIdentity, { once: true });
  } else {
    applyIdentity();
  }
})();
