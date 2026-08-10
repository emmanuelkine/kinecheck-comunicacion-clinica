(() => {
  "use strict";

  if (window.__KINECHECK_HOME_NATIVE_COURSES_V1__) return;
  window.__KINECHECK_HOME_NATIVE_COURSES_V1__ = true;

  let courseGrid = null;
  let homeHost = null;
  let sourceObserver = null;
  let hostObserver = null;
  let bodyObserver = null;
  let scheduled = false;

  function injectStyles() {
    if (document.querySelector("style[data-kc-home-native-courses]")) return;
    const style = document.createElement("style");
    style.dataset.kcHomeNativeCourses = "true";
    style.textContent = `
      body[data-kc-view="inicio"] .kc-home-section.kc-home-duplicate-apps {
        display: none !important;
      }

      body[data-kc-view="inicio"] #home-course-grid.kc-native-course-host {
        display: block !important;
        width: 100%;
        min-width: 0;
        overflow: visible;
      }

      body[data-kc-view="inicio"] #home-course-grid .kc-home-native-rail {
        display: flex;
        gap: 16px;
        width: 100%;
        min-width: 0;
        margin: 0;
        padding: 4px 2px 18px;
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-x: contain;
        scroll-snap-type: x proximity;
        scroll-padding-inline: 2px;
        touch-action: pan-x pan-y;
        scrollbar-width: thin;
      }

      body[data-kc-view="inicio"] #home-course-grid .kc-home-native-rail::-webkit-scrollbar {
        height: 7px;
      }

      body[data-kc-view="inicio"] #home-course-grid .kc-home-native-card {
        flex: 0 0 min(340px, 82vw);
        width: min(340px, 82vw);
        min-width: min(340px, 82vw);
        scroll-snap-align: start;
        scroll-snap-stop: normal;
      }

      body[data-kc-view="inicio"] #home-course-grid .kc-home-native-card .course-button {
        touch-action: manipulation;
        transform: none !important;
        transition: filter 120ms ease, opacity 120ms ease !important;
      }

      body[data-kc-view="inicio"] #home-course-grid .kc-home-native-card .course-button:hover,
      body[data-kc-view="inicio"] #home-course-grid .kc-home-native-card .course-button:active,
      body[data-kc-view="inicio"] #home-course-grid .kc-home-native-card .course-button:focus {
        transform: none !important;
      }

      @media (max-width: 760px) {
        body[data-kc-view="inicio"] #home-course-grid {
          margin-right: -16px;
          width: calc(100% + 16px);
        }

        body[data-kc-view="inicio"] #home-course-grid .kc-home-native-rail {
          gap: 14px;
          padding-right: 18px;
          scroll-padding-inline: 0 18px;
        }

        body[data-kc-view="inicio"] #home-course-grid .kc-home-native-card {
          flex-basis: min(86vw, 340px);
          width: min(86vw, 340px);
          min-width: min(86vw, 340px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function resolveElements() {
    courseGrid = document.querySelector("#course-grid");
    homeHost = document.querySelector("#home-course-grid");
    return Boolean(courseGrid && homeHost);
  }

  function hideDuplicateApplications() {
    const appGrid = document.querySelector("#home-app-grid");
    const section = appGrid?.closest(".kc-home-section");
    if (!section) return;
    section.classList.add("kc-home-duplicate-apps");
    section.setAttribute("aria-hidden", "true");
  }

  function sourceCards() {
    if (!courseGrid) return [];
    return [...courseGrid.querySelectorAll(".course-card.kind-course")]
      .filter((card) => {
        const button = card.querySelector("[data-course]");
        return button && !button.disabled && button.getAttribute("aria-disabled") !== "true";
      });
  }

  function signature(cards) {
    return cards.map((card) => {
      const button = card.querySelector("[data-course]");
      const progress = card.querySelector(".course-progress-detail")?.textContent || "";
      const percent = card.querySelector(".course-progress-copy strong")?.textContent || "";
      const status = card.querySelector(".status-badge")?.textContent || "";
      return [button?.dataset.course || "", button?.textContent || "", progress, percent, status].join("|");
    }).join("::");
  }

  function sanitizeClone(card) {
    const clone = card.cloneNode(true);
    clone.classList.add("kc-home-native-card");
    clone.removeAttribute("data-card-course");

    clone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    clone.querySelectorAll("[data-card-course]").forEach((element) => element.removeAttribute("data-card-course"));

    const button = clone.querySelector("[data-course]");
    if (button) {
      button.removeAttribute("aria-busy");
      button.style.pointerEvents = "";
    }
    return clone;
  }

  function hostIsNative() {
    return Boolean(
      homeHost
      && homeHost.children.length === 1
      && homeHost.firstElementChild?.classList.contains("kc-home-native-rail")
    );
  }

  function showToast(text) {
    const toast = document.querySelector("#kc-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3500);
  }

  function openThroughNativeButton(slug, visibleButton) {
    const nativeButton = courseGrid?.querySelector(`[data-course="${CSS.escape(slug)}"]`);
    if (!nativeButton || nativeButton.disabled || nativeButton.getAttribute("aria-disabled") === "true") {
      showToast("Este curso todavía no está disponible en tu cuenta.");
      return;
    }

    const originalText = visibleButton.textContent;
    visibleButton.setAttribute("aria-busy", "true");
    visibleButton.textContent = "Abriendo…";

    nativeButton.click();

    window.setTimeout(() => {
      if (!document.contains(visibleButton)) return;
      visibleButton.removeAttribute("aria-busy");
      visibleButton.textContent = originalText;
    }, 1800);
  }

  function renderHomeCourses() {
    scheduled = false;
    if (!resolveElements()) return;
    hideDuplicateApplications();

    const cards = sourceCards();
    if (!cards.length) {
      if (!homeHost.querySelector(".kc-empty-state")) {
        homeHost.innerHTML = '<div class="kc-empty-state">Verificando tus cursos…</div>';
      }
      return;
    }

    const nextSignature = signature(cards);
    if (hostIsNative() && homeHost.dataset.kcNativeSignature === nextSignature) return;

    const rail = document.createElement("div");
    rail.className = "kc-home-native-rail";
    rail.setAttribute("role", "list");
    rail.setAttribute("aria-label", "Tus cursos activos");

    cards.forEach((card) => {
      const clone = sanitizeClone(card);
      clone.setAttribute("role", "listitem");
      rail.appendChild(clone);
    });

    homeHost.classList.add("kc-native-course-host");
    homeHost.dataset.kcNativeSignature = nextSignature;
    homeHost.replaceChildren(rail);
  }

  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(renderHomeCourses);
  }

  function wireHomeActions() {
    homeHost.addEventListener("click", (event) => {
      const button = event.target instanceof Element
        ? event.target.closest(".kc-home-native-card [data-course]")
        : null;
      if (!button) return;

      const slug = String(button.dataset.course || "").trim();
      if (!slug) return;

      event.preventDefault();
      event.stopPropagation();
      openThroughNativeButton(slug, button);
    });
  }

  function start() {
    injectStyles();
    if (!resolveElements()) {
      window.setTimeout(start, 50);
      return;
    }

    hideDuplicateApplications();
    wireHomeActions();

    sourceObserver = new MutationObserver(scheduleRender);
    sourceObserver.observe(courseGrid, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ["disabled", "class", "aria-disabled"],
    });

    hostObserver = new MutationObserver(() => {
      if (!hostIsNative()) scheduleRender();
    });
    hostObserver.observe(homeHost, { childList: true, subtree: false });

    bodyObserver = new MutationObserver(() => {
      if (String(document.body.dataset.kcView || "") === "inicio") scheduleRender();
    });
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-kc-view"],
    });

    window.addEventListener("pageshow", scheduleRender);
    scheduleRender();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
