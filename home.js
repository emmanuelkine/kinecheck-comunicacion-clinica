(() => {
  const params = new URLSearchParams(location.search);
  if (params.get("course") === "comunicacion-clinica") {
    const destination = new URL("./comunicacion-clinica.html", location.href);
    destination.search = location.search;
    destination.hash = location.hash;
    location.replace(destination.toString());
    return;
  }

  const COMMERCE_FIX_VERSION = "20260802-commerce1";
  const ACADEMY_URL = `/academy/?v=${COMMERCE_FIX_VERSION}`;
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

  function loadCommerceFixStyles() {
    if (document.querySelector('link[data-kc-commerce-fix]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `/home-commerce-fix.css?v=${COMMERCE_FIX_VERSION}`;
    link.dataset.kcCommerceFix = "true";
    document.head.appendChild(link);
  }

  function makeLink(className, text) {
    const link = document.createElement("a");
    link.className = className;
    link.textContent = text;
    return link;
  }

  function repairProductActions(card) {
    const slug = String(card.dataset.course || "").trim();
    const checkout = CHECKOUTS[slug];
    if (!checkout) return;

    let actions = card.querySelector(".product-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "product-actions";
      card.appendChild(actions);
    }

    let buy = actions.querySelector(".buy");
    if (!buy) {
      buy = makeLink("buy", slug === "pack-estudiante" ? "Comprar el pack" : "Comprar en Hotmart");
      actions.prepend(buy);
    }
    buy.href = checkout;
    buy.target = "_blank";
    buy.rel = "noopener noreferrer";
    buy.textContent = slug === "pack-estudiante" ? "Comprar el pack" : "Comprar en Hotmart";
    buy.setAttribute("aria-label", `${buy.textContent}: ${card.querySelector("h3")?.textContent || "producto KineCheck"}`);

    let enter = actions.querySelector(".enter");
    if (!enter) {
      enter = makeLink("enter", "Ya compré: ingresar");
      actions.appendChild(enter);
    }
    enter.href = ACADEMY_URL;
    enter.textContent = "Ya compré: ingresar";
    enter.setAttribute("aria-label", `Ingresar con una compra existente de ${card.querySelector("h3")?.textContent || "KineCheck"}`);
  }

  loadCommerceFixStyles();

  const menuButton = document.querySelector("#menu-button");
  const nav = document.querySelector("#site-nav");
  const year = document.querySelector("#current-year");
  const filters = document.querySelectorAll("[data-filter]");
  const products = document.querySelectorAll("[data-product-card]");

  if (year) year.textContent = String(new Date().getFullYear());
  products.forEach(repairProductActions);

  document.querySelectorAll('a[href^="/academy/"]').forEach((link) => {
    link.href = ACADEMY_URL;
  });

  menuButton?.addEventListener("click", () => {
    const open = nav?.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(Boolean(open)));
  });

  nav?.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    nav.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  });

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter || "all";
      filters.forEach((item) => item.classList.toggle("active", item === button));
      products.forEach((card) => {
        const audiences = String(card.dataset.audiences || "").split(/\s+/).filter(Boolean);
        card.hidden = filter !== "all" && !audiences.includes(filter);
      });
    });
  });

  document.querySelectorAll("[data-audience-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const audience = button.dataset.audienceSelect || "all";
      const filterButton = document.querySelector(`[data-filter="${CSS.escape(audience)}"]`);
      filterButton?.click();
      document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();
