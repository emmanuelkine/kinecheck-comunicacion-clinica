/* Nómina KIN2002 privada: RLS Supabase + sesión docente KineCheck. */
const rosterStatus=document.getElementById('privateRosterStatus');
const rosterRetry=document.getElementById('retryPrivateRoster');
const rosterSignIn=document.getElementById('signinPrivateRoster');
const privacyNote='La nómina se obtiene desde un servidor privado, solo con una sesión docente autorizada.';
let rosterLoading=false;
let lastRosterSuccess=0;
const verifiedSlots=new Map();
const rosterKey=(section,pair,slot)=>[section,pair,Number(slot)].join('|');
const conf=window.KINECHECK_CONFIG||{};
const base=String(conf.supabaseUrl||'');
const apiKey=String(conf.supabaseAnonKey||'');
const identityKey='kinecheck_secure_session_v1';
function showRosterStatus(message,type='info') {
 if(rosterStatus){rosterStatus.textContent=message;rosterStatus.dataset.state=type;}
}
function safeRead(storage,key) {
 try{const value=JSON.parse(storage.getItem(key)||'null');return value?.access_token?value:null;}catch{return null;}
}
function sessionCandidate(){
 return safeRead(sessionStorage,identityKey)||safeRead(localStorage,identityKey);
}
async function api(path,method,session,body,prefer) {
 const controller=new AbortController();
 const guard=setTimeout(()=>controller.abort(),12000);
 try {
  const reply=await fetch(base+path,{method,mode:'cors',cache:'no-store',signal:controller.signal,
   headers:{apikey:apiKey,authorization:'Bearer '+session.access_token,accept:'application/json',...(body?{'content-type':'application/json'}:{}),...(prefer?{prefer}:{})},
   body:body?JSON.stringify(body):undefined});
  const result=await reply.text();
  let json;try{json=JSON.parse(result);}catch{json=null;}
  if(!reply.ok)throw Error('HTTP '+reply.status);
  return json;
 }finally{clearTimeout(guard);}
}
async function refreshToken(session) {
 if(!session?.refresh_token)return session;
 const exp=Number(session.expires_at||0);
 if(exp&&exp>Date.now()/1000+60)return session;
 const answer=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{
  method:'POST',cache:'no-store',headers:{apikey:apiKey,'content-type':'application/json'},
  body:JSON.stringify({refresh_token:session.refresh_token})});
 if(!answer.ok)throw Error('Sesión vencida; vuelve a ingresar a KineCheck.');
 const replacement=await answer.json();
 const next={...session,...replacement,expires_at:Math.floor(Date.now()/1000)+Number(replacement.expires_in||3600)};
 const currentLocal=safeRead(localStorage,identityKey),currentTab=safeRead(sessionStorage,identityKey);
 if(currentLocal?.access_token===session.access_token)localStorage.setItem(identityKey,JSON.stringify(next));
 if(currentTab?.access_token===session.access_token)sessionStorage.setItem(identityKey,JSON.stringify(next));
 return next;
}
async function loadPrivateRoster(){
 if(rosterLoading)return;
 if(!base.startsWith('https://')||!apiKey){showRosterStatus('Configuración de autenticación no disponible.','error');return;}
 rosterLoading=true;
 rosterRetry.disabled=true;
 showRosterStatus('Verificando acceso docente y recuperando nombres desde la nómina privada…');
 try {
  let session=sessionCandidate();
  if(!session){
   showRosterStatus('Para ver los nombres, primero ingresa con tu cuenta docente de KineCheck.','locked');
   rosterSignIn.hidden=false;return;
  }
  session=await refreshToken(session);
  const user=await api('/auth/v1/user','GET',session);
  if(!user?.id)throw Error('No se pudo verificar la identidad docente.');
  const url='/rest/v1/kc_kin2002_sim_roster?select=section,pair_code,station,slot,student_name&order=section.asc,pair_code.asc,slot.asc';
  const rows=await api(url,'GET',session);
  if(!Array.isArray(rows))throw Error('Respuesta de nómina inválida');
  if(!rows.length){
   showRosterStatus('Tu cuenta está autenticada, pero no tiene autorización para consultar la nómina KIN2002.','locked');
   return;
  }
  const pending=[],conflicts=[];
  verifiedSlots.clear();
  const clean=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  for(const row of rows) {
   verifiedSlots.set(rosterKey(row.section,row.pair_code,row.slot),String(row.student_name||'').trim());
   const g=groups.find(x=>x.section===row.section&&x.id===row.pair_code&&String(x.station)===String(row.station));
   const slot=Number(row.slot)-1;
   if(!g||slot<0||slot>=4||typeof row.student_name!=='string'){conflicts.push('Cupo no encontrado');continue;}while(g.students.length<=slot){const n=g.students.length+1;g.students.push({id:g.id+'-'+n+'-privado',name:'',levels:Array(8).fill(null),note:'',report:null,reportPoints:null,reportFeedback:''});}
   const student=g.students[slot],existing=String(student.name||'').trim(),name=row.student_name.trim();
   if(!existing)pending.push({student,name});
   else if(clean(existing)!==clean(name))conflicts.push(row.pair_code+' · cupo '+row.slot);
  }
  for(const {student,name} of pending)student.name=name;
  renderAll();
  const named=groups.reduce((sum,g)=>sum+g.students.filter(s=>String(s.name||'').trim()).length,0);
  const loadedNames=rows.filter(row=>String(row.student_name||'').trim()).length;
  const status=loadedNames+' registros de nómina privada consultados · '+named+' nombres visibles en este panel.';
  lastRosterSuccess=Date.now();
  showRosterStatus(status+(conflicts.length?' Hay '+conflicts.length+' conflictos de identidad/cupo: no se modificaron nombres discrepantes ni puntajes.':''),'success');
  rosterSignIn.hidden=true;
 }catch(err){
  showRosterStatus('No se pudo acceder a la nómina privada. '+(err?.message||'Error desconocido')+'. Revisa tu sesión docente e inténtalo de nuevo.','error');
 }finally{rosterLoading=false;rosterRetry.disabled=false;}
}
// Save student names only to the protected roster. No browser persistence of names.
async function savePrivateStudentName(group,student,newName,oldName){
 const slot=group.students.indexOf(student)+1;
 const name=String(newName||'').trim().replace(/\s+/g,' ');
 const key=rosterKey(group.section,group.id,slot);
 const rollback=()=>{student.name=oldName;renderAll();};
 if(!/^[\p{L}\p{M}0-9.'’ -]{2,140}$/u.test(name)){rollback();showRosterStatus('Nombre inválido (2 a 140 caracteres). No se guardó.','error');return false;}
 if(!/^[12]$/.test(String(group.station))||!/^P[0-9]{2}$/.test(group.id)||!/^(S1|S2)$/.test(group.section)){rollback();showRosterStatus('Cupo no válido para la nómina privada.','error');return false;}
 try{
  let session=sessionCandidate();
  if(!session)throw Error('Inicia sesión docente de KineCheck para guardar nombres.');
  session=await refreshToken(session);
  const email=String((await api('/auth/v1/user','GET',session))?.email||'').toLowerCase();
  if(!['emmanuelkine@gmail.com','jorge.miranda@docencia.uoh.cl','jmarceloma@gmail.com','constanzaa.correa@pregrado.uoh.cl','emmanuel.zuniga@edu.ipchile.cl'].includes(email))throw Error('Cuenta sin autorización de escritura en nómina.');
  const old=verifiedSlots.get(key);
  if(old===name){student.name=name;renderAll();showRosterStatus('Nombre ya confirmado en la nómina privada.','success');return true;}
  const basePath='/rest/v1/kc_kin2002_sim_roster';
  const query='?section=eq.'+encodeURIComponent(group.section)+'&pair_code=eq.'+encodeURIComponent(group.id)+'&slot=eq.'+slot;
  const row={section:group.section,pair_code:group.id,station:Number(group.station),slot,student_name:name,day_label:String(group.day||''),time_label:String(group.time||'')};
  if(old!==undefined){
   if(!confirm('¿Actualizar el nombre del cupo '+group.id+'-'+slot+' en la nómina privada? Se conservarán los puntajes.')){rollback();return false;}
   const updated=await api(basePath+query+'&student_name=eq.'+encodeURIComponent(old),'PATCH',session,{student_name:name},'return=representation');
   if(!Array.isArray(updated)||updated.length!==1)throw Error('Otro usuario modificó este cupo. Actualiza la nómina y reintenta.');
  }else{
   const created=await api(basePath,'POST',session,row,'return=representation');
   if(!Array.isArray(created)||created.length!==1)throw Error('No se pudo verificar la creación del cupo.');
  }
  verifiedSlots.set(key,name);
  student.name=name;
  renderAll();
  showRosterStatus('Nombre guardado en nómina privada: '+group.section+' '+group.id+' cupo '+slot+'. Los puntajes no se modificaron.','success');
  return true;
 }catch(err){
  rollback();
  showRosterStatus('No se guardó el nombre: '+String(err?.message||err)+'. Se restauró el nombre anterior; los puntajes no cambiaron.','error');
  return false;
 }
}
window.KineCheckRosterSaveName=savePrivateStudentName;

rosterRetry?.addEventListener('click',loadPrivateRoster);
if(rosterSignIn)rosterSignIn.href='/academy/';
loadPrivateRoster();
// Los nombres se almacenan únicamente en la base privada y se recuperan al volver al panel.
// Si la pestaña se reanuda y faltan nombres, reintentar con sesión docente; jamás guardar nombres en localStorage.
function retryMissingRoster(){
 if(rosterLoading || Date.now()-lastRosterSuccess<30000 || !sessionCandidate())return;
 if(groups.some(g=>g.students.some(s=>!String(s.name||'').trim())))void loadPrivateRoster();
}
window.addEventListener('pageshow',event=>{if(event.persisted)retryMissingRoster();});
window.addEventListener('focus',retryMissingRoster);
window.addEventListener('online',retryMissingRoster);