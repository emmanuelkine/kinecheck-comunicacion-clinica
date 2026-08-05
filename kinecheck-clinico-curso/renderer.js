const payload = window.__KINECHECK_COURSE_PAYLOAD__;
const root = document.querySelector("#root");

if (!root || !payload?.modules?.length) {
  throw new Error("El contenido del curso no está disponible.");
}

const VERSION = String(payload.version || "1");
const STORAGE_KEY = `kinecheck_clinico_course_progress:${VERSION}`;
const moduleIds = payload.modules.map((module) => module.id);
const lessonIds = payload.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));

function readState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {};
    return {
      activeModule: moduleIds.includes(value.activeModule) ? value.activeModule : moduleIds[0],
      completedLessons: new Set(Array.isArray(value.completedLessons) ? value.completedLessons.filter((id) => lessonIds.includes(id)) : []),
      correctChecks: new Set(Array.isArray(value.correctChecks) ? value.correctChecks.filter((id) => lessonIds.includes(id)) : []),
      startedAt: value.startedAt || new Date().toISOString(),
      updatedAt: value.updatedAt || new Date().toISOString(),
    };
  } catch {
    return { activeModule: moduleIds[0], completedLessons: new Set(), correctChecks: new Set(), startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
}

const state = readState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    activeModule: state.activeModule,
    completedLessons: [...state.completedLessons],
    correctChecks: [...state.correctChecks],
    startedAt: state.startedAt,
    updatedAt: new Date().toISOString(),
  }));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function progress() {
  return lessonIds.length ? Math.round((state.completedLessons.size / lessonIds.length) * 100) : 0;
}

function moduleProgress(module) {
  const done = module.lessons.filter((lesson) => state.completedLessons.has(lesson.id)).length;
  return { done, total: module.lessons.length, percent: module.lessons.length ? Math.round((done / module.lessons.length) * 100) : 0 };
}

