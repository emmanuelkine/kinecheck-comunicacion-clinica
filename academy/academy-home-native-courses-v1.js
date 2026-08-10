(() => {
  "use strict";

  if (window.__KINECHECK_HOME_NATIVE_COURSES_V1__) return;
  window.__KINECHECK_HOME_NATIVE_COURSES_V1__ = true;

  let courseGrid = null;
  let homeHost = null;
  let libraryAnchor = null;
  let hostObserver = null;
  let bodyObserver = null;
  let scheduled = false;

  function injectStyles() {
    if (document.querySelector("style[data-kc-home-native-courses]")) return;
    const style = document.createElement("style");
    style.dataset.kcHomeNativeCourses = "true";
    style.textContent = `
      body[data-kc-view="inicio"] #home-course-grid.kc-native-course-host {
        display: block !important;
        width: 100%;
      }
      body[data-kc-view="inicio"] #home-course-grid.kc-native-course-host > #course-grid {
        width: 100%;
        min-width: 0;
      }
      body[data-kc-view="inicio"] #home-course-grid #course-grid .kind-application,
      body[data-kc-view="inicio"] #home-course-grid #course-grid .kind-tool {
        display: none !important;
      }
      body[data-kc-view="inicio"] #home-course-grid #course-grid .course-group:not(:has(.course-card.kind-course)) {
        display: none !important;
      }
      body[data-kc-view="inicio"] #home-course-grid #course-grid .course-group-heading {
        display: none !important;
      }
      body[data-kc-view="inicio"] #home-course-grid #course-grid .course-rail {
        padding-top: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  function resolveElements() {
    if (!courseGrid) courseGrid = document.querySelector("#course-grid");
    if (!homeHost) homeHost = document.querySelector("#home-course-grid");
    if (!courseGrid || !homeHost) return false;

    if (!libraryAnchor) {
      const parent = courseGrid.parentNode;
      if (!parent) return false;
      libraryAnchor = document.createComment("kinecheck-course-grid-library-anchor");
      parent.insertBefore(libraryAnchor, courseGrid);
    }
    return true;
  }

  function mountInHome() {
    if (!resolveElements()) return;
    homeHost.classList.add("kc-native-course-host");

    if (courseGrid.parentNode !== homeHost || homeHost.children.length !== 1) {
      homeHost.replaceChildren(courseGrid);
    }
  }

  function restoreToLibrary() {
    if (!resolveElements()) return;
    homeHost.classList.remove("kc-native-course-host");

    if (libraryAnchor?.parentNode && courseGrid.parentNode !== libraryAnchor.parentNode) {
      libraryAnchor.parentNode.insertBefore(courseGrid, libraryAnchor.nextSibling);
    }
  }

  function sync() {
    scheduled = false;
    if (!resolveElements()) return;
    if (String(document.body.dataset.kcView || "inicio") === "inicio") mountInHome();
    else restoreToLibrary();
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(sync);
  }

  function start() {
    injectStyles();
    if (!resolveElements()) {
      window.setTimeout(start, 50);
      return;
    }

    bodyObserver = new MutationObserver(scheduleSync);
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-kc-view"],
    });

    hostObserver = new MutationObserver(() => {
      if (String(document.body.dataset.kcView || "") === "inicio" && courseGrid.parentNode !== homeHost) {
        scheduleSync();
      }
    });
    hostObserver.observe(homeHost, { childList: true });

    window.addEventListener("pageshow", scheduleSync);
    scheduleSync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
