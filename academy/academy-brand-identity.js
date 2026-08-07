(() => {
  "use strict";

  const BRAND_NAME = "Mi KineCheck";
  const BRAND_DESCRIPTOR = "UN SOLO ACCESO";
  const SUPPORT_EMAIL = "soporte.kinecheck@gmail.com";

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

  function removeEmptyHiddenLinks() {
    document.querySelectorAll('a[hidden][aria-hidden="true"]').forEach((link) => {
      if (!link.textContent.trim() && !link.querySelector("img,svg")) link.remove();
    });
  }

  function ensurePurchaseHelp() {
    const loginCard = document.querySelector(".login-card");
    if (!loginCard || loginCard.querySelector("[data-kc-purchase-help]")) return;

    const style = document.createElement("style");
    style.setAttribute("data-kc-purchase-help-style", "true");
    style.textContent = `
      .kc-purchase-help{margin-top:14px;padding:12px 14px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.035)}
      .kc-purchase-help summary{cursor:pointer;font-weight:800;line-height:1.35}
      .kc-purchase-help p{margin:10px 0 8px;line-height:1.5}
      .kc-purchase-help ol{margin:0 0 10px;padding-left:20px;line-height:1.5}
      .kc-purchase-help a{display:inline-block;margin-top:2px;font-weight:800}
      .kc-purchase-help small{display:block;margin-top:9px;opacity:.78;line-height:1.4}
    `;
    document.head.appendChild(style);

    const details = document.createElement("details");
    details.className = "kc-purchase-help";
    details.setAttribute("data-kc-purchase-help", "true");

    const summary = document.createElement("summary");
    summary.textContent = "Compré y todavía no aparece mi acceso";
    details.appendChild(summary);

    const intro = document.createElement("p");
    intro.textContent = "Si Hotmart confirmó tu compra pero aún no ves el producto, revisa estos pasos antes de contactar soporte:";
    details.appendChild(intro);

    const list = document.createElement("ol");
    [
      "Confirma que ingresaste con el mismo correo utilizado en Hotmart.",
      "Espera unos minutos y vuelve a abrir Mi KineCheck; algunas confirmaciones pueden tardar en sincronizarse.",
      "Si sigue sin aparecer, contacta soporte indicando el correo de compra y el código de transacción de Hotmart.",
    ].forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      list.appendChild(item);
    });
    details.appendChild(list);

    const support = document.createElement("a");
    support.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Compra confirmada sin acceso en KineCheck")}`;
    support.textContent = "Contactar soporte por acceso";
    details.appendChild(support);

    const privacy = document.createElement("small");
    privacy.textContent = "No envíes contraseñas, datos clínicos ni información sensible por correo.";
    details.appendChild(privacy);

    const existingSupport = loginCard.querySelector(".support-link");
    if (existingSupport) existingSupport.insertAdjacentElement("beforebegin", details);
    else loginCard.appendChild(details);
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

    removeEmptyHiddenLinks();
    ensurePurchaseHelp();
  }

  loadScript("../assets/runtime-config.js", "data-kc-runtime", "20260807-1");
  loadScript("../assets/observability.js", "data-kc-observability", "20260807-1");
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
