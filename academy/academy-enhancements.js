const PRODUCT_META = {
  CL: { category: "application", label: "APLICACIÓN CLÍNICA", productId: "8150019" },
  KE: { category: "application", label: "APLICACIÓN PARA ESTUDIANTES", productId: "8154796" },
  KR: { category: "tool", label: "HERRAMIENTA DE SEGUIMIENTO", productId: "8157431" },
  CC: { category: "course", label: "CURSO / MASTERCLASS", productId: "8192814" },
  MD: { category: "course", label: "CURSO / MASTERCLASS", productId: "8194777" },
  LB: { category: "tool", label: "SIMULADOR CLÍNICO", productId: "PROPIETARIO" },
  TO: { category: "course", label: "CURSO CLÍNICO", productId: "8205453", isNew: true },
};

function purchaseLink(title, productId) {
  const subject = encodeURIComponent(`Quiero comprar ${title}`);
  const body = encodeURIComponent(`Hola, quiero recibir el enlace de compra en Hotmart para ${title} (producto ${productId}).`);
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

    const title = card.querySelector("h3")?.textContent?.trim() || "este producto";
    const locked = button.disabled && button.textContent.trim() === "Sin acceso";
    if (locked && !card.querySelector(".purchase-button")) {
      const link = document.createElement("a");
      link.className = "purchase-button";
      link.href = purchaseLink(title, meta.productId);
      link.textContent = "Comprar / solicitar enlace";
      link.setAttribute("aria-label", `Comprar ${title}`);
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
