(() => {
  "use strict";

  if (window.__KINECHECK_COMMERCIAL_PROOF_V1__) return;
  window.__KINECHECK_COMMERCIAL_PROOF_V1__ = true;

  const PRICES = Object.freeze({
    "kinecheck-clinico": { amount: "$39.990", term: "12 meses", label: "Curso profesional + guía" },
    "kinecheck-estudiante": { amount: "$14.990", term: "12 meses", label: "Aplicación educativa" },
    "kinecheck-recupera": { amount: "$9.990", term: "3 meses", label: "Aplicación de seguimiento" },
    "comunicacion-clinica": { amount: "$19.900", term: "12 meses", label: "Curso interactivo" },
    "mas-alla-del-dolor": { amount: "$39.990", term: "12 meses", label: "Curso clínico" },
    "evidencia-aplicada": { amount: "$29.990", term: "12 meses", label: "Curso clínico" },
    "traumatologia-ortopedia-clinica": { amount: "$35.900", term: "12 meses", label: "Curso clínico" },
    "pack-estudiante": { amount: "$49.900", term: "12 meses", label: "Pack de dos productos", saving: "$5.080", discount: "9,2%" },
  });

  const CHECKOUTS = Object.freeze({
    "kinecheck-clinico": "https://pay.hotmart.com/L106791841D",
    "kinecheck-estudiante": "https://pay.hotmart.com/G106801166S",
    "kinecheck-recupera": "https://pay.hotmart.com/P106806251E",
    "comunicacion-clinica": "https://pay.hotmart.com/T106883983U",
    "mas-alla-del-dolor": "https://pay.hotmart.com/W106888386Q",
    "evidencia-aplicada": "https://pay.hotmart.com/F106921972I",
    "traumatologia-ortopedia-clinica": "https://pay.hotmart.com/B106913952R",
    "pack-estudiante": "https://pay.hotmart.com/Q106891608M",
  });

  function loadStyles() {
    if (document.querySelector("link[data-kc-commercial-proof]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("./home-commercial-proof-v1.css?v=20260806-1", location.href).toString();
    link.dataset.kcCommercialProof = "true";
    document.head.appendChild(link);
  }

  function installPrices() {
    document.querySelectorAll("[data-product-card][data-course]").forEach((card) => {
      const slug = String(card.dataset.course || "").trim();
      const price = PRICES[slug];
      if (!price || card.querySelector(".product-price")) return;

      const detail = slug === "pack-estudiante"
        ? `Ahorras ${price.saving} frente a la compra individual de ambos productos (${price.discount}).`
        : "Hotmart informa las cuotas y el total final antes del pago.";

      const priceBlock = document.createElement("div");
      priceBlock.className = "product-price";
      priceBlock.setAttribute("aria-label", `Precio en Chile: ${price.amount}, pago único, acceso por ${price.term}`);
      priceBlock.innerHTML = `
        <div>
          <span>PRECIO EN CHILE</span>
          <strong>${price.amount}</strong>
        </div>
        <p>Pago único · acceso por ${price.term}<small>${detail}</small></p>
      `;

      const list = card.querySelector("ul");
      if (list) list.before(priceBlock);
      else card.querySelector(".product-actions")?.before(priceBlock);

      const buy = card.querySelector(".product-actions .buy");
      if (buy) {
        buy.textContent = slug === "pack-estudiante" ? `Comprar pack · ${price.amount}` : `Comprar · ${price.amount}`;
        buy.setAttribute("aria-label", `${buy.textContent} en Hotmart`);
      }
    });
  }

  function installCommercialProof() {
    if (document.getElementById("respaldo-verificable")) return;
    const process = document.querySelector("#como-funciona");
    if (!process) return;

    const section = document.createElement("section");
    section.id = "respaldo-verificable";
    section.className = "section commercial-proof-section";
    section.setAttribute("aria-labelledby", "commercial-proof-title");
    section.innerHTML = `
      <div class="section-heading centered commercial-proof-heading">
        <span class="eyebrow">RESPALDO VERIFICABLE</span>
        <h2 id="commercial-proof-title">Decide con información clara antes de comprar.</h2>
        <p>Mostramos precios, vigencia, alcance y forma de acceso sin recurrir a cifras de usuarios ni testimonios no comprobados.</p>
      </div>

      <div class="commercial-proof-metrics" aria-label="Datos verificables del ecosistema KineCheck">
        <article><strong>7 + 1</strong><span>Siete productos y un pack activo</span></article>
        <article><strong>3</strong><span>Rutas: profesional, estudiante y paciente</span></article>
        <article><strong>1</strong><span>Cuenta y biblioteca para todos tus accesos</span></article>
        <article><strong>Semanal</strong><span>Vigilancia de PubMed, PEDro y guías clínicas</span></article>
      </div>

      <div class="commercial-confidence-grid">
        <article>
          <span>01</span><div><strong>Precio visible</strong><p>El valor base en Chile aparece en cada tarjeta antes de abrir Hotmart.</p></div>
        </article>
        <article>
          <span>02</span><div><strong>Vigencia explícita</strong><p>Cursos y herramientas indican si incluyen 3 o 12 meses de acceso.</p></div>
        </article>
        <article>
          <span>03</span><div><strong>Pago protegido</strong><p>El checkout, las cuotas y la confirmación de compra son procesados por Hotmart.</p></div>
        </article>
        <article>
          <span>04</span><div><strong>Soporte y políticas</strong><p>Centro de ayuda, soporte, privacidad, términos y reembolsos permanecen públicos.</p></div>
        </article>
      </div>

      <div class="verified-experience-note">
        <div><span class="eyebrow">EXPERIENCIAS REALES</span><strong>Las opiniones se incorporarán únicamente con autorización y verificación.</strong><p>El programa beta permite evaluar acceso, utilidad y experiencia antes del lanzamiento comercial medido.</p></div>
        <a href="./beta/">Conocer el programa beta <span aria-hidden="true">→</span></a>
      </div>
    `;
    process.before(section);

    const nav = document.querySelector("#site-nav");
    if (nav && !nav.querySelector('a[href="#respaldo-verificable"]')) {
      const link = document.createElement("a");
      link.href = "#respaldo-verificable";
      link.textContent = "Respaldo";
      nav.insertBefore(link, nav.querySelector('a[href="#como-funciona"]'));
    }
  }

  function installStructuredOffers() {
    if (document.getElementById("kinecheck-product-offers")) return;
    const items = [...document.querySelectorAll("[data-product-card][data-course]")].map((card) => {
      const slug = String(card.dataset.course || "").trim();
      const price = PRICES[slug];
      if (!price) return null;
      return {
        "@type": "Product",
        name: card.querySelector("h3")?.textContent?.trim() || slug,
        description: card.querySelector(".subtitle")?.textContent?.trim() || price.label,
        category: price.label,
        offers: {
          "@type": "Offer",
          url: CHECKOUTS[slug],
          priceCurrency: "CLP",
          price: price.amount.replace(/[^0-9]/g, ""),
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: "KineCheck" },
        },
      };
    }).filter(Boolean);

    const script = document.createElement("script");
    script.id = "kinecheck-product-offers";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Productos KineCheck",
      itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, item })),
    });
    document.head.appendChild(script);
  }

  function installPriceFaq() {
    const faq = document.querySelector(".faq");
    if (!faq || faq.querySelector("[data-price-faq]")) return;
    const details = document.createElement("details");
    details.dataset.priceFaq = "true";
    details.innerHTML = "<summary>¿Los precios publicados incluyen el monto final?</summary><p>Las tarjetas muestran el precio base vigente para Chile. Hotmart confirma antes de pagar el total, las cuotas disponibles y cualquier impuesto o condición aplicable al medio de pago.</p>";
    faq.prepend(details);
  }

  function init() {
    loadStyles();
    installPrices();
    installCommercialProof();
    installStructuredOffers();
    installPriceFaq();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
