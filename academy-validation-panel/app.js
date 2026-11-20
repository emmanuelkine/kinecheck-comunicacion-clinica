const app = document.querySelector('#app');
const nav = document.querySelector('#main-nav');
const title = document.querySelector('#page-title');
const reviewerName = document.querySelector('#reviewer-name');
const notice = document.querySelector('#notice');
const sidebar = document.querySelector('.sidebar');
const INTEGRATED_ADMIN = location.pathname.startsWith('/admin/academy');
const SUPABASE_URL = 'https://eqhcdclyeoapmqtlduwf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_';
const ADMIN_SESSION_KEY = 'kinecheck_admin_session_v1';
const PAGES_PROJECT_HOST = 'kinecheck-comunicacion-clinica.pages.dev';

const views = [
  ['dashboard', 'Resumen', '◫'],
  ['courses', 'Cursos', '▤'],
  ['decisions', 'Bandeja académica', '✓'],
  ['pairs', 'Pares A/B', 'A/B'],
  ['gaps', 'Brechas científicas', '⌁'],
  ['pilot', 'Pilotaje', '◷'],
  ['exports', 'Exportaciones', '⇩'],
];
const gateLabels = {
  contentReviewed: 'Contenido revisado', bibliographyValidated: 'Bibliografía validada', evaluationApproved: 'Evaluación aprobada',
  rubricApproved: 'Rúbrica aprobada', equivalenceReviewed: 'Equivalencia A/B revisada', pilotCompleted: 'Pilotaje completado',
  hoursValidated: 'Horas validadas', technicalValidationCompleted: 'Validación técnica completada', certifiabilityAuthorized: 'Certificabilidad autorizada',
};
const checkLabels = {
  correspondence: 'Correspondencia con la afirmación', methods: 'Métodos y diseño pertinentes', applicability: 'Aplicabilidad al contexto',
  uncertainty: 'Incertidumbre explícita', causality: 'Causalidad no sobreatribuida', effectMagnitude: 'Magnitud del efecto interpretada',
  limits: 'Limitaciones reconocidas', currency: 'Vigencia revisada',
};
let context;
let currentView = 'dashboard';
let selectedPairId;
let selectedCourseSlug;

function h(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value != null) node.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function setChildren(node, ...children) {
  node.replaceChildren(...children.flat(Infinity).filter(Boolean));
}

function flash(message, error = false) {
  notice.textContent = message;
  notice.classList.toggle('error', error);
  notice.hidden = false;
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => { notice.hidden = true; }, 5000);
}

function readAdminSession() {
  try { return JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || 'null'); }
  catch { return null; }
}

function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  document.dispatchEvent(new Event('kinecheck:admin-session'));
}

function isCloudflarePreview() {
  const hostname = location.hostname.toLowerCase();
  return hostname.endsWith(`.${PAGES_PROJECT_HOST}`) && hostname !== PAGES_PROJECT_HOST;
}

function isLocalPreview() {
  return location.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(location.hostname.toLowerCase());
}

function integratedOperation(url, options = {}) {
  const payload = options.body ? JSON.parse(options.body) : {};
  if (url === '/api/bootstrap') return { operation: 'bootstrap' };
  if (url === '/api/pilots') return { operation: 'pilot_add', payload };
  const pair = url.match(/^\/api\/pairs\/([A-Z]{2}-C\d{2})\/review$/);
  if (pair) return { operation: 'pair_review', pairId: pair[1], payload };
  const gap = url.match(/^\/api\/gaps\/([A-Z]{2}-C\d{2})\/review$/);
  if (gap) return { operation: 'gap_review', pairId: gap[1], payload };
  const course = url.match(/^\/api\/courses\/([a-z0-9-]+)\/review$/);
  if (course) return { operation: 'course_review', courseSlug: course[1], payload };
  const exported = url.match(/^\/api\/export\/([a-z0-9.-]+)$/);
  if (exported) return { operation: 'export', kind: exported[1] };
  const report = url.match(/^\/api\/reports\/([a-z0-9-]+)\.md$/);
  if (report) return { operation: 'course_report', courseSlug: report[1] };
  throw new Error('Ruta administrativa no permitida.');
}

async function integratedFetch(url, options = {}) {
  const session = readAdminSession();
  if (!session?.access_token) {
    location.replace('/admin/?academy=auth-required');
    throw new Error('Se requiere una sesión administrativa autorizada.');
  }
  const proxy = isCloudflarePreview() || isLocalPreview();
  const response = await fetch(proxy ? '/api/admin-academy-review' : `${SUPABASE_URL}/functions/v1/academy-admin-review`, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      ...(proxy ? {} : { apikey: SUPABASE_KEY }),
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'X-KC-Review': '1',
    },
    body: JSON.stringify(integratedOperation(url, options)),
  });
  if (response.status === 401) {
    clearAdminSession();
    location.replace('/admin/?academy=session-expired');
  }
  return response;
}

