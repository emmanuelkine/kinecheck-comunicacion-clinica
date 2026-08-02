(() => {
  const params = new URLSearchParams(location.search);
  if (params.get("course") === "comunicacion-clinica") {
    location.replace(`/comunicacion-clinica.html${location.search}${location.hash}`);
    return;
  }

  const menuButton = document.querySelector("#menu-button");
  const nav = document.querySelector("#site-nav");
  const year = document.querySelector("#current-year");
  const filters = document.querySelectorAll("[data-filter]");
  const products = document.querySelectorAll("[data-product-card]");

  if (year) year.textContent = String(new Date().getFullYear());

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
})();