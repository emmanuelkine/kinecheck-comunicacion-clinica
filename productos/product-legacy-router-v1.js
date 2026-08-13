(() => {
  "use strict";

  const allowed = new Set([
    "kinecheck-clinico",
    "kinecheck-estudiante",
    "kinecheck-recupera",
    "comunicacion-clinica",
    "mas-alla-del-dolor",
    "evidencia-aplicada",
    "traumatologia-ortopedia-clinica",
    "pack-estudiante",
  ]);

  const slug = new URLSearchParams(window.location.search).get("producto");
  if (slug && allowed.has(slug)) {
    window.location.replace(`./${slug}/`);
    return;
  }

  window.location.replace("../#productos");
})();
