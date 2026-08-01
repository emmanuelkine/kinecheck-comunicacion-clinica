(() => {
  if (window.__KINECHECK_COMMERCE_V4__) return;
  window.__KINECHECK_COMMERCE_V4__ = true;

  const CHECKOUTS = Object.freeze({
    "kinecheck-clinico": "https://pay.hotmart.com/L106791841D",
    "kinecheck-estudiante": "https://pay.hotmart.com/G106801166S",
    "kinecheck-recupera": "https://pay.hotmart.com/P106806251E",
    "comunicacion-clinica": "https://pay.hotmart.com/T106883983U",
    "mas-alla-del-dolor": "https://pay.hotmart.com/W106888386Q",
    "evidencia-aplicada": "https://pay.hotmart.com/F106921972I",
    "traumatologia-ortopedia-clinica": "https://pay.hotmart.com/B106913952R",
    "pack-kinecheck-estudiante": "https://pay.hotmart.com/Q106891608M",
  });

  const PACK = Object.freeze({
    slug: "pack-kinecheck-estudiante",
    title: "Pack KineCheck Estudiante",
    subtitle: "KineCheck Estudiante + Más allá del dolor.",
    icon: "PK",
    includes: ["kinecheck-estudiante", "mas-alla-del-dolor"],
  });

  const $ = (selector, root = document) => root.querySelector(selector);

  function showToast(text) {
    const toast = $("#kc-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3600);
  }

  function isOwned(slug) {
    const button = document.querySelector(`#course-grid [data-course="${CSS.escape(slug)}"]`);
    return Boolean(button && !button.disabled);
  }

  function openCheckout(slug) {
    const checkout = CHECKOUTS[slug];
    if (!checkout) {
      showToast("Todavía no hay un checkout configurado para este producto.");
      return;
    }
    window.open(checkout, "_blank", "noopener,noreferrer");
  }

  function injectStyles() {
    if ($("#kc-commerce-styles")) return;
    const style = document.createElement("style");
    style.id = "kc-commerce-styles";
    style.textContent = `
      .kc-commerce-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1rem}
      .kc-commerce-button,.kc-refresh-purchases{border:0;border-radius:14px;padding:.82rem 1rem;font:inherit;font-weight:800;cursor:pointer;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff;box-shadow:0 10px 24px rgba(234,88,12,.2)}
      .kc-refresh-purchases{background:linear-gradient(135deg,#14b8a6,#0f766e)}
      .kc-pack-offer{border:1px solid rgba(124,108,242,.28);background:linear-gradient(145deg,#f7f4ff,#fff7ed)!important}
      .kc-pack-offer .kc-summary-icon{background:linear-gradient(135deg,#7c6cf2,#f59e0b);color:#fff}
      .kc-pack-offer ul{margin:.5rem 0 1rem;padding-left:1.15rem;color:#52616b}
      .kc-commerce-note{font-size:.86rem;color:#667681;margin-top:.55rem}
    `;
    document.head.appendChild(style);
  }

  function enhanceExploreButtons() {
    document.querySelectorAll("[data-kc-explore-product], [data-kc-path-explore]").forEach((button) => {
      const slug = button.dataset.kcExploreProduct || button.dataset.kcPathExplore;
      if (!CHECKOUTS[slug]) return;
      if (button.textContent.trim() !== "Comprar en Hotmart") {
        button.textContent = "Comprar en Hotmart";
      }
      button.title = "Abrir el checkout oficial de Hotmart";
    });
  }

  function injectPackOffer() {
    const grid = $("#explore-grid");
    if (!grid) return;

    const alreadyOwned = PACK.includes.every(isOwned);
    const current = $("#kc-pack-estudiante-offer");
    if (alreadyOwned) {
      current?.remove();
      return;
    }
    if (current) return;

    const card = document.createElement("article");
    card.id = "kc-pack-estudiante-offer";
    card.className = "kc-summary-card kc-pack-offer";
    card.innerHTML = `
      <div class="kc-summary-top">
        <span class="kc-summary-icon">${PACK.icon}</span>
        <span class="kc-status">Pack</span>
      </div>
      <div><small>PACK KINECHECK</small><h3>${PACK.title}</h3></div>
      <p>${PACK.subtitle}</p>
      <ul><li>Aplicación KineCheck Estudiante</li><li>Curso Más allá del dolor</li></ul>
      <button type="button" class="kc-commerce-button" data-kc-buy-product="${PACK.slug}">Comprar Pack en Hotmart</button>
      <div class="kc-commerce-note">La compra concede ambas licencias con el mismo correo utilizado en Hotmart.</div>
    `;
    grid.appendChild(card);
  }

  function injectRefreshButtons() {
    const targets = [
      $("#explorar .kc-page-heading"),
      $("#cuenta .kc-page-heading"),
    ].filter(Boolean);

    targets.forEach((target, index) => {
      const id = `kc-refresh-purchases-${index}`;
      if ($(`#${id}`)) return;
      const wrap = document.createElement("div");
      wrap.className = "kc-commerce-actions";
      wrap.innerHTML = `<button id="${id}" class="kc-refresh-purchases" type="button" data-kc-refresh-purchases>Ya compré · Actualizar mis licencias</button>`;
      target.appendChild(wrap);
    });
  }

  function refreshLicenses() {
    showToast("Actualizando tus compras y licencias…");
    const url = new URL(window.location.href);
    url.searchParams.set("purchase", "approved");
    url.searchParams.set("refresh", String(Date.now()));
    url.hash = "biblioteca";
    window.setTimeout(() => window.location.assign(url.toString()), 250);
  }

  function enhance() {
    injectStyles();
    enhanceExploreButtons();
    injectPackOffer();
    injectRefreshButtons();
  }

  document.addEventListener("click", (event) => {
    const purchase = event.target.closest("[data-kc-buy-product]");
    if (purchase) {
      event.preventDefault();
      event.stopPropagation();
      openCheckout(purchase.dataset.kcBuyProduct);
      return;
    }

    const refresh = event.target.closest("[data-kc-refresh-purchases]");
    if (refresh) {
      event.preventDefault();
      refreshLicenses();
      return;
    }

    const explore = event.target.closest("[data-kc-explore-product], [data-kc-path-explore]");
    if (explore) {
      const slug = explore.dataset.kcExploreProduct || explore.dataset.kcPathExplore;
      if (!CHECKOUTS[slug]) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openCheckout(slug);
    }
  }, true);

  function start() {
    enhance();
    window.setTimeout(enhance, 250);
    window.setTimeout(enhance, 900);
    window.setTimeout(enhance, 2200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