async function api(url, options = {}) {
  const response = INTEGRATED_ADMIN
    ? await integratedFetch(url, options)
    : await fetch(url, {
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json', 'X-KC-Review': '1', ...options.headers } : options.headers,
    });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? payload.message ?? `Error ${response.status}`);
  return payload;
}

function filenameFrom(response, fallback) {
  const disposition = response.headers.get('Content-Disposition') || '';
  const matched = disposition.match(/filename="?([^";]+)"?/i);
  return matched?.[1] || fallback;
}

async function downloadProtected(url, fallback) {
  if (!INTEGRATED_ADMIN) {
    location.assign(url);
    return;
  }
  const response = await integratedFetch(url);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? payload.message ?? `Error ${response.status}`);
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filenameFrom(response, fallback);
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function badge(text, tone = '') { return h('span', { class: `badge ${tone}`, text }); }
function metric(label, value, detail = '', tone = '') { return h('article', { class: `metric ${tone}` }, h('span', { text: label }), h('strong', { text: value }), h('small', { text: detail })); }
function sectionHead(heading, description, action) { return h('div', { class: 'section-head' }, h('div', {}, h('h2', { text: heading }), h('p', { text: description })), action); }
function allPairs() { return context.data.courses.flatMap((course) => course.pairs.map((pair) => ({ ...pair, course }))); }
function courseBySlug(slug) { return context.data.courses.find((course) => course.slug === slug); }
function pairById(pairId) { return allPairs().find((pair) => pair.pairId === pairId); }
function decisionById(pairId) { return context.data.remediation.decisionQueue.find((item) => item.pairId === pairId); }