function list(items = []) {
  return `<ul class="kc-list">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
}

function cards(items = [], label = "Punto clínico") {
  return `<div class="kc-grid-2">${items.map((item, index) => `<article class="kc-card"><strong>${esc(label)} ${index + 1}</strong><p>${esc(item)}</p></article>`).join("")}</div>`;
}

function quizMarkup(lesson) {
  const quiz = lesson.quiz;
  if (!quiz?.options?.length) return "";
  return `<section class="kc-quiz" data-quiz="${esc(lesson.id)}">
    <fieldset>
      <legend>${esc(quiz.question)}</legend>
      ${quiz.options.map((option, index) => `<label class="kc-option"><input type="radio" name="quiz-${esc(lesson.id)}" value="${index}"><span>${esc(option)}</span></label>`).join("")}
    </fieldset>
    <button class="kc-button secondary" type="button" data-check-quiz="${esc(lesson.id)}">Comprobar razonamiento</button>
    <div class="kc-feedback" data-quiz-feedback="${esc(lesson.id)}" hidden></div>
  </section>`;
}

function lessonMarkup(lesson, lessonIndex) {
  const completed = state.completedLessons.has(lesson.id);
  return `<details class="kc-lesson ${completed ? "completed" : ""}" data-lesson="${esc(lesson.id)}">
    <summary>
      <span class="kc-lesson-number">${lessonIndex + 1}</span>
      <span class="kc-lesson-title"><strong>${esc(lesson.title)}</strong><span>${esc(lesson.focus)}</span></span>
      <span class="kc-lesson-state">${completed ? "Completada" : "Pendiente"}</span>
    </summary>
    <div class="kc-lesson-body">
      <section class="kc-section"><h3>Idea clínica central</h3><p>${esc(lesson.core)}</p></section>
      <section class="kc-section"><h3>Campos de la guía relacionados</h3><div class="kc-fields">${(lesson.guideFields || []).map((field) => `<span>${esc(field)}</span>`).join("")}</div></section>
      <section class="kc-section kc-grid-2">
        <article class="kc-card"><strong>Qué hacer</strong>${list(lesson.actions)}</article>
        <article class="kc-card"><strong>Errores que degradan la evaluación</strong>${list(lesson.pitfalls)}</article>
      </section>
      <section class="kc-section"><h3>Decisiones que debes justificar</h3>${cards(lesson.decisions, "Decisión")}</section>
      <section class="kc-section kc-case"><b>Caso profesional</b><p>${esc(lesson.case)}</p><strong>Tarea aplicada</strong><p>${esc(lesson.task)}</p></section>
      <section class="kc-section"><h3>Lectura crítica de la evidencia</h3><p>${esc(lesson.evidence)}</p></section>
      ${quizMarkup(lesson)}
      <div class="kc-lesson-actions">
        <small>${state.correctChecks.has(lesson.id) ? "Comprobación respondida correctamente." : "Completa la comprobación antes de cerrar la experiencia."}</small>
        <button class="kc-button primary" type="button" data-complete-lesson="${esc(lesson.id)}" ${state.correctChecks.has(lesson.id) ? "" : "disabled"}>${completed ? "Marcar como pendiente" : "Completar experiencia"}</button>
      </div>
    </div>
  </details>`;
}

function moduleMarkup(module, index) {
  const mp = moduleProgress(module);
  return `<section class="kc-module ${state.activeModule === module.id ? "active" : ""}" data-module="${esc(module.id)}">
    <header class="kc-module-header">
      <span class="kc-eyebrow">MÓDULO ${String(index + 1).padStart(2, "0")} · ${mp.done}/${mp.total} EXPERIENCIAS</span>
      <h2>${esc(module.title)}</h2>
      <p>${esc(module.purpose)}</p>
    </header>
    <div class="kc-objectives">${(module.objectives || []).map((objective, objectiveIndex) => `<article class="kc-objective"><span>RESULTADO ${objectiveIndex + 1}</span>${esc(objective)}</article>`).join("")}</div>
    <div class="kc-lessons">${module.lessons.map((lesson, lessonIndex) => lessonMarkup(lesson, lessonIndex)).join("")}</div>
    <footer class="kc-module-footer">
      <button class="kc-button secondary" type="button" data-module-step="-1" ${index === 0 ? "disabled" : ""}>← Módulo anterior</button>
      <button class="kc-button primary" type="button" data-module-step="1" ${index === payload.modules.length - 1 ? "disabled" : ""}>Módulo siguiente →</button>
    </footer>
  </section>`;
}

function referencesMarkup() {
  return `<section class="kc-references" id="referencias"><span class="kc-eyebrow">BASE CIENTÍFICA</span><h2>Referencias y marcos utilizados</h2><p>La evidencia orienta la evaluación; no transforma ningún hallazgo aislado en diagnóstico automático.</p><div class="kc-reference-list">${(payload.references || []).map((reference, index) => `<article class="kc-reference"><b>${index + 1}.</b> ${esc(reference.citation)} ${reference.url ? `<a href="${esc(reference.url)}" target="_blank" rel="noopener noreferrer">Fuente</a>` : ""}</article>`).join("")}</div></section>`;
}

function shell() {
  const totalHours = payload.durationHours || 18;
  const completedModules = payload.modules.filter((module) => moduleProgress(module).percent === 100).length;
  const currentProgress = progress();
  return `<div class="kc-course">
    <header class="kc-topbar">
      <a class="kc-brand" href="../academy/#biblioteca"><img src="../assets/kinecheck-mark.svg" alt=""><span><strong>KineCheck Clínico</strong><span>Curso profesional</span></span></a>
      <div class="kc-top-actions"><button class="kc-button secondary kc-mobile-toggle" type="button" data-toggle-sidebar>Temario</button><span class="kc-chip">Versión ${esc(VERSION)}</span><span class="kc-progress-chip"><b data-global-progress>${currentProgress}%</b> completado</span></div>
    </header>
    <div class="kc-layout">
      <aside class="kc-sidebar" data-sidebar>
        <div class="kc-sidebar-label">RUTA FORMATIVA</div>
        <nav class="kc-module-nav">${payload.modules.map((module, index) => {
          const mp = moduleProgress(module);
          return `<button type="button" data-open-module="${esc(module.id)}" class="${state.activeModule === module.id ? "active" : ""} ${mp.percent === 100 ? "done" : ""}"><span class="kc-nav-number">${index + 1}</span><span class="kc-nav-copy">${esc(module.title)}</span><span class="kc-nav-state">${mp.percent === 100 ? "✓" : `${mp.percent}%`}</span></button>`;
        }).join("")}</nav>
        <div class="kc-sidebar-note"><strong>Uso responsable</strong><br>Trabaja con casos ficticios, simulados o anonimizados. La guía adjunta no reemplaza el registro clínico exigido por tu institución ni la normativa aplicable.</div>
      </aside>
      <main class="kc-main">
        <section class="kc-hero">
          <div class="kc-hero-copy"><span class="kc-eyebrow">FORMACIÓN AVANZADA PARA PROFESIONALES</span><h1>Evaluar mejor.<br><em>Decidir con criterio.</em></h1><p class="kc-lead">${esc(payload.subtitle)}</p><div class="kc-hero-tags"><span>Seguridad clínica</span><span>Razonamiento probabilístico</span><span>Medición defendible</span><span>Decisiones compartidas</span></div></div>
          <aside class="kc-hero-panel"><strong>Tu avance profesional</strong><div class="kc-meter" style="--progress:${currentProgress}%"><span data-progress-bar></span></div><div class="kc-stat-grid"><div class="kc-stat"><b data-completed-lessons>${state.completedLessons.size}</b><span>de ${lessonIds.length} experiencias</span></div><div class="kc-stat"><b>${completedModules}/${payload.modules.length}</b><span>módulos cerrados</span></div><div class="kc-stat"><b>${totalHours} h</b><span>dedicación estimada</span></div><div class="kc-stat"><b>${payload.caseCount || 12}</b><span>casos aplicados</span></div></div></aside>
        </section>
        <div class="kc-alert"><strong>Curso principal + guía adjunta</strong>El aprendizaje, la seguridad y el razonamiento están en el centro. La guía digital sirve para ordenar preguntas, hallazgos e hipótesis; no para reemplazar una ficha clínica real ni almacenar información identificable.</div>
        ${payload.modules.map(moduleMarkup).join("")}
        ${referencesMarkup()}
      </main>
    </div>
  </div>`;
}

function updateUI() {
  const currentProgress = progress();
  document.querySelectorAll("[data-global-progress]").forEach((node) => { node.textContent = `${currentProgress}%`; });
  document.querySelectorAll("[data-progress-bar]").forEach((node) => { node.parentElement.style.setProperty("--progress", `${currentProgress}%`); });
  document.querySelectorAll("[data-completed-lessons]").forEach((node) => { node.textContent = state.completedLessons.size; });
  payload.modules.forEach((module) => {
    const mp = moduleProgress(module);
    const button = document.querySelector(`[data-open-module="${CSS.escape(module.id)}"]`);
    if (!button) return;
    button.classList.toggle("done", mp.percent === 100);
    button.querySelector(".kc-nav-state").textContent = mp.percent === 100 ? "✓" : `${mp.percent}%`;
  });
}

function openModule(id) {
  if (!moduleIds.includes(id)) return;
  state.activeModule = id;
  saveState();
  document.querySelectorAll("[data-module]").forEach((section) => section.classList.toggle("active", section.dataset.module === id));
  document.querySelectorAll("[data-open-module]").forEach((button) => button.classList.toggle("active", button.dataset.openModule === id));
  document.querySelector("[data-sidebar]")?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

root.innerHTML = shell();
document.title = `${payload.title || "KineCheck Clínico"} | KineCheck`;

root.addEventListener("click", (event) => {
  const moduleButton = event.target.closest("[data-open-module]");
  if (moduleButton) openModule(moduleButton.dataset.openModule);

  const stepButton = event.target.closest("[data-module-step]");
  if (stepButton && !stepButton.disabled) {
    const index = moduleIds.indexOf(state.activeModule);
    const next = moduleIds[index + Number(stepButton.dataset.moduleStep)];
    if (next) openModule(next);
  }

  const toggle = event.target.closest("[data-toggle-sidebar]");
  if (toggle) document.querySelector("[data-sidebar]")?.classList.toggle("open");

  const checkButton = event.target.closest("[data-check-quiz]");
  if (checkButton) {
    const lessonId = checkButton.dataset.checkQuiz;
    const lesson = payload.modules.flatMap((module) => module.lessons).find((item) => item.id === lessonId);
    const quiz = lesson?.quiz;
    const selected = document.querySelector(`input[name="quiz-${CSS.escape(lessonId)}"]:checked`);
    const feedback = document.querySelector(`[data-quiz-feedback="${CSS.escape(lessonId)}"]`);
    if (!quiz || !feedback) return;
    feedback.hidden = false;
    if (!selected) {
      feedback.className = "kc-feedback bad";
      feedback.textContent = "Selecciona una alternativa y justifica mentalmente por qué las demás son menos defendibles.";
      return;
    }
    const correct = Number(selected.value) === Number(quiz.answer);
    feedback.className = `kc-feedback ${correct ? "ok" : "bad"}`;
    feedback.textContent = `${correct ? "Correcto. " : "Revisa el razonamiento. "}${quiz.rationale}`;
    if (correct) {
      state.correctChecks.add(lessonId);
      document.querySelector(`[data-complete-lesson="${CSS.escape(lessonId)}"]`)?.removeAttribute("disabled");
      saveState();
    }
  }

  const completeButton = event.target.closest("[data-complete-lesson]");
  if (completeButton && !completeButton.disabled) {
    const lessonId = completeButton.dataset.completeLesson;
    const lessonNode = document.querySelector(`[data-lesson="${CSS.escape(lessonId)}"]`);
    if (state.completedLessons.has(lessonId)) state.completedLessons.delete(lessonId);
    else state.completedLessons.add(lessonId);
    const completed = state.completedLessons.has(lessonId);
    lessonNode?.classList.toggle("completed", completed);
    const label = lessonNode?.querySelector(".kc-lesson-state");
    if (label) label.textContent = completed ? "Completada" : "Pendiente";
    completeButton.textContent = completed ? "Marcar como pendiente" : "Completar experiencia";
    saveState();
    updateUI();
  }
});

window.KINECHECK_COURSE_READY = true;
