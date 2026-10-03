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

  function currentSession() {
    return window.KINECHECK_ACADEMY_SESSION?.get?.() || null;
  }

  async function api(functionName, body) {
    const activeSession = currentSession();
    if (!activeSession?.access_token) throw new Error("Tu sesión venció. Vuelve a ingresar a Academy.");
    const response = await fetch(`${String(config.supabaseUrl).replace(/\/$/, "")}/functions/v1/${functionName}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${activeSession.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || "No fue posible completar la solicitud.");
      error.payload = data;
      error.status = response.status;
      throw error;
    }
    return data;
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

  function resultMarkup(result) {
    const pass = result?.passed === true;
    const exhausted = Number(result?.attemptsUsed || 0) >= Number(result?.maxAttempts || 2) && !pass;
    return `
      <p class="academic-dialog-eyebrow">RESULTADO REGISTRADO</p>
      <h2>${pass ? "Evaluación aprobada" : "Evaluación no aprobada"}</h2>
      <span class="academic-status-pill ${pass ? "academic-pass" : "academic-review"}">${pass ? "Aprobado" : "Requiere nuevo intento"}</span>
      <dl class="academic-status-grid">
        <div><dt>Puntaje</dt><dd>${Number(result?.score || 0).toFixed(0)}%</dd></div>
        <div><dt>Mínimo</dt><dd>${Number(result?.passingScore || 80).toFixed(0)}%</dd></div>
        <div><dt>Preguntas correctas</dt><dd>${Number(result?.correct || 0)}/${Number(result?.total || 0)}</dd></div>
        <div><dt>Seguridad</dt><dd>${result?.safetyGatePassed ? "Cumplida" : "No cumplida"}</dd></div>
      </dl>
      <section class="academic-safety"><strong>Condición de seguridad</strong><p>${result?.safetyGatePassed ? "Las preguntas críticas de seguridad fueron respondidas correctamente." : "Al menos una pregunta crítica de seguridad fue incorrecta; este intento no puede aprobarse aunque el puntaje sea suficiente."}</p></section>
      ${pass ? `<section class="academic-result ${result?.courseCompletionConsolidated ? "academic-result-pass" : ""}"><h3>${result?.courseCompletionConsolidated ? "Finalización académica consolidada" : "Evaluación final aprobada"}</h3><p>${escapeHtml(result?.courseCompletionMessage || "")}</p></section>` : ""}
      <section>
        <h3>Retroalimentación</h3>
        <ol class="academic-feedback-list">
          ${(result?.feedback || []).map((item) => `<li class="${item.correct ? "is-correct" : "is-incorrect"}"><strong>Pregunta ${escapeHtml(item.itemOrder)}</strong> · ${item.correct ? "Correcta" : "Revisar"}<p>${escapeHtml(item.rationale || "")}</p></li>`).join("")}
        </ol>
      </section>
      ${!pass && !exhausted ? '<button type="button" class="academic-primary-action" data-academic-back>Volver al estado e iniciar el siguiente intento</button>' : ""}
      ${!pass && exhausted ? '<section class="academic-result"><h3>Intentos utilizados</h3><p>Los dos intentos quedaron registrados. Contacta soporte para una revisión académica antes de habilitar un nuevo intento.</p></section>' : ""}
      <p class="academic-status-note">Este resultado corresponde a la evaluación académica interna KineCheck. No equivale a certificación OTEC y el curso no es SENCE.</p>
    `;
  }

  function renderAssessment(dialog, payload, slug) {
    const assessment = payload.assessment || {};
    const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
    const content = dialog.querySelector("[data-academic-dialog-content]");
    content.innerHTML = `
      <p class="academic-dialog-eyebrow">EVALUACIÓN FINAL KINECHECK</p>
      <h2>${escapeHtml(payload.course?.title || "Evaluación final")}</h2>
      <p>Intento ${Number(assessment.attemptNumber || 1)} de ${Number(assessment.maxAttempts || 2)}. Apruebas con ${Number(assessment.passingScore || 80)}% y debes responder correctamente todas las preguntas críticas de seguridad.</p>
      <section class="academic-safety"><strong>Condición crítica</strong><p>${escapeHtml(assessment.safetyGate || "")}</p></section>
      <form data-academic-form data-attempt-id="${escapeHtml(assessment.attemptId)}" data-course-slug="${escapeHtml(slug)}">
        <ol class="academic-question-list">
          ${questions.map((question, questionIndex) => `
            <li class="academic-question">
              <fieldset>
                <legend><span>Pregunta ${questionIndex + 1}</span>${escapeHtml(question.stem)}</legend>
                ${(Array.isArray(question.options) ? question.options : []).map((option, optionIndex) => `
                  <label class="academic-option">
                    <input type="radio" name="q-${escapeHtml(question.id)}" value="${optionIndex}" required>
                    <span>${escapeHtml(option)}</span>
                  </label>
                `).join("")}
              </fieldset>
            </li>
          `).join("")}
        </ol>
        <div class="academic-submit-row">
          <button type="submit" class="academic-primary-action">Enviar y corregir evaluación</button>
          <small>El intento se registra al enviarlo. No cierres la ventana mientras se corrige.</small>
        </div>
      </form>
      <p class="academic-status-note">Evaluación interna KineCheck. La certificación OTEC permanece en preparación y no se emite desde esta pantalla.</p>
    `;

    const form = content.querySelector("[data-academic-form]");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = form.querySelector('button[type="submit"]');
      const answers = {};
      questions.forEach((question) => {
        const selected = form.querySelector(`input[name="q-${CSS.escape(String(question.id))}"]:checked`);
        if (selected) answers[String(question.id)] = Number(selected.value);
      });
      if (Object.keys(answers).length !== questions.length) {
        window.alert("Responde todas las preguntas antes de enviar.");
        return;
      }
      submitButton.disabled = true;
      submitButton.textContent = "Corrigiendo y registrando…";
      try {
        const result = await api("academic-assessment-submit", {
          attemptId: assessment.attemptId,
          answers,
        });
        content.innerHTML = resultMarkup(result);
        content.querySelector("[data-academic-back]")?.addEventListener("click", () => openStatus(slug, dialog));
      } catch (error) {
        submitButton.disabled = false;
        submitButton.textContent = "Enviar y corregir evaluación";
        const note = document.createElement("p");
        note.className = "notice error";
        note.textContent = error.message || "No fue posible corregir la evaluación.";
        form.prepend(note);
      }
    });
  }

  function renderStatus(dialog, data, slug) {
    const assessment = data.assessment || {};
    const attempts = Array.isArray(assessment.attempts) ? assessment.attempts : [];
    const passedAttempt = attempts.find((item) => item?.passed === true);
    const completion = assessment.completion || null;
    const passed = passedAttempt || (assessment.completed ? completion : null);
    const submitted = attempts.filter((item) => item?.submitted_at).length;
    const remaining = Math.max(0, Number(assessment.maxAttempts || 2) - submitted);
    const route = assessment.route || {};
    const routeLabel = route.trackingAvailable
      ? (route.complete ? "Completo" : "Pendiente")
      : "Verificación adicional";
    const canStart = assessment.canStart !== false;
    const content = dialog.querySelector("[data-academic-dialog-content]");

    content.innerHTML = `
      <p class="academic-dialog-eyebrow">EVALUACIÓN FINAL KINECHECK</p>
      <h2>${escapeHtml(data.course?.title || "Evaluación final")}</h2>
      <span class="academic-status-pill ${assessment.internalActive ? "" : "academic-review"}">${assessment.internalActive ? "Activa" : "No disponible"}</span>
      <p>${escapeHtml(data.message)}</p>
      <dl class="academic-status-grid">
        <div><dt>Preguntas</dt><dd>${Number(assessment.objectiveItemCount || 15)}</dd></div>
        <div><dt>Aprobación</dt><dd>${Number(assessment.passingScore || 80)}%</dd></div>
        <div><dt>Intentos</dt><dd>${submitted}/${Number(assessment.maxAttempts || 2)} usados</dd></div>
        <div><dt>Recorrido</dt><dd>${escapeHtml(routeLabel)}</dd></div>
        <div><dt>Certificación</dt><dd>${data.certification?.active ? "OTEC activa" : "OTEC en preparación · no SENCE"}</dd></div>
      </dl>
      <section class="academic-safety"><strong>Condición crítica de seguridad</strong><p>${escapeHtml(assessment.safetyGate || "Las preguntas críticas de seguridad deben responderse correctamente.")}</p></section>
      ${passed ? `<section class="academic-result academic-result-pass"><h3>Evaluación aprobada</h3><p>Resultado registrado en servidor: <strong>${escapeHtml(passed.score ?? "—")}%</strong>.</p><p>Esta aprobación es académica de KineCheck y no equivale todavía a certificación OTEC.</p></section>` : ""}
      ${!passed && assessment.internalActive && remaining > 0 && canStart ? `<button type="button" class="academic-primary-action" data-academic-start="${escapeHtml(slug)}">${submitted ? "Iniciar segundo intento" : "Comenzar evaluación final"}</button>` : ""}
      ${!passed && assessment.internalActive && remaining > 0 && !canStart ? '<section class="academic-result"><h3>Completa primero el recorrido</h3><p>La evaluación final quedará disponible cuando KineCheck verifique el recorrido obligatorio de este curso.</p></section>' : ""}
      ${!passed && remaining === 0 ? '<section class="academic-result"><h3>Intentos utilizados</h3><p>La evaluación quedó registrada sin aprobación en esta versión. Contacta soporte si necesitas una revisión académica.</p></section>' : ""}
      <p class="academic-status-note">La evaluación final es un requisito académico interno de KineCheck. La certificación privada OTEC seguirá bloqueada hasta que exista convenio, aprobación escrita del programa y plantilla autorizada.</p>
    `;

    content.querySelector("[data-academic-start]")?.addEventListener("click", async () => {
      const button = content.querySelector("[data-academic-start]");
      button.disabled = true;
      button.textContent = "Preparando evaluación…";
      try {
        const payload = await api("academic-assessment-start", { courseSlug: slug });
        if (payload.alreadyPassed) {
          await openStatus(slug, dialog);
          return;
        }
        renderAssessment(dialog, payload, slug);
      } catch (error) {
        button.disabled = false;
        button.textContent = submitted ? "Iniciar segundo intento" : "Comenzar evaluación final";
        const note = document.createElement("p");
        note.className = "notice error";
        note.textContent = error.message || "No fue posible iniciar la evaluación.";
        content.append(note);
      }
    });
  }

  async function openStatus(slug, existingDialog) {
    const dialog = existingDialog || ensureDialog();
    const content = dialog.querySelector("[data-academic-dialog-content]");
    content.innerHTML = '<p class="academic-dialog-loading">Consultando tu estado académico…</p>';
    if (!dialog.open) dialog.showModal();
    try {
      const data = await api("academic-assessment-status", { courseSlug: slug });
      renderStatus(dialog, data, slug);
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
      button.textContent = "Evaluación final";
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