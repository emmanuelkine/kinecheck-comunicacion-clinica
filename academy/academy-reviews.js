(() => {
  const CONFIG = window.KINECHECK_ACADEMY_CONFIG;
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const state = { course: null, rating: 0, existing: null };

  function loadAcademyEvidenceExtension() {
    if (!document.querySelector('link[data-academy-evidence]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "./academy-evidence-alerts.css?v=20260731-2";
      stylesheet.dataset.academyEvidence = "styles";
      document.head.appendChild(stylesheet);
    }

    if (!document.querySelector('script[data-academy-evidence]')) {
      const script = document.createElement("script");
      script.src = "./academy-evidence-alerts.js?v=20260731-2";
      script.dataset.academyEvidence = "script";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  function loadLearningPathExtension() {
    if (!document.querySelector('link[data-kinecheck-learning-path]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "./academy-learning-path-v4.css?v=20260731-color2";
      stylesheet.dataset.kinecheckLearningPath = "styles";
      document.head.appendChild(stylesheet);
    }

    if (!document.querySelector('script[data-kinecheck-learning-path]')) {
      const script = document.createElement("script");
      script.src = "./academy-learning-path-v4.js?v=20260731-1";
      script.dataset.kinecheckLearningPath = "script";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  function loadLaunchRouterExtension() {
    if (document.querySelector('script[data-kinecheck-launch-router]')) return;
    const script = document.createElement("script");
    script.src = "./academy-launch-router-v4.js?v=20260731-sso1";
    script.dataset.kinecheckLaunchRouter = "script";
    script.defer = true;
    document.head.appendChild(script);
  }

  function session() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function addReviewActions() {
    document.querySelectorAll(".course-card").forEach((card) => {
      const courseButton = card.querySelector("[data-course]");
      const currentBox = card.querySelector(".course-rating");
      const slug = courseButton?.dataset.course;
      const course = CONFIG.courses.find((item) => item.slug === slug);

      if (!courseButton || courseButton.disabled || course?.kind !== "course") {
        currentBox?.remove();
        return;
      }

      if (currentBox) return;

      const box = document.createElement("div");
      box.className = "course-rating";
      box.innerHTML = `
        <span class="course-rating-stars" data-rating-stars>☆☆☆☆☆</span>
        <span data-rating-summary>Comparte tu experiencia</span>
        <button type="button" class="review-button" data-review-course="${slug}">Evaluar curso</button>
      `;
      const meta = card.querySelector(".course-meta");
      (meta || card.querySelector("p")).insertAdjacentElement("afterend", box);
    });
  }

  function createModal() {
    const modal = document.createElement("div");
    modal.id = "review-modal";
    modal.className = "review-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <button class="review-close" type="button" aria-label="Cerrar">×</button>
        <span class="eyebrow compact">TU EXPERIENCIA</span>
        <h2 id="review-title">Califica este curso</h2>
        <p id="review-course-name" class="review-course-name"></p>
        <form id="review-form">
          <fieldset>
            <legend>Calificación general</legend>
            <div class="review-stars">${[1, 2, 3, 4, 5].map((number) => `<button type="button" data-star="${number}" aria-label="${number} estrellas">☆</button>`).join("")}</div>
          </fieldset>
          <label>¿Recomendarías este curso?<select id="review-recommend" required><option value="">Selecciona</option><option value="yes">Sí</option><option value="no">No</option></select></label>
          <label>¿Qué fue lo mejor?<textarea id="review-best" maxlength="800" rows="3"></textarea></label>
          <label>¿Qué mejorarías?<textarea id="review-improve" maxlength="800" rows="3"></textarea></label>
          <label class="review-consent"><input id="review-public" type="checkbox" checked> Autorizo publicar mi comentario de forma anónima.</label>
          <div id="review-message" class="notice" hidden></div>
          <button class="review-submit" type="submit">Enviar evaluación</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function setRating(value) {
    state.rating = Number(value);
    document.querySelectorAll("[data-star]").forEach((button) => {
      const active = Number(button.dataset.star) <= state.rating;
      button.textContent = active ? "★" : "☆";
      button.classList.toggle("active", active);
    });
  }

  async function loadExistingReview(slug) {
    const current = session();
    if (!current?.access_token) return null;
    try {
      const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/course-review?courseSlug=${encodeURIComponent(slug)}`, {
        headers: { apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${current.access_token}` },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.review || data;
    } catch { return null; }
  }

  function fillExistingReview(review) {
    if (!review || !Number(review.rating)) return;
    setRating(review.rating);
    document.querySelector("#review-recommend").value = review.recommends ? "yes" : "no";
    document.querySelector("#review-best").value = review.bestPart || review.best_part || "";
    document.querySelector("#review-improve").value = review.improvement || "";
    document.querySelector("#review-public").checked = Boolean(review.publicComment ?? review.public_comment);
    document.querySelector(".review-submit").textContent = "Actualizar evaluación";
  }

  async function openReview(slug) {
    const trigger = document.querySelector(`[data-review-course="${CSS.escape(slug)}"]`);
    const accessButton = trigger?.closest(".course-card")?.querySelector("[data-course]");
    state.course = CONFIG.courses.find((course) => course.slug === slug && course.kind === "course");
    if (!state.course || !session()?.access_token || !accessButton || accessButton.disabled) return;

    document.querySelector("#review-course-name").textContent = state.course.title;
    document.querySelector("#review-form").reset();
    document.querySelector("#review-public").checked = true;
    document.querySelector("#review-message").hidden = true;
    setRating(0);
    document.querySelector(".review-submit").textContent = "Enviar evaluación";
    state.existing = await loadExistingReview(slug);
    fillExistingReview(state.existing);
    document.querySelector("#review-modal").hidden = false;
    document.body.classList.add("review-open");
  }

  function closeReview() {
    document.querySelector("#review-modal").hidden = true;
    document.body.classList.remove("review-open");
  }

  async function submitReview(event) {
    event.preventDefault();
    const current = session();
    const reviewMessage = document.querySelector("#review-message");

    if (!current?.access_token || !state.course || state.rating < 1) {
      reviewMessage.textContent = "Selecciona entre 1 y 5 estrellas.";
      reviewMessage.className = "notice error";
      reviewMessage.hidden = false;
      return;
    }

    const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/course-review`, {
      method: "POST",
      headers: {
        apikey: CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${current.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseSlug: state.course.slug,
        rating: state.rating,
        recommends: document.querySelector("#review-recommend").value === "yes",
        bestPart: document.querySelector("#review-best").value.trim(),
        improvement: document.querySelector("#review-improve").value.trim(),
        publicComment: document.querySelector("#review-public").checked,
      }),
    });

    const data = await response.json().catch(() => ({}));
    reviewMessage.textContent = response.ok
      ? "Gracias. Tu evaluación fue registrada y quedará pendiente de revisión."
      : (data.message || "No fue posible registrar la evaluación.");
    reviewMessage.className = response.ok ? "notice" : "notice error";
    reviewMessage.hidden = false;
    if (response.ok) {
      const button = document.querySelector(`[data-review-course="${CSS.escape(state.course.slug)}"]`);
      if (button) button.textContent = "Editar mi evaluación";
      setTimeout(closeReview, 1600);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadAcademyEvidenceExtension();
    loadLearningPathExtension();
    loadLaunchRouterExtension();
    createModal();
    addReviewActions();
    const catalog = document.querySelector("#course-grid");
    if (catalog) {
      new MutationObserver(addReviewActions).observe(catalog, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled"],
      });
    }

    document.addEventListener("click", (event) => {
      const review = event.target.closest("[data-review-course]");
      if (review) openReview(review.dataset.reviewCourse);
      const star = event.target.closest("[data-star]");
      if (star) setRating(star.dataset.star);
      if (event.target.closest(".review-close") || event.target.id === "review-modal") closeReview();
    });

    document.querySelector("#review-form").addEventListener("submit", submitReview);
  });
})();