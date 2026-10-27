import { isCampusPreviewHost } from './environment.mjs';
const $ = (s,root=document)=>root.querySelector(s);
const state={catalog:null,context:null,mode:'login',institution:null,case:null,answers:[],refresh:null,workspace:0};
const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
function message(selector,text,bad=false){const el=$(selector);el.textContent=text;el.classList.toggle('error',bad);}
function button(text,handler,secondary=false){const b=node('button',secondary?'secondary':'',text);b.type='button';b.addEventListener('click',handler);return b;}
function link(text,url){const a=node('a','',text);a.href=url;return a;}
async function api(path,body={},retry=true){
 const response=await fetch(`/api/campus/${path}`,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({error:'La respuesta del servidor no es válida.'}));
 if(response.status===401 && retry && path==='action'){
  if(!state.refresh)state.refresh=api('auth/refresh',{},false).finally(()=>{state.refresh=null;});
  await state.refresh;return api(path,body,false);
 }
 if(!response.ok){const error=new Error(data.error||'No se pudo completar la solicitud.');error.status=response.status;throw error;}
 return data;
}
const action=(name,payload={})=>api('action',{action:name,payload});
async function busy(el,target,fn){
 const controls=el.matches('button')?[el]:[...el.querySelectorAll('button')];controls.forEach(b=>b.disabled=true);
 try{await fn();}catch(e){message(target,e.message,true);}finally{controls.forEach(b=>b.disabled=false);}
}
function selectedMembership(){return state.context?.memberships?.find(m=>m.institution_id===state.institution);}
function setMode(mode){
 state.mode=mode;const signup=mode==='signup',recover=mode==='recover';
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
 $('#passwordField').hidden=recover;$('#authForm [name=password]').required=!recover;
 $('#authForm [name=password]').minLength=signup?12:1;$('#authForm [name=password]').autocomplete=signup?'new-password':'current-password';
 $('#privacyCheck').hidden=!signup;$('#authForm [name=accept_privacy]').required=signup;
 $('#authSubmit').textContent=signup?'Crear cuenta gratuita':recover?'Enviar recuperación':'Ingresar';
 $('#authHelp').textContent=signup?'Contraseña de 12 a 128 caracteres. Confirma tu correo para activar el acceso.':recover?'Revisa tu correo y sigue las instrucciones.':'Puedes usar tu correo de KineCheck.';
 message('#authStatus','');
}
async function loadContext(quiet=false){
 try{state.context=await action('context');}catch(e){state.context=null;if(e.status!==401){message('#authStatus',e.message,true);if(!quiet)throw e;}}
 renderAccount();renderProgress();await renderInstitutions();
}
function renderAccount(){
 const signed=Boolean(state.context);$('#signedOut').hidden=signed;$('#signedIn').hidden=!signed;$('#privacyControls').hidden=!signed;
 $('#joinForm button').disabled=!signed;$('#operatorWorkspace').hidden=!state.context?.operator;
 if(!signed)return;
 $('#welcome').textContent=state.context.profile?`Hola, ${state.context.profile.display_name}.`:'Completa tu perfil para guardar el avance.';
 $('#accountEmail').textContent=state.context.email;
 const p=state.context.profile;$('#profileForm [name=display_name]').value=p?.display_name||'';$('#profileForm [name=academic_level]').value=p?.academic_level||1;
 $('#profileForm [name=privacy]').checked=Boolean(p);
}
function renderRoutes(){
 $('#routesGrid').replaceChildren();
 for(const level of state.catalog.levels){
  const item=state.catalog.cases.find(c=>c.id===level.caseId);const card=node('article','card route-card');
  card.append(node('div','route-number',String(level.level).padStart(2,'0')),node('span','tag',level.title),node('h3','',level.focus),node('p','',item.objective),node('p','small',`${item.minutes} minutos orientativos · 3 decisiones`));
  const actions=node('div','actions');actions.append(button('Resolver caso',()=>openCase(item.id)),button('Ver recursos',()=>{$('#resourceLevel').value=level.level;renderResources();$('#recursos').scrollIntoView();},true));card.append(actions);$('#routesGrid').append(card);
 }
 $('#assignmentCase').replaceChildren(...state.catalog.cases.map(c=>{const o=node('option','',`${state.catalog.levels.find(l=>l.level===c.level).title} · ${c.title}`);o.value=c.id;return o;}));
}
function renderResources(){
 const level=Number($('#resourceLevel').value);$('#resourcesGrid').replaceChildren();
 for(const resource of state.catalog.resources.filter(r=>!level||r.levels.includes(level))){const card=node('article','card');card.append(node('span','tag',resource.access),node('h3','',resource.title),link('Abrir recurso original →',resource.url));$('#resourcesGrid').append(card);}
}
function renderProgress(){
 $('#progressGrid').replaceChildren();
 if(!state.context){$('#progressGrid').append(node('p','notice','Ingresa y completa tu perfil para guardar tus próximos intentos. La práctica sin cuenta no se almacena.'));return;}
 for(const item of state.catalog.cases){const progress=state.context.progress.find(p=>p.case_id===item.id);const card=node('article','card progress-card');card.append(node('h3','',item.title));const bar=node('progress');bar.max=100;bar.value=progress?.best_score||0;bar.setAttribute('aria-label',`Mejor resultado en ${item.title}`);card.append(bar,node('p','',progress?`${progress.best_score}% de respuestas correctas · ${progress.attempts} intento(s)`:'Aún no has guardado un intento.'),button(progress?'Volver a practicar':'Comenzar',()=>openCase(item.id),true));$('#progressGrid').append(card);}
}
function openCase(id){
 const item=state.catalog.cases.find(c=>c.id===id);if(!item)return;
 state.case=item;state.answers=[];$('#caseTitle').textContent=item.title;$('#caseLevel').textContent=`${state.catalog.levels.find(l=>l.level===item.level).title} · Caso ficticio`;
 $('#caseObjective').textContent=`Objetivo: ${item.objective}`;$('#caseNarrative').textContent=item.narrative;$('#caseQuestions').replaceChildren();$('#caseFinish').hidden=true;$('#finishCase').disabled=false;message('#caseResult','');
 $('#caseSources').replaceChildren();
 for(const resourceId of item.resources){const resource=state.catalog.resources.find(r=>r.id===resourceId);const li=node('li');li.append(link(resource.title,resource.url));$('#caseSources').append(li);}
 for(const source of item.sources){const li=node('li');li.append(link(source.title,source.url));$('#caseSources').append(li);}
 renderQuestion(0);$('#caseDialog').showModal();$('#caseDialog').scrollTop=0;
}
function renderQuestion(index){
 const item=state.case,question=item.questions[index];const fieldset=node('fieldset','case-step');fieldset.append(node('legend','',`${index+1}. ${question.prompt}`));
 question.options.forEach((option,value)=>{const label=node('label','choice');const input=node('input');input.type='radio';input.name=`question-${index}`;input.value=value;label.append(input,node('span','',option));fieldset.append(label);});
 const feedback=node('div');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 const check=button('Comprobar y continuar',async()=>{
  const selected=$('input:checked',fieldset);if(!selected){feedback.textContent='Selecciona una respuesta antes de continuar.';return;}
  await busy(check,'#caseResult',async()=>{
   const result=await api('question',{case_id:item.id,index,answer:Number(selected.value)});state.answers[index]=Number(selected.value);
   feedback.className=`feedback${result.correct?'':' review'}`;feedback.replaceChildren(node('strong','',result.correct?'Respuesta fundamentada.':'Para revisar.'),node('p','',result.explanation),node('p','small',`Respuesta de referencia: ${result.expected}`));
   fieldset.querySelectorAll('input').forEach(input=>input.disabled=true);check.hidden=true;
   if(index+1<item.questions.length){renderQuestion(index+1);}else{$('#caseFinish').hidden=false;$('#finishCase').textContent=state.context?.profile?'Guardar resultado':'Ver resultado final sin guardar';}
  });
 });fieldset.append(check,feedback);$('#caseQuestions').append(fieldset);
}
async function finishCase(){
 await busy($('#finishCase'),'#caseResult',async()=>{
  const member=selectedMembership();const payload={case_id:state.case.id,answers:state.answers,institution_id:member?.share_metrics?member.institution_id:null};
  const result=state.context?.profile?await action('submit',payload):await api('practice',payload);
  message('#caseResult',`${result.score}% de respuestas correctas. ${result.saved?'Resultado guardado en tu cuenta.':'Práctica finalizada sin guardar. Ingresa y completa tu perfil para conservar tus próximos intentos.'} Revisa las explicaciones y los recursos para reforzar tu aprendizaje.`);
  $('#finishCase').hidden=true;
  if(result.saved)await loadContext();
 });
}
async function renderInstitutions(){
 const previous=state.institution;const members=state.context?.memberships||[];state.institution=members.some(m=>m.institution_id===previous)?previous:members[0]?.institution_id||null;
 $('#institutionWorkspace').hidden=!members.length;$('#institutionSelect').replaceChildren(...members.map(m=>{const o=node('option','',m.name);o.value=m.institution_id;return o;}));
 if(!state.institution)return;$('#institutionSelect').value=state.institution;await loadInstitutionWorkspace();
}
async function loadMetrics(org=state.institution){
 const result=await action('metrics',{institution_id:org});if(state.institution!==org)return;
 const box=$('#metricsPanel');box.replaceChildren();if(result.suppressed){box.append(node('p','notice',result.message));return;}
 const metrics=node('div','metrics');for(const [value,label] of [[result.cohort,'Estudiantes con autorización'],[result.activity,'Estudiantes que practicaron'],[result.average===null?null:`${result.average}%`,'Promedio de respuestas correctas']]){const card=node('div','metric');card.append(node('strong','',value===null?'Reservado':String(value)),node('span','',label));metrics.append(card);}box.append(metrics,node('p','small muted',result.attempts===null?'Resultados reservados hasta reunir 5 participantes.':`${result.attempts} intentos registrados en esta institución. El promedio considera todos esos intentos.`));
}
async function loadInstitutionWorkspace(){
 const ticket=++state.workspace,member=selectedMembership();if(!member)return;const org=member.institution_id;
 $('#institutionRole').textContent=`Tu perfil: ${member.role}.`;$('#shareMetrics').checked=member.share_metrics;$('#teacherWorkspace').hidden=member.role==='estudiante';$('#adminWorkspace').hidden=member.role!=='administrador';
 $('#assignmentsList').replaceChildren();$('#metricsPanel').replaceChildren();$('#membersList').replaceChildren();$('#invitationOutput').replaceChildren();
 $('#inviteRole').replaceChildren(...[['estudiante','Estudiante'],['docente','Docente'],...(state.context.operator?[['administrador','Administrador institucional']]:[])].map(([v,t])=>{const o=node('option','',t);o.value=v;return o;}));
 try{
  const assignments=await action('assignments',{institution_id:org});if(ticket!==state.workspace)return;
  for(const assignment of assignments){const row=node('div','assignment');const text=node('p','',assignment.title);text.append(node('small','',state.catalog.cases.find(c=>c.id===assignment.case_id)?.title||'Caso Campus'));row.append(text,button('Resolver',()=>openCase(assignment.case_id),true));if(member.role!=='estudiante')row.append(button('Cerrar actividad',e=>busy(e.currentTarget,'#institutionStatus',async()=>{await action('close_assignment',{institution_id:org,id:assignment.id});await loadInstitutionWorkspace();}),true));$('#assignmentsList').append(row);}
  if(!assignments.length)$('#assignmentsList').append(node('p','muted','Aún no hay actividades propuestas. Puedes seguir las rutas de aprendizaje.'));
  if(member.role!=='estudiante')await loadMetrics(org);if(ticket!==state.workspace)return;
  if(member.role==='administrador'){
   const members=await action('members',{institution_id:org});if(ticket!==state.workspace)return;
   for(const person of members){const row=node('div','member');const text=node('p','',person.display_name||'Perfil por completar');text.append(node('small','',person.role));row.append(text);if(person.role!=='administrador')row.append(button('Revocar acceso',e=>busy(e.currentTarget,'#institutionStatus',async()=>{await action('revoke',{institution_id:org,user_id:person.user_id});message('#institutionStatus','Acceso revocado. El progreso personal se conserva.');await loadInstitutionWorkspace();}),true));$('#membersList').append(row);}
  }
 }catch(e){if(ticket===state.workspace)message('#institutionStatus',e.message,true);}
}
function onForm(id,target,handler){$(id).addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;busy(form,target,()=>handler(Object.fromEntries(new FormData(form)),form));});}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
onForm('#authForm','#authStatus',async(data,form)=>{const mode=state.mode;const result=await api(`auth/${mode}`,{email:data.email,password:data.password,accept_privacy:form.elements.accept_privacy.checked});form.elements.password.value='';message('#authStatus',result.message||'Sesión iniciada.');if(mode!=='recover')await loadContext(true);});
onForm('#codeForm','#authStatus',async(data)=>{await api('auth/confirm',data);await loadContext();message('#authStatus','Código verificado.');if(data.type==='recovery'){$('#passwordDetails').open=true;$('#newPasswordForm input').focus();}});
onForm('#profileForm','#authStatus',async(data)=>{await action('profile',{display_name:data.display_name,academic_level:Number(data.academic_level),privacy_version:'2026-10-27'});await loadContext();message('#authStatus','Perfil guardado. Ya puedes conservar tus resultados.');});
onForm('#newPasswordForm','#authStatus',async(data,form)=>{await api('auth/password',data);form.reset();message('#authStatus','Contraseña actualizada.');});
$('#logout').addEventListener('click',event=>busy(event.currentTarget,'#authStatus',async()=>{await api('auth/logout');state.context=null;state.workspace++;renderAccount();renderProgress();await renderInstitutions();$('#profileForm').reset();$('#membersList').replaceChildren();$('#invitationOutput').replaceChildren();message('#authStatus','Sesión de Campus cerrada.');}));
$('#resourceLevel').addEventListener('change',renderResources);$('#closeCase').addEventListener('click',()=>$('#caseDialog').close());$('#finishCase').addEventListener('click',finishCase);
onForm('#joinForm','#joinStatus',async(data,form)=>{await action('join',{token:data.token.trim(),share_metrics:form.elements.share_metrics.checked});form.reset();sessionStorage.removeItem('kc_campus_invitation');await loadContext();message('#joinStatus','Cuenta vinculada. Tu progreso personal se conserva.');});
$('#institutionSelect').addEventListener('change',()=>{state.institution=$('#institutionSelect').value;loadInstitutionWorkspace();});
$('#shareMetrics').addEventListener('change',event=>busy($('#institutionWorkspace'),'#institutionStatus',async()=>{await action('consent',{institution_id:state.institution,share_metrics:event.target.checked});await loadContext();message('#institutionStatus','Preferencia de privacidad actualizada.');}));
$('#leaveInstitution').addEventListener('click',event=>busy(event.currentTarget,'#institutionStatus',async()=>{await action('leave',{institution_id:state.institution});await loadContext();message('#institutionStatus','Te desvinculaste. Tu progreso sigue en tu cuenta personal.');}));
$('#refreshMetrics').addEventListener('click',event=>busy(event.currentTarget,'#institutionStatus',()=>loadMetrics()));
onForm('#assignmentForm','#institutionStatus',async(data,form)=>{await action('assign',{...data,institution_id:state.institution});form.reset();await loadInstitutionWorkspace();message('#institutionStatus','Actividad propuesta a los integrantes.');});
onForm('#inviteForm','#institutionStatus',async(data)=>{const result=await action('invite',{...data,institution_id:state.institution});const url=new URL('/campus/',location.origin);url.hash=`invitation=${result.token}`;const a=link(url.href,url.href);a.className='link-output';$('#invitationOutput').replaceChildren(node('p','small','Copia este enlace y entrégalo a la persona invitada. Solo se muestra ahora; vence en 7 días.'),a);});
onForm('#institutionForm','#institutionStatus',async(data,form)=>{const result=await action('create_institution',{name:data.name,authorized:form.elements.authorized.checked});state.institution=result.institution_id;form.reset();await loadContext();message('#institutionStatus','Espacio creado. Invita al administrador institucional desde Administrar accesos.');});
$('#exportProgress').addEventListener('click',event=>busy(event.currentTarget,'#privacyStatus',async()=>{const data=await action('export');const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=link('Descargar',url);a.download='mis-datos-kinecheck-campus.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('#privacyStatus','Descarga preparada.');}));
$('#deleteProgress').addEventListener('click',event=>busy(event.currentTarget,'#privacyStatus',async()=>{if(!$('#confirmDelete').checked)throw new Error('Marca la confirmación para eliminar tus intentos.');await action('delete_progress');$('#confirmDelete').checked=false;await loadContext();message('#privacyStatus','Tus intentos de Campus fueron eliminados.');}));
async function boot(){
 try{
  if(isCampusPreviewHost(location.hostname)){
   const notice=node('p','notice','Entorno de pruebas de Campus. Las cuentas y el avance de esta previsualización están separados de kinecheck.cl. No corresponde a un convenio universitario.');
   $('#contenido').prepend(notice);
  }
  const currentUrl=new URL(location.href),flow=currentUrl.searchParams.get('campus_flow');
  const hash=new URLSearchParams(location.hash.slice(1));const invitation=hash.get('invitation');const refresh=hash.get('refresh_token');
  if(invitation&&/^[a-f0-9]{64}$/.test(invitation))sessionStorage.setItem('kc_campus_invitation',invitation);
  currentUrl.searchParams.delete('campus_flow');
  if(invitation||refresh||flow)history.replaceState({},'',currentUrl.pathname+currentUrl.search);
  const pending=sessionStorage.getItem('kc_campus_invitation');if(pending)$('#joinForm [name=token]').value=pending;
  const response=await fetch('/campus/catalog.json',{cache:'no-store'});if(!response.ok)throw new Error('No se pudo cargar el contenido. Recarga la página.');state.catalog=await response.json();renderRoutes();renderResources();renderProgress();
  if(refresh){try{await api('auth/callback',{refresh_token:refresh,flow});if(hash.get('type')==='recovery')$('#passwordDetails').open=true;}catch(e){message('#authStatus',e.message,true);}}
  await loadContext(true);message('#globalStatus','');
 }catch(e){message('#globalStatus',e.message,true);}
}
boot();
