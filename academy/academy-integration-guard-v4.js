(() => {
  if (window.__KINECHECK_INTEGRATION_GUARD_V4__) return;
  window.__KINECHECK_INTEGRATION_GUARD_V4__ = true;

  const CONFIG = window.KINECHECK_ACADEMY_CONFIG || {};
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const COURSE_HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
  const APPLICATIONS = new Set([
    "kinecheck-clinico",
    "kinecheck-estudiante",
    "kinecheck-recupera",
  ]);
  const RECOMMENDED_COURSES = new Set([
    "comunicacion-clinica",
    "mas-alla-del-dolor",
    "evidencia-aplicada",
    "traumatologia-ortopedia-clinica",
  ]);
  const EXTERNAL_COURSE_URLS = Object.freeze({
    "mas-alla-del-dolor": "https://emmanuelkine.github.io/mas-alla-del-dolor/?course=mas-alla-del-dolor&v=20260801-sso4",
    "evidencia-aplicada": "https://emmanuelkine.github.io/kinecheck-evidencia-aplicada/?v=20260801-sso4",
  });
  const INTEGRATION_SUFFIX = " Acceso único en integración; tu licencia se conserva.";
  const ssoEnabled = CONFIG.appSso ? Boolean(CONFIG.appSso.enabled) : true;
  let applying = false;
  let recommendationNavigation = false;

  function cleanText(value) {
    return String(value || "").replace(INTEGRATION_SUFFIX, "").trim();
  }

  function setTextIfChanged(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function closeMobileNavigation() {
    document.querySelector("#academy-sidebar")?.classList.remove("open");
    const overlay = document.querySelector("#sidebar-overlay");
    if (overlay) overlay.hidden = true;
    document.querySelector("#mobile-menu")?.setAttribute("aria-expanded", "false");
  }

  function showStableToast(text) {
    const toast = document.querySelector("#kc-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(showStableToast.timer);
    showStableToast.timer = window.setTimeout(() => {
      toast.hidden = true;
    }, 4200);
  }

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function validCourseSession() {
    const session = readSession();
    const expiresAt = Number(session?.expires_at || 0);
    const now = Math.floor(Date.now() / 1000);

    if (!session?.access_token || (expiresAt && expiresAt <= now + 30)) {
      showStableToast("Tu sesión necesita renovarse. Actualiza KineCheck e ingresa nuevamente antes de abrir este curso.");
      return null;
    }
    return session;
  }

  function repositoryBasePath() {
    return location.hostname.endsWith("github.io")
      ? "/kinecheck-comunicacion-clinica"
      : "";
  }

  function recommendedCourseUrl(slug) {
    if (EXTERNAL_COURSE_URLS[slug]) return EXTERNAL_COURSE_URLS[slug];

    const base = repositoryBasePath();
    if (slug === "comunicacion-clinica") {
      return `${location.origin}${base}/?course=comunicacion-clinica&v=20260801-sso4`;
    }
    if (slug === "traumatologia-ortopedia-clinica") {
      return `${location.origin}${base}/traumatologia/?course=traumatologia-ortopedia-clinica&v=20260801-sso4`;
    }
    return "";
  }

  function writeCourseHandoff(session, product) {
    window.name = "";
    window.name = JSON.stringify({
      type: COURSE_HANDOFF_TYPE,
      issuedAt: Date.now(),
      product,
      session: {
        access_token: session.access_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type || "bearer",
        handoff_access_only: true,
      },
    });
  }

  function openRecommendedCourse(slug, button) {
    if (recommendationNavigation) return;

    const destination = recommendedCourseUrl(slug);
    if (!destination) {
      showStableToast("No fue posible encontrar la ruta de este curso.");
      return;
    }

    const session = validCourseSession();
    if (!session) return;

    recommendationNavigation = true;
    if (button) {
      button.setAttribute("aria-busy", "true");
      button.style.pointerEvents = "none";
    }

    writeCourseHandoff(session, slug);
    location.assign(destination);
  }

  function openLibrary(scrollTarget = "") {
    document.body.dataset.kcView = "biblioteca";

    document.querySelectorAll("[data-kc-view-link]").forEach((link) => {
      link.classList.toggle("active", link.dataset.kcViewLink === "biblioteca");
    });

    const evidence = document.querySelector("#evidencia-semanal");
    if (evidence) evidence.dataset.kcSection = "biblioteca";

    history.replaceState(null, "", "#biblioteca");
    closeMobileNavigation();

    window.requestAnimationFrame(() => {
      const target = scrollTarget ? document.getElementById(scrollTarget) : null;
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function installStableButtonHandlers() {
    if (window.__KINECHECK_STABLE_BUTTON_HANDLERS__) return;
    window.__KINECHECK_STABLE_BUTTON_HANDLERS__ = true;

    document.addEventListener("click", (event) => {
      const recommendation = event.target.closest("[data-kc-path-open]");
      const recommendationSlug = String(recommendation?.dataset.kcPathOpen || "").trim();

      if (recommendation && RECOMMENDED_COURSES.has(recommendationSlug)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openRecommendedCourse(recommendationSlug, recommendation);
        return;
      }

      const onboarding = event.target.closest("#onboarding-action");
      if (onboarding) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openLibrary("productos");
        return;
      }

      const libraryLink = event.target.closest('[data-kc-view-link="biblioteca"]');
      if (libraryLink) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openLibrary(libraryLink.dataset.kcScrollTarget || "");
        return;
      }

      const libraryScroll = event.target.closest("[data-kc-scroll-target]");
      if (libraryScroll) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openLibrary(libraryScroll.dataset.kcScrollTarget || "");
      }
    }, true);
  }

  function cleanEnabledPresentation() {
    (CONFIG.courses || []).forEach((course) => {
      if (!APPLICATIONS.has(course.slug)) return;

      course.integrationPending = false;
      const cleanSubtitle = cleanText(course.subtitle);
      if (course.subtitle !== cleanSubtitle) course.subtitle = cleanSubtitle;

      document.querySelectorAll(`[data-card-course="${CSS.escape(course.slug)}"] p`).forEach((paragraph) => {
        const cleaned = cleanText(paragraph.textContent);
        setTextIfChanged(paragraph, cleaned);
      });

      document.querySelectorAll(`[data-kc-path-open="${CSS.escape(course.slug)}"], [data-kc-path-explore="${CSS.escape(course.slug)}"]`).forEach((button) => {
        const paragraph = button.closest("article")?.querySelector("p");
        if (!paragraph) return;
        const cleaned = cleanText(paragraph.textContent);
        setTextIfChanged(paragraph, cleaned);
      });
    });
  }

  function markButton(button) {
    const slug = button?.dataset?.course;
    if (!APPLICATIONS.has(slug)) return;

    if (!button.disabled) button.disabled = true;
    if (button.getAttribute("aria-disabled") !== "true") button.setAttribute("aria-disabled", "true");
    const title = "Tu licencia está activa. El acceso único de esta aplicación todavía está en integración.";
    if (button.title !== title) button.title = title;
    setTextIfChanged(button, "Acceso único en integración");

    const card = button.closest("article");
    const status = card?.querySelector(".status-badge, .kc-status");
    if (status) {
      setTextIfChanged(status, "En integración");
      if (!status.classList.contains("preparing")) status.classList.add("preparing");
    }

    const meta = card?.querySelector(".course-meta");
    setTextIfChanged(meta, "Licencia activa · acceso único en integración");
  }

  function applyIntegrationState() {
    if (applying) return;
    applying = true;
    try {
      if (ssoEnabled) {
        cleanEnabledPresentation();
        return;
      }

      document.querySelectorAll("[data-course]").forEach(markButton);

      document.querySelectorAll("[data-kc-path-open]").forEach((button) => {
        if (!APPLICATIONS.has(button.dataset.kcPathOpen)) return;
        if (!button.disabled) button.disabled = true;
        if (button.getAttribute("aria-disabled") !== "true") button.setAttribute("aria-disabled", "true");
        setTextIfChanged(button, "En integración");
      });

      const continueButton = document.querySelector("#continue-button");
      if (continueButton && APPLICATIONS.has(continueButton.dataset.course)) {
        continueButton.hidden = true;
        continueButton.removeAttribute("data-course");
        setTextIfChanged(document.querySelector("#continue-heading"), "Elige un contenido disponible");
        setTextIfChanged(
          document.querySelector("#continue-copy"),
          "Tus licencias se conservan. Las aplicaciones Clínico, Estudiante y Recupera se habilitarán aquí cuando finalice su integración al acceso único.",
        );
      }
    } finally {
      applying = false;
    }
  }

  function start() {
    installStableButtonHandlers();
    applyIntegrationState();

    if (ssoEnabled) {
      window.setTimeout(applyIntegrationState, 150);
      window.setTimeout(applyIntegrationState, 700);
      return;
    }

    const observer = new MutationObserver(applyIntegrationState);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "data-course", "data-kc-path-open"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
