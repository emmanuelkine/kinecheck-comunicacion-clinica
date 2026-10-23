import {cases, safety, fields} from './cases.js';
import {checkpoints} from './checkpoints.js';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY = 'kin2002-roleplay-preparacion-v1';
const endpoint = '/api/kin2002-roleplay';
const notice = message => { $('#notice').textContent = message; };
let state;
try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { state = null; }
let records = [], cursor = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { notice('No se pudo guardar el borrador local. Descarga una copia antes de cerrar.'); } };
function modal(title, content) { $('#window-content').innerHTML = `<h2>${esc(title)}</h2>${content}`; $('#window').showModal(); }
function roles(round = state.round) {
  const n = state.members.length;
  const kine = (n === 3 ? [0,2,1] : [0,2,1,3])[round];
  const patient = (n === 3 ? [1,0,2] : [1,3,0,2])[round];
  return {kine: state.members[kine], paciente: state.members[patient], observador: state.members.filter((_, i) => i !== kine && i !== patient).join(' y ')};
}
function roundData() { return state.rounds[state.round] ||= {checks: {}, attempts: [], read: {}}; }
function roleButtons() { return Object.entries(roles()).map(([role, name]) => `<button type='button' class='secondary' data-role='${role}'>${esc(name)} · ${role === 'kine' ? 'Kine' : role === 'paciente' ? 'Paciente' : 'Observador'}</button>`).join(''); }
function readRole(role) {
  const c = cases[state.caseId];
  const content = role === 'paciente'
    ? `<p><b>Cómo comenzar:</b> ${esc(c.brief)}</p><h3>Responde solo cuando te pregunten</h3><p>${esc(c.history)}</p><p>${esc(c.function)}</p><h3>Tu preocupación</h3><p>${esc(c.belief)}</p><h3>Tu prioridad</h3><p>${esc(c.priority)}</p><p>No inventes datos. Expresa las dudas naturalmente y no reproduzcas síntomas físicos. El dato nuevo se abre más adelante; si preguntan antes por esa experiencia, consulta tu tarjeta con el observador y responde de inmediato.</p><details><summary>Solo si preguntan antes: experiencia nueva</summary><p>${esc(c.twists[state.round])}</p></details>`
    : role === 'kine'
    ? `<p>${esc(c.brief)}</p><ol><li>Solicita consentimiento y explora la prioridad de la persona.</li><li>Verifica seguridad y selecciona una evaluación con propósito.</li><li>Explica una síntesis provisional y acuerda una primera tarea, si procede.</li><li>Revisa tu decisión con la información nueva y comprueba comprensión.</li></ol><p>No leas la tarjeta del paciente ni anticipes sus datos. Declara lo que falta.</p>`
    : `<p>Observa sin conducir la consulta. Registra frases y conductas concretas; confirma cada acción solo si ocurrió. Si falta algo, pide repetirlo. Controla el tiempo con el reloj del aula.</p><p>Al finalizar: una fortaleza, una mejora realizable y repetición del segmento. No confirmes la ejecución solo porque la plataforma mostró una decisión adecuada.</p>`;
  modal(`Tarjeta de ${role === 'kine' ? 'kinesiólogo' : role}`, `${content}<p class='warn'>${esc(safety)}</p>`);
  roundData().read[role] = true; save();
}
function setup() {
  $('#app').innerHTML = `<p class='eyebrow'>Juego de rol presencial · Un dispositivo por grupo</p><h1>Consulta, decide<br>y vuelve a intentarlo.</h1><p class='lead'>Actúen primero. Después revisen su decisión y reciban orientación inmediata en cada etapa.</p><div class='grid'><article class='card'><h2>Cómo jugar</h2><ol><li>Formen un trío y repartan los roles de kine, paciente y observador.</li><li>Cada persona lee solo su tarjeta; pasen el dispositivo sin mostrarla al resto.</li><li>Abran la consigna, guarden la pantalla y hagan la escena.</li><li>Revisen su decisión: si requiere corrección, repitan antes de avanzar.</li><li>Roten los roles en cada ronda y envíen un trabajo por grupo.</li></ol><p class='small'>Tres rondas en tríos. En un cuarteto: cuatro rondas y dos observadores que comparten el rol.</p></article><article class='card'><h2>Cómo sabrán si van bien</h2><p>🟢 <b>Decisión adecuada</b> para el escenario seleccionado.</p><p>🟡 <b>Necesita ajustes:</b> lean la explicación y vuelvan a intentarlo.</p><p>🔴 <b>Corrijan antes de continuar:</b> reciban una pista y repitan.</p><p class='small'>El observador verifica la actuación. La plataforma no escucha la consulta ni evalúa automáticamente su texto libre o una técnica.</p></article></div><form id='setup' class='card'><h2>Preparar el grupo</h2><label>Sección<select name='section'><option>S1</option><option>S2</option></select></label><label>Caso de práctica<select name='caseId'><option value='lumbar'>Dolor lumbar · Camila</option><option value='hombro'>Hombro · Andrea</option></select></label><label>Nombre o número del grupo<input name='group' required maxlength='50' placeholder='Ejemplo: Grupo 4'></label><label>Integrante A<input name='member0' required minlength='3' maxlength='100'></label><label>Integrante B<input name='member1' required minlength='3' maxlength='100'></label><label>Integrante C<input name='member2' required minlength='3' maxlength='100'></label><label>Integrante D, solo si son cuatro<input name='member3' minlength='3' maxlength='100'></label><p class='small'>Los nombres y respuestas se envían únicamente al registro docente. El borrador queda en este dispositivo; bórrenlo al terminar si es compartido. No incluyan datos de pacientes reales.</p><p class='warn'>${esc(safety)}</p><button>Comenzar la actividad</button></form>`;
  $('#setup').onsubmit = event => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const members = [0,1,2,3].map(i => String(data.get('member' + i) || '').trim()).filter(Boolean);
    if (![3,4].includes(members.length)) return notice('Indiquen tres o cuatro integrantes.');
    state = {id: crypto.randomUUID(), token: [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2,'0')).join(''), section: data.get('section'), caseId: data.get('caseId'), group: String(data.get('group')).trim(), members, round: 0, stage: 0, rounds: []};
    save(); render();
  };
}
function stage() {
  const c = cases[state.caseId], data = roundData(), number = state.stage;
  const checkpoint = checkpoints[number];
  const r = roles();
  const progress = ['Roles','Entrevista','Evaluación','Decisión','Dato nuevo','Repetición'];
  $('#app').innerHTML = `<p class='eyebrow'>${esc(state.section)} · ${esc(state.group)} · Ronda ${state.round + 1} de ${state.members.length}</p><h1>${number ? checkpoint.title : 'Preparen sus roles'}</h1><p class='lead'>${esc(c.title)}</p><ol class='steps' aria-label='Progreso'>${progress.map((label,i) => `<li class='${i === number ? 'current' : i < number ? 'done' : ''}'>${i+1}. ${label}</li>`).join('')}</ol><p class='small'>Kine: ${esc(r.kine)} · Paciente: ${esc(r.paciente)} · Observador: ${esc(r.observador)}</p><div class='card'><h2>Tarjetas personales</h2><p class='small'>Cada estudiante abre solo su rol. Respetar la información reservada es parte del juego; no hay bloqueo técnico entre tarjetas.</p>${roleButtons()}</div>${number === 0 ? `<article class='card action'><h2>Dos minutos de preparación</h2><p>Lean sus tarjetas. El observador tendrá el dispositivo para abrir las consignas; después lo deja boca abajo durante cada acción. Usen el reloj del aula.</p><p class='warn'>${esc(safety)}</p><button id='start-round'>Ya leímos · Iniciar entrevista</button></article>` : `<article class='card action'><h2>Primero, realicen la acción</h2><p>${esc(checkpoint.task)}</p>${number === 4 ? `<button id='twist'>Paciente · Abrir dato nuevo</button><div id='twist-text'>${data.twistOpened ? `<p class='warn'>${esc(c.twists[state.round])}</p>` : ''}</div>` : ''}<p class='pause'>Pantalla boca abajo mientras actúan.</p><button class='secondary' id='action'>Ver consigna en ventana</button></article><form id='stage-form' class='card'><h2>Registren lo realizado</h2>${checkpoint.keys.map(key => `<label>${esc(fields[key])}<textarea name='${key}' required minlength='12' maxlength='1100' placeholder='Un dato concreto → su interpretación → la decisión y su fundamento.'>${esc(data[key])}</textarea></label>`).join('')}<h2>Comprueben su decisión</h2><p>Seleccionen la opción que mejor representa lo que hicieron. La devolución se refiere a esa elección; sus respuestas escritas serán revisadas por el docente.</p><div id='choices'>${[...checkpoint.options.slice((state.round + number) % 3),...checkpoint.options.slice(0,(state.round + number) % 3)].map(option => `<button type='button' class='secondary' data-choice='${option.id}'>${esc(option.label)}</button>`).join('')}</div><div id='feedback' aria-live='polite'></div><h3>Verificación de la actuación · Observador</h3><p>${esc(checkpoint.evidence)}</p><label>¿Se observó realmente?<select id='observed'><option value=''>Selecciona una opción</option><option value='yes'>Sí, ocurrió y puedo dar un ejemplo</option><option value='repeat'>Parcial o no ocurrió: debemos repetir</option><option value='teacher'>Tenemos una duda: consultar al docente</option></select></label><div id='observed-feedback' aria-live='polite'></div><label>Ejemplo concreto que lo demuestra<input id='evidence' minlength='12' maxlength='400' required value='${esc(data.checks[number]?.evidence || '')}' placeholder='Una frase o conducta que el observador vio o escuchó'></label><button>${number === 5 ? 'Cerrar esta ronda' : 'Acción revisada · Continuar'}</button><p class='small'>No se avanza con una decisión pendiente de corrección o una actuación que deba repetirse.</p></form>`}<p class='small'>Borrador guardado en este dispositivo. La entrega al docente ocurre únicamente al pulsar Enviar al finalizar.</p><button class='secondary' id='download'>Descargar copia del borrador</button><button class='danger' id='reset'>Borrar y comenzar otro grupo</button><p class='watermark'>KineCheck</p>`;
  document.querySelectorAll('[data-role]').forEach(button => { button.onclick = () => readRole(button.dataset.role); });
  $('#download').onclick = download;
  $('#reset').onclick = reset;
  if (!number) {
    $('#start-round').onclick = () => {
      if (!['kine','paciente','observador'].every(role => data.read[role])) return notice('Cada rol debe abrir y leer su tarjeta antes de empezar.');
      state.stage = 1; save(); render();
    }; return;
  }
  let check = data.checks[number] ||= {choice: '', observed: '', evidence: ''};
  $('#observed').value = check.observed;
  const updateFeedback = () => {
    const selected = checkpoint.options.find(option => option.id === check.choice);
    $('#feedback').innerHTML = selected ? `<div class='card ${selected.level === 'good' ? 'review' : 'warn'}'><h3>${selected.level === 'good' ? '🟢 Decisión adecuada para este escenario' : selected.level === 'adjust' ? '🟡 Necesita ajustes' : '🔴 Corrijan antes de continuar'}</h3><p>${esc(selected.why)}</p>${selected.level === 'good' ? '<p class="small">Falta verificar la actuación con el observador. Esta orientación no valida automáticamente el texto escrito.</p>' : '<p><b>Acción:</b> repitan el segmento y seleccionen nuevamente la decisión que ahora representa su actuación.</p>'}</div>` : '<p class="small">Decisión pendiente de revisión.</p>';
    $('#observed-feedback').textContent = check.observed === 'yes' ? 'Actuación confirmada por el observador. Registren su evidencia.' : check.observed === 'teacher' ? 'Pausen y consulten al docente. Después repitan la acción y confirmen solo si se realizó.' : check.observed === 'repeat' ? 'Repitan el segmento antes de continuar. La decisión seleccionada no sustituye la práctica.' : 'Actuación pendiente de verificación.';
  };
  updateFeedback();
  document.querySelectorAll('[data-choice]').forEach(button => { button.onclick = () => { check.choice = button.dataset.choice; data.attempts.push({stage: number, choice: check.choice, at: new Date().toISOString()}); if (data.attempts.length > 100) data.attempts.shift(); save(); updateFeedback(); }; });
  $('#observed').onchange = event => { check.observed = event.target.value; save(); updateFeedback(); };
  $('#evidence').oninput = event => { check.evidence = event.target.value; save(); };
  document.querySelectorAll('textarea').forEach(input => { input.oninput = () => { data[input.name] = input.value; save(); }; });
  $('#action').onclick = () => modal(checkpoint.title, `<p>${esc(checkpoint.task)}</p><p class='pause'>Cierren esta ventana y realicen la acción cara a cara.</p>`);
  if (number === 4) $('#twist').onclick = () => { data.twistOpened = true; save(); $('#twist-text').innerHTML = `<p class='warn'>${esc(c.twists[state.round])}</p>`; modal('Paciente · Información nueva', `<p>${esc(c.twists[state.round])}</p><p>Comunícalo verbalmente. El kine debe escuchar antes de revisar su decisión.</p>`); };
  $('#stage-form').onsubmit = event => {
    event.preventDefault();
    if (number === 4 && !data.twistOpened) return notice('El paciente debe abrir y comunicar el dato nuevo.');
    if (check.choice !== checkpoint.options[0].id) return notice('Revisen la explicación, repitan la acción y corrijan su decisión antes de avanzar.');
    if (check.observed !== 'yes' || check.evidence.trim().length < 12) return notice('El observador debe confirmar la actuación y describir una evidencia.');
    const values = new FormData(event.currentTarget); checkpoint.keys.forEach(key => { data[key] = String(values.get(key)).trim(); });
    if (number < 5) state.stage++;
    else { data.complete = true; state.round++; state.stage = 0; }
    save(); render();
  };
}
function download() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'}), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'KIN2002_trabajo_y_comprobante.json'; a.click(); URL.revokeObjectURL(url);
  notice('Copia descargada. Contiene su código privado de consulta; no la publiquen.');
}
function reset() { if (confirm('¿Borrar el borrador de este dispositivo? Esto no elimina una entrega ya enviada. Descarga antes tu comprobante si necesitas consultar la devolución.')) { localStorage.removeItem(KEY); state = null; render(); } }
async function api(path, options = {}) {
  const response = await fetch(path, options); let data;
  try { data = await response.json(); } catch { throw new Error('No se pudo interpretar la respuesta del servidor. El borrador se conserva.'); }
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la solicitud.');
  return data;
}
function summary() {
  $('#app').innerHTML = `<p class='eyebrow'>Trabajo completo · ${esc(state.group)}</p><h1>${state.sent ? 'Entrega registrada.' : 'Revisen y envíen.'}</h1><p>${esc(state.members.join(' · '))} · ${esc(state.section)} · ${esc(cases[state.caseId].title)}</p><div class='card'><h2>${state.sent ? 'Comprobante de envío' : 'Antes del envío'}</h2><p>${state.sent ? `Código: <b>${esc(state.id)}</b><br>Recibido: ${esc(new Date(state.sent.createdAt).toLocaleString('es-CL'))}` : 'El registro incluye las decisiones escritas, los intentos en cada punto de control, las verificaciones del observador y la repetición. La decisión inicial se conserva separada de la revisada.'}</p><p class='small'>Las decisiones seleccionadas recibieron orientación inmediata. La calidad del razonamiento escrito y la ejecución clínica requieren revisión docente.</p>${state.sent ? `<button id='receipt'>Consultar retroalimentación docente</button><div id='teacher-feedback' aria-live='polite'></div>` : `<button id='send'>Enviar trabajo al docente</button>`}<button class='secondary' id='download'>Descargar trabajo y comprobante privado</button></div>${state.rounds.map((data,i) => `<details><summary>Ronda ${i+1} · Kine: ${esc(roles(i).kine)}</summary>${Object.entries(fields).map(([key,label]) => `<h3>${esc(label)}</h3><p class='answer'>${esc(data[key])}</p>`).join('')}</details>`).join('')}<button class='danger' id='reset'>Borrar datos de este dispositivo</button>`;
  $('#download').onclick = download; $('#reset').onclick = reset;
  if (state.sent) {
    const link = document.createElement('button'); link.textContent = 'Copiar enlace privado de la devolución'; link.className = 'secondary';
    $('#receipt').after(link);
    link.onclick = async () => {
      const value = location.origin + location.pathname + '#comprobante-' + state.id + '.' + state.token;
      try { await navigator.clipboard.writeText(value); notice('Enlace privado copiado. Compártanlo únicamente con los integrantes del grupo.'); }
      catch { modal('Conserven este enlace privado', `<p class='small'>Permite consultar la devolución del grupo. No lo publiquen.</p><textarea readonly>${esc(value)}</textarea>`); }
    };
    $('#receipt').onclick = async () => {
    try { const result = await api(endpoint, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'receipt',id:state.id,token:state.token})}); $('#teacher-feedback').innerHTML = `<h3>${esc(result.status)}</h3><p class='review'>${esc(result.teacherFeedback || 'Tu docente aún no ha publicado una devolución. Puedes volver a consultar más adelante desde este dispositivo.')}</p>`; } catch (error) { notice(error.message); }
    };
  } else $('#send').onclick = async event => {
    event.target.disabled = true; notice('Guardando el trabajo…');
    try { const result = await api(endpoint, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:state.id,token:state.token,section:state.section,caseId:state.caseId,group:state.group,members:state.members,rounds:state.rounds})}); state.sent = result; save(); render(); notice('Guardado confirmado por el servidor. Conserva tu comprobante.'); }
    catch (error) { notice(error.message); event.target.disabled = false; }
  };
}
function teacherToken() { try { return sessionStorage.getItem('k2admin') || JSON.parse(sessionStorage.getItem('kinecheck_admin_session_v1') || 'null')?.access_token || ''; } catch { return ''; } }
function teacher() {
  $('#app').innerHTML = `<p class='eyebrow'>Revisión docente privada</p><h1>Trabajos del juego de rol.</h1><p>Accede con tu sesión del panel o la misma clave del panel KIN2002. Las respuestas no se muestran a visitantes sin autorización.</p><a class='button secondary' href='/admin/'>Iniciar sesión en KineCheck</a><div class='card'><label>Clave KIN2002, si utilizas este acceso<input id='teacher-key' type='password' autocomplete='off'></label><button id='load'>Abrir trabajos</button><button class='secondary' id='logout'>Cerrar acceso docente</button></div><div id='records'></div><a href='#'>Volver a la actividad</a>`;
  $('#load').onclick = () => { const key = $('#teacher-key').value.trim(); if (key) sessionStorage.setItem('k2admin', key); records = []; loadTeacher(); };
  $('#logout').onclick = () => { sessionStorage.removeItem('k2admin'); sessionStorage.removeItem('kinecheck_admin_session_v1'); records=[]; teacher(); notice('Acceso docente cerrado en este dispositivo.'); };
  if (teacherToken()) loadTeacher();
}
async function loadTeacher(next = '') {
  try {
    const result = await api(endpoint + (next ? '?cursor=' + encodeURIComponent(next) : ''), {headers:{authorization:'Bearer ' + teacherToken()}});
    records.push(...result.records); cursor = result.cursor;
    $('#records').innerHTML = `<div class='card'><h2>${records.length} trabajos cargados</h2><label>Filtrar por nombre, grupo o sección<input id='filter'></label><button class='secondary' id='export'>Descargar CSV de trabajos cargados</button>${cursor ? `<button id='more'>Cargar más trabajos</button>` : ''}<div id='list'></div></div>`;
    $('#filter').oninput = drawRecords; $('#export').onclick = exportRecords; if (cursor) $('#more').onclick = () => loadTeacher(cursor); drawRecords();
  } catch (error) { notice(error.message); }
}
function drawRecords() {
  const query = $('#filter').value.trim().toLowerCase();
  $('#list').innerHTML = records.filter(record => (record.members.join(' ') + ' ' + record.group + ' ' + record.section).toLowerCase().includes(query)).map(record => `<details><summary>${esc(record.section)} · ${esc(record.group)} · ${esc(record.members.join(', '))} · ${record.teacherFeedback ? 'Retroalimentado' : 'Pendiente'}</summary><p class='small'>${esc(new Date(record.createdAt).toLocaleString('es-CL'))} · ${esc(record.id)}</p>${record.rounds.map((round,i) => `<h2>Ronda ${i+1}</h2>${Object.entries(fields).map(([key,label]) => `<h3>${esc(label)}</h3><p class='answer'>${esc(round[key])}</p>`).join('')}<h3>Puntos de control</h3><p class='small'>${esc((round.attempts || []).length)} intentos registrados; orientación sobre decisiones seleccionadas, no una calificación automática.</p>${Object.entries(round.checks || {}).map(([number,check]) => `<p class='small'>Etapa ${esc(number)} · ${esc(check.choice)} · Evidencia del observador: ${esc(check.evidence)}</p>`).join('')}`).join('')}<label>Retroalimentación docente<textarea id='feedback-${record.id}' maxlength='4000'>${esc(record.teacherFeedback)}</textarea></label><button data-review='${record.id}'>Guardar devolución para el grupo</button></details>`).join('') || '<p>No hay trabajos que coincidan con el filtro.</p>';
  document.querySelectorAll('[data-review]').forEach(button => { button.onclick = async () => {
    const id = button.dataset.review, feedback = $('#feedback-' + id).value.trim(); if (feedback.length < 5) return notice('Escribe una devolución de al menos cinco caracteres.');
    button.disabled = true;
    try { await api(endpoint,{method:'PUT',headers:{authorization:'Bearer ' + teacherToken(),'content-type':'application/json'},body:JSON.stringify({id,feedback})}); records.find(record => record.id === id).teacherFeedback = feedback; notice('Devolución guardada. El grupo puede consultarla con su comprobante privado.'); drawRecords(); } catch(error) { notice(error.message); button.disabled = false; }
  }; });
}
function exportRecords() {
  const csv = value => '"' + (/^\s*[=+\-@]/.test(String(value)) ? "'" : '') + String(value ?? '').replaceAll('"','""') + '"';
  const rows = [['Código','Fecha','Sección','Grupo','Integrantes','Caso','Ronda',...Object.values(fields),'Retroalimentación docente']];
  records.forEach(record => record.rounds.forEach((round,i) => rows.push([record.id,record.createdAt,record.section,record.group,record.members.join(' / '),record.caseId,i+1,...Object.keys(fields).map(key => round[key]),record.teacherFeedback])));
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(csv).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download='KIN2002_juego_de_rol.csv'; a.click(); URL.revokeObjectURL(url);
}
function privateReceipt() {
  const match = location.hash.match(/^#comprobante-([a-f0-9-]{36})\.([a-f0-9]{64})$/i);
  $('#app').innerHTML = `<p class='eyebrow'>Comprobante privado del grupo</p><h1>Tu retroalimentación.</h1><p>Este enlace permite consultar la devolución sin mostrar los trabajos de otros grupos. No lo publiques.</p><button id='consult'>Consultar devolución</button><div id='private-result' aria-live='polite'></div><a href='#'>Volver a la actividad</a>`;
  $('#consult').onclick = async () => {
    if (!match) return notice('El enlace de comprobante es inválido.');
    try { const result = await api(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'receipt',id:match[1],token:match[2]})}); $('#private-result').innerHTML = `<div class='card'><h2>${esc(result.status)}</h2><p class='review'>${esc(result.teacherFeedback || 'Aún no hay una devolución docente publicada. Puedes volver a consultar más adelante.')}</p></div>`; }
    catch (error) { notice(error.message); }
  };
}
function render() { notice(''); if (location.hash.startsWith('#comprobante-')) privateReceipt(); else if (location.hash === '#docente') teacher(); else if (!state) setup(); else if (state.sent || state.round >= state.members.length) summary(); else stage(); window.scrollTo({top:0}); }
window.addEventListener('hashchange', render);
render();