function activate(view) {
  currentView = view;
  renderNav();
  render();
  sidebar.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigate(view) {
  const hash = `#${view}`;
  if (window.location.hash === hash) activate(view);
  else window.location.hash = hash;
}

function applyHashRoute() {
  const [requested, entity] = window.location.hash.slice(1).split('/');
  const allowed = new Set(['dashboard', 'courses', 'course', 'decisions', 'pairs', 'gaps', 'pilot', 'exports']);
  if (requested === 'course' && entity && courseBySlug(entity)) selectedCourseSlug = entity;
  activate(allowed.has(requested) ? requested : 'dashboard');
}

function renderNav() {
  setChildren(nav, views.map(([key, label, icon]) => h('button', {
    type: 'button', class: `nav-button ${currentView === key || (currentView === 'course' && key === 'courses') ? 'active' : ''}`,
    onclick: () => navigate(key),
  }, h('span', { class: 'nav-icon', text: icon }), label)));
}

function dashboard() {
  const state = context.state;
  const decided = Object.values(state.pairReviews).filter((item) => item.decision && item.decision !== 'pending').length;
  const approved = Object.values(state.pairReviews).filter((item) => item.decision === 'approved').length;
  const closedGaps = Object.values(state.gapReviews).filter((item) => item.status === 'validated').length;
  const technical = Object.values(state.courseReviews).filter((item) => item.gates?.technicalValidationCompleted).length;
  const pilotCourses = new Set(state.pilotRecords.map((item) => item.courseSlug)).size;
  const academicProgress = Math.round((decided + closedGaps) / (context.data.counts.pairs + context.data.counts.gaps) * 100);
  const pendingHuman = context.data.counts.pairs - decided;
  const progress = [
    ['Académica', academicProgress, `${decided}/40 pares · ${closedGaps}/8 brechas`],
    ['Técnica', Math.round(technical / 8 * 100), `${technical}/8 cursos`],
    ['Pilotaje real', Math.round(pilotCourses / 8 * 100), `${pilotCourses}/8 cursos con datos`],
    ['OTEC', 0, 'Bloqueada'],
  ];
  return [
    sectionHead('Estado consolidado', 'La evidencia documental se conserva separada de las decisiones humanas nuevas. Ningún avance del panel activa OTEC ni certificados.'),
    h('div', { class: 'metrics' },
      metric('Cursos cargados', '8', '0 APTO'), metric('Bandeja humana', pendingHuman, `${decided}/40 con decisión`),
      metric('Variantes', '80', 'Claves privadas'), metric('Brechas fuente', '8', `${closedGaps} validadas`),
      metric('Certificables', '0', 'OTEC bloqueada', 'danger')),
    h('div', { class: 'dashboard-grid' },
      h('article', { class: 'card' }, h('h3', { text: 'Avance por dimensión' }),
        progress.map(([label, value, detail]) => h('div', { class: 'progress-row', title: detail }, h('span', { text: label }), h('progress', { max: '100', value: String(value), 'aria-label': `${label}: ${value}%` }), h('b', { text: `${value}%` }))),
        h('p', { class: 'muted', text: `Pares aprobados sin condiciones: ${approved}/40. Preparación base auditada: 60%. Esa cifra no cambia por guardar borradores.` })),
      h('div', {},
        h('article', { class: 'card' }, h('h3', { text: 'Separación de roles' }), h('div', { class: 'roles' },
          h('div', { class: 'role' }, h('strong', { text: 'Estudiante' }), h('span', { text: 'Sin acceso a este panel ni a claves.' })),
          h('div', { class: 'role' }, h('strong', { text: 'Docente' }), h('span', { text: 'Facilita y retroalimenta; no activa certificados.' })),
          h('div', { class: 'role' }, h('strong', { text: 'Revisor académico' }), h('span', { text: context.reviewer })),
          h('div', { class: 'role' }, h('strong', { text: 'Administrador' }), h('span', { text: 'Gestiona plataforma; no sustituye validación académica.' })))),
        h('div', { class: 'warning mt-16', text: 'Las 4.917 min planificadas no prueban horas reales. El pilotaje está vacío hasta registrar participantes reales seudonimizados.' }))
    ),
  ];
}

function coursesView() {
  return [
    sectionHead('Expedientes por curso', 'Cada curso mantiene su clasificación auditada hasta completar y autorizar todos los gates. Los cursos prioritarios se identifican sin alterar el orden de revisión.'),
    h('div', { class: 'course-grid' }, context.data.courses.map((course) => {
      const review = context.state.courseReviews[course.slug] ?? {};
      const decided = course.pairs.filter((pair) => context.state.pairReviews[pair.pairId]?.decision && context.state.pairReviews[pair.pairId]?.decision !== 'pending').length;
      const gaps = course.pairs.filter((pair) => pair.sourceGap);
      return h('article', { class: `card course-card ${course.priority === 'alta' ? 'priority' : ''}` },
        h('div', { class: 'course-top' }, h('div', {}, h('h3', { text: course.name }), h('span', { class: 'slug', text: course.slug }))),
        h('div', { class: 'badges' }, badge(course.classification, course.classification === 'NO APTO' ? 'red' : 'amber'), badge(`${course.score}/100`), badge(`${course.plannedHours.toFixed(1)} h planificadas`)),
        h('p', { text: course.priorAudit.alignment }),
        h('footer', {}, h('span', { class: 'muted', text: `${decided}/5 pares · ${gaps.length} brecha(s) · ${review.dictum ?? 'sin dictamen nuevo'}` }),
          h('button', { class: 'button secondary small', type: 'button', onclick: () => { selectedCourseSlug = course.slug; window.location.hash = `course/${course.slug}`; } }, 'Abrir expediente')));
    })),
  ];
}

function courseView() {
  const course = courseBySlug(selectedCourseSlug) ?? context.data.courses[0];
  selectedCourseSlug = course.slug;
  const review = context.state.courseReviews[course.slug] ?? { gates: {} };
  const gaps = course.pairs.filter((pair) => pair.sourceGap);
  const pairsApproved = course.pairs.filter((pair) => context.state.pairReviews[pair.pairId]?.decision === 'approved').length;
  const gapsValidated = gaps.filter((pair) => context.state.gapReviews[pair.pairId]?.status === 'validated').length;
  const pilotEvidence = context.state.pilotRecords.some((record) => record.courseSlug === course.slug);
  const canAuthorize = pairsApproved === course.pairs.length && gapsValidated === gaps.length && pilotEvidence && Number(review.validatedScore) >= 85 && Object.keys(gateLabels).slice(0, -1).every((gate) => review.gates?.[gate]);
  const gateForm = h('form', { class: 'card', onsubmit: async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api(`/api/courses/${course.slug}/review`, { method: 'POST', body: JSON.stringify({
        gates: Object.fromEntries(Object.keys(gateLabels).map((gate) => [gate, form.get(gate) === 'on'])),
        dictum: form.get('dictum'), validatedScore: form.get('validatedScore'), technicalEvidence: form.get('technicalEvidence'), notes: form.get('notes'),
      }) });
      context.state = result.state; flash('Expediente del curso guardado con trazabilidad.'); render();
    } catch (error) { flash(error.message, true); }
  } }, h('h3', { text: 'Gates independientes' }),
    h('div', { class: 'check-grid' }, Object.entries(gateLabels).map(([gate, label]) => h('label', { class: 'check' }, h('input', { type: 'checkbox', name: gate, checked: review.gates?.[gate], disabled: gate === 'certifiabilityAuthorized' && !canAuthorize }), h('span', { text: label })))),
    h('div', { class: 'field-grid mt-14' },
      h('label', {}, 'Dictamen humano', h('select', { name: 'dictum' }, ['NO APTO', 'REQUIERE MEJORAS', 'APTO'].map((value) => h('option', { value, selected: (review.dictum ?? course.classification) === value }, value)))),
      h('label', {}, 'Puntaje humano validado (0–100)', h('input', { name: 'validatedScore', type: 'number', min: '0', max: '100', step: '1', value: review.validatedScore ?? '' })),
      h('label', {}, 'Revisor', h('input', { value: context.reviewer, readonly: true })),
      h('label', { class: 'full' }, 'Evidencia técnica (pruebas, commit y resultado)', h('textarea', { name: 'technicalEvidence', text: review.technicalEvidence ?? '' })),
      h('label', { class: 'full' }, 'Observaciones y decisiones pendientes', h('textarea', { name: 'notes', text: review.notes ?? '' }))),
    h('div', { class: 'form-actions' }, h('button', { class: 'button', type: 'submit' }, 'Guardar expediente')));
  return [
    h('div', { class: 'toolbar' }, h('button', { class: 'button secondary small', type: 'button', onclick: () => navigate('courses') }, '← Todos los cursos'), h('button', { class: 'button secondary small', type: 'button', onclick: async () => {
      try { await downloadProtected(`/api/reports/${course.slug}.md`, `${course.slug}-informe.md`); }
      catch (error) { flash(error.message, true); }
    } }, 'Descargar informe individual')),
    sectionHead(course.name, `Clasificación base ${course.classification} (${course.score}/100). Horas planificadas: ${course.plannedHours.toFixed(1)}; aún no validadas empíricamente.`),
    h('div', { class: 'metrics' }, metric('Pares aprobados', `${pairsApproved}/5`), metric('Brechas validadas', `${gapsValidated}/${gaps.length}`), metric('Gates completos', `${Object.values(review.gates ?? {}).filter(Boolean).length}/9`), metric('Certificado', 'Bloqueado', '', 'danger'), metric('OTEC', 'Bloqueada', '', 'danger')),
    h('article', { class: 'card mb-16' }, h('h3', { text: 'Verificación académica preparada' }),
      h('div', { class: 'verification-grid' }, Object.entries(course.remediation.verification).map(([key, value]) => h('div', { class: 'verification-item' }, h('strong', { text: ({ learningOutcomes: 'Resultados de aprendizaje', content: 'Contenidos', activities: 'Actividades', evaluation: 'Evaluación y respuestas', rubric: 'Rúbrica', bibliography: 'Bibliografía', hours: 'Horas' })[key] ?? key }), h('p', { text: value })))),
      h('div', { class: 'audit-note mt-14' }, h('strong', { text: 'Decisión de Emmanuel Zúñiga pendiente' }), h('p', { text: course.remediation.humanDecision }))),
    gateForm,
  ];
}

