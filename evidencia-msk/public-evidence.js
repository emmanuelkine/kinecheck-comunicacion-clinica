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

  const renderError = () => {
    const latest = document.querySelector('#latest');
    const archive = document.querySelector('#archive');
    if (latest) latest.innerHTML = '<div class="empty">No fue posible cargar la actualización en este momento.</div>';
    if (archive) archive.innerHTML = '<div class="empty">No fue posible cargar el historial.</div>';
  };

  async function loadEvidence() {
    const latestRoot = document.querySelector('#latest');
    const archiveRoot = document.querySelector('#archive');
    if (!latestRoot || !archiveRoot) return;

    try {
      const response = await fetch('/evidencia-msk/actualizaciones.json?v=20260916-1', {
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

      latestRoot.innerHTML = `
        <article class="digest">
          <span class="digest-date">${esc(formatDate(latest.date))}</span>
          <h3>${esc(latest.title)}</h3>
          <p class="digest-summary">${esc(latest.summary)}</p>
          <div class="highlights">
            ${(latest.highlights || []).map((item) => `<div class="highlight">${esc(item)}</div>`).join('')}
          </div>
          <div class="practice"><strong>Qué cambia:</strong> ${esc(latest.practiceMessage)}</div>
          <div class="actions"><a class="primary" href="${esc(premiumUrl)}">${esc(premiumLabel)}</a></div>
        </article>`;

      archiveRoot.innerHTML = updates.map((update, index) => `
        <details ${index === 0 ? 'open' : ''}>
          <summary>${esc(formatDate(update.date))} · ${esc(update.title)}</summary>
          <p>${esc(update.summary)}</p>
          <ul>${(update.highlights || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
        </details>`).join('');
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