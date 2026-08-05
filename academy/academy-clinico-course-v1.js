(() => {
  if (window.__KINECHECK_CLINICO_COURSE_V1__) return;
  window.__KINECHECK_CLINICO_COURSE_V1__ = true;

  const CONFIG = window.KINECHECK_ACADEMY_CONFIG;
  if (!CONFIG?.courses || !Array.isArray(CONFIG.courses)) return;

  const APP_SLUG = "kinecheck-clinico";
  const COURSE_SLUG = "kinecheck-clinico-curso";
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";

  const guide = CONFIG.courses.find((course) => course.slug === APP_SLUG);
  if (guide) {
    guide.title = "Guía complementaria KineCheck Clínico";
    guide.subtitle = "Revisión estructurada de seguridad, hipótesis, examen y reevaluación. No reemplaza la ficha clínica institucional.";
    guide.audience = "Profesionales";
    guide.kind = "tool";
    guide.url = "../kinecheck-clinico-guia/?product=kinecheck-clinico&v=20260806-2";
    delete guide.ssoProduct;
  }

  if (!CONFIG.courses.some((course) => course.slug === COURSE_SLUG)) {
    const course = {
      slug: COURSE_SLUG,
      title: "KineCheck Clínico",
      subtitle: "Curso profesional de evaluación, seguridad y razonamiento musculoesquelético.",
      productId: "8150019",
      icon: "KC",
      kind: "course",
      audience: "Profesionales",
      audienceKey: "professionals",
      audiences: ["professionals"],
      modules: 10,
      status: "active",
      url: "../kinecheck-clinico-curso/?course=kinecheck-clinico-curso&v=20260806-2",
    };
    const guideIndex = CONFIG.courses.findIndex((item) => item.slug === APP_SLUG);
    CONFIG.courses.splice(Math.max(0, guideIndex + 1), 0, course);
  }

  function readSession() {
    const provided = window.KINECHECK_ACADEMY_SESSION?.get?.();
    if (provided?.access_token) return provided;
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  }

  async function validSession() {
    let session = readSession();
    const now = Math.floor(Date.now() / 1000);
    if ((!session?.access_token || (Number(session.expires_at || 0) && Number(session.expires_at) <= now + 60))
      && typeof window.KINECHECK_ACADEMY_SESSION?.refresh === "function") {
      session = await window.KINECHECK_ACADEMY_SESSION.refresh().catch(() => null);
    }
    return session?.access_token ? session : null;
  }

  function destination() {
    const base = location.hostname.endsWith("github.io") ? "/kinecheck-comunicacion-clinica" : "";
    return `${location.origin}${base}/kinecheck-clinico-curso/?course=${COURSE_SLUG}&v=20260806-2`;
  }

  async function openCourse(button) {
    if (button.dataset.kcClinicoOpening === "true") return;
    button.dataset.kcClinicoOpening = "true";
    button.setAttribute("aria-busy", "true");
    const session = await validSession();
    if (!session) {
      button.removeAttribute("aria-busy");
      button.dataset.kcClinicoOpening = "false";
      document.querySelector("#kc-toast")?.removeAttribute("hidden");
      return;
    }
    const accessOnly = {
      access_token: session.access_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type || "bearer",
      handoff_access_only: true,
    };
    window.name = JSON.stringify({
      type: HANDOFF_TYPE,
      issuedAt: Date.now(),
      product: COURSE_SLUG,
      session: accessOnly,
    });
    location.assign(destination());
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(`[data-course="${COURSE_SLUG}"], [data-kc-open-product="${COURSE_SLUG}"]`);
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openCourse(button);
  }, true);

  document.dispatchEvent(new CustomEvent("kinecheck:catalog-updated", { detail: { product: COURSE_SLUG } }));
})();
