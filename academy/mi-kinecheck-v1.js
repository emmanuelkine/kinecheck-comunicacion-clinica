(() => {
  "use strict";

  if (window.__MI_KINECHECK_V1__) return;
  window.__MI_KINECHECK_V1__ = true;

  const VERSION = "20260806-unified1";
  const STUDENT_ORDER = [
    ["kinecheck-estudiante", "Practica el proceso guiado", "Aprende qué preguntar, observar y relacionar antes de avanzar."],
    ["mas-alla-del-dolor", "Comprende dolor, función y contexto", "Profundiza cuando ya puedas seguir el orden básico de evaluación."],
    ["comunicacion-clinica", "Comunica lo que comprendes", "Transforma hallazgos y decisiones en explicaciones claras."],
    ["evidencia-aplicada", "Justifica con evidencia", "Aprende a buscar, valorar y aplicar información clínica."],
    ["traumatologia-ortopedia-clinica", "Integra condiciones clínicas", "Usa la base anterior para analizar lesiones y decisiones seguras."],
  ];

  let lastSignature = "";
  let applyTimer = null;

  function loadStyles() {
    if (document.querySelector("link[data-mi-kinecheck]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `./mi-kinecheck-v1.css?v=${VERSION}`;
    link.dataset.miKinecheck = "true";
    document.head.appendChild(link);
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function setHtml(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.innerHTML = value;
  }

  function setLinkLabel(view, value) {
    document.querySelectorAll(`[data-kc-view-link="${view}"]`).forEach((item) => {
      const label = item.querySelector("span:last-child,small") || item;
      label.textContent = value;
    });
  }

  function hideViewLink(view, hidden) {
    document.querySelectorAll(`[data-kc-view-link="${view}"]`).forEach((item) => {
      if (item.closest(".kc-home-actions,.kc-section-heading")) return;
      item.classList.toggle("kc-role-hidden", hidden);
      item.setAttribute("aria-hidden", hidden ? "true" : "false");
      if (hidden) item.setAttribute("tabindex", "-1");
      else item.removeAttribute("tabindex");
    });
  }

  function courseButton(slug) {
    return [...document.querySelectorAll(`[data-course="${slug}"]`)].find((button) => !button.disabled) || null;
  }

  function ownedSlugs() {
    const result = new Set();
    document.querySelectorAll("button[data-course]:not([disabled])").forEach((button) => result.add(button.dataset.course));
    return result;
  }

  function ownerAccount() {
    const email = String(document.querySelector("#sidebar-email")?.textContent || document.querySelector("#account-email")?.textContent || "").trim().toLowerCase();
    return (window.KINECHECK_ACADEMY_CONFIG?.ownerEmails || []).map((item) => String(item).toLowerCase()).includes(email);
  }

  function detectRole(active) {
    if (ownerAccount()) return "professional";
    const nonPatient = [...active].filter((slug) => slug !== "kinecheck-recupera");
    if (active.has("kinecheck-recupera") && nonPatient.length === 0) return "patient";
    if (active.has("kinecheck-estudiante") && !active.has("kinecheck-clinico") && !active.has("kinecheck-clinico-curso")) return "student";
    return "professional";
  }

  function normalizeIdentity() {
    document.title = "Mi KineCheck";
    document.documentElement.classList.add("mi-kinecheck");
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Mi KineCheck: entra una vez y accede a los productos asociados a tu compra.");

    setText(".login-showcase .brand > div > span", "UNA CUENTA · UN ACCESO");
    setText(".login-showcase > .eyebrow", "MI KINECHECK");
    setHtml("#login-title", "Entra una vez.<br><em>Continúa desde aquí.</em>");
    setText(".login-showcase .lead", "Tus cursos y herramientas aparecen aquí según las compras asociadas a tu correo.");
    setText("#auth-default-panel > .eyebrow", "MI KINECHECK");
    setText("#auth-default-panel h2", "Entrar");
    setText("#auth-default-panel > p", "Usa el mismo correo de tu compra en Hotmart.");
    setText("#auth-submit", "Entrar a Mi KineCheck");
    setText(".mobile-brand > div > span", "UN SOLO ACCESO");
    setText(".sidebar-brand > div > span", "MI KINECHECK");
    setText(".topbar-brand > div > span", "MI KINECHECK");

    setLinkLabel("inicio", "Inicio");
    setLinkLabel("biblioteca", "Mis productos");
    setLinkLabel("herramientas", "Recursos");
    setLinkLabel("perfil", "Cuenta y ayuda");

    document.querySelectorAll(".kc-explore-link span").forEach((node) => { node.textContent = "Conocer otros productos"; });
    setText("#home-library-title", "Recursos para seguir aprendiendo");
    setText("#home-courses-title", "Tu aprendizaje");
    setText("#home-apps-title", "Tus herramientas");

    document.querySelectorAll("p,span,strong,h1,h2,h3").forEach((node) => {
      if (node.children.length) return;
      if (!/Academy|ecosistema|biblioteca clásica|plataforma 5\.0/i.test(node.textContent)) return;
      node.textContent = node.textContent
        .replace(/KineCheck Academy/gi, "Mi KineCheck")
        .replace(/Academy clásica/gi, "Mi KineCheck")
        .replace(/Academy/gi, "Mi KineCheck")
        .replace(/ecosistema KineCheck/gi, "Mi KineCheck")
        .replace(/tu ecosistema clínico/gi, "Mi KineCheck")
        .replace(/PLATAFORMA 5\.0/gi, "MI KINECHECK");
    });
  }

  function clearRoleLayout() {
    document.querySelector("#kc-guided-experience")?.remove();
    document.querySelectorAll(".kc-home-section,#onboarding,.continue-panel,.kc-explore-link").forEach((node) => node.classList.remove("kc-role-hidden"));
    hideViewLink("biblioteca", false);
    hideViewLink("herramientas", false);
    hideViewLink("perfil", false);
  }

  function proxyButton(slug, label) {
    const active = Boolean(courseButton(slug));
    return `<button type="button" data-kc-open-owned="${slug}" ${active ? "" : "disabled"}>${active ? label : "No incluido en tu cuenta"}</button>`;
  }

  function patientLayout() {
    document.body.dataset.kcExperience = "patient";
    setLinkLabel("inicio", "Hoy");
    setLinkLabel("biblioteca", "Mi plan");
    setLinkLabel("perfil", "Ayuda");
    hideViewLink("herramientas", true);

    setText(".kc-home-hero .eyebrow", "MI RECUPERACIÓN");
    setHtml(".kc-home-hero h1", "Tu plan.<br><em>Claro y a mano.</em>");
    setText("#welcome", "Aquí verás solo lo necesario para seguir tu plan y registrar cómo te sientes.");
    setText("#kc-home-continue", "Abrir mi plan");
    document.querySelector('.kc-home-actions [data-kc-view-link="explorar"]')?.classList.add("kc-role-hidden");
    setText("#continue-heading", "KineCheck Recupera");
    setText("#continue-copy", "Revisa lo indicado para hoy, registra cómo estás y observa tu avance.");

    document.querySelector("#onboarding")?.classList.add("kc-role-hidden");
    document.querySelector(".kc-explore-link")?.classList.add("kc-role-hidden");
    ["#home-courses-title", "#home-library-title", "#home-news-title"].forEach((selector) => {
      document.querySelector(selector)?.closest(".kc-home-section")?.classList.add("kc-role-hidden");
    });

    const section = document.createElement("section");
    section.id = "kc-guided-experience";
    section.className = "kc-guided-experience patient";
    section.innerHTML = `
      <div class="kc-guided-heading"><span>ASÍ DE SIMPLE</span><h2>Tres acciones para tu día.</h2><p>No necesitas navegar cursos, evidencia ni herramientas clínicas.</p></div>
      <div class="kc-patient-actions">
        <article><b>1</b><strong>Revisa tu plan</strong><p>Mira qué corresponde hacer hoy.</p></article>
        <article><b>2</b><strong>Registra cómo estás</strong><p>Responde preguntas breves y comprensibles.</p></article>
        <article><b>3</b><strong>Observa tu avance</strong><p>Usa la información para conversar con tu profesional.</p></article>
      </div>
      ${proxyButton("kinecheck-recupera", "Abrir KineCheck Recupera")}
      <small>Recupera no diagnostica ni reemplaza la atención profesional o de urgencia.</small>
    `;
    document.querySelector("#inicio")?.after(section);

    document.querySelectorAll('[data-course="kinecheck-recupera"]').forEach((button) => {
      if (!button.disabled) button.textContent = "Abrir mi plan";
    });
  }

  function studentLayout(active) {
    document.body.dataset.kcExperience = "student";
    setLinkLabel("inicio", "Mi ruta");
    setLinkLabel("biblioteca", "Mis productos");
    setLinkLabel("herramientas", "Recursos");
    setLinkLabel("perfil", "Cuenta y ayuda");

    setText(".kc-home-hero .eyebrow", "MI RUTA DE APRENDIZAJE");
    setHtml(".kc-home-hero h1", "Un paso primero.<br><em>Después, el siguiente.</em>");
    setText("#welcome", "Mi KineCheck ordena tus productos para que sepas dónde comenzar y cómo continuar.");
    setText("#kc-home-continue", "Continuar mi ruta");
    setText("#continue-copy", "Retoma el producto que ya comenzaste o abre el primer paso disponible.");
    setText("#home-courses-title", "Cursos para profundizar");
    setText("#home-apps-title", "Práctica guiada");
    document.querySelector("#onboarding")?.classList.add("kc-role-hidden");
    document.querySelector("#home-news-title")?.closest(".kc-home-section")?.classList.add("kc-role-hidden");

    const available = STUDENT_ORDER.filter(([slug]) => active.has(slug));
    const section = document.createElement("section");
    section.id = "kc-guided-experience";
    section.className = "kc-guided-experience student";
    section.innerHTML = `
      <div class="kc-guided-heading"><span>ORDEN RECOMENDADO</span><h2>Tu ruta con los productos que ya tienes.</h2><p>La secuencia reduce la sensación de tener muchas experiencias separadas.</p></div>
      <ol class="kc-student-path">
        ${available.length ? available.map(([slug, title, copy], index) => `
          <li class="${index === 0 ? "next" : ""}"><b>${index + 1}</b><div><strong>${title}</strong><p>${copy}</p>${proxyButton(slug, index === 0 ? "Comenzar aquí" : "Abrir")}</div></li>
        `).join("") : '<li class="empty"><div><strong>Aún no hay productos activos.</strong><p>Revisa que hayas ingresado con el mismo correo usado en Hotmart.</p></div></li>'}
      </ol>
      <div class="kc-learning-rule"><strong>Regla de avance:</strong> no pases al siguiente producto hasta poder explicar qué información buscas, qué significa y qué decisión puede cambiar.</div>
    `;
    document.querySelector("#inicio")?.after(section);

    document.querySelectorAll('[data-course="kinecheck-estudiante"]').forEach((button) => {
      if (!button.disabled) button.textContent = "Empezar práctica guiada";
    });
  }

  function professionalLayout() {
    document.body.dataset.kcExperience = "professional";
    setText(".kc-home-hero .eyebrow", "MI KINECHECK");
    setHtml(".kc-home-hero h1", '<span id="kc-welcome-name">Bienvenido</span>.<br><em>Continúa donde quedaste.</em>');
    setText("#welcome", "Accede a tus cursos y herramientas desde un solo espacio.");
    setText("#kc-home-continue", "Continuar actividad");
  }

  function applyRole() {
    normalizeIdentity();
    if (document.querySelector("#dashboard-view")?.hidden) return;

    const active = ownedSlugs();
    const signature = `${[...active].sort().join("|")}|${ownerAccount()}`;
    if (!active.size || signature === lastSignature) return;
    lastSignature = signature;

    clearRoleLayout();
    const role = detectRole(active);
    if (role === "patient") patientLayout();
    else if (role === "student") studentLayout(active);
    else professionalLayout();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-kc-open-owned]");
    if (!button || button.disabled) return;
    courseButton(button.dataset.kcOpenOwned)?.click();
  });

  function schedule() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyRole, 80);
  }

  loadStyles();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "disabled"] });
})();
