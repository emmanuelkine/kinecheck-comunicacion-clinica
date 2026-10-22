const API='https://eqhcdclyeoapmqtlduwf.supabase.co';
const KEY='sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=sessionStorage.getItem('kc_health_token')||'', user=null, profile=null;
async function request(path,{method='GET',body,auth=false}={}){
 const r=await fetch(API+path,{method,headers:{apikey:KEY,Authorization:'Bearer '+(auth?token:KEY),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json().catch(()=>null);if(!r.ok)throw Error(data?.msg||data?.message||data?.error_description||'Error '+r.status);return data;
}
async function loadSlots(){
 try{
 const data=await request('/rest/v1/kc_health_slots?select=id,specialty,region,comuna,starts_at,location_text,public_contact&status=eq.active&starts_at=gt.'+encodeURIComponent(new Date().toISOString())+'&order=starts_at.asc&limit=100');
 const specialty=$('specialty').value, city=$('city').value.toLocaleLowerCase('es');
 const rows=data.filter(x=>(!specialty||x.specialty===specialty)&&(!city||x.comuna.toLocaleLowerCase('es').includes(city)));
 $('results').innerHTML=rows.length?rows.map(x=>'<article class="card"><div class="tag">HORA DISPONIBLE</div><h3>'+esc(x.specialty)+'</h3><p>'+esc(x.comuna)+' · '+esc(x.region)+'</p><p>'+esc(new Date(x.starts_at).toLocaleString('es-CL',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Santiago'}))+'</p><p>'+esc(x.location_text)+'</p><p>Contacto directo: '+esc(x.public_contact)+'</p></article>').join(''):'<p>No hay horas verificadas disponibles con estos filtros.</p>';
 }catch(e){$('results').textContent='No se pudo consultar la disponibilidad. Intenta nuevamente.';}
}
async function refreshUser(){
 if(!token)return;
 try{user=await request('/auth/v1/user',{auth:true});const data=await request('/rest/v1/kc_health_professionals?select=full_name,profession,verification_status&user_id=eq.'+user.id,{auth:true});profile=data[0]||null;
 $('authPanel').classList.add('hidden');$('profilePanel').classList.toggle('hidden',!!profile);
 $('verificationMessage').textContent=profile?(profile.verification_status==='verified'?'Identidad profesional verificada. Ya puedes publicar horas.': 'Solicitud recibida. Estado: '+(profile.verification_status==='pending'?'pendiente de revisión':'rechazada')+'. No puedes publicar hasta ser verificado.'):'Completa tu solicitud de verificación.';
 $('publishForm').classList.toggle('hidden',profile?.verification_status!=='verified');
 }catch(e){token='';sessionStorage.removeItem('kc_health_token');$('authMessage').textContent='La sesión expiró. Solicita un nuevo enlace.';}
}
$('authBtn').onclick=async()=>{const email=$('authEmail').value.trim();if(!email)return;$('authBtn').disabled=true;try{await request('/auth/v1/otp',{method:'POST',body:{email,create_user:true,options:{email_redirect_to:location.origin+'/horas-disponibles/#publishPanel'}}});$('authMessage').textContent='Revisa tu correo y abre el enlace de acceso.';}catch(e){$('authMessage').textContent='No se pudo enviar el enlace: '+e.message;}finally{$('authBtn').disabled=false;}};
$('profileBtn').onclick=async()=>{if(!user)return;const name=$('profileName').value.trim(),profession=$('profileProfession').value.trim();if(name.length<3||profession.length<3){$('profileMessage').textContent='Completa nombre y profesión.';return;}try{await request('/rest/v1/kc_health_professionals',{method:'POST',auth:true,body:{user_id:user.id,full_name:name,profession,registration_number:$('profileRegistry').value.trim()||null}});$('profileMessage').textContent='Solicitud enviada. Pendiente de revisión.';await refreshUser();}catch(e){$('profileMessage').textContent='No se pudo registrar: '+e.message;}};
$('publishForm').onsubmit=async e=>{e.preventDefault();if(profile?.verification_status!=='verified')return;const f=Object.fromEntries(new FormData(e.target).entries());const starts=new Date(f.date+'T'+f.time+':00-03:00');if(!Number.isFinite(starts.getTime())||starts<=new Date()){$('message').textContent='Selecciona una fecha y hora futuras.';return;}try{await request('/rest/v1/kc_health_slots',{method:'POST',auth:true,body:{professional_id:user.id,specialty:f.specialty,region:'Región de O’Higgins',comuna:f.city,starts_at:starts.toISOString(),location_text:f.address,public_contact:f.contact}});$('message').textContent='Hora publicada para todos los visitantes.';e.target.reset();loadSlots();}catch(err){$('message').textContent='No se pudo publicar: '+err.message;}};
$('searchBtn').onclick=()=>$('searchPanel').scrollIntoView({behavior:'smooth'});
$('publishBtn').onclick=()=>{$('publishPanel').classList.remove('hidden');$('publishPanel').scrollIntoView({behavior:'smooth'});};
$('filterBtn').onclick=loadSlots;
if(location.hash==='#publishPanel'){$('publishPanel').classList.remove('hidden');setTimeout(()=>$('publishPanel').scrollIntoView(),100);}
if(location.hash==='#searchPanel')setTimeout(()=>$('searchPanel').scrollIntoView(),100);
const hash=new URLSearchParams(location.hash.slice(1));if(hash.has('access_token')){token=hash.get('access_token');sessionStorage.setItem('kc_health_token',token);history.replaceState(null,'',location.pathname+'#publishPanel');$('publishPanel').classList.remove('hidden');}
loadSlots();refreshUser();
