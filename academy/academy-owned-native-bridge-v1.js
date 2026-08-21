(() => {
  "use strict";

  if (window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__) return;
  window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__ = true;

  // Intercepta únicamente accesos auxiliares y el botón global Continuar.
  // Las tarjetas dinámicas de cursos se redirigen al botón nativo equivalente
  // de #course-grid, que es el flujo probado de "Mis productos".
  const PRODUCT_SELECTOR = [
    "[data-kc-open-owned]",
    "[data-kc-path-open]",
    "#continue-button[data-course]",
  ].join(", ");

  const STUDENT_ORDER = [
    "kinecheck-estudiante",
    "dolor-lumbar-persistente",
    "dolor-musculoesqueletico",
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
  let libraryReorderFrame = 0;
  let libraryObserver = null;

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

  function courseKind(slug) {
    const courses = window.KINECHECK_ACADEMY_CONFIG?.courses;
    if (!Array.isArray(courses)) return "";
    return String(courses.find((item) => String(item?.slug || "") === slug)?.kind || "").trim();
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
    if (typeof window.openCourse === "function") return window.openCourse;
    return null;
  }

  async function openSlug(slug, source) {
    if (!slug) return;

    try {
      // Los accesos auxiliares usan primero el opener unificado. Es la misma ruta que
      // utilizan las recomendaciones: muestra estado "Abriendo…", renueva sesión
      // cuando corresponde y deja un error visible en #kc-toast si no puede navegar.
      if (typeof window.KINECHECK_OPEN_PRODUCT === "function") {
        await window.KINECHECK_OPEN_PRODUCT(slug, source || null);
        return;
      }

      const startedAt = Date.now();
      while (Date.now() - startedAt < 4000) {
        await new Promise((resolve) => window.setTimeout(resolve, 40));
        if (typeof window.KINECHECK_OPEN_PRODUCT === "function") {
          await window.KINECHECK_OPEN_PRODUCT(slug, source || null);
          return;
        }
      }

      // Fallback de resiliencia únicamente si el opener unificado no llegó a cargar.
      const native = nativeOpenCourse();
      if (native) {
        await native(slug);
        return;
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

  function setGroupHeading(group, title, description, count) {
    const heading = group?.querySelector(".course-group-heading");
    if (!heading) return;
    const titleNode = heading.querySelector("h3");
    const descriptionNode = heading.querySelector("p");
    const countNode = heading.querySelector(".course-group-count");
    const countText = `${count} ${count === 1 ? "producto" : "productos"}`;
    if (titleNode && titleNode.textContent !== title) titleNode.textContent = title;
    if (descriptionNode && descriptionNode.textContent !== description) descriptionNode.textContent = description;
    if (countNode && countNode.textContent !== countText) countNode.textContent = countText;
  }

  function createDiscoverGroup() {
    const group = document.createElement("section");
    group.className = "course-group";
    group.dataset.courseGroup = "discover";
    group.innerHTML = `
      <div class="course-group-heading">
        <div><h3>Otros productos KineCheck</h3><p>Formaciones y herramientas que puedes adquirir cuando las necesites.</p></div>
        <span class="course-group-count">0 productos</span>
      </div>
      <div class="course-rail"></div>
    `;
    return group;
  }

  function cardOwned(card) {
    const button = card?.querySelector("button[data-course]");
    return Boolean(button && !button.disabled);
  }

  function decorateConstructionCards() {
    const card = document.querySelector('[data-card-course="banderas-clinicas"]');
    if (!card || card.dataset.kcConstruction === "true") return;
    const badge = card.querySelector(".status-badge");
    if (!badge || /verificando/i.test(String(badge.textContent || ""))) return;
    badge.textContent = "EN CONSTRUCCIÓN";
    badge.classList.add("preparing");
    const meta = card.querySelector(".course-meta");
    if (meta) meta.textContent = "Próximo lanzamiento · contenido en desarrollo";
    card.dataset.kcConstruction = "true";
  }

  function organizeLibraryProducts() {
    const grid = document.querySelector("#course-grid");
    if (!grid) return;

    // Espera a que la verificación de licencias termine para evitar reordenar
    // tarjetas mientras aún están en estado transitorio.
    const checking = [...grid.querySelectorAll(".status-badge")]
      .some((badge) => /verificando/i.test(String(badge.textContent || "")));
    if (checking) return;

    decorateConstructionCards();

    const baseGroup = grid.querySelector('[data-course-group="not-started"]');
    if (!baseGroup) return;
    const baseRail = baseGroup.querySelector(".course-rail");
    if (!baseRail) return;

    let discoverGroup = grid.querySelector('[data-course-group="discover"]');
    const discoverRail = discoverGroup?.querySelector(".course-rail") || null;
    const cards = [
      ...baseRail.querySelectorAll(":scope > .course-card"),
      ...(discoverRail ? [...discoverRail.querySelectorAll(":scope > .course-card")] : []),
    ];
    if (!cards.length) return;

    const owned = cards.filter(cardOwned);
    const locked = cards.filter((card) => !cardOwned(card));
    const startedGroup = grid.querySelector('[data-course-group="started"]');
    const hasStarted = Boolean(startedGroup?.querySelector(".course-card"));

    if (!owned.length) {
      cards.forEach((card) => {
        if (card.parentElement !== baseRail) baseRail.appendChild(card);
      });
      if (discoverGroup) {
        discoverGroup.remove();
        discoverGroup = null;
      }
      setGroupHeading(
        baseGroup,
        hasStarted ? "Otros productos KineCheck" : "Tu biblioteca",
        hasStarted
          ? "Formaciones y herramientas disponibles para adquirir cuando las necesites."
          : "Explora tus cursos, aplicaciones y herramientas disponibles.",
        cards.length,
      );
      return;
    }

    owned.forEach((card) => {
      if (card.parentElement !== baseRail) baseRail.appendChild(card);
    });
    setGroupHeading(
      baseGroup,
      hasStarted ? "Listos para comenzar" : "Mis productos adquiridos",
      hasStarted
        ? "Productos incluidos en tu cuenta que aún no has iniciado."
        : "Tus compras verificadas aparecen primero para que puedas comenzar de inmediato.",
      owned.length,
    );

    if (!locked.length) {
      discoverGroup?.remove();
      return;
    }

    if (!discoverGroup) {
      discoverGroup = createDiscoverGroup();
      baseGroup.insertAdjacentElement("afterend", discoverGroup);
    }
    const nextDiscoverRail = discoverGroup.querySelector(".course-rail");
    locked.forEach((card) => {
      if (card.parentElement !== nextDiscoverRail) nextDiscoverRail.appendChild(card);
    });
    setGroupHeading(
      discoverGroup,
      "Otros productos KineCheck",
      "Formaciones y herramientas que puedes adquirir cuando las necesites.",
      locked.length,
    );
  }

  function scheduleLibraryOrganization() {
    if (libraryReorderFrame) return;
    libraryReorderFrame = window.requestAnimationFrame(() => {
      libraryReorderFrame = 0;
      organizeLibraryProducts();
    });
  }

  function startLibraryOrganizer() {
    const grid = document.querySelector("#course-grid");
    if (!grid || libraryObserver) {
      scheduleLibraryOrganization();
      return;
    }

    libraryObserver = new MutationObserver(scheduleLibraryOrganization);
    libraryObserver.observe(grid, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "class"],
    });
    scheduleLibraryOrganization();
  }

  function reconcileInteractionLocks() {
    const stageModal = document.querySelector("#kc-stage-modal");
    if (stageModal) {
      if (!stageModal.hidden) stageModal.hidden = true;
      if (stageModal.getAttribute("aria-hidden") !== "true") stageModal.setAttribute("aria-hidden", "true");
      if (!stageModal.hasAttribute("inert")) stageModal.setAttribute("inert", "");
    }
    if (document.body.classList.contains("kc-stage-modal-open")) {
      document.body.classList.remove("kc-stage-modal-open");
    }

    const reviewModal = document.querySelector("#review-modal");
    const reviewIsOpen = Boolean(reviewModal && !reviewModal.hidden);
    if (document.body.classList.contains("review-open") !== reviewIsOpen) {
      document.body.classList.toggle("review-open", reviewIsOpen);
    }

    if (!reviewIsOpen && getComputedStyle(document.body).overflow === "hidden") {
      document.body.style.removeProperty("overflow");
    }
  }

  window.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    // En Inicio, los cursos son tarjetas proxy. En vez de abrirlos mediante otro
    // controlador, dispara el mismo botón nativo que funciona en "Mis productos".
    const courseProxy = target.closest("[data-kc-open-product]");
    if (courseProxy && !courseProxy.disabled && courseProxy.getAttribute("aria-disabled") !== "true") {
      const slug = sourceSlug(courseProxy);
      if (slug && courseKind(slug) === "course") {
        const nativeButton = activeCourse(slug);
        if (nativeButton) {
          stop(event);
          nativeButton.click();
          return;
        }
      }
    }

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
    reconcileInteractionLocks();
    startLibraryOrganizer();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      reconcileInteractionLocks();
      startLibraryOrganizer();
    }, { once: true });
  } else {
    reconcileInteractionLocks();
    startLibraryOrganizer();
  }

  const lockObserver = new MutationObserver(reconcileInteractionLocks);
  lockObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  lockObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden"],
  });
})();