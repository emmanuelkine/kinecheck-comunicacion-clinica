(() => {
  "use strict";

  if (window.__KINECHECK_CLINICAL_INTERIOR_V1__) return;
  window.__KINECHECK_CLINICAL_INTERIOR_V1__ = true;

  const CONFIG = Object.freeze({
    "kc-scales-library": Object.freeze({
      product: "Escalas Clínicas",
      eyebrow: "RECURSO ACTIVO · MEDICIÓN CLÍNICA",
      guideTitle: "Cómo usar Escalas Clínicas en consulta",
      guideCopy: "Un flujo breve para elegir una medida útil, registrar una línea base reproducible y seguir cambios que importan a la persona.",
      steps: [
        ["Define", "Aclara el constructo", "Función, síntomas, participación, calidad de vida o dominio psicosocial."],
        ["Selecciona", "Elige población y versión", "Prefiere el instrumento y la adaptación lingüística validados para tu contexto."],
        ["Registra", "Establece línea base", "Anota fecha, versión, puntaje, actividades relevantes y condiciones de aplicación."],
        ["Reevalúa", "Compara con contexto", "Usa la misma versión y relaciona el cambio con metas, desempeño y evolución clínica."],
      ],
      glossary: [
        ["PROM", "Resultado informado por la persona; describe impacto y evolución, no estructura anatómica."],
        ["MDC", "Cambio mínimo que probablemente supera el error de medición en una población concreta."],
        ["MCID", "Cambio percibido como importante; depende del método, población y horizonte temporal."],
        ["Tendencia", "La serie longitudinal suele aportar más que interpretar un único puntaje de forma aislada."],
      ],
      cardValues: [
        ["Decisión clínica", "Sigue tendencia + meta funcional"],
        ["Registro mínimo", "Fecha · versión · puntaje · actividad"],
        ["Evita", "Usarlo como diagnóstico estructural"],
      ],
    }),
    "kc-special-tests-library": Object.freeze({
      product: "Pruebas Especiales",
      eyebrow: "RECURSO ACTIVO · EXAMEN FÍSICO",
      guideTitle: "Cómo usar Pruebas Especiales con razonamiento clínico",
      guideCopy: "La prueba especial aporta cuando responde una pregunta concreta y modifica una probabilidad clínica; no cuando se acumulan maniobras sin hipótesis previa.",
      steps: [
        ["Pregunta", "Define la hipótesis", "Formula qué condición o hallazgo quieres volver más o menos probable antes de examinar."],
        ["Pretest", "Estima probabilidad inicial", "Integra historia, mecanismo, prevalencia, evolución y hallazgos previos al test."],
        ["Test", "Ejecuta con precisión", "Respeta posición, carga, criterio de positividad y secuencia descrita para la maniobra."],
        ["Integra", "Actualiza la hipótesis", "Combina resultado, LR cuando exista, examen completo e imagen solo cuando esté indicada."],
      ],
      glossary: [
        ["Sensibilidad", "Proporción de personas con la condición que tienen un test positivo en la muestra estudiada."],
        ["Especificidad", "Proporción sin la condición que tienen un test negativo en la muestra estudiada."],
        ["LR+", "Cuánto aumenta las odds de la condición tras un resultado positivo."],
        ["LR−", "Cuánto disminuyen las odds de la condición tras un resultado negativo."],
      ],
      cardValues: [
        ["Antes del test", "Estima probabilidad pretest"],
        ["Después", "Actualiza hipótesis con el resultado"],
        ["Evita", "Diagnóstico basado en un test aislado"],
      ],
    }),
  });

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function guideMarkup(cfg) {
    return `
      <section class="kc-interior-guide" aria-label="Guía de uso profesional">
        <div class="kc-interior-guide-head">
          <div>
            <span>Guía de uso profesional</span>
            <h3>${cfg.guideTitle}</h3>
            <p>${cfg.guideCopy}</p>
          </div>
        </div>
        <div class="kc-interior-steps">
          ${cfg.steps.map((step, index) => `
            <div class="kc-interior-step">
              <b>${index + 1}</b>
              <strong>${step[1]}</strong>
              <span>${step[2]}</span>
            </div>
          `).join("")}
        </div>
        <div class="kc-interior-glossary">
          ${cfg.glossary.map((term) => `
            <div class="kc-interior-term">
              <strong>${term[0]}</strong>
              <span>${term[1]}</span>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function shellMarkup(cfg) {
    return `
      <section class="kc-interior-shell" aria-label="Controles del recurso">
        <div class="kc-interior-status">
          <strong>${cfg.eyebrow}</strong>
          <span>Estás dentro de ${cfg.product}</span>
        </div>
        <div class="kc-interior-actions">
          <button class="kc-interior-button primary" type="button" data-kc-interior-action="library">← Volver a Biblioteca</button>
          <button class="kc-interior-button" type="button" data-kc-interior-action="expand">Expandir todo</button>
          <button class="kc-interior-button" type="button" data-kc-interior-action="collapse">Contraer</button>
          <button class="kc-interior-button" type="button" data-kc-interior-action="top">Inicio del recurso</button>
        </div>
        <div class="kc-interior-search-wrap">
          <input class="kc-interior-search" type="search" autocomplete="off" spellcheck="false" placeholder="Buscar por escala, prueba, región, población o concepto…" aria-label="Buscar dentro de ${cfg.product}">
          <span class="kc-interior-search-count" aria-live="polite">Todo visible</span>
        </div>
      </section>
    `;
  }

  function quickNavMarkup(section) {
    const labels = [...section.querySelectorAll("details.kc-clinical-group > summary")].map((summary, index) => ({
      label: summary.textContent.trim(),
      index,
    }));
    if (!labels.length) return "";
    return `
      <nav class="kc-interior-quicknav" aria-label="Navegación rápida del recurso">
        <strong>Ir directamente a una sección</strong>
        <div class="kc-interior-navbuttons">
          ${labels.map((item) => `<button class="kc-interior-navbutton" type="button" data-kc-interior-group="${item.index}">${item.label}</button>`).join("")}
        </div>
      </nav>
    `;
  }

  function addProfessionalValue(card, cfg) {
    if (card.querySelector(".kc-clinical-pro-value")) return;
    const panel = document.createElement("div");
    panel.className = "kc-clinical-pro-value";
    panel.setAttribute("aria-label", "Claves para uso profesional");
    panel.innerHTML = cfg.cardValues.map((item) => `<div><small>${item[0]}</small><span>${item[1]}</span></div>`).join("");
    const note = card.querySelector(".kc-clinical-note");
    if (note) note.insertAdjacentElement("afterend", panel);
    else card.appendChild(panel);
  }

  function updateSearch(section, query) {
    const needle = normalize(query);
    let visibleCards = 0;
    const groups = [...section.querySelectorAll("details.kc-clinical-group")];
    groups.forEach((group) => {
      let groupVisible = 0;
      group.querySelectorAll(".kc-clinical-card").forEach((card) => {
        const match = !needle || normalize(card.textContent).includes(needle);
        card.classList.toggle("kc-interior-match-hidden", !match);
        if (match) {
          visibleCards += 1;
          groupVisible += 1;
        }
      });
      group.classList.toggle("kc-interior-group-hidden", Boolean(needle) && groupVisible === 0);
      if (needle && groupVisible > 0) group.open = true;
    });

    const count = section.querySelector(".kc-interior-search-count");
    if (count) count.textContent = needle ? `${visibleCards} resultado${visibleCards === 1 ? "" : "s"}` : "Todo visible";
    const empty = section.querySelector(".kc-interior-empty");
    if (empty) empty.dataset.visible = String(Boolean(needle) && visibleCards === 0);
  }

  function backToLibrary() {
    const link = document.querySelector('[data-kc-view-link="biblioteca"]');
    if (link instanceof HTMLElement) {
      link.click();
      window.setTimeout(() => document.querySelector("#kc-clinical-featured-products")?.scrollIntoView({ behavior: "smooth", block: "start" }), 140);
      return;
    }
    window.location.hash = "biblioteca";
  }

  function wire(section) {
    const groups = [...section.querySelectorAll("details.kc-clinical-group")];
    section.querySelector('[data-kc-interior-action="library"]')?.addEventListener("click", backToLibrary);
    section.querySelector('[data-kc-interior-action="expand"]')?.addEventListener("click", () => groups.forEach((group) => { group.open = true; }));
    section.querySelector('[data-kc-interior-action="collapse"]')?.addEventListener("click", () => groups.forEach((group) => { group.open = false; }));
    section.querySelector('[data-kc-interior-action="top"]')?.addEventListener("click", () => section.scrollIntoView({ behavior: "smooth", block: "start" }));

    section.querySelectorAll("[data-kc-interior-group]").forEach((button) => {
      button.addEventListener("click", () => {
        const group = groups[Number(button.getAttribute("data-kc-interior-group"))];
        if (!group) return;
        group.open = true;
        group.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    const search = section.querySelector(".kc-interior-search");
    search?.addEventListener("input", () => updateSearch(section, search.value));
    search?.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      search.value = "";
      updateSearch(section, "");
      search.blur();
    });
  }

  function enhance(section, cfg) {
    if (!(section instanceof Element) || section.classList.contains("kc-interior-enhanced")) return;
    section.classList.add("kc-interior-enhanced");
    const header = section.querySelector(":scope > .kc-clinical-header");
    if (!header) return;

    header.insertAdjacentHTML("afterend", shellMarkup(cfg));
    const shell = section.querySelector(":scope > .kc-interior-shell");
    shell?.insertAdjacentHTML("afterend", guideMarkup(cfg));
    const guide = section.querySelector(":scope > .kc-interior-guide");
    guide?.insertAdjacentHTML("afterend", quickNavMarkup(section));

    const empty = document.createElement("div");
    empty.className = "kc-interior-empty";
    empty.textContent = "No encontramos coincidencias. Prueba con otro término o presiona Escape para limpiar la búsqueda.";
    const firstGroup = section.querySelector("details.kc-clinical-group");
    if (firstGroup) firstGroup.insertAdjacentElement("beforebegin", empty);
    else section.appendChild(empty);

    section.querySelectorAll(".kc-clinical-card").forEach((card) => addProfessionalValue(card, cfg));
    wire(section);
  }

  function apply() {
    Object.entries(CONFIG).forEach(([id, cfg]) => enhance(document.getElementById(id), cfg));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once: true });
  else apply();

  window.setTimeout(apply, 120);
  window.setTimeout(apply, 500);
  window.setTimeout(apply, 1200);
})();