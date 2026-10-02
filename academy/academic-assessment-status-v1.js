(function () {
  "use strict";

  const COURSE_SLUGS = new Set([
    "kinecheck-clinico-curso", "comunicacion-clinica", "mas-alla-del-dolor",
    "evidencia-aplicada", "traumatologia-ortopedia-clinica", "dolor-lumbar-persistente",
    "dolor-musculoesqueletico", "ejercicio-terapeutico",
  ]);
  const config = window.KINECHECK_ACADEMY_CONFIG;
  if (!config?.supabaseUrl || !config?.supabaseAnonKey) return;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function session() {
    return window.KINECHECK_ACADEMY_SESSION?.get?.() || null;
  }

  function ensureDialog() {
    let dialog = document.querySelector("#academic-assessment-dialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "academic-assessment-dialog";
    dialog.className = "academic-assessment-dialog";
    dialog.innerHTML = '<div class="academic-assessment-shell"><button type="button" class="academic-dialog-close" aria-label="Cerrar">×</button><div data-academic-dialog-content></div></div>';
    dialog.querySelector(".academic-dialog-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    document.body.append(dialog);
    return dialog;
  }

  function renderStatus(dialog, data) {
    const assessment = data.assessment || {};
    const rubric = Array.isArray(assessment.rubric) ? assessment.rubric : [];
    const requirements = Array.isArray(assessment.activationRequirements)
      ? assessment.activationRequirements : [];
    dialog.querySelector("[data-academic-dialog-content]").innerHTML = `
      <p class="academic-dialog-eyebrow">Estado académico</p>
      <h2>${escapeHtml(data.course?.title || "Evaluación final")}</h2>
      <span class="academic-status-pill">${assessment.active ? "Evaluación activa" : "Preparada · no activa"}</span>
      <p>${escapeHtml(data.message)}</p>
      <dl class="academic-status-grid">
        <div><dt>Diseño propuesto</dt><dd>${assessment.objectiveItemCount} preguntas + caso de ${assessment.casePoints} puntos</dd></div>
        <div><dt>Aprobación propuesta</dt><dd>${assessment.proposedPassScore}/100 y condición crítica de seguridad</dd></div>
        <div><dt>Intentos propuestos</dt><dd>${assessment.proposedMaxAttempts}; sujetos a aprobación OTEC</dd></div>
        <div><dt>Certificación</dt><dd>${data.certification?.active ? "Activa" : "Convenio OTEC pendiente · no SENCE"}</dd></div>
      </dl>
      <section class="academic-safety"><strong>Condición crítica</strong><p>${escapeHtml(assessment.safetyGate)}</p></section>
      ${assessment.ownerPreview && assessment.casePrompt ? `<section><h3>Vista previa del caso integrador</h3><p>${escapeHtml(assessment.casePrompt)}</p></section>` : ""}
      ${assessment.ownerPreview && rubric.length ? `<section><h3>Rúbrica preparada</h3><ul>${rubric.map((item) => `<li><strong>${escapeHtml(item.dimension)}</strong>: ${escapeHtml(item.maximum)} puntos</li>`).join("")}</ul></section>` : ""}
      <section><h3>Antes de activarla</h3><ul>${requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
      <p class="academic-status-note">Tus actividades actuales mantienen su carácter formativo. Esta pantalla no emite certificados ni cambia retroactivamente requisitos.</p>
    `;
  }

  async function openStatus(slug) {
    const dialog = ensureDialog();
    const content = dialog.querySelector("[data-academic-dialog-content]");
    content.innerHTML = '<p class="academic-dialog-loading">Consultando configuración académica…</p>';
    dialog.showModal();
    const activeSession = session();
    if (!activeSession?.access_token) {
      content.innerHTML = "<h2>Sesión requerida</h2><p>Vuelve a iniciar sesión en Academy.</p>";
      return;
    }
    try {
      const response = await fetch(`${String(config.supabaseUrl).replace(/\/$/, "")}/functions/v1/academic-assessment-status`, {
        method: "POST",
        cache: "no-store",
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${activeSession.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseSlug: slug }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No fue posible consultar la evaluación.");
      renderStatus(dialog, data);
    } catch (error) {
      content.innerHTML = `<h2>Estado no disponible</h2><p>${escapeHtml(error.message)}</p>`;
    }
  }

  function enhanceCards() {
    document.querySelectorAll("[data-card-course]").forEach((card) => {
      const slug = card.getAttribute("data-card-course");
      if (!COURSE_SLUGS.has(slug) || card.querySelector("[data-assessment-course]")) return;
      const openButton = card.querySelector('button[data-course]:not([disabled])');
      if (!openButton) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "academic-status-button";
      button.dataset.assessmentCourse = slug;
      button.textContent = "Evaluación académica";
      openButton.insertAdjacentElement("beforebegin", button);
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-assessment-course]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openStatus(button.dataset.assessmentCourse);
  });
  new MutationObserver(enhanceCards).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhanceCards);
  else enhanceCards();
})();
