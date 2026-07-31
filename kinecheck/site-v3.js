(() => {
  const productGroups = document.querySelector("#product-groups");
  const filteredSection = document.querySelector("#filtered-products");
  const filteredGrid = document.querySelector("#filtered-grid");
  const filteredTitle = document.querySelector("#filtered-title");
  const filteredCopy = document.querySelector("#filtered-copy");
  const filteredDot = document.querySelector("#filtered-dot");
  const menuButton = document.querySelector("#public-menu-button");
  const navigation = document.querySelector("#public-nav");
  const supportPanel = document.querySelector("#public-support-panel");
  const supportLauncher = document.querySelector("#public-support-launcher");
  const productsSection = document.querySelector("#productos");
  const sourceCards = [...document.querySelectorAll("#product-groups .product-card")];

  const FILTER_PRESENTATION = {
    professionals: {
      title: "Soluciones para profesionales",
      copy: "Aplicaciones, cursos y simulación para fortalecer la práctica clínica.",
    },
    students: {
      title: "Soluciones para estudiantes",
      copy: "Herramientas y cursos para aprender evaluación, comunicación y razonamiento clínico.",
    },
    patients: {
      title: "Soluciones para pacientes",
      copy: "Seguimiento simple para acompañar y comunicar el proceso de recuperación.",
    },
  };

  function setActiveFilter(filter) {
    document.querySelectorAll(".public-filter-tabs [data-public-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.publicFilter === filter);
    });
  }

  function applyFilter(filter, shouldScroll = false) {
    const selected = filter in FILTER_PRESENTATION ? filter : "all";
    setActiveFilter(selected);

    if (selected === "all") {
      productGroups.hidden = false;
      filteredSection.hidden = true;
    } else {
      const presentation = FILTER_PRESENTATION[selected];
      const matching = sourceCards.filter((card) => (
        String(card.dataset.audiences || "").split(/\s+/).includes(selected)
      ));

      filteredTitle.textContent = presentation.title;
      filteredCopy.textContent = `${presentation.copy} ${matching.length} ${matching.length === 1 ? "opción disponible" : "opciones disponibles"}.`;
      filteredDot.className = `group-dot ${selected}`;
      filteredGrid.replaceChildren(...matching.map((card) => card.cloneNode(true)));
      productGroups.hidden = true;
      filteredSection.hidden = false;
    }

    if (shouldScroll) {
      productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function toggleMenu(force) {
    if (!menuButton || !navigation) return;
    const open = typeof force === "boolean" ? force : !navigation.classList.contains("open");
    navigation.classList.toggle("open", open);
    menuButton.setAttribute("aria-expanded", String(open));
  }

  function toggleSupport(force) {
    if (!supportPanel || !supportLauncher) return;
    const open = typeof force === "boolean" ? force : supportPanel.hidden;
    supportPanel.hidden = !open;
    supportLauncher.setAttribute("aria-expanded", String(open));
    if (open) supportPanel.querySelector("a")?.focus();
  }

  function applyKineCheckV4Brand() {
    document.querySelectorAll(".brand small").forEach((label) => {
      label.textContent = "ECOSISTEMA";
    });

    const heroTitle = document.querySelector(".hero-copy h1");
    const heroCopy = document.querySelector(".hero-copy > p");
    if (heroTitle) heroTitle.innerHTML = "Aplicaciones, cursos y herramientas.<br><em>Todo en KineCheck.</em>";
    if (heroCopy) heroCopy.textContent = "Un solo ecosistema para aprender, fortalecer la práctica clínica y acompañar el seguimiento del paciente.";

    const panelBadge = document.querySelector(".panel-badge");
    if (panelBadge) panelBadge.textContent = "KINECHECK";

    document.querySelectorAll("a, button, h3, p, summary").forEach((element) => {
      if (element.children.length === 0 && element.textContent.includes("Academy")) {
        element.textContent = element.textContent
          .replaceAll("KineCheck Academy", "KineCheck")
          .replaceAll("Academy", "KineCheck");
      }
    });
  }

  document.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-public-filter]");
    if (filter) {
      if (filter.matches("a")) event.preventDefault();
      applyFilter(
        filter.dataset.publicFilter,
        Boolean(filter.closest(".audience-card")),
      );
    }

    if (event.target.closest("[data-support-open]")) toggleSupport(true);
    if (event.target.closest("[data-support-close]")) toggleSupport(false);
  });

  menuButton?.addEventListener("click", () => toggleMenu());
  navigation?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => toggleMenu(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      toggleMenu(false);
      toggleSupport(false);
    }
  });

  applyKineCheckV4Brand();
})();
