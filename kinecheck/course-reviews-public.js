(() => {
  const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
  const ANON_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";
  const COURSE_SLUGS = ["comunicacion-clinica","mas-alla-del-dolor","evidencia-aplicada","traumatologia-ortopedia-clinica"];

  const stars = (rating) => {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return "★".repeat(rounded) + "☆".repeat(5 - rounded);
  };

  function mountPlaceholders() {
    document.querySelectorAll(".product-card[data-course-slug]").forEach((card) => {
      if (card.querySelector(".public-course-rating")) return;
      const box = document.createElement("div");
      box.className = "public-course-rating";
      box.dataset.publicRating = card.dataset.courseSlug;
      box.innerHTML = '<span class="public-rating-stars" aria-hidden="true">☆☆☆☆☆</span><span>Aún sin evaluaciones</span>';
      card.querySelector(".subtitle")?.insertAdjacentElement("afterend", box);
    });
  }

  function renderSummary(item) {
    const slug = item.courseSlug || item.course_slug;
    const rating = Number(item.averageRating ?? item.average_rating ?? 0);
    const count = Number(item.reviewCount ?? item.review_count ?? 0);
    document.querySelectorAll(`[data-public-rating="${CSS.escape(slug)}"]`).forEach((box) => {
      box.innerHTML = count > 0
        ? `<span class="public-rating-stars" aria-label="${rating.toFixed(1)} de 5 estrellas">${stars(rating)}</span><strong>${rating.toFixed(1)}</strong><span>· ${count} ${count === 1 ? "opinión" : "opiniones"}</span>`
        : '<span class="public-rating-stars" aria-hidden="true">☆☆☆☆☆</span><span>Aún sin evaluaciones</span>';
    });
  }

  function renderTestimonials(items) {
    const approved = items.filter((item) => item.comment && (item.approved ?? true)).slice(0, 6);
    const section = document.querySelector("#opiniones-cursos");
    const grid = document.querySelector("#public-review-grid");
    if (!section || !grid || !approved.length) return;
    grid.replaceChildren(...approved.map((item) => {
      const article = document.createElement("article");
      article.className = "public-review-card";
      const title = item.courseTitle || item.course_title || "Curso KineCheck";
      const rating = Number(item.rating || 0);
      article.innerHTML = `<span class="public-rating-stars" aria-label="${rating} de 5 estrellas">${stars(rating)}</span><p></p><strong></strong><small>Opinión verificada</small>`;
      article.querySelector("p").textContent = item.comment;
      article.querySelector("strong").textContent = title;
      return article;
    }));
    section.hidden = false;
  }

  async function loadRatings() {
    mountPlaceholders();
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/course-reviews-public?courseSlugs=${encodeURIComponent(COURSE_SLUGS.join(","))}`, {
        headers: { apikey: ANON_KEY }
      });
      if (!response.ok) return;
      const data = await response.json();
      (data.summaries || []).forEach(renderSummary);
      renderTestimonials(data.reviews || []);
    } catch {
      // El catálogo sigue disponible aunque las calificaciones no puedan cargarse.
    }
  }

  document.addEventListener("DOMContentLoaded", loadRatings);
  new MutationObserver(mountPlaceholders).observe(document.documentElement, { childList: true, subtree: true });
})();