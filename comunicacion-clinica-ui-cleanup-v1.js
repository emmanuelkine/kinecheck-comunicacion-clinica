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

  function ensureRc1Styles() {
    if (document.getElementById("kc-communication-rc1-styles")) return;
    const style = document.createElement("style");
    style.id = "kc-communication-rc1-styles";
    style.textContent = `
      #root [data-kc-rc1-light-card="true"],
      #root [data-kc-rc1-light-card="true"] * {
        color:#173840!important;
        text-shadow:none!important;
      }
      #root [data-kc-rc1-light-card="true"] a {
        color:#075f69!important;
        text-decoration-color:currentColor!important;
      }
      @media(max-width:640px){
        #root,#root *{max-width:100%;box-sizing:border-box}
        #root h1,#root h2,#root h3{overflow-wrap:anywhere;word-break:normal;hyphens:auto}
      }
    `;
    document.head.appendChild(style);
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

  function parseRgb(value) {
    const match = String(value || "").match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+([\d.]+))?\)/i);
    if (!match) return null;
    return { r:Number(match[1]), g:Number(match[2]), b:Number(match[3]), a:match[4] == null ? 1 : Number(match[4]) };
  }

  function findLightContainer(node, root) {
    let current = node instanceof Element ? node : node?.parentElement;
    for (let depth = 0; current && current !== root && depth < 7; depth += 1, current = current.parentElement) {
      const rgb = parseRgb(getComputedStyle(current).backgroundColor);
      if (!rgb || rgb.a < 0.2) continue;
      const luminance = (0.2126 * rgb.r) + (0.7152 * rgb.g) + (0.0722 * rgb.b);
      if (luminance >= 190) return current;
    }
    return null;
  }

  function repairLightCardContrast() {
    const root = document.querySelector("#root");
    if (!root) return;
    const phrase = "clase completa, no resumen";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!normalizeText(node.nodeValue).includes(phrase)) continue;
      const container = findLightContainer(node, root);
      if (container) container.setAttribute("data-kc-rc1-light-card", "true");
    }
  }

  function hideInertDotLaunchers() {
    const root = document.querySelector("#root");
    if (!root) return;
    const dotLabels = new Set(["...", "•••", "⋯", "···"]);
    root.querySelectorAll("button").forEach((button) => {
      const label = normalizeText(button.textContent);
      if (!dotLabels.has(label)) return;
      const style = getComputedStyle(button);
      const unlabeled = !button.getAttribute("aria-label") && !button.getAttribute("aria-controls") && !button.getAttribute("title");
      if (style.position !== "fixed" || !unlabeled) return;
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
      button.setAttribute("tabindex", "-1");
      button.style.setProperty("display", "none", "important");
    });
  }

  function repair() {
    ensureRc1Styles();
    hideMisleadingEcosystemButton();
    repairLightCardContrast();
    hideInertDotLaunchers();
  }

  function start() {
    const root = document.querySelector("#root");
    if (!root) return;

    repair();

    const observer = new MutationObserver(() => {
      repair();
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
