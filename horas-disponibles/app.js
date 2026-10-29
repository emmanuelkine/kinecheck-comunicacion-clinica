const isPagesPreview=location.hostname.endsWith('.pages.dev');
const API=isPagesPreview?'https://mhnqtyvwxytppekktvxb.supabase.co':'https://eqhcdclyeoapmqtlduwf.supabase.co';
const KEY=isPagesPreview?'sb_publishable_JLWKq6m0g4yB30iIQLE4bg_AkspSDYD':'sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_';
const $=id=>document.getElementById(id);
const norm=s=>String(s??'').trim().toLocaleLowerCase('es');
// Dedicated facility_type and modality columns; legacy KCLOC records remain readable.
const types=["Consulta particular","Centro médico o centro de salud","Clínica","Hospital","Centro odontológico","Clínica veterinaria","Otro establecimiento"];
const DECLARATION_VERSION='2026-10-29-v1';
const parseLocation=s=>{const m=String(s||'').match(/^\[KCLOC:([^|\]]+)\|([^\]]+)\] (.*)$/s);return m?{facility:m[1],modality:m[2],address:m[3]}:{facility:'No especificado',modality:'No especificada',address:String(s||'')};};
const slotLocation=x=>{const legacy=parseLocation(x.location_text);return {facility:x.facility_type||legacy.facility,modality:x.modality||legacy.modality,address:legacy.address};};
const safeBookingUrl=s=>{try{const u=new URL(String(s||''));return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')?u.href:null;}catch{return null;}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=sessionStorage.getItem('kc_health_token')||'', user=null, profile=null;
async function request(path,{method='GET',body,auth=false}={}){
 const r=await fetch(API+path,{method,headers:{apikey:KEY,Authorization:'Bearer '+(auth?token:KEY),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json().catch(()=>null);if(!r.ok)throw Error(data?.msg||data?.message||data?.error_description||'Error '+r.status);return data;
}
async function loadSlots(){
 try{
 const data=await request('/rest/v1/kc_health_slots?select=id,specialty,region,comuna,starts_at,location_text,facility_type,modality,public_contact,booking_url,expires_at&status=eq.active&starts_at=gt.'+encodeURIComponent(new Date().toISOString())+'&order=starts_at.asc&limit=100');
 const specialty=norm($('specialty').value), city=norm($('city').value), region=norm($('regionFilter').value), facility=$('facilityFilter').value, modality=$('modalityFilter').value;
 const windowHours=Number($('timeWindow').value)||0; const now=Date.now();
 const rows=data.filter(x=>(!windowHours||new Date(x.starts_at).getTime()<=now+windowHours*3600000)&&(!x.expires_at||new Date(x.expires_at)>new Date())&&(!specialty||norm(x.specialty).includes(specialty))&&(!city||norm(x.comuna).includes(city))&&(!region||norm(x.region).includes(region))&&(!facility||slotLocation(x).facility===facility)&&(!modality||slotLocation(x).modality===modality));
 $('results').innerHTML=rows.length?rows.map(x=>'<article class="card"><div class="tag">HORA DISPONIBLE</div><h3>'+esc(x.specialty)+'</h3><p>'+esc(x.comuna)+' · '+esc(x.region)+'</p><p>'+esc(new Date(x.starts_at).toLocaleString('es-CL',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Santiago'}))+'</p><p>'+esc(slotLocation(x).address)+'</p><p>Reserva y confirma en el sistema oficial.</p>'+(safeBookingUrl(x.booking_url)?'<p><a href="'+esc(safeBookingUrl(x.booking_url))+'" target="_blank" rel="noopener noreferrer nofollow">Agendar en el centro ↗</a></p>':'<p>Enlace de reserva pendiente.</p>')+'</article>').join(''):'<p>No hay horas verificadas disponibles con estos filtros.</p>';
 }catch(e){$('results').textContent='No se pudo consultar la disponibilidad. Intenta nuevamente.';}
}
async function refreshUser(){
 if(!token)return;
 try{user=await request('/auth/v1/user',{auth:true});const [data,acceptances]=await Promise.all([
  request('/rest/v1/kc_health_professionals?select=full_name,profession,verification_status&user_id=eq.'+user.id,{auth:true}),
  request('/rest/v1/kc_health_responsibility_acceptances?select=user_id&user_id=eq.'+user.id,{auth:true})
 ]);profile=data[0]||null;const accepted=acceptances.some(x=>x.user_id===user.id);
 $('authPanel').classList.add('hidden');$('profilePanel').classList.toggle('hidden',accepted);
 $('profileFields').classList.toggle('hidden',!!profile);$('existingProfileMessage').classList.toggle('hidden',!profile);
 $('verificationMessage').textContent=profile?(profile.verification_status==='verified'?'El sistema registra una verificación independiente de credenciales.':profile.verification_status==='pending'?'Tu perfil está pendiente. KineCheck no ha comprobado tus credenciales y no habilita publicaciones sin una validación independiente.':'No se pudo confirmar la habilitación; las publicaciones están desactivadas.'):'Completa los datos mínimos. La declaración de responsabilidad es obligatoria antes de continuar.';
 if(accepted)$('verificationMessage').textContent+=' Declaración aceptada y registrada.';
 $('profileBtn').textContent=profile?'Aceptar declaración':'Guardar perfil y declaración';
 $('profileBtn').dataset.accepted=String(accepted);
 $('publishForm').classList.toggle('hidden',profile?.verification_status!=='verified');
 $('mySlotsPanel').classList.toggle('hidden',profile?.verification_status!=='verified');
 if(profile?.verification_status==='verified')loadMySlots();
 await refreshInstitution();
 }catch(e){token='';sessionStorage.removeItem('kc_health_token');$('authMessage').textContent='La sesión expiró. Solicita un nuevo enlace.';}
}
async function refreshInstitution(){
 if(!user)return;
 try{
  const rows=await request('/rest/v1/kc_health_institutions?select=id,public_name,verification_status&owner_user_id=eq.'+encodeURIComponent(user.id)+'&order=created_at.desc&limit=10',{auth:true});
  $('institutionAuth').classList.add('hidden');
  $('institutionForm').classList.toggle('hidden',rows.length>0);
  $('institutionRegistered').classList.toggle('hidden',rows.length===0);
  $('institutionRegistered').textContent=rows.length?'Institución registrada: '+rows.map(x=>x.public_name+' ('+(x.verification_status==='pending'?'verificación pendiente':x.verification_status)+')').join(', ')+'. La publicación institucional permanece deshabilitada.':'';
 }catch(e){$('institutionFormMessage').textContent='No fue posible consultar el registro institucional.';}
}
$('institutionAccessBtn').onclick=async()=>{
 const email=$('institutionEmail').value.trim();if(!email)return;sessionStorage.setItem('kc_health_auth_intent','institution');
 $('institutionAccessBtn').disabled=true;
 try{await request('/auth/v1/otp?redirect_to='+encodeURIComponent(new URL('/horas-disponibles/#institutionPanel',location.origin).toString()),{method:'POST',body:{email,create_user:true}});$('institutionAuthMessage').textContent='Revisa tu correo y abre el enlace de acceso.';}
 catch(e){$('institutionAuthMessage').textContent='No se pudo enviar el enlace: '+e.message;}
 finally{$('institutionAccessBtn').disabled=false;}
};
$('institutionForm').onsubmit=async e=>{
 e.preventDefault();if(!user)return;
 const f=Object.fromEntries(new FormData(e.target).entries());
 try{await request('/rest/v1/kc_health_institutions',{method:'POST',auth:true,body:{...f,owner_user_id:user.id}});
 $('institutionFormMessage').textContent='Registro recibido. Permanecerá pendiente de verificación institucional.';await refreshInstitution();}
 catch(err){$('institutionFormMessage').textContent='No se pudo registrar la institución: '+err.message;}
};
$('authBtn').onclick=async()=>{const email=$('authEmail').value.trim();if(!email)return;$('authBtn').disabled=true;try{const redirectTo=new URL('/horas-disponibles/',location.origin).toString();await request('/auth/v1/otp?redirect_to='+encodeURIComponent(redirectTo),{method:'POST',body:{email,create_user:true}});$('authMessage').textContent='Revisa tu correo y abre el enlace de acceso.';}catch(e){$('authMessage').textContent='No se pudo enviar el enlace: '+e.message;}finally{$('authBtn').disabled=false;}};
$('profileBtn').onclick=async()=>{if(!user)return;if(!$('responsibilityAccepted').checked){$('profileMessage').textContent='Debes aceptar la declaración para continuar.';return;}const name=$('profileName').value.trim(),profession=$('profileProfession').value.trim();if(!profile&&(name.length<3||profession.length<3)){$('profileMessage').textContent='Completa nombre y profesión.';return;}const button=$('profileBtn');button.disabled=true;try{if(!profile)await request('/rest/v1/kc_health_professionals',{method:'POST',auth:true,body:{user_id:user.id,full_name:name,profession}});await request('/rest/v1/kc_health_responsibility_acceptances',{method:'POST',auth:true,body:{user_id:user.id,accepted:true,declaration_version:DECLARATION_VERSION}});$('profileMessage').textContent='Declaración registrada. La verificación de credenciales y la habilitación para publicar son procesos distintos.';await refreshUser();}catch(e){$('profileMessage').textContent='No se pudo guardar. Si el perfil ya se creó, vuelve a aceptar la declaración para completar el registro.';}finally{button.disabled=false;}};
$('publishForm').onsubmit=async e=>{e.preventDefault();if(profile?.verification_status!=='verified')return;const f=Object.fromEntries(new FormData(e.target).entries());const starts=chileDateTime(f.date,f.time);if(!safeBookingUrl(f.booking_url)){$('message').textContent='Ingresa un enlace HTTPS válido al sistema oficial de agendamiento.';return;}if(!types.includes(f.facility_type)){$('message').textContent='Selecciona un tipo de establecimiento válido.';return;}if(!Number.isFinite(starts.getTime())||starts<=new Date()){$('message').textContent='Selecciona una fecha y hora futuras.';return;}try{await request('/rest/v1/kc_health_slots',{method:'POST',auth:true,body:{professional_id:user.id,specialty:f.specialty,region:f.region,comuna:f.city,starts_at:starts.toISOString(),location_text:f.address,facility_type:f.facility_type,modality:f.modality,public_contact:f.contact,booking_url:safeBookingUrl(f.booking_url),expires_at:starts.toISOString()}});$('message').textContent='Hora publicada para todos los visitantes.';e.target.reset();loadSlots();}catch(err){$('message').textContent='No se pudo publicar: '+err.message;}};

function chileDateTime(date,time){
 const [y,m,d]=date.split('-').map(Number),[h,mi]=time.split(':').map(Number);
 if(!y||!m||!d||!Number.isFinite(h)||!Number.isFinite(mi))return new Date(NaN);
 const target=Date.UTC(y,m-1,d,h,mi),fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 let guess=target;
 for(let i=0;i<3;i++){const p=Object.fromEntries(fmt.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));const represented=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);guess+=target-represented;}
 return new Date(guess);
}
async function loadMySlots(){
 try{
  const rows=await request('/rest/v1/kc_health_slots?select=id,specialty,comuna,starts_at,location_text,facility_type,modality,public_contact,booking_url,status&professional_id=eq.'+encodeURIComponent(user.id)+'&order=starts_at.asc&limit=100',{auth:true});
  $('mySlots').innerHTML=rows.length?rows.map(x=>{
   const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(x.starts_at));
   const p=Object.fromEntries(parts.map(a=>[a.type,a.value])),date=p.year+'-'+p.month+'-'+p.day,time=p.hour+':'+p.minute,loc=slotLocation(x);
   return '<form class="card slotEditor" data-slot-id="'+esc(x.id)+'" data-slot-status="'+esc(x.status)+'"><div class="tag">'+(x.status==='active'?'PUBLICADA':'DESACTIVADA')+'</div><div class="grid"><div><label>Profesión o especialidad</label><input name="specialty" maxlength="120" required value="'+esc(x.specialty)+'"></div><div><label>Comuna</label><input name="city" maxlength="100" required value="'+esc(x.comuna)+'"></div><div><label>Fecha</label><input name="date" type="date" required value="'+date+'"></div><div><label>Hora (Chile)</label><input name="time" type="time" required value="'+time+'"></div><div><label>Tipo de establecimiento</label><select name="facility_type" required>'+(types.includes(loc.facility)?'':'<option value="" selected disabled>Selecciona el establecimiento (dato anterior no registrado)</option>')+types.map(t=>'<option value="'+esc(t)+'"'+(loc.facility===t?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></div><div><label>Modalidad</label><select name="modality" required>'+(loc.modality==='Presencial'||loc.modality==='Teleconsulta'?'':'<option value="" selected disabled>Selecciona la modalidad (dato anterior no registrado)</option>')+'<option value="Presencial"'+(loc.modality==='Presencial'?' selected':'')+'>Presencial</option><option value="Teleconsulta"'+(loc.modality==='Teleconsulta'?' selected':'')+'>Teleconsulta</option></select></div><div><label>Dirección</label><input name="address" maxlength="200" required value="'+esc(loc.address)+'"></div><div><label>Contacto público</label><input name="contact" maxlength="180" required value="'+esc(x.public_contact)+'"></div><div><label>Enlace oficial HTTPS</label><input name="booking_url" type="url" maxlength="1500" required value="'+esc(x.booking_url||'')+'"></div></div><div class="actions"><button type="submit">Guardar cambios</button>'+(x.status==='active'?'<button class="secondary" type="button" data-deactivate>Desactivar hora</button>':'')+'</div><p class="slotMessage" role="status"></p></form>';
  }).join(''):'<p>Aún no tienes horas publicadas.</p>';
 }catch(e){$('mySlots').textContent='No se pudo cargar tu disponibilidad.';}
}
$('mySlots').addEventListener('submit',async e=>{
 const form=e.target.closest('.slotEditor');if(!form)return;e.preventDefault();
 if(profile?.verification_status!=='verified')return;
 const f=Object.fromEntries(new FormData(form).entries()),starts=chileDateTime(f.date,f.time),out=form.querySelector('.slotMessage');
 if(!safeBookingUrl(f.booking_url)){out.textContent='Ingresa un enlace HTTPS válido al sistema de agendamiento.';return;}if(!types.includes(f.facility_type)||!['Presencial','Teleconsulta'].includes(f.modality)){out.textContent='Debes seleccionar explícitamente el establecimiento y la modalidad para esta hora.';return;}if(!Number.isFinite(starts.getTime())||starts<=new Date()){out.textContent='Selecciona una fecha y hora futuras.';return;}
 try{await request('/rest/v1/kc_health_slots?id=eq.'+encodeURIComponent(form.dataset.slotId)+'&professional_id=eq.'+encodeURIComponent(user.id),{method:'PATCH',auth:true,body:{specialty:f.specialty,comuna:f.city,starts_at:starts.toISOString(),location_text:f.address,facility_type:f.facility_type,modality:f.modality,public_contact:f.contact,booking_url:safeBookingUrl(f.booking_url),expires_at:starts.toISOString(),status:form.dataset.slotStatus}});out.textContent='Cambios guardados.';loadSlots();}
 catch(err){out.textContent='No se pudo guardar: '+err.message;}
});
$('mySlots').addEventListener('click',async e=>{
 const button=e.target.closest('[data-deactivate]');if(!button)return;
 const form=button.closest('.slotEditor');if(profile?.verification_status!=='verified'||!form)return;
 try{await request('/rest/v1/kc_health_slots?id=eq.'+encodeURIComponent(form.dataset.slotId)+'&professional_id=eq.'+encodeURIComponent(user.id),{method:'PATCH',auth:true,body:{status:'inactive'}});await loadMySlots();loadSlots();}
 catch(err){form.querySelector('.slotMessage').textContent='No se pudo desactivar: '+err.message;}
});
$('searchBtn').onclick=()=>$('searchPanel').scrollIntoView({behavior:'smooth'});
$('publishBtn').onclick=()=>{$('publishPanel').classList.remove('hidden');$('publishPanel').scrollIntoView({behavior:'smooth'});};
$('filterBtn').onclick=loadSlots;
const searchFields=['specialty','city','regionFilter','facilityFilter','modalityFilter','timeWindow'];
$('saveSearchBtn').onclick=()=>{
 try{localStorage.setItem('kc_health_saved_search_v1',JSON.stringify(Object.fromEntries(searchFields.map(id=>[id,$(id).value]))));$('savedSearchMessage').textContent='Búsqueda guardada en este dispositivo. No se enviarán alertas ni notificaciones automáticas.';}
 catch{$('savedSearchMessage').textContent='Este navegador no permite guardar la búsqueda.';}
};
$('restoreSearchBtn').onclick=()=>{
 try{const saved=JSON.parse(localStorage.getItem('kc_health_saved_search_v1')||'null');if(!saved){$('savedSearchMessage').textContent='No hay una búsqueda guardada.';return;}searchFields.forEach(id=>{if(typeof saved[id]!=='string')return;const el=$(id);if(!el.options||Array.from(el.options).some(o=>o.value===saved[id]))el.value=saved[id];});$('savedSearchMessage').textContent='Búsqueda recuperada. Mostrando resultados actuales.';loadSlots();}
 catch{$('savedSearchMessage').textContent='No se pudo recuperar la búsqueda.';}
};
$('clearSearchBtn').onclick=()=>{try{localStorage.removeItem('kc_health_saved_search_v1');$('savedSearchMessage').textContent='Búsqueda guardada eliminada de este dispositivo.';}catch{$('savedSearchMessage').textContent='No se pudo eliminar la búsqueda.';}};

if(location.hash==='#publishPanel'){$('publishPanel').classList.remove('hidden');setTimeout(()=>$('publishPanel').scrollIntoView(),100);}
if(location.hash==='#institutionPanel'){$('institutionPanel').classList.remove('hidden');setTimeout(()=>$('institutionPanel').scrollIntoView(),100);}
if(location.hash==='#searchPanel')setTimeout(()=>$('searchPanel').scrollIntoView(),100);
const hash=new URLSearchParams(location.hash.slice(1));if(hash.has('access_token')){token=hash.get('access_token');sessionStorage.setItem('kc_health_token',token);const destination=sessionStorage.getItem('kc_health_auth_intent')==='institution'?'#institutionPanel':'#publishPanel';sessionStorage.removeItem('kc_health_auth_intent');history.replaceState(null,'',location.pathname+destination);if(destination==='#institutionPanel')$('institutionPanel').classList.remove('hidden');else $('publishPanel').classList.remove('hidden');}
loadSlots();refreshUser();
