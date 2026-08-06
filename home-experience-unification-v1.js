(() => {
  "use strict";

  if (window.__KC_PUBLIC_EXPERIENCE_V1__) return;
  window.__KC_PUBLIC_EXPERIENCE_V1__ = true;

  const VERSION = "20260806-unified1";
  const PRIVATE_URL = new URL(`./academy/?v=${VERSION}`, location.href).toString();

  function loadStyles() {
    if (document.querySelector("link[data-kc-public-unified]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(`./home-experience-unification-v1.css?v=${VERSION}`, location.href).toString();
    link.dataset.kcPublicUnified = "true";
    document.head.appendChild(link);
  }

  function text(selector, value) {
    const node = document.querySelector(selector);
    if (node && node.textContent !== value) node.textContent = value;
  }

  function accessLinks() {
    document.querySelectorAll('a[href*="/academy/"],a[href*="/platform/"]').forEach((link) => {
      if (link.href !== PRIVATE_URL) link.href = PRIVATE_URL;
      const current = link.textContent.trim().toLowerCase();
      let label = "";
      if (link.classList.contains("enter") || current.includes("ya tengo") || current.includes("ya compr")) {
        label = "Ya compré: entrar";
      } else if (current.includes("biblioteca") || current.includes("ingresar") || current.includes("abrir")) {
        label = "Entrar a Mi KineCheck";
      }
      if (label && link.textContent.trim() !== label) link.textContent = label;
      if (label && link.getAttribute("aria-label") !== label) link.setAttribute("aria-label", label);
    });
  }

  function replaceAcademyWords() {
    document.querySelectorAll("p,span,strong,h1,h2,h3,summary").forEach((node) => {
      if (node.children.length) return;
      const value = node.textContent;
      if (!/Academy|plataforma KineCheck|mi biblioteca|tu biblioteca|una sola biblioteca/i.test(value)) return;
      const next = value
        .replace(/KineCheck Academy/gi, "Mi KineCheck")
        .replace(/Academy/gi, "Mi KineCheck")
        .replace(/plataforma KineCheck/gi, "Mi KineCheck")
        .replace(/mi biblioteca/gi, "Mi KineCheck")
        .replace(/tu biblioteca/gi, "tus productos")
        .replace(/una sola biblioteca/gi, "un solo acceso");
      if (next !== value) node.textContent = next;
    });
  }

  function updateProduct(slug, config) {
    const card = document.querySelector(`[data-product-card][data-course="${slug}"]`);
    if (!card) return;
    card.classList.add(`kc-${config.role}-product`);
    const subtitle = card.querySelector(".subtitle");
    if (subtitle && subtitle.textContent !== config.subtitle) subtitle.textContent = config.subtitle;
    const list = card.querySelector("ul");
    const listHtml = config.items.map((item) => `<li>${item}</li>`).join("");
    if (list && list.innerHTML !== listHtml) list.innerHTML = listHtml;
    const type = card.querySelector(".product-type");
    if (type && config.type && type.textContent !== config.type) type.textContent = config.type;
    if (!card.querySelector(".kc-role-badge")) {
      const badge = document.createElement("span");
      badge.className = `kc-role-badge ${config.role}`;
      badge.textContent = config.badge;
      card.querySelector(".product-top")?.appendChild(badge);
    }
  }

  function installRoutePanel() {
    if (document.querySelector("#kc-clear-routes")) return;
    const products = document.querySelector("#productos");
    if (!products) return;

    const section = document.createElement("section");
    section.id = "kc-clear-routes";
    section.className = "section kc-clear-routes";
    section.innerHTML = `
      <div class="section-heading centered">
        <span class="eyebrow">TRES RUTAS CLARAS</span>
        <h2>Una sola entrada. Una experiencia adecuada para cada persona.</h2>
        <p>No necesitas entender la arquitectura de KineCheck. Elige tu situación y comienza por el producto recomendado.</p>
      </div>
      <div class="kc-route-grid">
        <article class="kc-route-card professional">
          <span>PROFESIONAL</span><h3>Profundizar y decidir</h3>
          <p>Formación avanzada, evidencia y herramientas complementarias para la práctica.</p>
          <button type="button" data-kc-public-filter="professionals">Ver ruta profesional</button>
        </article>
        <article class="kc-route-card student">
          <span>ESTUDIANTE</span><h3>Aprender en un orden</h3>
          <p>Primero practica el proceso guiado; después profundiza con cursos y casos.</p>
          <ol><li>KineCheck Estudiante</li><li>Más allá del dolor</li><li>Cursos clínicos según tu avance</li></ol>
          <button type="button" data-kc-public-filter="students">Ver ruta estudiante</button>
        </article>
        <article class="kc-route-card patient">
          <span>PACIENTE</span><h3>Seguir mi plan</h3>
          <p>Una experiencia simple para revisar lo indicado, registrar cómo te sientes y ver tu avance.</p>
          <button type="button" data-kc-public-filter="patients">Ver KineCheck Recupera</button>
        </article>
      </div>
    `;
    products.before(section);

    section.addEventListener("click", (event) => {
      const button = event.target.closest("[data-kc-public-filter]");
      if (!button) return;
      document.querySelector(`[data-filter="${button.dataset.kcPublicFilter}"]`)?.click();
      products.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function apply() {
    loadStyles();
    document.documentElement.classList.add("kc-public-unified");
    document.title = "KineCheck | Elige tu ruta y entra a Mi KineCheck";

    text(".announcement strong", "Una cuenta. Un acceso. Tus productos en Mi KineCheck.");
    text(".ecosystem-head .eyebrow", "MI KINECHECK");
    text(".ecosystem-head h2", "Todo lo que adquiriste, organizado detrás de una sola entrada.");
    text("#rutas .section-heading h2", "Elige tu ruta sin aprenderte nombres ni puertas.");
    text("#rutas .section-heading p", "Profesional, estudiante o paciente: cada perfil comienza en un lugar distinto, pero todos entran por Mi KineCheck.");

    const patientAudience = document.querySelector(".patient-card p");
    if (patientAudience && patientAudience.textContent !== "Quiero revisar mi plan, registrar cómo me siento y ver mi avance sin términos complicados.") patientAudience.textContent = "Quiero revisar mi plan, registrar cómo me siento y ver mi avance sin términos complicados.";
    const studentAudience = document.querySelector(".student-card p");
    if (studentAudience && studentAudience.textContent !== "Quiero saber qué estudiar primero y avanzar desde la práctica guiada hacia cursos clínicos.") studentAudience.textContent = "Quiero saber qué estudiar primero y avanzar desde la práctica guiada hacia cursos clínicos.";

    updateProduct("kinecheck-estudiante", {
      role: "student", badge: "EMPIEZA AQUÍ", type: "APRENDIZAJE GUIADO · 12 MESES",
      subtitle: "Tu primer paso para aprender evaluación y razonamiento clínico",
      items: ["Recorrido guiado: qué preguntar, observar y relacionar", "Práctica paso a paso antes de los cursos avanzados", "Checklist para reconocer lo que falta", "Acceso durante 12 meses"],
    });
    updateProduct("kinecheck-recupera", {
      role: "patient", badge: "SIMPLE Y DIRECTO", type: "MI RECUPERACIÓN · 3 MESES",
      subtitle: "Tu plan, tu registro y tu avance en un solo lugar",
      items: ["Revisa qué corresponde hacer hoy", "Registra cómo te sientes con preguntas simples", "Observa tu avance sin interpretar datos clínicos", "Acceso durante 3 meses"],
    });
    updateProduct("pack-estudiante", {
      role: "student", badge: "RUTA INTEGRADA", type: "RUTA ESTUDIANTE · 12 MESES",
      subtitle: "Primero practica el proceso; luego comprende el dolor y el contexto",
      items: ["Paso 1: KineCheck Estudiante", "Paso 2: curso Más allá del dolor", "Dos experiencias conectadas, no dos puertas distintas", "Acceso a ambos productos durante 12 meses"],
    });

    installRoutePanel();
    accessLinks();
    replaceAcademyWords();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once: true });
  else apply();

  const observer = new MutationObserver(() => {
    accessLinks();
    replaceAcademyWords();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