function decisionsView() {
  const queue = context.data.remediation.decisionQueue;
  const selected = decisionById(selectedPairId) ?? queue[0];
  selectedPairId = selected.pairId;
  const review = context.state.pairReviews[selected.pairId] ?? {};
  const submit = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      const result = await api(`/api/pairs/${selected.pairId}/review`, { method: 'POST', body: JSON.stringify({
        decision: values.get('decision'), notes: values.get('notes'), correctionReason: values.get('correctionReason'),
        proposedFormA: values.get('proposedFormA'), proposedFormB: values.get('proposedFormB'),
        proposedExpectedElements: String(values.get('proposedExpectedElements')).split('\n'), proposedRationale: values.get('proposedRationale'),
      }) });
      context.state = result.state; flash(`Decisión humana de ${selected.pairId} guardada; no se publicó ni activó.`); render();
    } catch (error) { flash(error.message, true); }
  };
  const source = pairById(selected.pairId);
  return [
    sectionHead('Bandeja de decisiones académicas', 'Cuarenta pares preparados para Emmanuel Zúñiga: ocho correcciones con comparación antes/después y 32 retenciones explícitas. Nada está aprobado automáticamente.'),
    h('div', { class: 'metrics' },
      metric('Pendientes', String(queue.filter((item) => !context.state.pairReviews[item.pairId]?.decision || context.state.pairReviews[item.pairId]?.decision === 'pending').length), 'de 40'),
      metric('Corregidos', '8', 'candidatos, no aprobados'), metric('Retenidos', '32', 'revisión humana pendiente'), metric('OTEC', 'Bloqueada', '', 'danger')),
    h('div', { class: 'review-layout' },
      h('aside', { class: 'card pair-list' }, queue.map((item) => h('button', { type: 'button', class: `pair-button ${item.pairId === selected.pairId ? 'active' : ''}`, onclick: () => { selectedPairId = item.pairId; render(); } },
        h('strong', { text: `${item.priorityRank}. ${item.pairId} · ${item.courseName}` }),
        h('span', { text: `${item.remediationType === 'corrected_candidate' ? 'corrección' : 'retención'} · ${context.state.pairReviews[item.pairId]?.decision ?? 'pendiente'}` })))),
      h('div', { class: 'review-main' },
        h('article', { class: 'card' },
          h('div', { class: 'meta-strip' }, badge(selected.courseName), badge(selected.pairId), badge(selected.remediationType === 'corrected_candidate' ? 'Corrección propuesta' : 'Sin cambio conceptual', selected.remediationType === 'corrected_candidate' ? 'amber' : '')),
          h('h3', { text: 'Problema o fundamento de retención' }), h('p', { text: selected.problem }),
          h('div', { class: 'compare-grid mt-14' },
            h('section', { class: 'form-card before' }, h('h4', { text: 'ANTES' }), h('strong', { text: 'Forma A' }), h('p', { text: selected.before.formA }), h('strong', { text: 'Forma B' }), h('p', { text: selected.before.formB }), h('strong', { text: 'Criterios' }), h('ul', { class: 'criteria' }, selected.before.expectedElements.map((item) => h('li', { text: item })))),
            h('section', { class: 'form-card after' }, h('h4', { text: 'DESPUÉS · CANDIDATO' }), h('strong', { text: 'Forma A' }), h('p', { text: selected.current.formA }), h('strong', { text: 'Forma B' }), h('p', { text: selected.current.formB }), h('strong', { text: 'Criterios' }), h('ul', { class: 'criteria' }, selected.current.expectedElements.map((item) => h('li', { text: item }))))),
          h('div', { class: 'evidence-grid mt-14' },
            h('section', {}, h('h3', { text: 'Justificación científica' }), h('p', { text: selected.scientificJustification }), h('p', {}, h('strong', { text: 'Respuestas alternativas: ' }), selected.alternativeDefensibleAnswers), h('p', {}, h('strong', { text: 'Recomendación: ' }), selected.recommendation)),
            h('section', {}, h('h3', { text: 'Fuentes verificables' }), selected.references.length ? selected.references.map((reference) => h('div', { class: 'reference compact' }, h('strong', { text: reference.id }), h('p', { text: reference.citation }), h('div', { class: 'badges' }, reference.doi ? h('a', { href: `https://doi.org/${reference.doi}`, target: '_blank', rel: 'noopener noreferrer' }, 'DOI') : null, reference.url ? h('a', { href: reference.url, target: '_blank', rel: 'noopener noreferrer' }, 'Fuente') : null))) : h('p', { class: 'muted', text: 'Se conservan las fuentes del programa; no se agregó una nueva brecha.' }))),
        h('form', { class: 'card', onsubmit: submit }, h('h3', { text: 'Decisión exclusiva de Emmanuel Zúñiga' }),
          h('div', { class: 'field-grid' },
            h('label', {}, 'Decisión', h('select', { name: 'decision' }, [['pending', 'Pendiente'], ['approved', 'Aprobar'], ['approved_with_corrections', 'Aprobar con correcciones'], ['modification_requested', 'Solicitar modificación'], ['rejected', 'Rechazar']].map(([value, label]) => h('option', { value, selected: (review.decision ?? 'pending') === value }, label)))),
            h('label', {}, 'Versión', h('input', { value: context.data.instrumentVersion, readonly: true })),
            h('label', { class: 'full' }, 'Fundamento de corrección, modificación o rechazo', h('textarea', { name: 'correctionReason', text: review.correctionReason ?? '' })),
            h('label', {}, 'Forma A decidida', h('textarea', { name: 'proposedFormA', text: review.proposedFormA ?? source.formA })),
            h('label', {}, 'Forma B decidida', h('textarea', { name: 'proposedFormB', text: review.proposedFormB ?? source.formB })),
            h('label', { class: 'full' }, 'Criterios decididos (uno por línea)', h('textarea', { name: 'proposedExpectedElements', text: (review.proposedExpectedElements?.length ? review.proposedExpectedElements : source.expectedElements).join('\n') })),
            h('label', { class: 'full' }, 'Justificación decidida', h('textarea', { name: 'proposedRationale', text: review.proposedRationale ?? source.rationale })),
            h('label', { class: 'full' }, 'Notas', h('textarea', { name: 'notes', text: review.notes ?? '' }))),
          h('div', { class: 'form-actions' }, h('button', { class: 'button', type: 'submit' }, 'Registrar decisión humana')))),
    )),
  ];
}

