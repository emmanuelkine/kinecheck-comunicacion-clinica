(() => {
  "use strict";

  const PRODUCTS = Object.freeze({
    general: {
      title: "Acceso general KineCheck",
      description: "Tus productos aparecerán automáticamente según las licencias asociadas a tu correo.",
      term: "Vigencia: revisa la condición informada en tu compra."
    },
    "kinecheck-clinico": {
      title: "KineCheck Clínico",
      description: "Encontrarás la aplicación profesional para organizar evaluación, razonamiento y seguimiento clínico.",
      term: "Vigencia habitual para compras nuevas: 12 meses."
    },
    "kinecheck-estudiante": {
      title: "KineCheck Estudiante",
      description: "Tu espacio se orientará al aprendizaje guiado, práctica de casos y razonamiento paso a paso.",
      term: "Vigencia habitual para compras nuevas: 12 meses."
    },
    "kinecheck-recupera": {
      title: "KineCheck Recupera",
      description: "Accederás al registro de ejercicios, síntomas, función, cumplimiento y evolución personal.",
      term: "Vigencia habitual para compras nuevas: 3 meses."
    },
    "comunicacion-clinica": {
      title: "Comunicación Clínica",
      description: "El curso aparecerá en tu biblioteca con sus lecciones, actividades y recursos asociados.",
      term: "Vigencia habitual para compras nuevas: 12 meses."
    },
    "evidencia-aplicada": {
      title: "Evidencia Aplicada",
      description: "Tendrás acceso al curso y a la biblioteca de contenidos de evidencia vinculada a tu licencia.",
      term: "Vigencia habitual para compras nuevas: 12 meses."
    },
    "mas-alla-del-dolor": {
      title: "Más allá del dolor",
      description: "Encontrarás la ruta formativa de evaluación musculoesquelética integral y razonamiento biopsicosocial.",
      term: "Vigencia habitual para compras nuevas: 12 meses."
    },
    "traumatologia-ortopedia-clinica": {
      title: "Traumatología y Ortopedia Clínica",
      description: "El curso aparecerá en la biblioteca con contenidos de mecanismo lesional, seguridad y decisiones clínicas.",
      term: "Vigencia habitual para compras nuevas: 12 meses."
    },
    "pack-estudiante": {
      title: "Pack KineCheck Estudiante",
      description: "La misma compra debe habilitar KineCheck Estudiante y Más allá del dolor dentro de tu biblioteca.",
      term: "Vigencia habitual para compras nuevas: 12 meses para ambos productos."
    }
  });

  const selector = document.querySelector("#product-selector");
  const applyButton = document.querySelector("#apply-product");
  const title = document.querySelector("#product-title");
  const description = document.querySelector("#product-description");
  const term = document.querySelector("#product-term");

  function applyProduct(slug, updateUrl = true) {
    const normalized = Object.hasOwn(PRODUCTS, slug) ? slug : "general";
    const product = PRODUCTS[normalized];
    selector.value = normalized;
    title.textContent = product.title;
    description.textContent = product.description;
    term.textContent = product.term;

    if (updateUrl) {
      const url = new URL(location.href);
      if (normalized === "general") url.searchParams.delete("producto");
      else url.searchParams.set("producto", normalized);
      history.replaceState(null, "", url);
    }
  }

  applyButton.addEventListener("click", () => applyProduct(selector.value));
  selector.addEventListener("change", () => applyProduct(selector.value));

  const requested = new URLSearchParams(location.search).get("producto") || "general";
  applyProduct(requested, false);
})();