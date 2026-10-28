(() => {
  "use strict";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const STORE = "kinecheck_ortho_progress_v1";
  const readProgress = () => {
    try { return JSON.parse(localStorage.getItem(STORE) || '{"bookmarks":[],"notes":{}}'); }
    catch { return { bookmarks: [], notes: {} }; }
  };

  function render(root, data) {
    if (!Array.isArray(data.modules) || data.modules.length !== 12) throw new Error("The approved course version is incomplete.");
    let active = Math.max(0, Math.min(data.modules.length - 1, Number(location.hash.match(/module-(\d+)/)?.[1] || 1) - 1));
    const progress = readProgress();
    const safeModules = data.modules;
    const header = () => `<section class="card hero"><p class="kicker">REHABILITACIÓN MUSCULOESQUELÉTICA AVANZADA</p><h1>${esc(data.title)}</h1><p>${esc(data.subtitle)}</p><div class="tag">${esc(data.level)}</div> <div class="tag">${esc(data.durationHours)} h estimadas · en validación</div><p class="small-note">Material educativo original. No sustituye evaluación individual, protocolos quirúrgicos ni derivación. Se necesita revisión clínica externa antes de uso formativo comercial.</p></section>`;
    const lessonMarkup = lesson => `<section class="card lesson"><p class="kicker">${esc(lesson.type || "LECCIÓN")}</p><h2>${esc(lesson.title)}</h2>${(lesson.body || []).map(part=>`<p>${esc(part)}</p>`).join("")}${lesson.diagram?`<figure class="callout"><figcaption><strong>Esquema conceptual</strong><p>${esc(lesson.diagram)}</p></figcaption></figure>`:""}${lesson.clinicalExample?`<aside class="callout"><strong>Aplicación clínica</strong><p>${esc(lesson.clinicalExample)}</p></aside>`:""}${lesson.uncertainty?`<aside class="callout uncertainty"><strong>Incertidumbre y límites</strong><p>${esc(lesson.uncertainty)}</p></aside>`:""}${lesson.algorithm?`<section class="case-step"><h3>Secuencia de decisión</h3><ol>${lesson.algorithm.map(step=>`<li>${esc(step)}</li>`).join("")}</ol></section>`:""}${lesson.activity?`<section class="case-step"><h3>Actividad formativa</h3><p>${esc(lesson.activity.prompt)}</p><label class="field">Tu razonamiento<textarea data-note="${esc(lesson.id)}" maxlength="2000" placeholder="Usa sólo casos ficticios o desidentificados.">${esc(progress.notes?.[lesson.id] || "")}</textarea></label><p class="small-note">Respuesta guardada sólo en este dispositivo. No forma parte de una evaluación ni se envía al servidor.</p>${lesson.activity.reflection?`<details><summary>Ver criterios de contraste</summary><p>${esc(lesson.activity.reflection)}</p></details>`:""}</section>`:""}${lesson.case?`<section class="case-step" data-case="${esc(lesson.case.id)}"><h3>${esc(lesson.case.title)}</h3><p>${esc(lesson.case.introduction)}</p><div data-case-stage></div></section>`:""}${lesson.questions?`<section class="case-step"><h3>Comprobación formativa</h3>${lesson.questions.map(q=>`<details><summary>${esc(q.prompt)}</summary><ol>${q.options.map(x=>`<li>${esc(x)}</li>`).join("")}</ol><p><strong>Fundamento:</strong> ${esc(q.feedback)}</p><p class="small-note">La clave no se puntúa; compara tu argumento con los criterios.</p></details>`).join("")}</section>`:""}${lesson.references?`<h3>Referencias vinculadas</h3><ul class="reference-list">${lesson.references.map(ref=>`<li><a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.citation)}</a> <span class="tag">${esc(ref.evidenceLevel)}</span></li>`).join("")}</ul>`:""}</section>`;
    const module = safeModules[active];
    root.innerHTML = `${header()}<section class="course-grid" aria-label="Objetivos y evaluación"><article class="card"><p class="kicker">COMPETENCIAS DEL RECORRIDO</p><ul>${data.competencies.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></article><article class="card"><p class="kicker">ESTADO ACADÉMICO</p><p>Completado, aprobado y certificado son estados distintos. Este espacio aún no registra matrícula, notas ni certificados.</p><span class="tag">Evaluación sumativa desactivada</span><span class="tag">OTEC deshabilitada</span></article></section><section class="course-layout"><nav class="card module-list" aria-label="Módulos">${safeModules.map((item,index)=>`<button type="button" data-module="${index}" aria-current="${index===active}"><span>${String(index+1).padStart(2,"0")}</span><span>${esc(item.title)}<small>${esc(item.hours)} h · ${item.lessons.length} lecciones</small></span></button>`).join("")}</nav><div>${module.lessons.map(lessonMarkup).join("")}<p class="only-local">Las notas de actividad se guardan en este dispositivo. La sincronización y el progreso oficial requieren la instalación de la evaluación académica validada.</p></div></section>`;
    root.querySelectorAll("[data-module]").forEach(button => button.addEventListener("click", () => {
      active = Number(button.dataset.module);
      location.hash = `module-${active+1}`;
      render(root, data);
    }));
    root.querySelectorAll("[data-note]").forEach(field => field.addEventListener("input", () => {
      progress.notes ||= {};
      progress.notes[field.dataset.note] = field.value;
      try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch { /* Local storage may be disabled. */ }
    }));
    root.querySelectorAll("[data-case]").forEach(container => {
      const caseId = container.dataset.case;
      const caseData = safeModules.flatMap(item => item.lessons).map(item => item.case).find(item => item?.id === caseId);
      if (!caseData?.stages?.length) return;
      progress.caseStages ||= {};
      progress.caseAnswers ||= {};
      const stageIndex = Math.min(progress.caseStages[caseId] || 0, caseData.stages.length - 1);
      const stage = caseData.stages[stageIndex];
      const prior = progress.caseAnswers[caseId]?.[stageIndex];
      const box = container.querySelector("[data-case-stage]");
      box.innerHTML = `<p><strong>Etapa ${stageIndex+1} de ${caseData.stages.length}:</strong> ${esc(stage.prompt)}</p><p>${esc(stage.reveal)}</p><label class="field">Selecciona una decisión defendible<select required data-choice><option value="">Elige una opción</option>${stage.options.map((option,index)=>`<option value="${index}" ${prior?.choice===index?"selected":""}>${esc(option)}</option>`).join("")}</select></label><label class="field">Justifica tu decisión<textarea data-rationale maxlength="1500" required placeholder="Describe hipótesis, alternativas, seguridad e incertidumbre.">${esc(prior?.rationale || "")}</textarea></label><button type="button" data-case-next ${prior?"disabled":""}>${stageIndex+1===caseData.stages.length?"Finalizar caso":"Registrar decisión y revelar la próxima etapa"}</button>${prior?`<aside class="callout"><strong>Consecuencia educativa</strong><p>${esc(stage.feedback)}</p></aside>`:""}`;
      const next = box.querySelector("[data-case-next]");
      next?.addEventListener("click", () => {
        const choice = box.querySelector("[data-choice]").value;
        const rationale = box.querySelector("[data-rationale]").value.trim();
        if (!choice || !rationale) { box.querySelector("[data-rationale]").focus(); return; }
        progress.caseAnswers[caseId] ||= {};
        progress.caseAnswers[caseId][stageIndex] = { choice: Number(choice), rationale };
        if (stageIndex + 1 < caseData.stages.length) progress.caseStages[caseId] = stageIndex + 1;
        try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch { /* Continue this session without persistence. */ }
        render(root, data);
      });
    });
  }
  window.KC_ORTHO_RENDER = render;
})();