function pairsView() {
  const pairs = allPairs();
  const selected = pairById(selectedPairId) ?? pairs[0];
  selectedPairId = selected.pairId;
  const review = context.state.pairReviews[selected.pairId] ?? {};
  const form = h('form', { class: 'card', onsubmit: async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      const result = await api(`/api/pairs/${selected.pairId}/review`, { method: 'POST', body: JSON.stringify({
        decision: values.get('decision'), notes: values.get('notes'), correctionReason: values.get('correctionReason'),
        proposedFormA: values.get('proposedFormA'), proposedFormB: values.get('proposedFormB'),
        proposedExpectedElements: String(values.get('proposedExpectedElements')).split('\n'), proposedRationale: values.get('proposedRationale'),
      }) });
      context.state = result.state; flash(`${selected.pairId} guardado; no se modificó el instrumento fuente.`); render();
    } catch (error) { flash(error.message, true); }
  } }, h('h3', { text: 'Decisión y propuesta de edición' }),
    h('div', { class: 'field-grid' },
      h('label', {}, 'Decisión humana', h('select', { name: 'decision' }, [
        ['pending', 'Pendiente'], ['approved', 'Aprobar'], ['approved_with_corrections', 'Aprobar con correcciones'],
        ['modification_requested', 'Solicitar modificación'], ['rejected', 'Rechazar'],
      ].map(([value, label]) => h('option', { value, selected: (review.decision ?? 'pending') === value }, label)))),
      h('label', {}, 'Versión', h('input', { value: context.data.instrumentVersion, readonly: true })),
      h('label', { class: 'full' }, 'Motivo de corrección, modificación o rechazo', h('textarea', { name: 'correctionReason', text: review.correctionReason ?? '' })),
      h('label', {}, 'Forma A propuesta', h('textarea', { name: 'proposedFormA', text: review.proposedFormA ?? selected.formA })),
      h('label', {}, 'Forma B propuesta', h('textarea', { name: 'proposedFormB', text: review.proposedFormB ?? selected.formB })),
      h('label', { class: 'full' }, 'Criterios de respuesta propuestos (uno por línea)', h('textarea', { name: 'proposedExpectedElements', text: (review.proposedExpectedElements?.length ? review.proposedExpectedElements : selected.expectedElements).join('\n') })),
      h('label', { class: 'full' }, 'Justificación propuesta', h('textarea', { name: 'proposedRationale', text: review.proposedRationale ?? selected.rationale })),
      h('label', { class: 'full' }, 'Notas del revisor', h('textarea', { name: 'notes', text: review.notes ?? '' }))),
    h('div', { class: 'form-actions' }, h('button', { class: 'button', type: 'submit' }, 'Guardar decisión versionada')));

  return [
    sectionHead('Revisión de formas A/B', 'Los criterios esperados y la justificación se entregan sólo tras autenticar esta sesión local. Guardar una propuesta no modifica los instrumentos fuente ni la publica.'),
    h('div', { class: 'review-layout' },
      h('aside', { class: 'card pair-list' }, pairs.map((pair) => h('button', { type: 'button', class: `pair-button ${pair.pairId === selected.pairId ? 'active' : ''}`, onclick: () => { selectedPairId = pair.pairId; render(); } }, h('strong', { text: `${pair.pairId} · ${pair.course.name}` }), h('span', { text: `${pair.outcomeId} · ${context.state.pairReviews[pair.pairId]?.decision ?? 'pendiente'}` })))),
      h('div', { class: 'review-main' },
        h('article', { class: 'card' }, h('div', { class: 'meta-strip' }, badge(selected.course.name), badge(selected.outcomeId), badge(selected.cognitiveLevel), badge(selected.safetyGate ? 'Gate de seguridad' : 'Sin gate crítico', selected.safetyGate ? 'red' : '')),
          h('div', { class: 'forms-grid mt-15' }, h('section', { class: 'form-card' }, h('h4', { text: 'FORMA A' }), h('p', { text: selected.formA })), h('section', { class: 'form-card' }, h('h4', { text: 'FORMA B' }), h('p', { text: selected.formB }))),
          h('div', { class: 'evidence-grid mt-14' },
            h('section', {}, h('h3', { text: 'Criterios de respuesta' }), h('ul', { class: 'criteria' }, selected.expectedElements.map((item) => h('li', { text: item })))),
            h('section', {}, h('h3', { text: 'Justificación y fuentes' }), h('p', { text: selected.rationale }), h('div', { class: 'badges' }, selected.sourceRefs.map((item) => badge(item))))),
          h('div', { class: 'audit-note mt-14' }, h('strong', { text: 'Observación de auditoría previa' }), h('p', { text: selected.course.priorAudit.contentReview }))),
        h('article', { class: 'card' }, h('h3', { text: 'Rúbrica común' }), h('div', { class: 'badges' }, context.data.rubric.dimensions.map((item) => badge(item))), h('p', { text: `Escala 0–3 por dimensión; máximo ${context.data.rubric.maximumPerCase}. ${context.data.rubric.criticalSafetyRule}.` })),
        form)),
  ];
}

