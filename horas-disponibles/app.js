const project='kinecheck-comunicacion-clinica.pages.dev';
const isPagesPreview=location.hostname===project||location.hostname.endsWith('.'+project)||['localhost','127.0.0.1'].includes(location.hostname);
const API=isPagesPreview?'https://mhnqtyvwxytppekktvxb.supabase.co':'https://eqhcdclyeoapmqtlduwf.supabase.co';
const KEY=isPagesPreview?'sb_publishable_JLWKq6m0g4yB30iIQLE4bg_AkspSDYD':'sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DECLARATION_VERSION='2026-10-29-v1';
const types=['Consulta particular','Centro médico o centro de salud','Clínica','Hospital','Centro odontológico','Clínica veterinaria','Otro establecimiento'];
const safeBookingUrl=s=>{try{const u=new URL(String(s||''));return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,63}$/i.test(u.hostname)&&!/(^|\.)(localhost|local|internal|invalid|test|example)$/i.test(u.hostname)&&!u.hostname.includes('..')?u.href:null;}catch{return null;}};
const dateText=s=>new Date(s).toLocaleString('es-CL',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Santiago'});
let token=sessionStorage.getItem('kc_health_token')||'',user=null,profile=null,context=null;
let resultsOffset=0,membersOffset=0,institutionSlotsOffset=0,selectedProfessional=null;
const org=()=>$('institutionSelect').value||null;
const isAdmin=()=>['owner','admin'].includes(context?.institutions.find(i=>i.id===org())?.role);
function show(id,visible){$(id).classList.toggle('hidden',!visible);}
async function request(path,{method='GET',body,auth=false}={}){
 const r=await fetch(API+path,{method,headers:{apikey:KEY,...(auth?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json().catch(()=>null);if(!r.ok)throw Error(data?.msg||data?.message||data?.error_description||'No se pudo completar la operación ('+r.status+').');return data;
}
const rpc=(action,payload={})=>request('/rest/v1/rpc/kc_hours_api',{method:'POST',auth:true,body:{action,payload}});
const publicEvent=(slot_id,event)=>request('/rest/v1/rpc/kc_hours_public_event',{method:'POST',body:{slot_id,event}});
const searchFields=['specialty','city','regionFilter','facilityFilter','modalityFilter','timeWindow','dateFilter'];
async function loadSlots(){
 try{
 const rows=await request('/rest/v1/rpc/kc_hours_search',{method:'POST',body:{filters:{specialty:$('specialty').value,comuna:$('city').value,region:$('regionFilter').value,facility_type:$('facilityFilter').value,modality:$('modalityFilter').value,hours:$('timeWindow').value,date:$('dateFilter').value,offset:resultsOffset}}});
 $('results').innerHTML=rows.length?rows.map(x=>'<article class="card"><div class="tag">HORA DISPONIBLE</div><h3>'+esc(x.full_name)+'</h3><p>'+esc(x.profession)+' · '+esc(x.specialty)+'</p>'+(x.institution_name?'<p>'+esc(x.institution_name)+'</p>':'')+'<p>'+esc(x.comuna)+' · '+esc(x.region)+'</p><p>'+esc(dateText(x.starts_at))+'</p><p>'+esc(x.location_text)+' · '+esc(x.modality)+'</p>'+(safeBookingUrl(x.booking_url)?'<a data-contact="'+esc(x.id)+'" href="'+esc(safeBookingUrl(x.booking_url))+'" target="_blank" rel="noopener noreferrer nofollow">Agendar en el centro ↗</a>':'')+'<details><summary>Informar un problema</summary><label>Motivo<select data-report-category><option value="not_available">La hora no está disponible</option><option value="incorrect_information">Información incorrecta</option><option value="suspected_fraud">Posible publicación fraudulenta</option><option value="unsafe_link">Problema con el enlace</option></select></label><button type="button" class="secondary" data-report="'+esc(x.id)+'">Enviar reporte</button><p class="reportMessage" role="status"></p></details></article>').join(''):'<p>No hay horas verificadas disponibles con estos filtros.</p>';
 $('resultsPrevious').disabled=resultsOffset===0;$('resultsNext').disabled=rows.length<24;
 }catch(e){$('results').textContent='No se pudo consultar la disponibilidad. Intenta nuevamente.';}
}
$('results').addEventListener('click',async e=>{
 const link=e.target.closest('[data-contact]');if(link)publicEvent(link.dataset.contact,'contact').catch(()=>{});
 const button=e.target.closest('[data-report]');if(!button)return;button.disabled=true;
 try{await publicEvent(button.dataset.report,button.closest('details').querySelector('select').value);button.closest('details').querySelector('.reportMessage').textContent='Reporte recibido para revisión. No incluyas antecedentes clínicos.';}
 catch(err){button.closest('details').querySelector('.reportMessage').textContent='No se pudo enviar el reporte.';button.disabled=false;}
});
function pilotText(kind,id){const p=context?.pilots.find(p=>p.subject_type===kind&&p.subject_id===id);return p?'Piloto '+(p.state==='expired'?'vencido':p.state==='paused'?'pausado':'activo')+' · Inicio: '+dateText(p.started_at)+' · Vencimiento: '+dateText(p.expires_at)+'. Sin cobros automáticos.':'El piloto de 60 días comienza al activarlo, después de las verificaciones y habilitación del servicio.';}
async function refreshUser(){
 if(!token)return;
 try{
 user=await request('/auth/v1/user',{auth:true});context=await rpc('context');profile=context.profile;
 show('authPanel',false);show('profilePanel',true);show('profileFields',true);show('existingProfileMessage',!!profile);show('accountPanel',true);
 if(profile){$('profileName').value=profile.full_name;$('profileProfession').value=profile.profession;$('publishForm').elements.name.value=profile.full_name;}
 $('responsibilityAccepted').checked=false;
 $('profileBtn').textContent=profile?'Actualizar perfil y confirmar declaración':'Guardar perfil y declaración';
 $('verificationMessage').textContent=profile?(profile.verification_status==='verified'?'Credenciales con verificación independiente registrada.':'Credenciales pendientes de verificación independiente. Las publicaciones están desactivadas.'):'Completa tu perfil y acepta la declaración obligatoria.';
 if(context.accepted)$('verificationMessage').textContent+=' Declaración '+DECLARATION_VERSION+' aceptada y registrada.';
 show('publishForm',profile?.verification_status==='verified'&&profile.is_active&&!profile.is_suspended);show('mySlotsPanel',!!profile);
 $('profileActiveBtn').disabled=!profile;$('profileActiveBtn').textContent=profile?.is_active?'Desactivar perfil':'Reactivar perfil';
 $('professionalPilot').textContent=pilotText('professional',user.id);$('startProfessionalPilot').disabled=!context.release_ready||profile?.verification_status!=='verified'||context.pilots.some(p=>p.subject_type==='professional');
 await Promise.all([loadMySlots(),refreshInstitution(),loadMemberships(),loadModeration()]);
 }catch(e){$('authMessage').textContent=e.message+' Solicita un nuevo enlace si la sesión expiró.';show('authPanel',true);}
}
async function sendLink(email,intent,out){
 if(!email)return;const nonce=crypto.randomUUID();localStorage.setItem('kc_hours_login_flow',JSON.stringify({nonce,created:Date.now()}));sessionStorage.setItem('kc_health_auth_intent',intent);
 const redirect=new URL('/horas-disponibles/',location.origin);redirect.searchParams.set('flow',nonce);
 const invite=sessionStorage.getItem('kc_hours_invite');if(invite)redirect.searchParams.set('invite',invite);
 await request('/auth/v1/otp?redirect_to='+encodeURIComponent(redirect.href),{method:'POST',body:{email,create_user:true}});$(out).textContent='Revisa tu correo y abre el enlace de acceso en este navegador.';
}
for(const [button,input,intent,out] of [['authBtn','authEmail','professional','authMessage'],['institutionAccessBtn','institutionEmail','institution','institutionAuthMessage']])$(button).onclick=async()=>{
 $(button).disabled=true;try{await sendLink($(input).value.trim(),intent,out);}catch(e){$(out).textContent=e.message;}finally{$(button).disabled=false;}
};
$('profileBtn').onclick=async()=>{
 if(!user)return;if(!$('responsibilityAccepted').checked){$('profileMessage').textContent='Debes aceptar la declaración para continuar.';return;}
 const button=$('profileBtn');button.disabled=true;
 try{await rpc('profile',{full_name:$('profileName').value.trim(),profession:$('profileProfession').value.trim(),accepted:true});$('profileMessage').textContent='Perfil y declaración guardados. Cambiar nombre o profesión requiere una nueva verificación independiente.';await refreshUser();}
 catch(e){$('profileMessage').textContent=e.message;}finally{button.disabled=false;}
};
$('profileActiveBtn').onclick=async()=>{try{await rpc('profile_active',{active:!profile.is_active});await refreshUser();await loadSlots();}catch(e){$('accountMessage').textContent=e.message;}};
$('startProfessionalPilot').onclick=async()=>{try{await rpc('start_pilot');await refreshUser();}catch(e){$('accountMessage').textContent=e.message;}};
$('startInstitutionPilot').onclick=async()=>{try{await rpc('start_pilot',{institution_id:org()});await refreshUser();}catch(e){$('institutionMessage').textContent=e.message;}};
$('logoutBtn').onclick=async()=>{try{await request('/auth/v1/logout',{method:'POST',auth:true});}catch{}sessionStorage.removeItem('kc_health_token');location.reload();};
$('institutionForm').onsubmit=async e=>{e.preventDefault();try{await rpc('create_institution',Object.fromEntries(new FormData(e.target)));$('institutionFormMessage').textContent='Institución registrada, pendiente de verificación independiente.';await refreshUser();}catch(err){$('institutionFormMessage').textContent=err.message;}};
async function refreshInstitution(){
 const previous=org();const institutions=context?.institutions||[];show('institutionAuth',!user);show('institutionForm',!!user);show('institutionRegistered',false);show('institutionWorkspace',institutions.length>0);
 $('institutionSelect').innerHTML=institutions.map(i=>'<option value="'+esc(i.id)+'">'+esc(i.public_name)+'</option>').join('');if(institutions.some(i=>i.id===previous))$('institutionSelect').value=previous;
 if(institutions.length)await loadInstitution();
}
async function loadInstitution(){
 if(!org())return;selectedProfessional=null;$('selectedProfessional').textContent='Selecciona un profesional autorizado en el listado.';
 show('institutionAdmin',isAdmin());const inst=context.institutions.find(i=>i.id===org());
 $('institutionState').textContent=inst.public_name+' · '+(inst.verification_status==='verified'?'Verificación independiente registrada':'Verificación institucional pendiente')+' · '+(inst.is_active?'Activa':'Desactivada');
 $('institutionPilot').textContent=pilotText('institution',org());$('startInstitutionPilot').disabled=!isAdmin()||!context.release_ready||inst.verification_status!=='verified'||context.pilots.some(p=>p.subject_id===org());
 $('institutionActiveBtn').disabled=!isAdmin();$('institutionActiveBtn').textContent=inst.is_active?'Desactivar institución':'Reactivar institución';$('inviteRole').querySelector('[value=admin]').disabled=inst.role!=='owner';
 await Promise.all([loadMembers(),loadInstitutionSlots(),isAdmin()?loadInstitutionAdmin():Promise.resolve()]);
}
$('institutionSelect').onchange=()=>{membersOffset=0;institutionSlotsOffset=0;loadInstitution().catch(e=>$('institutionMessage').textContent=e.message);};
$('institutionActiveBtn').onclick=async()=>{try{await rpc('institution_active',{institution_id:org(),active:!context.institutions.find(i=>i.id===org()).is_active});await refreshUser();await loadSlots();}catch(e){$('institutionMessage').textContent=e.message;}};
async function loadMembers(){
 const data=await rpc('members',{institution_id:org(),search:$('memberSearch').value,offset:membersOffset});
 $('institutionMembers').innerHTML=data.rows.map(m=>'<article class="card"><h4>'+esc(m.full_name)+'</h4><p>'+esc(m.profession)+' · '+(m.verification_status==='verified'?'Verificación registrada':'Credenciales pendientes')+'</p><p>Vínculo: '+esc(m.membership_status)+'</p><div class="actions">'+(isAdmin()?'<button type="button" data-member="'+esc(m.professional_id)+'" data-status="'+(m.membership_status==='active'?'revoked':'active')+'">'+(m.membership_status==='active'?'Deshabilitar':'Habilitar')+'</button>':'')+(m.membership_status==='active'?'<button type="button" class="secondary" data-select-professional="'+esc(m.professional_id)+'" data-name="'+esc(m.full_name)+'">Gestionar horas</button>':'')+'</div></article>').join('')||'<p>No hay profesionales autorizados para tu cuenta en esta página.</p>';
 $('memberPage').textContent='Desde '+(membersOffset+1)+' · '+data.rows.length+' en esta página. Total de vínculos autorizados: '+data.total+'.';$('membersPrevious').disabled=membersOffset===0;$('membersNext').disabled=data.rows.length<50;
}
$('institutionMembers').addEventListener('click',async e=>{
 const b=e.target.closest('[data-member],[data-select-professional]');if(!b)return;
 try{if(b.dataset.member){await rpc('member_status',{institution_id:org(),professional_id:b.dataset.member,status:b.dataset.status});await loadInstitution();await loadSlots();}
 else{selectedProfessional=b.dataset.selectProfessional;$('selectedProfessional').textContent='Agenda de '+b.dataset.name;const form=$('institutionPublishForm');show('institutionPublishForm',true);form.scrollIntoView({behavior:'smooth'});}}
 catch(err){$('institutionMessage').textContent=err.message;}
});
$('inviteForm').onsubmit=async e=>{e.preventDefault();try{const data=await rpc('invite',{...Object.fromEntries(new FormData(e.target)),institution_id:org()});const url=new URL('/horas-disponibles/',location.origin);url.searchParams.set('invite',data.token);$('inviteLink').value=url.href;$('inviteMessage').textContent='Invitación destinada a esa cuenta. Se usa una sola vez y vence en 7 días. Comparte el enlace con la persona autorizada.';}catch(err){$('inviteMessage').textContent=err.message;}};
$('copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText($('inviteLink').value);$('inviteMessage').textContent='Enlace copiado.';}catch{$('inviteLink').select();$('inviteMessage').textContent='Selecciona y copia el enlace.';}};
async function loadInstitutionAdmin(){
 const [m,staff,invitations]=await Promise.all([rpc('metrics',{institution_id:org()}),rpc('staff',{institution_id:org()}),rpc('invitations',{institution_id:org()})]);
 $('institutionInvitations').innerHTML=invitations.map(i=>'<p>'+esc(i.email)+' · '+esc(i.role)+' · Vence '+esc(dateText(i.expires_at))+' <button type="button" class="secondary" data-revoke-invitation="'+esc(i.token_hash)+'">Revocar invitación</button></p>').join('')||'<p>Sin invitaciones pendientes.</p>';
 $('institutionMetrics').innerHTML=[['Profesionales habilitados',m.enabled_professionals],['Horas publicadas',m.published],['Disponibles ahora',m.currently_available],['Contactos al agendamiento',m.contacts],['Marcadas como agendadas',m.booked]].map(([name,n])=>'<div class="card"><strong>'+esc(n)+'</strong><p>'+esc(name)+'</p></div>').join('');
 $('institutionStaff').innerHTML=staff.map(s=>'<p>'+esc(s.name)+' · '+(s.role==='secretary'?'Secretaría':'Administración')+' · '+(s.active?'Activo':'Revocado')+(s.active?'<button class="secondary" type="button" data-revoke-staff="'+esc(s.user_id)+'">Revocar permiso</button>':'')+'</p>').join('')||'<p>Aún no hay personal incorporado.</p>';
}
$('institutionStaff').addEventListener('click',async e=>{const b=e.target.closest('[data-revoke-staff]');if(!b)return;try{await rpc('revoke_staff',{institution_id:org(),user_id:b.dataset.revokeStaff});await loadInstitution();}catch(err){$('institutionMessage').textContent=err.message;}});
$('institutionInvitations').addEventListener('click',async e=>{const b=e.target.closest('[data-revoke-invitation]');if(!b)return;try{await rpc('revoke_invitation',{institution_id:org(),token_hash:b.dataset.revokeInvitation});await loadInstitutionAdmin();}catch(err){$('institutionMessage').textContent=err.message;}});
async function loadMemberships(){
 const sections=await Promise.all((context?.memberships||[]).map(async m=>{
 const staff=m.professional_consent?await rpc('staff',{institution_id:m.institution_id}):[];
 return '<article class="card"><h4>'+esc(m.public_name)+'</h4><p>Vínculo: '+esc(m.membership_status)+'</p>'+staff.filter(s=>s.role==='secretary'&&s.active).map(s=>'<p>'+esc(s.name)+' <button type="button" class="secondary" data-delegate="'+esc(s.user_id)+'" data-org="'+esc(m.institution_id)+'" data-active="'+!s.delegated+'">'+(s.delegated?'Revocar gestión de mi agenda':'Autorizar gestión de mi agenda')+'</button></p>').join('')+'<button type="button" class="secondary" data-revoke-membership="'+esc(m.institution_id)+'">Revocar vínculo institucional</button></article>';
 }));$('myMemberships').innerHTML=sections.join('')||'<p>No tienes vínculos institucionales.</p>';
}
$('myMemberships').addEventListener('click',async e=>{const b=e.target.closest('[data-delegate],[data-revoke-membership]');if(!b)return;try{if(b.dataset.delegate)await rpc('delegate',{institution_id:b.dataset.org,user_id:b.dataset.delegate,active:b.dataset.active==='true'});else await rpc('revoke_membership',{institution_id:b.dataset.revokeMembership});await refreshUser();await loadSlots();}catch(err){$('accountMessage').textContent=err.message;}});
function chileDateTime(date,time){
 const [y,m,d]=date.split('-').map(Number),[h,mi]=time.split(':').map(Number);if(!y||!m||!d||!Number.isFinite(h)||!Number.isFinite(mi))return new Date(NaN);
 const target=Date.UTC(y,m-1,d,h,mi),fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});let guess=target;
 for(let i=0;i<3;i++){const p=Object.fromEntries(fmt.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));guess+=target-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);}return new Date(guess);
}
function slotPayload(form){const f=Object.fromEntries(new FormData(form)),starts=chileDateTime(f.date,f.time);if(!safeBookingUrl(f.booking_url))throw Error('Ingresa un enlace HTTPS válido al agendamiento oficial.');if(!types.includes(f.facility_type)||!Number.isFinite(starts.getTime())||starts<=new Date())throw Error('Selecciona un establecimiento y una fecha y hora futuras.');return {specialty:f.specialty,region:f.region,comuna:f.city,starts_at:starts.toISOString(),location_text:f.address,facility_type:f.facility_type,modality:f.modality,public_contact:f.contact,booking_url:safeBookingUrl(f.booking_url)};}
async function publish(form,institution_id=null,professional_id=null){const out=form.querySelector('[role=status]');try{await rpc('save_slot',{...slotPayload(form),institution_id,professional_id});out.textContent='Hora publicada.';form.reset();await loadSlots();if(institution_id)await loadInstitutionSlots();else await loadMySlots();}catch(e){out.textContent=e.message;}}
$('publishForm').onsubmit=e=>{e.preventDefault();publish(e.target);};
// Reuse the existing publication form for authorized institutional agendas.
const institutionalForm=$('publishForm').cloneNode(true);institutionalForm.id='institutionPublishForm';institutionalForm.querySelector('#message').removeAttribute('id');institutionalForm.querySelector('[name=name]').closest('div').remove();$('institutionPublishContainer').append(institutionalForm);
institutionalForm.onsubmit=e=>{e.preventDefault();if(!selectedProfessional){$('institutionMessage').textContent='Selecciona un profesional autorizado.';return;}publish(e.target,org(),selectedProfessional);};
function slotEditor(x){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(x.starts_at)).map(a=>[a.type,a.value]));
 return '<form class="card slotEditor" data-slot-id="'+esc(x.id)+'"><h4>'+esc(x.full_name||profile?.full_name)+'</h4><p>'+esc(x.specialty)+' · '+esc(dateText(x.starts_at))+' · '+(x.is_suspended?'Suspendida':x.status==='active'?'Publicada':'Desactivada')+'</p><div class="grid">'+[['specialty','Especialidad',x.specialty],['city','Comuna',x.comuna],['region','Región',x.region],['address','Dirección',x.location_text],['contact','Contacto público',x.public_contact],['booking_url','Enlace oficial HTTPS',x.booking_url],['date','Fecha',p.year+'-'+p.month+'-'+p.day],['time','Hora',p.hour+':'+p.minute]].map(([name,label,value])=>'<label>'+label+'<input name="'+name+'" type="'+(name==='date'||name==='time'?name:name==='booking_url'?'url':'text')+'" value="'+esc(value)+'" '+(name==='contact'?'':'required')+'></label>').join('')+'<label>Establecimiento<select name="facility_type">'+types.map(t=>'<option'+(x.facility_type===t?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label><label>Modalidad<select name="modality"><option'+(x.modality==='Presencial'?' selected':'')+'>Presencial</option><option'+(x.modality==='Teleconsulta'?' selected':'')+'>Teleconsulta</option></select></label></div><div class="actions">'+(x.status==='active'&&!x.is_suspended?'<button type="submit">Guardar cambios</button><button type="button" class="secondary" data-deactivate>Cancelar hora</button><button type="button" class="secondary" data-booked>Se agendó · Desactivar</button>':'')+'</div><p class="slotMessage" role="status"></p></form>';
}
async function loadMySlots(){if(!profile){$('mySlots').innerHTML='';return;}const rows=await rpc('slots');$('mySlots').innerHTML=rows.map(slotEditor).join('')||'<p>Aún no tienes horas publicadas.</p>';}
async function loadInstitutionSlots(){const rows=await rpc('slots',{institution_id:org(),offset:institutionSlotsOffset});$('institutionSlots').innerHTML=rows.map(slotEditor).join('')||'<p>No hay horas para gestionar en esta página.</p>';$('institutionSlotsPrevious').disabled=institutionSlotsOffset===0;$('institutionSlotsNext').disabled=rows.length<50;}
for(const id of ['mySlots','institutionSlots']){
 $(id).addEventListener('submit',async e=>{const form=e.target.closest('.slotEditor');if(!form)return;e.preventDefault();try{await rpc('save_slot',{...slotPayload(form),slot_id:form.dataset.slotId});form.querySelector('.slotMessage').textContent='Cambios guardados.';await loadSlots();}catch(err){form.querySelector('.slotMessage').textContent=err.message;}});
 $(id).addEventListener('click',async e=>{const b=e.target.closest('[data-deactivate],[data-booked]');if(!b)return;const form=b.closest('.slotEditor');try{await rpc('deactivate_slot',{slot_id:form.dataset.slotId,booked:b.hasAttribute('data-booked')});await (id==='mySlots'?loadMySlots():loadInstitutionSlots());await loadSlots();}catch(err){form.querySelector('.slotMessage').textContent=err.message;}});
}
async function loadModeration(){show('moderationPanel',!!context?.operator);if(!context?.operator)return;const reports=await rpc('reports');$('moderationReports').innerHTML=reports.map(r=>'<p>'+esc(r.category)+' · '+esc(r.day)+' · Reportes: '+r.reports+' <button type="button" class="secondary" data-suspend="'+esc(r.slot_id)+'">Suspender publicación</button></p>').join('')||'<p>Sin denuncias pendientes.</p>';}
$('moderationReports').addEventListener('click',async e=>{const b=e.target.closest('[data-suspend]');if(!b)return;try{await rpc('suspend_slot',{slot_id:b.dataset.suspend});await loadModeration();await loadSlots();}catch(err){$('moderationMessage').textContent=err.message;}});
$('institutionBtn').onclick=()=>{const open=$('institutionPanel').classList.contains('hidden');show('institutionPanel',open);$('institutionBtn').setAttribute('aria-expanded',String(open));if(open)$('institutionPanel').scrollIntoView({behavior:'smooth'});};
$('searchBtn').onclick=()=>$('searchPanel').scrollIntoView({behavior:'smooth'});
$('publishBtn').onclick=()=>{show('publishPanel',true);$('publishPanel').scrollIntoView({behavior:'smooth'});};
$('filterBtn').onclick=()=>{resultsOffset=0;loadSlots();};
$('resultsPrevious').onclick=()=>{resultsOffset=Math.max(0,resultsOffset-24);loadSlots();};$('resultsNext').onclick=()=>{resultsOffset+=24;loadSlots();};
$('membersPrevious').onclick=()=>{membersOffset=Math.max(0,membersOffset-50);loadMembers().catch(e=>$('institutionMessage').textContent=e.message);};$('membersNext').onclick=()=>{membersOffset+=50;loadMembers().catch(e=>$('institutionMessage').textContent=e.message);};$('memberSearchBtn').onclick=()=>{membersOffset=0;loadMembers().catch(e=>$('institutionMessage').textContent=e.message);};
$('institutionSlotsPrevious').onclick=()=>{institutionSlotsOffset=Math.max(0,institutionSlotsOffset-50);loadInstitutionSlots().catch(e=>$('institutionMessage').textContent=e.message);};$('institutionSlotsNext').onclick=()=>{institutionSlotsOffset+=50;loadInstitutionSlots().catch(e=>$('institutionMessage').textContent=e.message);};
$('saveSearchBtn').onclick=()=>{try{localStorage.setItem('kc_health_saved_search_v1',JSON.stringify(Object.fromEntries(searchFields.map(id=>[id,$(id).value]))));$('savedSearchMessage').textContent='Búsqueda guardada en este dispositivo. Sin notificaciones automáticas.';}catch{$('savedSearchMessage').textContent='Este navegador no permite guardar la búsqueda.';}};
$('restoreSearchBtn').onclick=()=>{try{const saved=JSON.parse(localStorage.getItem('kc_health_saved_search_v1')||'null');if(!saved){$('savedSearchMessage').textContent='No hay una búsqueda guardada.';return;}for(const id of searchFields)if(typeof saved[id]==='string')$(id).value=saved[id];resultsOffset=0;loadSlots();}catch{$('savedSearchMessage').textContent='No se pudo recuperar la búsqueda.';}};
$('clearSearchBtn').onclick=()=>{localStorage.removeItem('kc_health_saved_search_v1');$('savedSearchMessage').textContent='Búsqueda guardada eliminada.';};
$('acceptInvite').onclick=async()=>{try{if(!$('joinConsent').checked)throw Error('Acepta el vínculo antes de continuar.');await rpc('accept_invite',{token:sessionStorage.getItem('kc_hours_invite'),consent:true});sessionStorage.removeItem('kc_hours_invite');$('joinMessage').textContent='Invitación aceptada. La institución debe habilitar el vínculo profesional y tú autorizas a cada secretaria.';await refreshUser();}catch(e){$('joinMessage').textContent=e.message;}};
const url=new URL(location.href),hash=new URLSearchParams(location.hash.slice(1));
if(url.searchParams.has('invite')){sessionStorage.setItem('kc_hours_invite',url.searchParams.get('invite'));url.searchParams.delete('invite');history.replaceState(null,'',url.pathname+url.search+url.hash);}
if(sessionStorage.getItem('kc_hours_invite')){show('joinPanel',true);show('publishPanel',true);}
if(hash.has('access_token')){
 let flow;try{flow=JSON.parse(localStorage.getItem('kc_hours_login_flow'));}catch{}
 if(flow&&flow.nonce===url.searchParams.get('flow')&&Date.now()-flow.created<900000){token=hash.get('access_token');sessionStorage.setItem('kc_health_token',token);localStorage.removeItem('kc_hours_login_flow');}
 else $('authMessage').textContent='Solicita un nuevo enlace desde este navegador para continuar.';
 const destination=sessionStorage.getItem('kc_health_auth_intent')==='institution'?'#institutionPanel':'#publishPanel';sessionStorage.removeItem('kc_health_auth_intent');history.replaceState(null,'',location.pathname+destination);show(destination.slice(1),true);
}
for(const id of ['publishPanel','institutionPanel'])if(location.hash==='#'+id)show(id,true);
// Associate all existing visible labels with controls, including the reused form.
for(const form of document.querySelectorAll('form, #authPanel, #profileFields, #institutionAuth'))for(const control of form.querySelectorAll('input,select')){if(!control.id)control.id='hours-field-'+crypto.randomUUID();let label=control.previousElementSibling;if(label?.tagName==='LABEL'&&!label.contains(control))label.htmlFor=control.id;}
loadSlots();refreshUser();
