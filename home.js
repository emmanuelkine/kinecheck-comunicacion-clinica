(() => {
  const params = new URLSearchParams(location.search);
  if (params.get("course") === "comunicacion-clinica") {
    const destination = new URL("./comunicacion-clinica.html", location.href);
    destination.search = location.search;
    destination.hash = location.hash;
    location.replace(destination.toString());
    return;
  }

  document.documentElement.classList.add("js");

  const COMMERCE_FIX_VERSION = "20260804-access-term1";
  const ACADEMY_URL = new URL(`./academy/?v=${COMMERCE_FIX_VERSION}`, location.href).toString();
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

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const menuButton = document.querySelector("#menu-button");
  const nav = document.querySelector("#site-nav");
  const header = document.querySelector(".site-header");
  const heroCopy = document.querySelector(".hero-copy");
  const year = document.querySelector("#current-year");
  const filters = [...document.querySelectorAll("[data-filter]")];
  const products = [...document.querySelectorAll("[data-product-card]")];

  function loadCommerceFixStyles() {
    if (document.querySelector('link[data-kc-commerce-fix]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(`./home-commerce-fix.css?v=${COMMERCE_FIX_VERSION}`, location.href).toString();
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

  function closeMenu() {
    nav?.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  }

  function animateVisibleProducts() {
    if (reduceMotion) return;
    products.forEach((card, index) => {
      card.classList.remove("filter-enter");
      if (card.hidden) return;
      card.style.animationDelay = `${Math.min(index, 6) * 45}ms`;
      requestAnimationFrame(() => card.classList.add("filter-enter"));
    });
  }

  function installRevealAnimations() {
    const targets = [
      ...document.querySelectorAll(
        ".hero-copy,.ecosystem-card,.trust-row article,.section-heading,.audience,.product,.step,.process-note,.value-panel,.faq details,.final-cta",
      ),
    ];

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    targets.forEach((target, index) => {
      target.classList.add("reveal-ready");
      target.style.setProperty("--reveal-order", String(index % 5));
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -6% 0px",
    });

    targets.forEach((target) => observer.observe(target));
  }

  function installActiveNavigation() {
    if (!("IntersectionObserver" in window) || !nav) return;
    const sections = [...document.querySelectorAll("main section[id]")];
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const byId = new Map(links.map((link) => [link.getAttribute("href")?.slice(1), link]));

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => link.removeAttribute("aria-current"));
      byId.get(visible.target.id)?.setAttribute("aria-current", "true");
    }, {
      threshold: [0.2, 0.45, 0.7],
      rootMargin: "-25% 0px -58% 0px",
    });

    sections.forEach((section) => observer.observe(section));
  }

  function installHeroPointerGlow() {
    if (!heroCopy || reduceMotion || !window.matchMedia("(pointer:fine)").matches) return;
    heroCopy.addEventListener("pointermove", (event) => {
      const rect = heroCopy.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      heroCopy.style.setProperty("--pointer-x", `${x.toFixed(1)}%`);
      heroCopy.style.setProperty("--pointer-y", `${y.toFixed(1)}%`);
    });
    heroCopy.addEventListener("pointerleave", () => {
      heroCopy.style.setProperty("--pointer-x", "82%");
      heroCopy.style.setProperty("--pointer-y", "16%");
    });
  }

  function installFaqBehavior() {
    const details = [...document.querySelectorAll(".faq details")];
    details.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        details.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  loadCommerceFixStyles();

  if (year) year.textContent = String(new Date().getFullYear());
  products.forEach(repairProductActions);

  document.querySelectorAll('a[href*="academy/"]').forEach((link) => {
    link.href = ACADEMY_URL;
  });

  menuButton?.addEventListener("click", () => {
    const open = nav?.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(Boolean(open)));
  });

  nav?.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("scroll", () => {
    header?.classList.toggle("scrolled", window.scrollY > 18);
  }, { passive: true });

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter || "all";
      filters.forEach((item) => item.classList.toggle("active", item === button));
      products.forEach((card) => {
        const audiences = String(card.dataset.audiences || "").split(/\s+/).filter(Boolean);
        card.hidden = filter !== "all" && !audiences.includes(filter);
      });
      animateVisibleProducts();
    });
  });

  document.querySelectorAll("[data-audience-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const audience = button.dataset.audienceSelect || "all";
      const filterButton = document.querySelector(`[data-filter="${CSS.escape(audience)}"]`);
      filterButton?.click();
      document.querySelector("#productos")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });

  installRevealAnimations();
  installActiveNavigation();
  installHeroPointerGlow();
  installFaqBehavior();
})();