function gapsView() {
  const gaps = allPairs().filter((pair) => pair.sourceGap);
  return [
    sectionHead('Ocho brechas bibliográficas', 'Una cita identificada no cierra una brecha. El estado “validada” exige marcar los ocho controles científicos y registrar un fundamento explícito.'),
    h('div', { class: 'gap-grid' }, gaps.map((pair) => {
      const review = context.state.gapReviews[pair.pairId] ?? { checks: {} };
      return h('form', { class: 'card', onsubmit: async (event) => {
        event.preventDefault(); const values = new FormData(event.currentTarget);
        try {
          const result = await api(`/api/gaps/${pair.pairId}/review`, { method: 'POST', body: JSON.stringify({
            status: values.get('status'), checks: Object.fromEntries(Object.keys(checkLabels).map((check) => [check, values.get(check) === 'on'])),
            decisionRationale: values.get('decisionRationale'), notes: values.get('notes'),
          }) });
          context.state = result.state; flash(`Brecha ${pair.pairId} guardada.`); render();
        } catch (error) { flash(error.message, true); }
      } },
      h('div', { class: 'meta-strip' }, badge(pair.course.name), badge(pair.pairId), badge('Expediente bibliográfico preparado', 'green'), badge(review.status ?? 'pending', review.status === 'validated' ? 'green' : 'amber')),
      h('h3', { text: pair.sourceGap }),
      h('p', { text: pair.sourceGapDecision?.pending }),
      h('div', {}, pair.supplementalReferences.map((reference) => h('div', { class: 'reference' }, h('strong', { text: reference.id }), h('p', { text: reference.citation }), h('p', { text: reference.use }), h('div', { class: 'badges' }, reference.doi ? h('a', { href: `https://doi.org/${reference.doi}`, target: '_blank', rel: 'noopener noreferrer' }, `DOI ${reference.doi}`) : null, reference.url ? h('a', { href: reference.url, target: '_blank', rel: 'noopener noreferrer' }, 'Fuente') : null)))),
      h('div', { class: 'check-grid mt-14' }, Object.entries(checkLabels).map(([check, label]) => h('label', { class: 'check' }, h('input', { type: 'checkbox', name: check, checked: review.checks?.[check] }), h('span', { text: label })))),
      h('div', { class: 'field-grid mt-14' },
        h('label', {}, 'Estado', h('select', { name: 'status' }, [['pending', 'Pendiente'], ['narrowed_not_closed', 'Acotada, no cerrada'], ['validated', 'Validada'], ['rejected', 'Rechazada']].map(([value, label]) => h('option', { value, selected: (review.status ?? 'pending') === value }, label)))),
        h('label', {}, 'Revisor', h('input', { value: context.reviewer, readonly: true })),
        h('label', { class: 'full' }, 'Fundamento científico de la decisión', h('textarea', { name: 'decisionRationale', text: review.decisionRationale ?? '' })),
        h('label', { class: 'full' }, 'Notas', h('textarea', { name: 'notes', text: review.notes ?? '' }))),
      h('div', { class: 'form-actions' }, h('button', { class: 'button', type: 'submit' }, 'Guardar revisión de brecha')));
    })),
  ];
}

