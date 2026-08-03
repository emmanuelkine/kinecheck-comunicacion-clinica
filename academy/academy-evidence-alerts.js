(() => {
  const DATA_URL = "./evidence-alerts.json?v=20260731-2";
  const STATE_PREFIX = "kinecheck_academy_evidence_state_v1";
  const SECTION_ID = "evidencia-semanal";
  let dataset = null;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

  function storageScope() {
    try {
      const session = window.KINECHECK_ACADEMY_SESSION?.get?.()
        || JSON.parse(localStorage.getItem("kinecheck_secure_session_v1") || "null");
      return String(session?.user?.email || session?.user?.id || "anonymous").trim().toLowerCase();
    } catch {
      return "anonymous";
    }
  }

  function stateKey() {
    return `${STATE_PREFIX}:${storageScope()}`;
  }

  function readState() {
    try {
      const stored = JSON.parse(localStorage.getItem(stateKey()) || "{}");
      return {
        read: Array.isArray(stored.read) ? stored.read : [],
        favorites: Array.isArray(stored.favorites) ? stored.favorites : [],
      };
    } catch {
      return { read: [], favorites: [] };
    }
  }

  function saveState(state) {
    localStorage.setItem(stateKey(), JSON.stringify(state));
    updateUnreadCounters();
  }

  function toggleState(collection, id) {
    const state = readState();
    const values = new Set(state[collection]);
    values.has(id) ? values.delete(id) : values.add(id);
    state[collection] = [...values];
    saveState(state);
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return String(value || "");
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  function evidenceCourseUrl() {
    const course = window.KINECHECK_ACADEMY_CONFIG?.courses?.find(
      (item) => item.slug === "evidencia-aplicada",
    );
    return course?.url || "https://emmanuelkine.github.io/kinecheck-evidencia-aplicada/";
  }

  async function loadDataset() {
    if (dataset) return dataset;
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("No fue posible cargar la evidencia semanal.");
    dataset = await response.json();
    if (dataset.contentClassification !== "public-evidence-digest") {
      throw new Error("La clasificación editorial del contenido no es válida.");
    }
    return dataset;
  }

  function installNavigation() {
    const sidebarNav = document.querySelector(".sidebar-nav");
    if (sidebarNav && !sidebarNav.querySelector(`[href="#${SECTION_ID}"]`)) {
      const link = document.createElement("a");
      link.className = "nav-item";
      link.href = `#${SECTION_ID}`;
      link.innerHTML = '<span class="nav-icon">⌁</span><span>Evidencia semanal</span><span class="nav-evidence-count" hidden>0</span>';
      const resources = sidebarNav.querySelector('a[href="#recursos"]');
      sidebarNav.insertBefore(link, resources || sidebarNav.lastElementChild);
      link.addEventListener("click", () => {
        sidebarNav.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
        if (window.innerWidth <= 980) {
          document.querySelector("#academy-sidebar")?.classList.remove("open");
          const overlay = document.querySelector("#sidebar-overlay");
          if (overlay) overlay.hidden = true;
          document.querySelector("#mobile-menu")?.setAttribute("aria-expanded", "false");
        }
      });
    }

    const topbarNav = document.querySelector(".topbar-nav");
    if (topbarNav && !topbarNav.querySelector(`[href="#${SECTION_ID}"]`)) {
      const link = document.createElement("a");
      link.href = `#${SECTION_ID}`;
      link.innerHTML = 'Evidencia <span class="topbar-evidence-count" hidden>0</span>';
      const resources = topbarNav.querySelector('a[href="#recursos"]');
      topbarNav.insertBefore(link, resources || topbarNav.lastElementChild);
      link.addEventListener("click", () => {
        topbarNav.querySelectorAll("a").forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
      });
    }
  }

  function installSection() {
    const main = document.querySelector("#contenido-principal");
    const resources = document.querySelector("#recursos");
    if (!main || document.getElementById(SECTION_ID)) return;

    const section = document.createElement("section");
    section.id = SECTION_ID;
    section.className = "evidence-section";
    section.setAttribute("aria-labelledby", "evidence-title");
    section.innerHTML = `
      <div class="evidence-heading">
        <div>
          <span class="eyebrow compact">EVIDENCIA ACTUALIZADA</span>
          <h2 id="evidence-title">Evidencia semanal aplicada</h2>
          <p>Hallazgos nuevos de PubMed, PEDro y vigilancia de guías clínicas, traducidos a decisiones clínicas y oportunidades docentes para kinesiología.</p>
        </div>
        <div class="evidence-summary" aria-live="polite">
          <span id="evidence-total" class="evidence-pill verified">Cargando referencias…</span>
          <span id="evidence-reviewed" class="evidence-pill">0 revisadas</span>
          <span id="evidence-date" class="evidence-pill">Última revisión pendiente</span>
        </div>
      </div>
      <div id="evidence-editorial-note" class="evidence-editorial-note">Cargando criterio editorial…</div>
      <div class="evidence-tools" aria-label="Filtros de evidencia semanal">
        <input id="evidence-search" type="search" placeholder="Buscar región, intervención o concepto" autocomplete="off">
        <select id="evidence-source" aria-label="Filtrar por fuente"><option value="">Todas las fuentes</option></select>
        <select id="evidence-status" aria-label="Filtrar por estado">
          <option value="">Todas las alertas</option>
          <option value="unread">Pendientes</option>
          <option value="read">Revisadas</option>
          <option value="favorite">Favoritas</option>
        </select>
      </div>
      <div id="evidence-results" class="evidence-results" aria-live="polite">
        <div class="evidence-empty">Cargando evidencia verificada…</div>
      </div>
      <div id="evidence-watchlist"></div>
      <div class="evidence-footer-action">
        <div>
          <strong>Profundiza el razonamiento crítico</strong>
          <p>El curso KineCheck Evidencia Aplicada conserva las actividades, casos, cuaderno clínico y progreso protegido.</p>
        </div>
        <a id="evidence-course-link" class="evidence-course-link" href="${escapeHtml(evidenceCourseUrl())}">Abrir Evidencia Aplicada</a>
      </div>
    `;
    main.insertBefore(section, resources || null);
  }

  function searchableText(item) {
    return [
      item.title,
      item.authors,
      item.citation,
      item.studyType,
      item.population,
      item.mainFinding,
      item.quality,
      item.clinicalImplication,
      item.teachingImplication,
      ...(item.topics || []),
    ].join(" ").toLowerCase();
  }

  function cardMarkup(item, state, index) {
    const isRead = state.read.includes(item.id);
    const isFavorite = state.favorites.includes(item.id);
    const open = index === 0 && !isRead ? " open" : "";
    return `
      <details class="evidence-card ${isRead ? "is-read" : ""}" data-evidence-id="${escapeHtml(item.id)}"${open}>
        <summary>
          <span class="evidence-source">${escapeHtml(item.source)}</span>
          <span class="evidence-title-block">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.studyType)} · alerta ${escapeHtml(formatDate(item.alertDate))}</span>
          </span>
          <span class="evidence-summary-state">${isRead ? "Revisada" : '<span class="evidence-unread-dot" aria-hidden="true"></span>Pendiente'}</span>
        </summary>
        <div class="evidence-card-body">
          <p class="evidence-reference">${escapeHtml(item.citation)}</p>
          <div class="evidence-tags">${(item.topics || []).map((topic) => `<span class="evidence-tag">${escapeHtml(topic)}</span>`).join("")}</div>
          <div class="evidence-grid">
            <div class="evidence-field"><strong>Población</strong><p>${escapeHtml(item.population)}</p></div>
            <div class="evidence-field"><strong>Hallazgo principal</strong><p>${escapeHtml(item.mainFinding)}</p></div>
            <div class="evidence-field"><strong>Calidad y limitaciones</strong><p>${escapeHtml(item.quality)}</p></div>
            <div class="evidence-field"><strong>Referencia</strong><p>${escapeHtml(item.authors)}${item.pmid ? ` · PMID ${escapeHtml(item.pmid)}` : ""}${item.pedroScore ? ` · PEDro ${escapeHtml(item.pedroScore)}` : ""}</p></div>
          </div>
          <div class="evidence-implications">
            <div class="evidence-implication"><strong>Implicación clínica</strong><p>${escapeHtml(item.clinicalImplication)}</p></div>
            <div class="evidence-implication teaching"><strong>Implicación docente</strong><p>${escapeHtml(item.teachingImplication)}</p></div>
          </div>
          <div class="evidence-actions">
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Abrir fuente original</a>
            <button type="button" data-evidence-action="read" data-evidence-id="${escapeHtml(item.id)}">${isRead ? "Marcar pendiente" : "Marcar revisada"}</button>
            <button type="button" class="${isFavorite ? "active" : ""}" data-evidence-action="favorite" data-evidence-id="${escapeHtml(item.id)}">${isFavorite ? "Favorita ★" : "Guardar favorita"}</button>
          </div>
        </div>
      </details>
    `;
  }

  function watchlistMarkup(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return `
      <section class="evidence-watchlist" aria-labelledby="evidence-watch-title">
        <h3 id="evidence-watch-title">Vigilancia de guías clínicas</h3>
        ${items.map((item) => `
          <article>
            <span class="evidence-pill">${escapeHtml(item.status)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.message)}</p>
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Revisar estado oficial</a>
          </article>
        `).join("")}
      </section>
    `;
  }

  function filteredItems() {
    const state = readState();
    const query = document.querySelector("#evidence-search")?.value.trim().toLowerCase() || "";
    const source = document.querySelector("#evidence-source")?.value || "";
    const status = document.querySelector("#evidence-status")?.value || "";
    return (dataset?.items || [])
      .slice()
      .sort((a, b) => String(b.alertDate).localeCompare(String(a.alertDate)) || String(b.publicationDate).localeCompare(String(a.publicationDate)))
      .filter((item) => {
        const matchesQuery = !query || searchableText(item).includes(query);
        const matchesSource = !source || item.source === source;
        const matchesStatus = !status
          || (status === "unread" && !state.read.includes(item.id))
          || (status === "read" && state.read.includes(item.id))
          || (status === "favorite" && state.favorites.includes(item.id));
        return matchesQuery && matchesSource && matchesStatus;
      });
  }

  function updateSummary() {
    if (!dataset) return;
    const state = readState();
    const total = dataset.items?.length || 0;
    const reviewed = dataset.items?.filter((item) => state.read.includes(item.id)).length || 0;
    const totalElement = document.querySelector("#evidence-total");
    const reviewedElement = document.querySelector("#evidence-reviewed");
    const dateElement = document.querySelector("#evidence-date");
    if (totalElement) totalElement.textContent = `${total} referencias verificadas`;
    if (reviewedElement) reviewedElement.textContent = `${reviewed} revisada${reviewed === 1 ? "" : "s"}`;
    if (dateElement) dateElement.textContent = `Actualizado ${formatDate(dataset.lastReviewed)}`;
  }

  function updateUnreadCounters() {
    if (!dataset) return;
    const state = readState();
    const unread = dataset.items.filter((item) => !state.read.includes(item.id)).length;
    document.querySelectorAll(".nav-evidence-count,.topbar-evidence-count").forEach((counter) => {
      counter.textContent = String(unread);
      counter.hidden = unread === 0;
    });
    updateSummary();
  }

  function render() {
    const container = document.querySelector("#evidence-results");
    if (!container || !dataset) return;
    const items = filteredItems();
    const state = readState();
    container.innerHTML = items.length
      ? items.map((item, index) => cardMarkup(item, state, index)).join("")
      : '<div class="evidence-empty">No hay alertas que coincidan con estos filtros.</div>';
    updateSummary();
  }

  function refreshForActiveSession() {
    if (!dataset) return;
    render();
    updateUnreadCounters();
  }

  function watchSessionActivation() {
    const dashboard = document.querySelector("#dashboard-view");
    if (dashboard) {
      new MutationObserver(() => {
        if (!dashboard.hidden) refreshForActiveSession();
      }).observe(dashboard, { attributes: true, attributeFilter: ["hidden"] });
    }
    window.addEventListener("storage", (event) => {
      if (event.key === "kinecheck_secure_session_v1" || String(event.key || "").startsWith(STATE_PREFIX)) {
        refreshForActiveSession();
      }
    });
  }

  function wireSection() {
    ["#evidence-search", "#evidence-source", "#evidence-status"].forEach((selector) => {
      document.querySelector(selector)?.addEventListener("input", render);
    });

    document.querySelector(`#${SECTION_ID}`)?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-evidence-action]");
      if (!button) return;
      const collection = button.dataset.evidenceAction === "favorite" ? "favorites" : "read";
      toggleState(collection, button.dataset.evidenceId);
      render();
    });
  }

  async function initializeData() {
    try {
      await loadDataset();
      const sourceSelect = document.querySelector("#evidence-source");
      if (sourceSelect) {
        [...new Set(dataset.items.map((item) => item.source))].forEach((source) => {
          const option = document.createElement("option");
          option.value = source;
          option.textContent = source;
          sourceSelect.appendChild(option);
        });
      }
      const note = document.querySelector("#evidence-editorial-note");
      if (note) note.innerHTML = `<strong>Criterio editorial:</strong> ${escapeHtml(dataset.editorialNote)}`;
      const watchlist = document.querySelector("#evidence-watchlist");
      if (watchlist) watchlist.innerHTML = watchlistMarkup(dataset.watchlist);
      render();
      updateUnreadCounters();
    } catch (error) {
      const container = document.querySelector("#evidence-results");
      if (container) container.innerHTML = `<div class="evidence-empty"><strong>No fue posible cargar la evidencia.</strong><br>${escapeHtml(error.message)}</div>`;
    }
  }

  function init() {
    installNavigation();
    installSection();
    wireSection();
    watchSessionActivation();
    initializeData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
