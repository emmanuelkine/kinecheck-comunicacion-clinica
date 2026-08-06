(() => {
  "use strict";

  if (window.__KINECHECK_INTEGRATION_GUARD_V5__) return;
  window.__KINECHECK_INTEGRATION_GUARD_V5__ = true;

  function loadUnifiedOpener() {
    if (window.__KINECHECK_OPEN_V6__ || document.querySelector('script[data-kc-open-v6]')) return;
    const script = document.createElement("script");
    script.src = "./academy-open-v6.js?v=20260806-final4";
    script.defer = true;
    script.dataset.kcOpenV6 = "true";
    document.head.appendChild(script);
  }

  function normalizePresentation() {
    document.querySelectorAll('[data-course], [data-kc-path-open], [data-kc-open-product]').forEach((button) => {
      if (button.disabled || button.getAttribute("aria-disabled") === "true") return;
      button.removeAttribute("title");
      button.style.pointerEvents = "";
    });
  }

  loadUnifiedOpener();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", normalizePresentation, { once: true });
  } else {
    normalizePresentation();
  }
})();