function pilotView() {
  const form = h('form', { class: 'card', onsubmit: async (event) => {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    try {
      const result = await api('/api/pilots', { method: 'POST', body: JSON.stringify(Object.fromEntries(values.entries())) });
      context.state = result.state; event.currentTarget.reset(); flash('Dato real de pilotaje guardado.'); render();
    } catch (error) { flash(error.message, true); }
  } }, h('h3', { text: 'Registrar participante real seudonimizado' }), h('div', { class: 'warning', text: 'No ingreses nombres, RUT, email, teléfono ni datos clínicos identificables. No simules participantes.' }),
  h('div', { class: 'field-grid mt-14' },
    h('label', {}, 'Código seudónimo', h('input', { name: 'participantCode', placeholder: 'P-001', required: true })),
    h('label', {}, 'Curso', h('select', { name: 'courseSlug', required: true }, context.data.courses.map((course) => h('option', { value: course.slug }, course.name)))),
    h('label', {}, 'Forma', h('select', { name: 'form', required: true }, h('option', { value: 'A' }, 'A'), h('option', { value: 'B' }, 'B'))),
    h('label', {}, 'Minutos observados', h('input', { name: 'observedMinutes', type: 'number', min: '1', max: '10000', step: '1', required: true })),
    h('label', {}, 'Puntaje observado (%)', h('input', { name: 'scorePercent', type: 'number', min: '0', max: '100', step: '0.1' })),
    h('label', {}, 'Dificultad de ítems', h('textarea', { name: 'itemDifficulty', placeholder: 'Resultados observados, no estimaciones' })),
    h('label', {}, 'Discriminación de ítems', h('textarea', { name: 'itemDiscrimination', placeholder: 'Calcular sólo con datos reales suficientes' })),
    h('label', {}, 'Resultados por competencia', h('textarea', { name: 'competencyResults' })),
    h('label', {}, 'Problemas de comprensión', h('textarea', { name: 'comprehensionIssues' })),
    h('label', {}, 'Comparación A/B', h('textarea', { name: 'formComparison' })),
    h('label', {}, 'Calidad de la retroalimentación', h('textarea', { name: 'feedbackQuality' })),
    h('label', {}, 'Notas', h('textarea', { name: 'notes' })),
    h('label', {}, 'Mejoras propuestas', h('textarea', { name: 'improvements' }))),
  h('div', { class: 'form-actions' }, h('button', { class: 'button', type: 'submit' }, 'Guardar observación real')));
  const records = context.state.pilotRecords;
  return [
    sectionHead('Pilotaje futuro', 'Esta sección almacena observaciones reales y seudonimizadas: claridad, dificultad, equivalencia, tiempo, resultados por competencia, interpretación y retroalimentación.'),
    records.length ? h('div', { class: 'table-wrap mb-16' }, h('table', {}, h('thead', {}, h('tr', {}, ['Código', 'Curso', 'Forma', 'Minutos', 'Puntaje', 'Fecha'].map((item) => h('th', { text: item })))), h('tbody', {}, records.map((record) => h('tr', {}, h('td', { text: record.participantCode }), h('td', { text: courseBySlug(record.courseSlug)?.name ?? record.courseSlug }), h('td', { text: record.form }), h('td', { text: record.observedMinutes }), h('td', { text: record.scorePercent == null ? '—' : `${record.scorePercent}%` }), h('td', { text: record.recordedAt })))))) : h('div', { class: 'pilot-empty mb-16' }, h('strong', { text: 'Sin datos de pilotaje' }), h('p', { text: 'Estado correcto hasta que existan participantes reales. El panel no genera datos ficticios.' })),
    form,
  ];
}

