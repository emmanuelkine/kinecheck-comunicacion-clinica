(() => {
  "use strict";

  if (window.__KINECHECK_RECOMMENDED_BUTTONS_FIX__) return;
  window.__KINECHECK_RECOMMENDED_BUTTONS_FIX__ = true;

  // Solo las recomendaciones especiales usan el router alternativo.
  // Inicio, Mis productos y Continuar deben llegar a los listeners nativos
  // de Academy para reutilizar openCourse(), validación de licencia y SSO.
  const SELECTOR = "#kc-stage-recommendations [data-kc-path-open]";
  const OPENER_SRC = "./academy-open-v6.js?v=20260809-private1";
  let openerPromise = null;

  function toast(text) {
    const element = document.querySelector("#kc-toast");
    if (!element) return;
    element.textContent = text;
    element.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => { element.hidden = true; }, 5000);
  }

  function ensureOpener() {
    if (typeof window.KINECHECK_OPEN_PRODUCT === "function") {
      return Promise.resolve(window.KINECHECK_OPEN_PRODUCT);
    }
    if (openerPromise) return openerPromise;

    openerPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-kc-current-launch-router], script[data-kc-open-v6], script[src*="academy-open-v6.js"]');
      if (existing) {
        const startedAt = Date.now();
        const waitUntilReady = () => {
          if (typeof window.KINECHECK_OPEN_PRODUCT === "function") {
            resolve(window.KINECHECK_OPEN_PRODUCT);
            return;
          }
          if (Date.now() - startedAt >= 5000) {
            reject(new Error("El controlador de productos no respondió."));
            return;
          }
          window.setTimeout(waitUntilReady, 30);
        };
        waitUntilReady();
        return;
      }

      const script = document.createElement("script");
      script.src = OPENER_SRC;
      script.async = false;
      script.dataset.kcCurrentLaunchRouter = "true";
      script.onload = () => {
        if (typeof window.KINECHECK_OPEN_PRODUCT === "function") resolve(window.KINECHECK_OPEN_PRODUCT);
        else reject(new Error("El controlador de productos no quedó disponible."));
      };
      script.onerror = () => reject(new Error("No fue posible cargar el acceso de KineCheck."));
      document.head.appendChild(script);
    }).finally(() => {
      openerPromise = null;
    });

    return openerPromise;
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(SELECTOR);
    if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return;

    const product = String(button.dataset.kcPathOpen || "").trim();
    if (!product) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    try {
      window.KINECHECK_RESET_PRODUCT_NAVIGATION?.();
      const openProduct = await ensureOpener();
      await openProduct(product, button);
    } catch (error) {
      button.removeAttribute("aria-busy");
      button.style.pointerEvents = "";
      if (button.dataset.kcOriginalText) button.textContent = button.dataset.kcOriginalText;
      toast(error instanceof Error ? error.message : "No fue posible abrir el producto.");
    }
  }, true);

  window.addEventListener("pageshow", () => {
    window.KINECHECK_RESET_PRODUCT_NAVIGATION?.();
  });
})();
