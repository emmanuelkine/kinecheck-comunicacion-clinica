(() => {
  "use strict";

  if (window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__) return;
  window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__ = true;

  // Solo intercepta entradas proxy creadas por Inicio, Mi KineCheck y recomendaciones.
  // Los botones nativos de #course-grid y #continue-button deben conservar sus
  // listeners de academy-v39.js y no ser bloqueados por este bridge.
  const PRODUCT_SELECTOR = [
    "[data-kc-open-product]",
    "[data-kc-open-owned]",
    "[data-kc-path-open]",
  ].join(", ");

  const STUDENT_ORDER = [
    "kinecheck-estudiante",
    "mas-alla-del-dolor",
    "comunicacion-clinica",
    "evidencia-aplicada",
    "traumatologia-ortopedia-clinica",
  ];

  const VIEW_ALIASES = Object.freeze({
    productos: "biblioteca",
    recursos: "biblioteca",
    "evidencia-semanal": "biblioteca",
    "mis-cursos": "biblioteca",
    cuenta: "perfil",
    "mi-cuenta": "perfil",
  });
  const VIEWS = new Set(["inicio", "biblioteca", "herramientas", "perfil", "explorar"]);

  function toast(text) {
    const element = document.querySelector("#kc-toast");
    if (!element) return;
    element.textContent = text;
    element.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => { element.hidden = true; }, 4500);
  }

  function sourceSlug(source) {
    return String(
      source?.dataset?.kcOpenProduct
      || source?.dataset?.kcOpenOwned
      || source?.dataset?.kcPathOpen
      || source?.dataset?.course
      || "",
    ).trim();
  }

  function activeCourse(slug) {
    return [...document.querySelectorAll("#course-grid [data-course]")]
      .find((button) => !button.disabled && String(button.dataset.course || "").trim() === slug) || null;
  }

  function firstStudentCourse() {
    return STUDENT_ORDER.find((slug) => activeCourse(slug)) || "";
  }

  function normalizeView(view) {
    const raw = String(view || "").replace(/^#/, "").trim().toLowerCase();
    const mapped = VIEW_ALIASES[raw] || raw;
    return VIEWS.has(mapped) ? mapped : "inicio";
  }

  function activateView(view, scrollTarget = "") {
    const next = normalizeView(view);
    document.body.dataset.kcView = next;

    document.querySelectorAll("[data-kc-view-link]").forEach((link) => {
      link.classList.toggle("active", normalizeView(link.dataset.kcViewLink) === next);
    });

    const targetHash = `#${next}`;
    if (location.hash !== targetHash) history.pushState(null, "", targetHash);

    document.querySelector("#academy-sidebar")?.classList.remove("open");
    const overlay = document.querySelector("#sidebar-overlay");
    if (overlay) overlay.hidden = true;
    document.querySelector("#mobile-menu")?.setAttribute("aria-expanded", "false");

    window.requestAnimationFrame(() => {
      if (scrollTarget) {
        document.getElementById(scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  function nativeOpenCourse() {
    if (typeof window.KINECHECK_ACADEMY_OPEN_COURSE === "function") {
      return window.KINECHECK_ACADEMY_OPEN_COURSE;
    }
    // academy-v39.js es un script clásico; su función openCourse queda disponible
    // en window. Este fallback conecta el bridge con el flujo nativo validado.
    if (typeof window.openCourse === "function") return window.openCourse;
    return null;
  }

  async function openSlug(slug, source) {
    if (!slug) return;

    try {
      const native = nativeOpenCourse();
      if (native) {
        await native(slug);
        return;
      }

      if (typeof window.KINECHECK_OPEN_PRODUCT === "function") {
        await window.KINECHECK_OPEN_PRODUCT(slug, source || null);
        return;
      }

      const startedAt = Date.now();
      while (Date.now() - startedAt < 4000) {
        await new Promise((resolve) => window.setTimeout(resolve, 40));
        const delayedNative = nativeOpenCourse();
        if (delayedNative) {
          await delayedNative(slug);
          return;
        }
        if (typeof window.KINECHECK_OPEN_PRODUCT === "function") {
          await window.KINECHECK_OPEN_PRODUCT(slug, source || null);
          return;
        }
      }

      throw new Error("El controlador de acceso no terminó de cargar.");
    } catch (error) {
      source?.removeAttribute?.("aria-busy");
      if (source?.style) source.style.pointerEvents = "";
      toast(error instanceof Error ? error.message : "No fue posible abrir el producto.");
    }
  }

  function stop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  window.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const product = target.closest(PRODUCT_SELECTOR);
    if (product && !product.disabled && product.getAttribute("aria-disabled") !== "true") {
      const slug = sourceSlug(product);
      if (!slug) return;
      stop(event);
      void openSlug(slug, product);
      return;
    }

    const homeContinue = target.closest("#kc-home-continue");
    if (homeContinue) {
      stop(event);
      const remembered = String(document.querySelector("#continue-button")?.dataset?.course || "").trim();
      const role = String(document.body.dataset.kcExperience || "").trim();
      const fallback = role === "patient"
        ? (activeCourse("kinecheck-recupera") ? "kinecheck-recupera" : "")
        : role === "student"
          ? firstStudentCourse()
          : "";
      const slug = remembered || fallback;
      if (slug) void openSlug(slug, homeContinue);
      else activateView("biblioteca");
      return;
    }

    const simplifiedView = target.closest("[data-mi-kc-view]");
    if (simplifiedView) {
      stop(event);
      activateView(simplifiedView.dataset.miKcView);
      return;
    }

    const viewLink = target.closest("[data-kc-view-link]");
    if (viewLink) {
      stop(event);
      activateView(viewLink.dataset.kcViewLink, viewLink.dataset.kcScrollTarget || "");
      return;
    }

    const scrollLink = target.closest("[data-kc-scroll-target]");
    if (scrollLink) {
      stop(event);
      activateView("biblioteca", scrollLink.dataset.kcScrollTarget || "");
      return;
    }

    const exploreProduct = target.closest("[data-kc-explore-product]");
    if (exploreProduct) {
      stop(event);
      activateView("explorar");
      return;
    }

    const mobileMenu = target.closest("#mobile-menu");
    if (mobileMenu) {
      stop(event);
      const sidebar = document.querySelector("#academy-sidebar");
      const overlay = document.querySelector("#sidebar-overlay");
      const open = !sidebar?.classList.contains("open");
      sidebar?.classList.toggle("open", open);
      if (overlay) overlay.hidden = !open;
      mobileMenu.setAttribute("aria-expanded", String(open));
      return;
    }

    if (target.closest("#sidebar-overlay")) {
      stop(event);
      document.querySelector("#academy-sidebar")?.classList.remove("open");
      const overlay = document.querySelector("#sidebar-overlay");
      if (overlay) overlay.hidden = true;
      document.querySelector("#mobile-menu")?.setAttribute("aria-expanded", "false");
      return;
    }

    const supportOpen = target.closest("[data-support-open]");
    if (supportOpen) {
      stop(event);
      const panel = document.querySelector("#support-panel");
      const launcher = document.querySelector("#support-launcher");
      if (panel) panel.hidden = false;
      launcher?.setAttribute("aria-expanded", "true");
      return;
    }

    const supportClose = target.closest("[data-support-close]");
    if (supportClose) {
      stop(event);
      const panel = document.querySelector("#support-panel");
      const launcher = document.querySelector("#support-launcher");
      if (panel) panel.hidden = true;
      launcher?.setAttribute("aria-expanded", "false");
    }
  }, true);

  window.addEventListener("pageshow", () => {
    window.KINECHECK_RESET_PRODUCT_NAVIGATION?.();
  });
})();
