(() => {
  "use strict";

  if (window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__) return;
  window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__ = true;

  const SOURCE_SELECTOR = "[data-kc-open-product], [data-kc-open-owned]";

  function nativeButton(slug) {
    const safe = String(slug || "").trim();
    if (!safe) return null;
    return [...document.querySelectorAll("#course-grid [data-course]")]
      .find((button) => !button.disabled && button.dataset.course === safe) || null;
  }

  window.addEventListener("click", (event) => {
    const source = event.target instanceof Element ? event.target.closest(SOURCE_SELECTOR) : null;
    if (!source || source.disabled || source.getAttribute("aria-disabled") === "true") return;

    const slug = String(source.dataset.kcOpenProduct || source.dataset.kcOpenOwned || "").trim();
    const target = nativeButton(slug);
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // El botón de #course-grid es la entrada canónica a openCourse() en academy-v39.js.
    target.click();
  }, true);
})();
