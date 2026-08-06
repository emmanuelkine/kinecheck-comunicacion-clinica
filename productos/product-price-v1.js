(() => {
  "use strict";

  if (window.__KINECHECK_PRODUCT_PRICE_V1__) return;
  window.__KINECHECK_PRODUCT_PRICE_V1__ = true;

  const slug = new URLSearchParams(location.search).get("producto") || "kinecheck-clinico";
  const PRICES = Object.freeze({
    "kinecheck-clinico": { amount: "$39.990", term: "12 meses", installments: "Hasta 12 cuotas de $3.333" },
    "kinecheck-estudiante": { amount: "$14.990", term: "12 meses", installments: "Hasta 12 cuotas de $1.249" },
    "kinecheck-recupera": { amount: "$9.990", term: "3 meses", installments: "Hasta 12 cuotas de $833" },
    "comunicacion-clinica": { amount: "$19.900", term: "12 meses", installments: "Hasta 12 cuotas de $1.658" },
    "mas-alla-del-dolor": { amount: "$39.990", term: "12 meses", installments: "Hasta 12 cuotas de $3.333" },
    "evidencia-aplicada": { amount: "$29.990", term: "12 meses", installments: "Hasta 12 cuotas de $2.499" },
    "traumatologia-ortopedia-clinica": { amount: "$35.900", term: "12 meses", installments: "Hasta 12 cuotas de $2.992" },
    "pack-estudiante": { amount: "$59.900", term: "12 meses", installments: "Hasta 12 cuotas de $4.992" },
  });

  function loadStyles() {
    if (document.querySelector("link[data-kc-product-price]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("./product-price-v1.css?v=20260806-1", location.href).toString();
    link.dataset.kcProductPrice = "true";
    document.head.appendChild(link);
  }

  function installPrice() {
    const price = PRICES[slug];
    if (!price || document.querySelector(".product-detail-price")) return;

    const description = document.querySelector("#product-description");
    const actions = document.querySelector(".product-hero .hero-actions");
    if (!actions) return;

    const block = document.createElement("div");
    block.className = "product-detail-price";
    block.setAttribute("aria-label", `Precio en Chile: ${price.amount}, pago único, acceso por ${price.term}`);
    block.innerHTML = `
      <div><span>PRECIO EN CHILE</span><strong>${price.amount}</strong></div>
      <p>Pago único · acceso por ${price.term}<small>${price.installments} en tarjeta de crédito.</small></p>
    `;
    actions.before(block);

    document.querySelectorAll("[data-checkout]").forEach((button) => {
      button.textContent = slug === "pack-estudiante" ? `Comprar pack · ${price.amount}` : `Comprar · ${price.amount}`;
      button.setAttribute("aria-label", `${button.textContent} en Hotmart`);
    });

    const facts = document.querySelector(".quick-facts");
    if (facts && !facts.querySelector("[data-price-fact]")) {
      const fact = document.createElement("article");
      fact.className = "fact";
      fact.dataset.priceFact = "true";
      fact.innerHTML = `<small>PRECIO BASE CHILE</small><strong>${price.amount}</strong>`;
      facts.prepend(fact);
    }

    if (slug === "pack-estudiante") {
      const note = document.createElement("p");
      note.className = "pack-price-note";
      note.textContent = "Este valor corresponde al pack configurado actualmente en Hotmart. El pack agrupa los dos accesos en una sola compra y no se presenta como descuento frente a compras individuales.";
      block.after(note);
    }

    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.id = "kinecheck-product-offer";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: document.querySelector("#product-title")?.textContent?.trim() || "Producto KineCheck",
      description: description?.textContent?.trim() || "Producto digital KineCheck",
      offers: {
        "@type": "Offer",
        priceCurrency: "CLP",
        price: price.amount.replace(/[^0-9]/g, ""),
        availability: "https://schema.org/InStock",
      },
    });
    document.head.appendChild(schema);
  }

  function installPriceFaq() {
    const price = PRICES[slug];
    const faq = document.querySelector("#faq-grid");
    if (!price || !faq || faq.querySelector("[data-price-faq]")) return;
    const details = document.createElement("details");
    details.dataset.priceFaq = "true";
    details.innerHTML = `<summary>¿Cuál es el precio y cómo se confirma?</summary><p>El precio base vigente para Chile es ${price.amount}. Hotmart muestra antes de pagar las cuotas disponibles, los impuestos aplicables y el total final según el medio de pago.</p>`;
    faq.prepend(details);
  }

  function init() {
    loadStyles();
    const observer = new MutationObserver(() => {
      installPrice();
      installPriceFaq();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    installPrice();
    installPriceFaq();
    window.setTimeout(() => observer.disconnect(), 8000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
