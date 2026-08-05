(() => {
  "use strict";

  const input = document.querySelector("#help-search");
  const items = [...document.querySelectorAll("[data-help-item]")];
  const noResults = document.querySelector("#no-results");

  if (!input) return;

  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const update = () => {
    const query = normalize(input.value);
    let visible = 0;

    items.forEach((item) => {
      const haystack = normalize(`${item.dataset.search || ""} ${item.textContent || ""}`);
      const matches = !query || query.split(/\s+/).every((term) => haystack.includes(term));
      item.classList.toggle("hidden-by-search", !matches);
      if (matches) visible += 1;
      if (matches && query && item.tagName === "DETAILS") item.open = true;
      if (!query && item.tagName === "DETAILS") item.open = false;
    });

    if (noResults) noResults.hidden = visible > 0;
  };

  input.addEventListener("input", update);
  input.addEventListener("search", update);

  const requested = new URLSearchParams(location.search).get("q");
  if (requested) {
    input.value = requested;
    update();
  }
})();