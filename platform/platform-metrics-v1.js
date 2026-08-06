(() => {
  "use strict";

  if (window.__KINECHECK_PLATFORM_METRICS_V1__) return;
  window.__KINECHECK_PLATFORM_METRICS_V1__ = true;

  let recorded = false;

  function recordWhenReady() {
    if (recorded) return true;
    const app = document.querySelector("#app-view");
    if (!app || app.hidden || getComputedStyle(app).display === "none") return false;
    if (typeof window.KINECHECK_METRIC !== "function") return false;
    recorded = true;
    window.KINECHECK_METRIC("platform_login_success");
    return true;
  }

  function init() {
    if (recordWhenReady()) return;
    const observer = new MutationObserver(() => {
      if (recordWhenReady()) observer.disconnect();
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["hidden", "style", "class"],
    });
    window.setTimeout(() => observer.disconnect(), 30 * 60 * 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
