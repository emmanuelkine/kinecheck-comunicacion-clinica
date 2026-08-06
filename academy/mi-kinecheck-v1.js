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

  let signature = "";
  let timer = null;

  function loadStyles() {
    if (document.querySelector("link[data-mi-kinecheck]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `./mi-kinecheck-v1.css?v=${VERSION}`;
    link.dataset.miKinecheck = "true";
    document.head.appendChild(link);
  }

  function text(selector, value) {
    const node = document.querySelector(selector);
    if (node && node.textContent !== value) node.textContent = value;
  }

  function html(selector, value) {
    const node = document.querySelector(selector);
    if (node && node.innerHTML !== value) node.innerHTML = value;
  }

  function linkLabel(view, value) {
    document.querySelectorAll(`[data-kc-view-link="${view}"]`).forEach((item) => {
      const label = item.querySelector("span:last-child,small") || item;
      if (label.textContent !== value) label.textContent = value;
    });
  }

  function hideLink(view, hidden) {
    document.querySelectorAll(`[data-kc-view-link="${view}"]`).forEach((item) => {
      if (item.closest(".kc-home-actions,.kc-section-heading")) return;
      item.classList.toggle("kc-role-hidden", hidden);
      item.setAttribute("aria-hidden", hidden ? "true" : "false");
      if (hidden) item.setAttribute("tabindex", "-1");
      else item.removeAttribute("tabindex");
    });
  }

  function openButton(slug) {
    return [...document.querySelectorAll(`[data-course="${slug}"]`)].find((button) => !button.disabled) || null;
  }

  function activeSlugs() {
    const slugs = new Set();
    document.querySelectorAll("button[data-course]:not([disabled])").forEach((button) => slugs.add(button.dataset.course));
    return slugs;
  }

  function isOwner() {
    const email = String(document.querySelector("#sidebar-email")?.textContent || document.querySelector("#account-email")?.textContent || "").trim().toLowerCase();
    return (window.KINECHECK_ACADEMY_CONFIG?.ownerEmails || []).map((item) => String(item).toLowerCase()).includes(email);
  }

  function roleFor(slugs) {
    if (isOwner()) return "professional";
    const nonPatient = [...slugs].filter((slug) => slug !== "kinecheck-recupera");
    if (slugs.has("kinecheck-recupera") && nonPatient.length === 0) return "patient";
    if (slugs.has("kinecheck-estudiante") && !slugs.has("kinecheck-clinico") && !slugs.has("kinecheck-clinico-curso")) return "student";
    return "professional";
  }

  function identity() {
    if (document.title !== "Mi KineCheck") document.title = "Mi KineCheck";
    document.documentElement.classList.add("mi-kinecheck");
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Mi KineCheck: entra una vez y accede a los productos asociados a tu compra.");
    text(".login-showcase .brand > div > span", "UNA CUENTA · UN ACCESO");
    text(".login-showcase > .eyebrow", "MI KINECHECK");
    html("#login-title", "Entra una vez.<br><em>Continúa desde aquí.</em>");
    text(".login-showcase .lead", "Tus cursos y herramientas aparecen aquí según las compras asociadas a tu correo.");
    text("#auth-default-panel > .eyebrow", "MI KINECHECK");
    text("#auth-default-panel h2", "Entrar");
    text("#auth-default-panel > p", "Usa el mismo correo de tu compra en Hotmart.");
    text("#auth-submit", "Entrar a Mi KineCheck");
    text(".mobile-brand > div > span", "UN SOLO ACCESO");
    text(".sidebar-brand > div > span", "MI KINECHECK");
    text(".topbar-brand > div > span", "MI KINECHECK");

    if (!document.body.dataset.kcExperience) {
      linkLabel("inicio", "Inicio");
      linkLabel("biblioteca", "Mis productos");
      linkLabel("herramientas", "Recursos");
      linkLabel("perfil", "Cuenta y ayuda");
      text("#home-library-title", "Recursos para seguir aprendiendo");
      text("#home-courses-title", "Tu aprendizaje");
      text("#home-apps-title", "Tus herramientas");
    }

    document.querySelectorAll(".kc-explore-link span").forEach((node) => {
      if (node.textContent !== "Conocer otros productos") node.textContent = "Conocer otros productos";
    });

    document.querySelectorAll("p,span,strong,h1,h2,h3").forEach((node) => {
      if (node.children.length) return;
      const before = node.textContent;
      if (!/Academy|ecosistema|biblioteca clásica|plataforma 5\.0/i.test(before)) return;
      const after = before
        .replace(/KineCheck Academy/gi, "Mi KineCheck")
        .replace(/Academy clásica/gi, "Mi KineCheck")
        .replace(/Academy/gi, "Mi KineCheck")
        .replace(/ecosistema KineCheck/gi, "Mi KineCheck")
        .replace(/tu ecosistema clínico/gi, "Mi KineCheck")
        .replace(/PLATAFORMA 5\.0/gi, "MI KINECHECK");
      if (after !== before) node.textContent = after;
    });
  }

  function resetRole() {
    document.querySelector("#kc-guided-experience")?.remove();
    document.querySelectorAll(".kc-home-section,#onboarding,.continue-panel,.kc-explore-link").forEach((node) => node.classList.remove("kc-role-hidden"));
    ["biblioteca", "herramientas", "perfil"].forEach((view) => hideLink(view, false));
  }

  function action(slug, label) {
    const available = Boolean(openButton(slug));
    return `<button type="button" data-kc-open-owned="${slug}" ${available ? "" : "disabled"}>${available ? label : "No incluido en tu cuenta"}</button>`;
  }

  function patient() {
    document.body.dataset.kcExperience = "patient";
    linkLabel("inicio", "Hoy");
    linkLabel("biblioteca", "Mi plan");
    linkLabel("perfil", "Ayuda");
    hideLink("herramientas", true);
    text(".kc-home-hero .eyebrow", "MI RECUPERACIÓN");
    html(".kc-home-hero h1", "Tu plan.<br><em>Claro y a mano.</em>");
    text("#welcome", "Aquí verás solo lo necesario para seguir tu plan y registrar cómo te sientes.");
    text("#kc-home-continue", "Abrir mi plan");
    text("#continue-heading", "KineCheck Recupera");
    text("#continue-copy", "Revisa lo indicado para hoy, registra cómo estás y observa tu avance.");
    document.querySelector('.kc-home-actions [data-kc-view-link="explorar"]')?.classList.add("kc-role-hidden");
    document.querySelector("#onboarding")?.classList.add("kc-role-hidden");
    document.querySelector(".kc-explore-link")?.classList.add("kc-role-hidden");
    ["#home-courses-title", "#home-library-title", "#home-news-title"].forEach((selector) => document.querySelector(selector)?.closest(".kc-home-section")?.classList.add("kc-role-hidden"));

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
      ${action("kinecheck-recupera", "Abrir KineCheck Recupera")}
      <small>Recupera no diagnostica ni reemplaza la atención profesional o de urgencia.</small>
    `;
    document.querySelector("#inicio")?.after(section);
    document.querySelectorAll('[data-course="kinecheck-recupera"]').forEach((button) => {
      if (!button.disabled && button.textContent !== "Abrir mi plan") button.textContent = "Abrir mi plan";
    });
  }

  function student(slugs) {
    document.body.dataset.kcExperience = "student";
    linkLabel("inicio", "Mi ruta");
    linkLabel("biblioteca", "Mis productos");
    linkLabel("herramientas", "Recursos");
    linkLabel("perfil", "Cuenta y ayuda");
    text(".kc-home-hero .eyebrow", "MI RUTA DE APRENDIZAJE");
    html(".kc-home-hero h1", "Un paso primero.<br><em>Después, el siguiente.</em>");
    text("#welcome", "Mi KineCheck ordena tus productos para que sepas dónde comenzar y cómo continuar.");
    text("#kc-home-continue", "Continuar mi ruta");
    text("#continue-copy", "Retoma el producto que ya comenzaste o abre el primer paso disponible.");
    text("#home-courses-title", "Cursos para profundizar");
    text("#home-apps-title", "Práctica guiada");
    document.querySelector("#onboarding")?.classList.add("kc-role-hidden");
    document.querySelector("#home-news-title")?.closest(".kc-home-section")?.classList.add("kc-role-hidden");

    const available = STUDENT_ORDER.filter(([slug]) => slugs.has(slug));
    const section = document.createElement("section");
    section.id = "kc-guided-experience";
    section.className = "kc-guided-experience student";
    section.innerHTML = `
      <div class="kc-guided-heading"><span>ORDEN RECOMENDADO</span><h2>Tu ruta con los productos que ya tienes.</h2><p>La secuencia reduce la sensación de tener muchas experiencias separadas.</p></div>
      <ol class="kc-student-path">
        ${available.length ? available.map(([slug, title, copy], index) => `<li class="${index === 0 ? "next" : ""}"><b>${index + 1}</b><div><strong>${title}</strong><p>${copy}</p>${action(slug, index === 0 ? "Comenzar aquí" : "Abrir")}</div></li>`).join("") : '<li class="empty"><div><strong>Aún no hay productos activos.</strong><p>Revisa que hayas ingresado con el mismo correo usado en Hotmart.</p></div></li>'}
      </ol>
      <div class="kc-learning-rule"><strong>Regla de avance:</strong> no pases al siguiente producto hasta poder explicar qué información buscas, qué significa y qué decisión puede cambiar.</div>
    `;
    document.querySelector("#inicio")?.after(section);
    document.querySelectorAll('[data-course="kinecheck-estudiante"]').forEach((button) => {
      if (!button.disabled && button.textContent !== "Empezar práctica guiada") button.textContent = "Empezar práctica guiada";
    });
  }

  function professional() {
    document.body.dataset.kcExperience = "professional";
    linkLabel("inicio", "Inicio");
    linkLabel("biblioteca", "Mis productos");
    linkLabel("herramientas", "Recursos");
    linkLabel("perfil", "Cuenta y ayuda");
    text(".kc-home-hero .eyebrow", "MI KINECHECK");
    html(".kc-home-hero h1", '<span id="kc-welcome-name">Bienvenido</span>.<br><em>Continúa donde quedaste.</em>');
    text("#welcome", "Accede a tus cursos y herramientas desde un solo espacio.");
    text("#kc-home-continue", "Continuar actividad");
  }

  function apply() {
    identity();
    if (document.querySelector("#dashboard-view")?.hidden) return;
    const slugs = activeSlugs();
    if (!slugs.size) return;
    const next = `${[...slugs].sort().join("|")}|${isOwner()}`;
    if (next === signature) return;
    signature = next;
    resetRole();
    const role = roleFor(slugs);
    if (role === "patient") patient();
    else if (role === "student") student(slugs);
    else professional();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-kc-open-owned]");
    if (!button || button.disabled) return;
    openButton(button.dataset.kcOpenOwned)?.click();
  });

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 80);
  }

  loadStyles();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "disabled"] });
})();
