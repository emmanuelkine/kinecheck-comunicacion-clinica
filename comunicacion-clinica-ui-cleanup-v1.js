(() => {
  "use strict";

  if (window.__KINECHECK_COMMUNICATION_UI_CLEANUP_V1__) return;
  window.__KINECHECK_COMMUNICATION_UI_CLEANUP_V1__ = true;

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function hideMisleadingEcosystemButton() {
    const root = document.querySelector("#root");
    if (!root) return;

    root.querySelectorAll("a,button").forEach((control) => {
      if (normalizeText(control.textContent) !== "ecosistema") return;

      control.hidden = true;
      control.setAttribute("aria-hidden", "true");
      control.setAttribute("tabindex", "-1");
      control.style.setProperty("display", "none", "important");
    });
  }

  function start() {
    const root = document.querySelector("#root");
    if (!root) return;

    hideMisleadingEcosystemButton();

    const observer = new MutationObserver(() => {
      hideMisleadingEcosystemButton();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
