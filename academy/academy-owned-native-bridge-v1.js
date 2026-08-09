(() => {
  "use strict";

  if (window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__) return;
  window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__ = true;

  const SOURCE_SELECTOR = [
    "[data-kc-open-product]",
    "[data-kc-open-owned]",
    "[data-kc-path-open]",
    "#course-grid [data-course]",
    "#continue-button[data-course]",
  ].join(", ");
  const EXTERNAL = new Set(["mas-alla-del-dolor", "evidencia-aplicada"]);

  function nativeButton(slug) {
    const safe = String(slug || "").trim();
    if (!safe) return null;
    return [...document.querySelectorAll("#course-grid [data-course]")]
      .find((button) => !button.disabled && button.dataset.course === safe) || null;
  }

  function sourceSlug(source) {
    return String(
      source.dataset.kcOpenProduct
      || source.dataset.kcOpenOwned
      || source.dataset.kcPathOpen
      || source.dataset.course
      || "",
    ).trim();
  }

  function isNativeSource(source) {
    return source.matches("#course-grid [data-course], #continue-button[data-course]");
  }

  window.addEventListener("click", (event) => {
    const source = event.target instanceof Element ? event.target.closest(SOURCE_SELECTOR) : null;
    if (!source || source.disabled || source.getAttribute("aria-disabled") === "true") return;

    const slug = sourceSlug(source);
    if (!slug) return;

    if (EXTERNAL.has(slug) && typeof window.KINECHECK_OPEN_PRODUCT === "function") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.KINECHECK_OPEN_PRODUCT(slug, source);
      return;
    }

    if (isNativeSource(source)) return;

    const target = nativeButton(slug);
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // El botón de #course-grid es la entrada canónica a openCourse() en Academy.
    target.click();
  }, true);
})();
