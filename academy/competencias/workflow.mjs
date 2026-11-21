export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function statesMarkup(state) {
 return `<div class="states">${[
  ['Curso completado',state.courseCompleted,'Finalizaste los contenidos y actividades obligatorias. Todavía debes aprobar la evaluación.','Recorrido obligatorio pendiente de verificación.'],
  ['Curso aprobado',state.coursePassed,'Cumpliste los requisitos académicos. El certificado puede estar pendiente de emisión.','Aún no existe una aprobación académica válida.'],
  ['Certificado emitido',state.certificateIssued,'El documento está disponible para consulta o descarga.','Todavía no se ha emitido un certificado válido.'],
 ].map(([title,met,yes,no])=>`<article class="state" data-met="${met===true}"><strong>${title}</strong><p>${met===true?yes:no}</p></article>`).join('')}</div>`;
}
export function summaryMarkup(rows) {
 const stats={Matriculados:rows.length,Completados:rows.filter(r=>r.course_completed).length,Aprobados:rows.filter(r=>r.course_passed).length,
  'Con intentos no aprobados':rows.filter(r=>!r.course_passed&&r.attempts?.some(a=>a.passed===false)).length,
  'Con actividad registrada en 30 días':rows.filter(r=>r.last_activity_at&&Date.parse(r.last_activity_at)>=Date.now()-30*86400000).length,
  'Exámenes enviados':rows.reduce((n,r)=>n+Number(r.exams_submitted||0),0),
  'Certificados pendientes':rows.filter(r=>r.certificate_id&&!r.issued_at&&!r.revoked_at).length,
  'Certificados emitidos vigentes':rows.filter(r=>r.issued_at&&!r.revoked_at).length,
  'Certificados anulados':rows.filter(r=>r.revoked_at).length};
 return `<dl>${Object.entries(stats).map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl><div class="scroll"><table><thead><tr><th>Estudiante</th><th>Curso y versión</th><th>Completado</th><th>Aprobado</th><th>Intentos</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.user_id)}</td><td>${escapeHtml(r.course_slug)}<br>${escapeHtml(r.version)}</td><td>${r.course_completed?'Sí':'No'}</td><td>${r.course_passed?'Sí':'No'}</td><td>${escapeHtml(r.attempts_started)}</td></tr>`).join('')}</tbody></table></div>`;
}
if(typeof document!=='undefined') {
 const notice=document.querySelector('#notice'),student=document.querySelector('#student'),output=document.querySelector('#admin-output');
 let enrollment='',timer;
 const note=(message,error=false)=>{notice.textContent=message;notice.classList.toggle('error',error);notice.focus();};
 async function api(action,payload={}) {
  let session;try{session=JSON.parse(localStorage.getItem('kinecheck_secure_session_v1')||'null');}catch{}
  if(!session?.access_token)throw new Error('Ingresa a Academy para utilizar tu sesión.');
  const response=await fetch('/api/academy-workflow',{method:'POST',cache:'no-store',headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action,payload})});
  const result=await response.json();if(!response.ok)throw new Error(result.message||'Operación no confirmada.');return result;
 }
 function download(value,name) {const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function load() {
  clearInterval(timer);const state=await api('status',{enrollmentId:enrollment});
  student.innerHTML=`<h2>${escapeHtml(state.course)}</h2><p>Versión ${escapeHtml(state.version)}</p>${statesMarkup(state)}<h2>Requisitos antes del examen</h2><p>${escapeHtml(state.instructions)}</p><ul>${(state.criticalRules||[]).map(r=>`<li>${escapeHtml(r)}</li>`).join('')}</ul><p>${escapeHtml(state.passingScore)}/100; máximo ${escapeHtml(state.maxAttempts)} intentos de ${escapeHtml(state.durationMinutes)} minutos. Los intentos iniciados consumen un intento. Al confirmar una etapa, su respuesta queda registrada y se libera información nueva.</p>
   <p>${state.otecActive?'La solicitud de certificado depende también de aprobación y requisitos administrativos.':'Certificación OTEC en preparación. La aprobación no emite un certificado.'}</p>
   <button type="button" id="start" ${!state.courseCompleted||state.coursePassed||!state.assessmentActive?'disabled':''}>Iniciar o reanudar evaluación</button>
   <h2>Historial de intentos</h2><ol>${state.attempts.map(a=>`<li>Intento ${a.attemptNumber}: ${escapeHtml(a.status)} · ${a.score===null?'Sin calificación':`${a.score}/100`} · ${a.passed===true?'Aprobado':a.passed===false?'No aprobado':'Pendiente'}</li>`).join('')}</ol>
   <h2>Resultados por competencia</h2>${state.competencies?.length?`<ul>${state.competencies.map(r=>`<li>${escapeHtml(r.module)} · ${escapeHtml(r.learningOutcome)} · ${escapeHtml(r.competency)}: ${r.points}/${r.maximum}${r.criticalMet===false?' · Competencia crítica no demostrada':''}</li>`).join('')}</ul>`:'<p>Aún no hay una corrección validada.</p>'}
   ${(state.reviews||[]).map(r=>`<section class="feedback"><h3>Retroalimentación de revisión</h3><p>${escapeHtml(r.feedback)}</p>${Object.values(r.grades||{}).map(g=>`<p>${escapeHtml(g.feedback)}</p>`).join('')}</section>`).join('')}
   ${state.certificateIssued&&state.certificate?.url&&/^https:\/\//i.test(state.certificate.url)?`<p><a rel="noopener noreferrer" target="_blank" href="${escapeHtml(state.certificate.url)}">Consultar certificado</a></p>`:''}
   ${state.coursePassed&&state.otecActive&&!state.certificateIssued?'<button type="button" id="request-cert">Solicitar certificado incluido en el curso</button>':''}`;
  document.querySelector('#start')?.addEventListener('click',async event=>{event.target.disabled=true;try{renderAttempt(await api('start',{enrollmentId:enrollment}));}catch(e){note(e.message,true);event.target.disabled=false;}});
  document.querySelector('#request-cert')?.addEventListener('click',async()=>{try{await api('request_certificate',{enrollmentId:enrollment});await load();note('Solicitud registrada. El certificado aún debe ser emitido.');}catch(e){note(e.message,true);}});
 }
 function renderReviewQueue(rows) {
  output.innerHTML=`<h2>Respuestas pendientes de revisión</h2>${rows.length?'':'<p>No hay respuestas pendientes.</p>'}${rows.map((r,index)=>`<form data-review="${index}"><h3>${escapeHtml(r.title)} · versión ${escapeHtml(r.version)}</h3>${r.questions.map(q=>`<fieldset><legend>${escapeHtml(q.prompt)}</legend><p>${escapeHtml(q.context)}</p><blockquote>${escapeHtml(r.answers[q.id])}</blockquote>${q.rubric.map(d=>`<label>${escapeHtml(d.description||d.id)} (máximo ${d.maximum})<input type="number" name="${q.id}:${d.id}" min="0" max="${d.maximum}" step="0.25" required></label>`).join('')}<label for="feedback-${q.id}">Retroalimentación fundamentada</label><textarea id="feedback-${q.id}" name="feedback-${q.id}" required maxlength="3000"></textarea>${q.critical?`<label><input type="checkbox" name="safe-${q.id}"> La respuesta demuestra la competencia crítica de seguridad. Si queda sin marcar, el intento no puede aprobarse.</label>`:''}</fieldset>`).join('')}<label for="review-${index}">Fundamento general de la revisión humana</label><textarea id="review-${index}" name="rationale" required maxlength="5000"></textarea><p>Se evalúa la justificación y se aceptan alternativas defendibles. Los puntajes se calculan en servidor. Al confirmar, la revisión queda registrada y no se sobrescribe; una corrección posterior exige revisión académica.</p><button>Confirmar corrección académica</button></form>`).join('')}`;
  output.querySelectorAll('[data-review]').forEach(form=>form.addEventListener('submit',async event=>{
   event.preventDefault();const r=rows[Number(form.dataset.review)],data=new FormData(form),button=form.querySelector('button');button.disabled=true;
   const grades=Object.fromEntries(r.questions.map(q=>[q.id,{dimensions:Object.fromEntries(q.rubric.map(d=>[d.id,Number(data.get(`${q.id}:${d.id}`))])),feedback:String(data.get(`feedback-${q.id}`)||''),...(q.critical?{safe:data.has(`safe-${q.id}`)}:{})}]));
   try{const result=await api('review',{attemptId:r.id,grades,rationale:String(data.get('rationale')||'')});note(`Revisión registrada: ${result.score}/100. ${result.passed?'Aprobado.':'No aprobado.'}`);renderReviewQueue((await api('review_queue')).rows);}catch(e){note(e.message,true);button.disabled=false;}
  }));
 }
 function renderAttempt(attempt) {
  clearInterval(timer);
  if(attempt.status!=='in_progress'){load().then(()=>note(attempt.status==='expired'?'El plazo terminó. El intento quedó registrado sin aprobación.':'Respuestas enviadas. La aprobación requiere revisión humana.')).catch(e=>note(e.message,true));return;}
  student.innerHTML=`<h2>Etapa ${escapeHtml(attempt.stage.stage)} del caso</h2><p>Paso ${attempt.step} de ${attempt.steps}. Intento ${attempt.attemptNumber}.</p><p class="deadline" id="deadline"></p><form id="answers">${attempt.stage.questions.map(q=>`<fieldset><legend>${escapeHtml(q.prompt)}</legend><p>${escapeHtml(q.context)}</p>${q.kind==='choice'?q.options.map((o,i)=>`<label class="option"><input required type="radio" name="${q.id}" value="${i}"><span>${escapeHtml(o)}</span></label>`).join(''):`<label for="q-${q.id}">Respuesta justificada</label><textarea id="q-${q.id}" name="${q.id}" required maxlength="10000"></textarea><ul class="rubric">${q.rubric.map(r=>`<li>${escapeHtml(r.description||r.id)}: máximo ${r.maximum} puntos</li>`).join('')}</ul>`}</fieldset>`).join('')}<p>Se aceptan alternativas clínicamente defendibles que cumplan la rúbrica. No ingreses datos identificables de pacientes.</p><button>Confirmar etapa y continuar</button></form>`;
  const deadline=document.querySelector('#deadline');const tick=()=>{const seconds=Math.max(0,Math.floor((Date.parse(attempt.deadline)-Date.now())/1000));deadline.textContent=`Tiempo restante: ${Math.floor(seconds/60)} min ${seconds%60} s. El servidor controla el plazo.`;};tick();timer=setInterval(tick,1000);
  document.querySelector('#answers').addEventListener('submit',async event=>{event.preventDefault();const form=event.target,button=form.querySelector('button');button.disabled=true;const data=new FormData(form);const answers=Object.fromEntries(attempt.stage.questions.map(q=>[q.id,q.kind==='choice'?Number(data.get(q.id)):String(data.get(q.id)||'')]));try{renderAttempt(await api('stage',{attemptId:attempt.id,step:attempt.step,answers}));}catch(e){note(e.message,true);button.disabled=false;}});
 }
 document.querySelector('#lookup').addEventListener('submit',async event=>{event.preventDefault();enrollment=document.querySelector('#enrollment').value.trim();try{await load();note('Estado consultado en servidor.');}catch(e){note(e.message,true);}});
 document.querySelectorAll('[data-admin]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;try{const action=button.dataset.admin,result=await api(action);if(action==='review_queue')renderReviewQueue(result.rows);else if(action==='dashboard')output.innerHTML=summaryMarkup(result.rows);else{output.innerHTML='<h2>Análisis descriptivo de preguntas</h2><p>Estos conteos no acreditan validez psicométrica ni discriminación de los ítems.</p><ul>'+result.rows.map(r=>`<li>${escapeHtml(r.module)} · ${escapeHtml(r.learning_outcome)}: ${r.correct_responses}/${r.responses} respuestas correctas.</li>`).join('')+'</ul>';}}catch(e){note(e.message,true);}finally{button.disabled=false;}}));
 document.querySelector('#monthly').addEventListener('submit',async event=>{event.preventDefault();try{const month=document.querySelector('#month').value;download(await api('monthly_report',{month}),`KineCheck-emisiones-${month}.json`);note('Reporte descargado con documentos efectivamente emitidos.');}catch(e){note(e.message,true);}});
}