function exportsView() {
  const exports = [
    ['Excel consolidado', 'Nueve hojas con resumen, cursos, 40 pares, 80 variantes, rúbricas, brechas, observaciones, pilotaje y log.', '/api/export/consolidated.xlsx'],
    ['Matriz de 40 pares', 'CSV con formas A/B, criterios, fuentes y decisiones.', '/api/export/pairs.csv'],
    ['Bandeja antes/después', 'CSV con 40 decisiones, ocho correcciones, 32 retenciones, evidencia y estado humano.', '/api/export/proposals.csv'],
    ['Matriz de 80 variantes', 'Una fila por variante con RA, nivel, gate y criterio.', '/api/export/variants.csv'],
    ['Rúbricas', 'Dimensiones, escala y regla crítica de seguridad.', '/api/export/rubrics.csv'],
    ['Brechas bibliográficas', 'Evidencia, DOI, controles científicos y fundamento humano.', '/api/export/gaps.csv'],
    ['Observaciones del revisor', 'Antecedentes por curso y decisiones humanas pendientes.', '/api/export/observations.csv'],
    ['Datos de pilotaje', 'Sólo registros reales seudonimizados; puede estar vacío.', '/api/export/pilots.csv'],
    ['Acta de validación', 'Borrador Markdown que mantiene OTEC y certificados bloqueados.', '/api/export/acta.md'],
    ['Decisiones versionadas', 'JSON con estado y cadena hash de eventos.', '/api/export/decisions.json'],
  ];
  return [
    sectionHead('Exportaciones verificables', `Las descargas reflejan el estado guardado ${INTEGRATED_ADMIN ? 'en la persistencia administrativa protegida' : 'en esta sesión local'}. Ninguna exportación modifica cursos, notas históricas o certificados.`),
    h('div', { class: 'export-grid' }, exports.map(([name, description, href]) => h('article', { class: 'card export-card' }, h('h3', { text: name }), h('p', { text: description }), h('button', { class: 'button secondary', type: 'button', onclick: async () => {
      try { await downloadProtected(href, href.split('/').at(-1)); }
      catch (error) { flash(error.message, true); }
    } }, 'Descargar')))),
    h('article', { class: 'card mt-16' }, h('h3', { text: 'Informes individuales' }), h('div', { class: 'badges' }, context.data.courses.map((course) => h('button', { class: 'button secondary small', type: 'button', onclick: async () => {
      try { await downloadProtected(`/api/reports/${course.slug}.md`, `${course.slug}-informe.md`); }
      catch (error) { flash(error.message, true); }
    } }, course.name)))),
  ];
}

function render() {
  const names = { dashboard: 'Resumen', courses: 'Cursos', course: 'Expediente del curso', decisions: 'Bandeja académica', pairs: 'Pares A/B', gaps: 'Brechas científicas', pilot: 'Pilotaje', exports: 'Exportaciones' };
  title.textContent = names[currentView];
  const factories = { dashboard, courses: coursesView, course: courseView, decisions: decisionsView, pairs: pairsView, gaps: gapsView, pilot: pilotView, exports: exportsView };
  setChildren(app, factories[currentView]());
  app.setAttribute('aria-busy', 'false');
}

document.querySelector('#menu-button').addEventListener('click', () => sidebar.classList.toggle('open'));
window.addEventListener('hashchange', () => { if (context) applyHashRoute(); });

try {
  context = await api('/api/bootstrap');
  reviewerName.textContent = context.reviewer;
  applyHashRoute();
} catch (error) {
  app.setAttribute('aria-busy', 'false');
  setChildren(app, h('div', { class: 'warning', text: `No fue posible cargar el panel: ${error.message}` }));
}
