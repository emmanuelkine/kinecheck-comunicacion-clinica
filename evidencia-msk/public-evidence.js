(()=>{
  'use strict';

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

  const formatDate = (date) => {
    try {
      return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(new Date(`${date}T12:00:00`));
    } catch {
      return date;
    }
  };

  const topicMarkup = (topics = []) => topics.length
    ? `<div class="topic-tags" aria-label="Temas">${topics.map((topic) => `<span class="topic-tag">${esc(topic)}</span>`).join('')}</div>`
    : '';

  const renderError = () => {
    const latest = document.querySelector('#latest');
    const archive = document.querySelector('#archive');
    if (latest) latest.innerHTML = '<div class="empty">No fue posible cargar la actualización en este momento.</div>';
    if (archive) archive.innerHTML = '<div class="empty">No fue posible cargar el historial.</div>';
  };

  async function loadEvidence() {
    const latestRoot = document.querySelector('#latest');
    const archiveRoot = document.querySelector('#archive');
    const filtersRoot = document.querySelector('#evidence-filters');
    const filterStatus = document.querySelector('#filter-status');
    if (!latestRoot || !archiveRoot) return;

    try {
      const response = await fetch('/evidencia-msk/actualizaciones.json?v=20261002-3', {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const updates = Array.isArray(data.updates) ? data.updates : [];
      const latest = updates[0];

      if (!latest) {
        latestRoot.innerHTML = '<div class="empty">Aún no hay una actualización publicada.</div>';
        archiveRoot.innerHTML = '<div class="empty">Aún no hay historial disponible.</div>';
        return;
      }

      const premiumUrl = latest.premiumUrl || data.premiumUrl || '/productos/evidencia-aplicada/';
      const premiumLabel = latest.premiumLabel || 'Ver análisis completo';
      const sourceUrl = latest.sourceUrl || '';

      latestRoot.innerHTML = `
        <article class="digest">
          <span class="digest-date">${esc(formatDate(latest.date))}</span>
          <h3>${esc(latest.title)}</h3>
          ${topicMarkup(latest.topics)}
          <p class="digest-summary">${esc(latest.summary)}</p>
          <div class="highlights">
            ${(latest.highlights || []).map((item) => `<div class="highlight">${esc(item)}</div>`).join('')}
          </div>
          <div class="practice"><strong>Qué cambia:</strong> ${esc(latest.practiceMessage)}</div>
          <div class="actions">
            <a class="primary" href="${esc(premiumUrl)}">${esc(premiumLabel)}</a>
            ${sourceUrl ? `<a class="secondary" href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">Abrir fuente original</a>` : ''}
          </div>
        </article>`;

      const topicCounts = new Map();
      updates.forEach((update) => {
        (update.topics || []).forEach((topic) => topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1));
      });
      const preferredOrder = ['Hombro', 'Columna', 'Rodilla', 'Tendón', 'Dolor', 'Evaluación y razonamiento', 'Ejercicio', 'Terapia manual'];
      const topics = [...topicCounts.keys()].sort((a, b) => {
        const ai = preferredOrder.indexOf(a);
        const bi = preferredOrder.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b, 'es');
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

      let activeTopic = 'Todos';

      const renderArchive = () => {
        const visible = activeTopic === 'Todos'
          ? updates
          : updates.filter((update) => (update.topics || []).includes(activeTopic));

        archiveRoot.innerHTML = visible.length ? visible.map((update, index) => `
          <details ${index === 0 ? 'open' : ''}>
            <summary>${esc(formatDate(update.date))} · ${esc(update.title)}</summary>
            ${topicMarkup(update.topics)}
            <p>${esc(update.summary)}</p>
            <ul>${(update.highlights || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
          </details>`).join('') : '<div class="empty">No hay resúmenes publicados en este tema.</div>';

        if (filterStatus) {
          filterStatus.textContent = activeTopic === 'Todos'
            ? `${visible.length} resúmenes disponibles`
            : `${visible.length} ${visible.length === 1 ? 'resumen' : 'resúmenes'} en ${activeTopic}`;
        }
      };

      if (filtersRoot) {
        const filterItems = [
          { label: 'Todos', count: updates.length },
          ...topics.map((topic) => ({ label: topic, count: topicCounts.get(topic) || 0 }))
        ];
        filtersRoot.innerHTML = filterItems.map(({ label, count }) => `
          <button class="filter-chip${label === 'Todos' ? ' is-active' : ''}" type="button" data-topic="${esc(label)}" aria-pressed="${label === 'Todos' ? 'true' : 'false'}">
            ${esc(label)} <span>${count}</span>
          </button>`).join('');

        filtersRoot.addEventListener('click', (event) => {
          const button = event.target.closest('.filter-chip');
          if (!button) return;
          activeTopic = button.dataset.topic || 'Todos';
          filtersRoot.querySelectorAll('.filter-chip').forEach((chip) => {
            const selected = chip === button;
            chip.classList.toggle('is-active', selected);
            chip.setAttribute('aria-pressed', String(selected));
          });
          renderArchive();
        });
      }

      renderArchive();
    } catch (error) {
      console.error('No fue posible cargar Evidencia MSK', error);
      renderError();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadEvidence, { once: true });
  } else {
    loadEvidence();
  }
})();
