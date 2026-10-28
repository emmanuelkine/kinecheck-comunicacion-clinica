(() => {
  "use strict";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const STORE = "kinecheck_ortho_progress_v1";
  const readProgress = () => {
    try { return JSON.parse(localStorage.getItem(STORE) || '{"bookmarks":[],"notes":{},"completedModules":[]}'); }
    catch { return { bookmarks: [], notes: {}, completedModules: [] }; }
  };

  function render(root, data) {
    if (!Array.isArray(data.modules) || data.modules.length !== 12) throw new Error("The approved course version is incomplete.");
    const progress = readProgress();
    let active = Math.max(0, Math.min(data.modules.length - 1, Number(location.hash.match(/module-(\d+)/)?.[1] || progress.resumeModule || 1) - 1));
    progress.completedModules = Array.isArray(progress.completedModules) ? progress.completedModules : [];
    progress.bookmarks = Array.isArray(progress.bookmarks) ? progress.bookmarks : [];
    const safeModules = data.modules;
    const completedCount = progress.completedModules.length;
    const percent = Math.round(completedCount / safeModules.length * 100);
    const header = () => `<section class="card hero"><p class="kicker">REHABILITACIÓN MUSCULOESQUELÉTICA AVANZADA</p><h1>${esc(data.title)}</h1><p>${esc(data.subtitle)}</p><div class="tag">${esc(data.level)}</div> <div class="tag">${esc(data.durationHours)} h propuestas · sin pilotaje</div><p class="small-note">Material educativo original. No sustituye evaluación individual, protocolos quirúrgicos ni derivación. Revisión clínica, científica, pedagógica y piloto pendientes.</p></section>`;
    const dashboard = () => `<section class="card student-dashboard" aria-labelledby="student-dashboard-title"><div><p class="kicker">TU ESPACIO DE ESTUDIO</p><h2 id="student-dashboard-title">Progreso en este dispositivo</h2><p><progress max="100" value="${percent}" aria-label="Progreso local de estudio: ${percent}%">${percent}%</progress> <strong>${percent}%</strong> · ${completedCount} de ${safeModules.length} módulos marcados.</p><p class="small-note">Este registro local no se sincroniza ni constituye finalización académica oficial. La matrícula, evaluación sumativa y certificación aún no están habilitadas.</p></div><div class="study-states"><span>Completado: ${completedCount}</span><span>Pendiente: ${safeModules.length-completedCount}</span><span>Evaluación: desactivada</span><span>Certificado: no emitido</span></div><div class="competency-tags" aria-label="Competencias del recorrido">${data.competencies.map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div></section>`;
    const diagramMarkup = diagram => `<figure class="original-diagram"><figcaption><strong>${esc(diagram.title)}</strong><p>${esc(diagram.description)}</p></figcaption><ol aria-label="${esc(diagram.title)}">${diagram.steps.map((step,index)=>`<li><span aria-hidden="true">${index+1}</span>${esc(step)}</li>`).join("")}</ol></figure>`;
    const lessonMarkup = lesson => `<section class="card lesson"><p class="kicker">${esc(lesson.type || "LECCIÓN")}</p><h2>${esc(lesson.title)}</h2><p class="small-note">Tiempo de estudio estimado: ${esc(lesson.estimatedMinutes || 0)} min · pendiente de pilotaje con estudiantes.</p><section><h3>Presentación</h3><p>${esc(lesson.introduction || "")}</p></section><section><h3>Resultados de aprendizaje</h3><ul>${(module.outcomes || []).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section><section><h3>Requisitos previos</h3><ul>${(module.prerequisites || []).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>${(lesson.sections || []).map(section=>`<section><h3>${esc(section.title)}</h3>${section.paragraphs.map(part=>`<p>${esc(part)}</p>`).join("")}</section>`).join("")}${lesson.diagram?diagramMarkup(lesson.diagram):""}${lesson.recommendations?`<section class="case-step"><h3>Recomendaciones y certeza</h3><ul>${lesson.recommendations.map(item=>`<li>${esc(item.text)} <span class="tag">${esc(data.evidenceClaims?.[item.claimId]?.certainty || "afirmación en revisión")}</span></li>`).join("")}</ul></section>`:""}${lesson.clinicalExample?`<aside class="callout"><strong>Aplicación clínica</strong><p>${esc(lesson.clinicalExample)}</p></aside>`:""}${lesson.uncertainty?`<aside class="callout uncertainty"><strong>Incertidumbre y límites</strong><p>${esc(lesson.uncertainty)}</p></aside>`:""}${lesson.algorithm?`<section class="case-step"><h3>Algoritmo de razonamiento</h3><ol>${lesson.algorithm.map(step=>`<li>${esc(step)}</li>`).join("")}</ol></section>`:""}${lesson.activity?`<section class="case-step"><h3>Actividad formativa</h3><p>${esc(lesson.activity.prompt)}</p><label class="field">Tu razonamiento<textarea data-note="${esc(lesson.id)}" maxlength="2000" placeholder="Usa sólo casos ficticios o desidentificados.">${esc(progress.notes?.[lesson.id] || "")}</textarea></label><p class="small-note">Respuesta guardada sólo en este dispositivo. No forma parte de una evaluación ni se envía al servidor.</p>${lesson.activity.reflection?`<details><summary>Ver criterios de contraste</summary><p>${esc(lesson.activity.reflection)}</p></details>`:""}</section>`:""}${lesson.case?`<section class="case-step" data-case="${esc(lesson.case.id)}"><h3>${esc(lesson.case.title)}</h3><p>${esc(lesson.case.introduction)}</p><div data-case-stage></div><details><summary>Rúbrica analítica del caso</summary><ul>${lesson.case.rubric.map(item=>`<li>${esc(item.description)} (${esc(item.maximum)} puntos)${item.critical?" · criterio crítico":""}</li>`).join("")}</ul></details></section>`:""}${lesson.questions?`<section class="case-step"><h3>Comprobación formativa</h3>${lesson.questions.map(q=>`<details><summary>${esc(q.prompt)}</summary><ol>${q.options.map(x=>`<li>${esc(x.text)} <span class="tag">${x.correct?"respuesta más defendible":"alternativa a analizar"}</span><p>${esc(x.feedback)}</p></li>`).join("")}</ol><p class="small-note">La clave no se puntúa; compara tu argumento con los criterios.</p></details>`).join("")}</section>`:""}${lesson.summary?`<section><h3>Síntesis</h3><ul>${lesson.summary.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`:""}${lesson.references?`<h3>Referencias vinculadas</h3><ul class="reference-list">${lesson.references.map(ref=>`<li><a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.citation)}</a> <span class="tag">${esc(ref.evidenceLevel)}</span></li>`).join("")}</ul>`:""}</section>`;
    const module = safeModules[active];
    root.innerHTML = `${header()}${dashboard()}<section class="course-grid" aria-label="Objetivos y evaluación"><article class="card"><p class="kicker">COMPETENCIAS DEL RECORRIDO</p><ul>${data.competencies.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></article><article class="card"><p class="kicker">ESTADOS ACADÉMICOS</p><p>Completado, aprobado y certificado son estados distintos. Aún no hay notas ni certificados oficiales asociados.</p><span class="tag">Evaluación sumativa desactivada</span><span class="tag">OTEC deshabilitada</span></article></section><section class="course-layout"><nav class="card module-list" aria-label="Módulos">${safeModules.map((item,index)=>`<button type="button" data-module="${index}" aria-current="${index===active}" aria-label="Módulo ${index+1}: ${esc(item.title)}${progress.completedModules.includes(item.id)?', marcado localmente como revisado':''}"><span>${String(index+1).padStart(2,"0")}</span><span>${esc(item.title)}<small>${esc(item.hours)} h · ${item.lessons.length} lección · ${progress.completedModules.includes(item.id)?"revisado local":"pendiente"}</small></span></button>`).join("")}</nav><div><div class="lesson-actions"><button type="button" data-complete-module>${progress.completedModules.includes(module.id)?"Quitar marca de módulo":"Marcar módulo revisado"}</button>${module.lessons.map(lesson=>`<button type="button" class="secondary" data-bookmark="${esc(lesson.id)}">${progress.bookmarks.includes(lesson.id)?"Quitar marcador":"Guardar marcador"}</button>`).join("")}<p class="small-note">Módulo ${active+1} de ${safeModules.length} · ${esc(module.hours)} h propuestas. Al navegar se guarda dónde continuar en este dispositivo.</p></div>${module.lessons.map(lessonMarkup).join("")}<p class="only-local">Notas, marcadores y módulos revisados se guardan sólo en este dispositivo; no sustituyen el progreso académico del servidor.</p></div></section><details class="card reference-library"><summary>Biblioteca de referencias del programa</summary><ul class="reference-list">${data.references.map(ref=>`<li><a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.citation)}</a> <span class="tag">${esc(ref.evidenceLevel)}</span> <span class="small-note">${esc(ref.checked || "")}</span></li>`).join("")}</ul></details>`;
    root.querySelectorAll("[data-module]").forEach(button => button.addEventListener("click", () => {
      active = Number(button.dataset.module);
      location.hash = `module-${active+1}`;
      progress.resumeModule = active + 1;
      try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch { /* Local storage may be disabled. */ }
      render(root, data);
    }));
    root.querySelector("[data-complete-module]")?.addEventListener("click", () => {
      progress.completedModules = progress.completedModules.includes(module.id)
        ? progress.completedModules.filter(id => id !== module.id)
        : [...progress.completedModules, module.id];
      try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch { /* Local storage may be disabled. */ }
      render(root, data);
    });
    root.querySelectorAll("[data-bookmark]").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.bookmark;
      progress.bookmarks = progress.bookmarks.includes(id) ? progress.bookmarks.filter(item => item !== id) : [...progress.bookmarks, id];
      try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch { /* Local storage may be disabled. */ }
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
      const chosenFeedback = prior ? stage.options[prior.choice]?.feedback : "";
      box.innerHTML = `<p><strong>Etapa ${stageIndex+1} de ${caseData.stages.length}: ${esc(stage.title)}</strong></p><p>${esc(stage.reveal)}</p><p>${esc(stage.prompt)}</p><label class="field">Selecciona una decisión defendible<select required data-choice ${prior?"disabled":""}><option value="">Elige una opción</option>${stage.options.map((option,index)=>`<option value="${index}" ${prior?.choice===index?"selected":""}>${esc(option.text)}</option>`).join("")}</select></label><label class="field">Justifica tu decisión<textarea data-rationale maxlength="1500" required ${prior?"readonly":""} placeholder="Describe hipótesis, alternativas, seguridad e incertidumbre.">${esc(prior?.rationale || "")}</textarea></label><button type="button" data-case-next ${prior?"disabled":""}>${stageIndex+1===caseData.stages.length?"Finalizar caso":"Registrar decisión y revelar la próxima etapa"}</button>${prior?`<aside class="callout"><strong>Retroalimentación educativa · ${esc(stage.options[prior.choice]?.quality || "respuesta")}</strong><p>${esc(chosenFeedback)}</p><p>${esc(stage.focus)}</p></aside>`:""}${prior&&stageIndex+1===caseData.stages.length?`<aside class="callout"><strong>Caso completado</strong><p>Revisa la rúbrica y contrasta cada decisión con seguridad, hipótesis, medición, intervención, adaptación y comunicación.</p></aside>`:""}`;
      const next = box.querySelector("[data-case-next]");
      next?.addEventListener("click", () => {
        const choice = box.querySelector("[data-choice]").value;
        const rationale = box.querySelector("[data-rationale]").value.trim();
        if (!choice || !rationale) { box.querySelector("[data-rationale]").focus(); return; }
        progress.caseAnswers[caseId] ||= {};
        progress.caseAnswers[caseId][stageIndex] = { choice: Number(choice), rationale, answeredAt: new Date().toISOString() };
        if (stageIndex + 1 < caseData.stages.length) progress.caseStages[caseId] = stageIndex + 1;
        try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch { /* Continue this session without persistence. */ }
        render(root, data);
      });
    });
  }
  window.KC_ORTHO_RENDER = render;
})();
