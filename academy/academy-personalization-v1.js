(() => {
  "use strict";

  if (window.__KINECHECK_PERSONALIZATION_V1__) return;
  window.__KINECHECK_PERSONALIZATION_V1__ = true;

  const FAVORITES_KEY = "kinecheck_favorite_products_v1";
  const style = document.createElement("style");
  style.textContent = `
    .kc-favorite{position:absolute;top:14px;right:14px;z-index:2;display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(5,28,36,.78);color:#cfe2e5;font-size:18px;cursor:pointer;backdrop-filter:blur(8px)}
    .kc-favorite[aria-pressed="true"]{color:#ffd76a;border-color:rgba(255,215,106,.48);background:rgba(94,75,20,.30)}
    .course-card{position:relative}
    .kc-recommendations{margin:26px 0 0;padding:22px;border:1px solid rgba(95,222,210,.18);border-radius:22px;background:linear-gradient(145deg,rgba(8,38,47,.78),rgba(5,26,34,.68))}
    .kc-recommendations__head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:14px}.kc-recommendations__head h2{margin:4px 0 0}.kc-recommendations__head span{color:#7bded1;font-size:.7rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
    .kc-recommendations__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .kc-recommendation{display:grid;gap:8px;min-height:140px;padding:16px;border:1px solid rgba(255,255,255,.10);border-radius:17px;background:rgba(255,255,255,.035);color:inherit;text-align:left;cursor:pointer}.kc-recommendation:hover{border-color:rgba(95,222,210,.36);transform:translateY(-1px)}
    .kc-recommendation small{color:#79dcd0;font-weight:850}.kc-recommendation strong{font-size:1rem;line-height:1.25}.kc-recommendation p{margin:0;color:#a9c0c5;font-size:.78rem;line-height:1.45}
    @media(max-width:800px){.kc-recommendations__grid{grid-template-columns:1fr}.kc-recommendations{padding:18px}}
    @media(prefers-reduced-motion:reduce){.kc-recommendation{transform:none!important}}
  `;
  document.head.appendChild(style);

  function readFavorites() {
    try {
      const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      return new Set(Array.isArray(value) ? value.map(String) : []);
    } catch { return new Set(); }
  }

  function writeFavorites(set) {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set])); } catch {}
  }

  function cardFor(slug) {
    return document.querySelector(`#course-grid [data-card-course="${CSS.escape(slug)}"]`);
  }

  function isOwned(slug) {
    const button = cardFor(slug)?.querySelector("button[data-course]");
    return Boolean(button && !button.disabled);
  }

  function addFavoriteButtons() {
    const favorites = readFavorites();
    document.querySelectorAll("#course-grid .course-card[data-card-course]").forEach((card) => {
      if (card.querySelector(".kc-favorite")) return;
      const slug = String(card.dataset.cardCourse || "").trim();
      if (!slug) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "kc-favorite";
      button.setAttribute("aria-label", "Guardar como favorito");
      button.setAttribute("aria-pressed", favorites.has(slug) ? "true" : "false");
      button.textContent = favorites.has(slug) ? "★" : "☆";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = readFavorites();
        if (next.has(slug)) next.delete(slug); else next.add(slug);
        writeFavorites(next);
        button.setAttribute("aria-pressed", next.has(slug) ? "true" : "false");
        button.textContent = next.has(slug) ? "★" : "☆";
        renderRecommendations();
      });
      card.appendChild(button);
    });
  }

  function recommendationScore(course, favorites) {
    let score = 0;
    if (favorites.has(course.slug)) score += 100;
    if (isOwned(course.slug)) score += 40;
    if (course.kind === "course") score += 15;
    if ((course.audiences || []).includes("professionals")) score += 5;
    return score;
  }

  function recommendationMarkup(course) {
    const owned = isOwned(course.slug);
    return `<button class="kc-recommendation" type="button" data-kc-recommend="${course.slug}"><small>${owned ? "EN TU CUENTA" : "PARA EXPLORAR"}</small><strong>${course.title}</strong><p>${course.subtitle || "Continúa construyendo tu ruta KineCheck."}</p></button>`;
  }

  function ensureRecommendationSection() {
    let section = document.querySelector("#kc-recommendations");
    if (section) return section;
    const homeCourses = document.querySelector("#home-course-grid")?.closest(".kc-home-section");
    if (!homeCourses) return null;
    section = document.createElement("section");
    section.id = "kc-recommendations";
    section.className = "kc-recommendations kc-home-section";
    section.dataset.kcSection = "inicio";
    section.innerHTML = `<div class="kc-recommendations__head"><div><span>RUTA PERSONAL</span><h2>Recomendado para ti</h2></div></div><div class="kc-recommendations__grid"></div>`;
    homeCourses.insertAdjacentElement("afterend", section);
    section.addEventListener("click", (event) => {
      const button = event.target.closest("[data-kc-recommend]");
      if (!button) return;
      const slug = String(button.dataset.kcRecommend || "").trim();
      if (!slug) return;
      if (isOwned(slug) && typeof window.KINECHECK_OPEN_PRODUCT === "function") {
        void window.KINECHECK_OPEN_PRODUCT(slug, button);
        return;
      }
      document.body.dataset.kcView = "explorar";
      location.hash = "explorar";
      window.dispatchEvent(new Event("hashchange"));
    });
    return section;
  }

  function renderRecommendations() {
    const config = window.KINECHECK_ACADEMY_CONFIG;
    if (!Array.isArray(config?.courses)) return;
    const section = ensureRecommendationSection();
    if (!section) return;
    const favorites = readFavorites();
    const courses = config.courses
      .filter((course) => course.status === "active" && course.url && course.kind !== "application")
      .sort((a, b) => recommendationScore(b, favorites) - recommendationScore(a, favorites))
      .slice(0, 3);
    const grid = section.querySelector(".kc-recommendations__grid");
    if (grid) grid.innerHTML = courses.map(recommendationMarkup).join("");
    section.hidden = courses.length === 0;
  }

  function refresh() {
    addFavoriteButtons();
    renderRecommendations();
  }

  const observer = new MutationObserver(refresh);
  const start = () => {
    const grid = document.querySelector("#course-grid");
    if (!grid) return window.setTimeout(start, 120);
    observer.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
    refresh();
  };
  start();
})();
