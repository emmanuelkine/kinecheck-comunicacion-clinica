const PRODUCT_META = {
  CL: { category: "tool", label: "GUÍA COMPLEMENTARIA", productId: "8150019", checkoutUrl: "https://pay.hotmart.com/L106791841D" },
  KC: { category: "course", label: "CURSO PROFESIONAL", productId: "8150019", checkoutUrl: "https://pay.hotmart.com/L106791841D" },
  KE: { category: "application", label: "APLICACIÓN PARA ESTUDIANTES", productId: "8154796", checkoutUrl: "https://pay.hotmart.com/G106801166S" },
  KR: { category: "tool", label: "PRÓXIMAMENTE", productId: "8157431", checkoutUrl: "https://pay.hotmart.com/P106806251E", paused: true },
  CC: { category: "course", label: "CURSO / MASTERCLASS", productId: "8192814", checkoutUrl: "https://pay.hotmart.com/T106883983U" },
  MD: { category: "course", label: "CURSO / MASTERCLASS", productId: "8194777", checkoutUrl: "https://pay.hotmart.com/W106888386Q" },
  LB: { category: "tool", label: "SIMULADOR CLÍNICO", productId: "PROPIETARIO" },
  TO: { category: "course", label: "CURSO CLÍNICO", productId: "8205453", checkoutUrl: "https://pay.hotmart.com/B106913952R", isNew: true },
};

function purchaseLink(title, meta) {
  if (meta.checkoutUrl) return meta.checkoutUrl;
  const subject = encodeURIComponent(`Quiero comprar ${title}`);
  const body = encodeURIComponent(`Hola, quiero recibir el enlace de compra en Hotmart para ${title} (producto ${meta.productId}).`);
  return `mailto:emmanuelkine@gmail.com?subject=${subject}&body=${body}`;
}

function ensureLegend() {
  const heading = document.querySelector(".section-heading");
  if (!heading || document.querySelector(".product-legend")) return;
  const legend = document.createElement("div");
  legend.className = "product-legend";
  legend.innerHTML = `
    <span class="legend-item legend-application">Aplicaciones</span>
    <span class="legend-item legend-course">Cursos</span>
    <span class="legend-item legend-tool">Herramientas</span>
  `;
  heading.insertAdjacentElement("afterend", legend);
}

function enhanceCards() {
  ensureLegend();
  document.querySelectorAll(".course-card").forEach((card) => {
    const icon = card.querySelector(".course-icon")?.textContent?.trim();
    const meta = PRODUCT_META[icon];
    if (!meta) return;

    card.classList.remove("category-application", "category-course", "category-tool");
    card.classList.add(`category-${meta.category}`);

    const type = card.querySelector(".course-type");
    if (type) type.textContent = meta.label;

    if (meta.isNew && !card.querySelector(".new-badge")) {
      const badge = document.createElement("span");
      badge.className = "new-badge";
      badge.textContent = "NUEVO";
      card.appendChild(badge);
    }

    const button = card.querySelector(".course-button");
    if (!button) return;

    if (meta.paused) {
      card.querySelector(".purchase-button")?.remove();
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.textContent = "Próximamente";
      return;
    }

    const title = card.querySelector("h3")?.textContent?.trim() || "este producto";
    const locked = button.disabled && button.textContent.trim() === "Sin acceso";
    if (locked && !card.querySelector(".purchase-button")) {
      const link = document.createElement("a");
      link.className = "purchase-button";
      link.href = purchaseLink(title, meta);
      link.textContent = meta.checkoutUrl ? "Comprar ahora" : "Solicitar enlace";
      link.setAttribute("aria-label", `Comprar ${title}`);
      if (meta.checkoutUrl) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      button.replaceWith(link);
    }
  });
}

const grid = document.querySelector("#course-grid");
if (grid) {
  new MutationObserver(enhanceCards).observe(grid, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", enhanceCards);
setTimeout(enhanceCards, 500);
