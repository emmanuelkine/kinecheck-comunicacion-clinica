(() => {
  "use strict";

  if (window.__MI_KINECHECK_CARD_COPY_V1__) return;
  window.__MI_KINECHECK_CARD_COPY_V1__ = true;

  const COPY = Object.freeze({
    "kinecheck-estudiante": {
      type: "PRÁCTICA GUIADA · ESTUDIANTES",
      title: "KineCheck Estudiante",
      copy: "Empieza aquí: practica la evaluación y el razonamiento clínico en un orden comprensible.",
      action: "Empezar práctica guiada",
    },
    "kinecheck-recupera": {
      type: "PRÓXIMAMENTE",
      title: "KineCheck Recupera",
      copy: "No disponible para registrar información mientras se revisa privacidad y protección de datos.",
      action: "Próximamente",
    },
  });

  function set(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function apply() {
    Object.entries(COPY).forEach(([slug, config]) => {
      document.querySelectorAll(`[data-course="${slug}"]`).forEach((button) => {
        const card = button.closest("article");
        if (!card) return;
        card.classList.add(`mi-kc-${slug}`);
        set(card.querySelector(".course-type,.kc-product-type"), config.type);
        set(card.querySelector("h3"), config.title);
        set(card.querySelector("h3 + p,.kc-product-copy"), config.copy);
        if (!button.disabled) set(button, config.action);
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once: true });
  else apply();
  new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
})();
