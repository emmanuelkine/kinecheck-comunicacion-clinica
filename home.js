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

  const COMMERCE_FIX_VERSION = "20260805-legal-security1";
  const PLATFORM_URL = new URL(`./platform/?v=${COMMERCE_FIX_VERSION}`, location.href).toString();
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
  const PRODUCT_LABELS = Object.freeze({
    "kinecheck-clinico": "Curso profesional + guía complementaria",
    "kinecheck-estudiante": "Aplicación formativa · razonamiento guiado",
    "kinecheck-recupera": "Aplicación para pacientes · progreso y ejercicios",
    "comunicacion-clinica": "Curso interactivo · comunicación en salud",
    "mas-alla-del-dolor": "Curso clínico · evaluación musculoesquelética",
    "evidencia-aplicada": "Curso clínico · evidencia y decisiones",
    "traumatologia-ortopedia-clinica": "Curso clínico · lesiones y seguridad",
    "pack-estudiante": "Pack formativo · dos productos en una cuenta",
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const menuButton = document.querySelector("#menu-button");
  const nav = document.querySelector("#site-nav");
  const header = document.querySelector(".site-header");
  const heroCopy = document.querySelector(".hero-copy");
  const year = document.querySelector("#current-year");
  const filters = [...document.querySelectorAll("[data-filter]")];
  const products = [...document.querySelectorAll("[data-product-card]")];

  function loadStyles(href, marker) {
    if (document.querySelector(`link[${marker}]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(href, location.href).toString();
    link.setAttribute(marker, "true");
    document.head.appendChild(link);
  }

  function makeLink(className, text) {
    const link = document.createElement("a");
    link.className = className;
    link.textContent = text;
    return link;
  }

  function installProductMedia(card, slug) {
    if (card.querySelector(".product-media")) return;
    const media = document.createElement("div");
    media.className = "product-media";
    media.dataset.label = PRODUCT_LABELS[slug] || "Producto KineCheck";
    media.setAttribute("aria-hidden", "true");
    card.prepend(media);
  }

  function repairProductActions(card) {
    const slug = String(card.dataset.course || "").trim();
    const checkout = CHECKOUTS[slug];
    if (!checkout) return;

    installProductMedia(card, slug);

    let actions = card.querySelector(".product-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "product-actions";
      card.appendChild(actions);
    }

    let detail = actions.querySelector(".detail");
    if (!detail) {
      detail = makeLink("detail", "Conocer el producto");
      actions.prepend(detail);
    }
    detail.href = new URL(`./productos/?producto=${encodeURIComponent(slug)}`, location.href).toString();
    detail.setAttribute("aria-label", `Conocer en detalle ${card.querySelector("h3")?.textContent || "este producto"}`);

    let buy = actions.querySelector(".buy");
    if (!buy) {
      buy = makeLink("buy", slug === "pack-estudiante" ? "Comprar el pack" : "Comprar en Hotmart");
      actions.appendChild(buy);
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
    enter.href = PLATFORM_URL;
    enter.textContent = "Ya compré: ingresar";
    enter.setAttribute("aria-label", `Ingresar con una compra existente de ${card.querySelector("h3")?.textContent || "KineCheck"}`);
  }

  function installCatalogIntro() {
    const productGrid = document.querySelector(".products");
    if (!productGrid || document.querySelector(".catalog-intro-note")) return;
    const note = document.createElement("p");
    note.className = "catalog-intro-note";
    note.innerHTML = "<strong>Primero conoce el producto.</strong> Cada ficha explica propósito, contenidos, público, vigencia y forma de acceso antes de llevarte al checkout de Hotmart.";
    productGrid.before(note);
  }

  function installComplianceLinks() {
    const footerNav = document.querySelector(".site-footer nav");
    const links = [
      ["./legal/terminos.html", "Términos"],
      ["./legal/privacidad.html", "Privacidad"],
      ["./legal/reembolsos.html", "Reembolsos"],
      ["./beta/", "Programa beta"],
    ];
    links.forEach(([href, label]) => {
      if (!footerNav || footerNav.querySelector(`a[href="${href}"]`)) return;
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      footerNav.appendChild(link);
    });

    if (nav && !nav.querySelector('a[href="./beta/"]')) {
      const betaLink = document.createElement("a");
      betaLink.href = "./beta/";
      betaLink.textContent = "Beta";
      nav.insertBefore(betaLink, nav.querySelector(".nav-cta"));
    }

    const accessQuestion = [...document.querySelectorAll(".faq details")]
      .find((item) => item.querySelector("summary")?.textContent?.includes("¿Cómo recibo el acceso?"));
    const accessAnswer = accessQuestion?.querySelector("p");
    if (accessAnswer) {
      accessAnswer.textContent = "Cuando Hotmart aprueba el pago, ingresa a la plataforma KineCheck con el mismo correo utilizado en la compra. La sincronización normalmente tarda pocos segundos.";
    }
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
    const targets = [...document.querySelectorAll(".hero-copy,.ecosystem-card,.trust-row article,.section-heading,.audience,.product,.step,.process-note,.value-panel,.faq details,.final-cta")];
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
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((target) => observer.observe(target));
  }

  function installActiveNavigation() {
    if (!("IntersectionObserver" in window) || !nav) return;
    const sections = [...document.querySelectorAll("main section[id]")];
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const byId = new Map(links.map((link) => [link.getAttribute("href")?.slice(1), link]));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => link.removeAttribute("aria-current"));
      byId.get(visible.target.id)?.setAttribute("aria-current", "true");
    }, { threshold: [0.2, 0.45, 0.7], rootMargin: "-25% 0px -58% 0px" });
    sections.forEach((section) => observer.observe(section));
  }

  function installHeroPointerGlow() {
    if (!heroCopy || reduceMotion || !window.matchMedia("(pointer:fine)").matches) return;
    heroCopy.addEventListener("pointermove", (event) => {
      const rect = heroCopy.getBoundingClientRect();
      heroCopy.style.setProperty("--pointer-x", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
      heroCopy.style.setProperty("--pointer-y", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
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
        details.forEach((other) => { if (other !== item) other.open = false; });
      });
    });
  }

  loadStyles(`./home-commerce-fix.css?v=${COMMERCE_FIX_VERSION}`, "data-kc-commerce-fix");
  loadStyles(`./catalog-professional.css?v=${COMMERCE_FIX_VERSION}`, "data-kc-catalog-professional");

  if (year) year.textContent = String(new Date().getFullYear());
  products.forEach(repairProductActions);
  installCatalogIntro();
  installComplianceLinks();

  document.querySelectorAll('a[href*="academy/"],a[href*="platform/"]').forEach((link) => {
    if (!link.closest(".product-actions") || link.classList.contains("enter")) link.href = PLATFORM_URL;
  });

  menuButton?.addEventListener("click", () => {
    const open = nav?.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(Boolean(open)));
  });
  nav?.addEventListener("click", (event) => { if (event.target.closest("a")) closeMenu(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
  window.addEventListener("scroll", () => { header?.classList.toggle("scrolled", window.scrollY > 18); }, { passive: true });

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
      document.querySelector(`[data-filter="${CSS.escape(audience)}"]`)?.click();
      document.querySelector("#productos")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });

  installRevealAnimations();
  installActiveNavigation();
  installHeroPointerGlow();
  installFaqBehavior();
})();