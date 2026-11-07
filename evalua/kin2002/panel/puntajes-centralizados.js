/* KIN2002 · persistencia privada de simulación, independiente de notas de informe.
 * No se almacenan nombres en este módulo ni se migran notas existentes automáticamente.
 * Revision + filtro CAS evitan sobreescrituras entre docentes. */
(() => {
'use strict';
const label=document.getElementById('centralScoresStatus');
const refreshButton=document.getElementById('centralScoresRefresh');
const migrateButton=document.getElementById('centralScoresMigrate');
const resolveButton=document.getElementById('centralScoresResolve');
const config=window.KINECHECK_CONFIG||{};
const base=String(config.supabaseUrl||'');
const anon=String(config.supabaseAnonKey||'');
const TOKEN='kinecheck_secure_session_v1';
const route='/rest/v1/kc_kin2002_sim_scores';
const staff=new Set(['emmanuelkine@gmail.com','jorge.miranda@docencia.uoh.cl','jmarceloma@gmail.com','constanzaa.correa@pregrado.uoh.cl']);
const revisions=new Map(),conflicts=new Set(),legacy=new Set(),queues=new Map();
let ready=false,fetching=false,lastFetch=0;
const dirtyLocal=new Set();
const key=(g,slot)=>[g.section,g.id,slot].join('|');
function status(msg,kind='info'){if(label){label.textContent=msg;label.dataset.state=kind;label.style.color=kind==='error'?'#ffd18b':kind==='success'?'#a5ffcf':'#c3e9ed';}}
function session(){try{return JSON.parse(sessionStorage.getItem(TOKEN)||localStorage.getItem(TOKEN)||'null')}catch{return null}}
async function auth(){
 if(!base.startsWith('https://')||!anon)throw Error('Configuración de KineCheck incompleta');
 let current=session();
 if(!current?.access_token)throw Error('Inicia sesión docente de KineCheck');
 if(current.expires_at&&Number(current.expires_at)<Date.now()/1000+60){
  if(typeof refreshToken!=='function')throw Error('Vuelve a iniciar sesión docente');
  current=await refreshToken(current);
 }
 const reply=await fetch(base+'/auth/v1/user',{headers:{apikey:anon,authorization:'Bearer '+current.access_token},cache:'no-store'});
 if(!reply.ok)throw Error('Sesión docente no válida ('+reply.status+')');
 const user=await reply.json();
 if(!user?.id||!staff.has(String(user.email||'').toLowerCase()))throw Error('Cuenta no autorizada para KIN2002');
 return current;
}
async function request(method,path,body){
 const current=await auth();
 const headers={apikey:anon,authorization:'Bearer '+current.access_token,accept:'application/json'};
 if(body!==undefined){headers['content-type']='application/json';headers.prefer='return=representation';}
 const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 if(!response.ok){
  const detail=await response.json().catch(()=>({}));
  throw Error('Servidor '+response.status+(detail.code?' ('+detail.code+')':''));
 }
 return await response.json();
}
const validLevels=a=>Array.isArray(a)&&a.length===8&&a.every(n=>n===null||(Number.isInteger(n)&&n>=0&&n<=4));
const dataOf=s=>({levels:[...s.levels],note:String(s.note||'').slice(0,3000)});
const empty=s=>s.levels.every(v=>v===null||v===undefined)&&!String(s.note||'').trim();
const equal=(s,r)=>JSON.stringify(dataOf(s).levels)===JSON.stringify(r.levels)&&dataOf(s).note===String(r.note||'');
function seat(k){
 for(const g of groups)for(let i=0;i<g.students.length;i++)if(key(g,i+1)===k)return {g,s:g.students[i],slot:i+1};
 return null;
}
function syncCounts(){
 if(!ready)return;
 status('Sincronización activa · '+revisions.size+' registros en servidor · '+legacy.size+' respaldos locales por migrar · '+conflicts.size+' diferencias por revisar · '+dirtyLocal.size+' cambios pendientes.',
  conflicts.size?'error':legacy.size?'info':'success');
 if(migrateButton)migrateButton.disabled=!legacy.size;
 if(resolveButton)resolveButton.disabled=!conflicts.size;
}
async function refresh(){
 if(fetching||queues.size)return;
 fetching=true;ready=false;
 if(refreshButton)refreshButton.disabled=true;
 status('Verificando sesión y recuperando evaluaciones desde Supabase…');
 try{
  const rows=await request('GET',route+'?select=section,pair_code,slot,levels,note,revision,modified_by&order=section.asc,pair_code.asc,slot.asc');
  if(!Array.isArray(rows))throw Error('Respuesta de evaluaciones no válida');
  revisions.clear();conflicts.clear();legacy.clear();
  for(const r of rows){
   const k=[r.section,r.pair_code,Number(r.slot)].join('|'),target=seat(k);
   if(!target||!validLevels(r.levels))continue;
   revisions.set(k,Number(r.revision));
   if(equal(target.s,r)&&!dirtyLocal.has(k))continue;
   if(empty(target.s)&&!dirtyLocal.has(k)){
    target.s.levels=[...r.levels];target.s.note=String(r.note||'');
   }else{
    conflicts.add(k);
   }
  }
  for(const g of groups)g.students.forEach((s,i)=>{
   const k=key(g,i+1);if(!revisions.has(k)&&!empty(s))legacy.add(k);
  });
  ready=true;lastFetch=Date.now();
  save();renderAll();syncCounts();
 }catch(e){
  ready=false;
  status('No se pueden sincronizar evaluaciones: '+(e?.message||String(e))+'. Los cambios locales no se borraron. Exporta un respaldo JSON.','error');
 }finally{fetching=false;if(refreshButton)refreshButton.disabled=false;}
}
async function submit(k){
 const target=seat(k);if(!target)throw Error('Cupo inexistente');
 if(!validLevels(target.s.levels))throw Error('Niveles fuera de rango: el servidor no recibió el cambio');
 if(conflicts.has(k))throw Error('Conflicto no resuelto con la evaluación del servidor. Usa «Actualizar puntajes»');
 if(legacy.has(k))throw Error('Este cupo contiene puntajes antiguos locales: migra el respaldo antes de editarlo en el servidor');
 const payload=dataOf(target.s);
 const common={levels:payload.levels,note:payload.note,updated_at:new Date().toISOString()};
 // El servidor toma modified_by del JWT; el cliente envía el UID comprobado más abajo.
 const current=await auth();
 const u=await fetch(base+'/auth/v1/user',{headers:{apikey:anon,authorization:'Bearer '+current.access_token},cache:'no-store'});
 if(!u.ok)throw Error('La sesión docente venció');
 const uid=(await u.json()).id;
 const update={levels:common.levels,note:common.note,modified_by:uid,updated_at:common.updated_at};
 const rev=revisions.get(k);
 let returned;
 if(rev===undefined){
  returned=await request('POST',route,{section:target.g.section,pair_code:target.g.id,slot:target.slot,...update,revision:1});
 }else{
  const where='?section=eq.'+encodeURIComponent(target.g.section)+'&pair_code=eq.'+encodeURIComponent(target.g.id)+'&slot=eq.'+target.slot+'&revision=eq.'+rev;
  returned=await request('PATCH',route+where,{...update,revision:rev+1});
 }
 if(!Array.isArray(returned)||returned.length!==1){
  conflicts.add(k);throw Error('Otro docente modificó este cupo. No se sobrescribió su evaluación');
 }
 revisions.set(k,Number(returned[0].revision));dirtyLocal.delete(k);
 syncCounts();
}
function saveSeat(group,student){
 const slot=group.students.indexOf(student)+1,k=key(group,slot);
 if(slot<=0)return Promise.resolve(false);
 if(!ready){dirtyLocal.add(k);status('Solo respaldo local: servidor aún no disponible. No se ha sincronizado este puntaje.','error');return Promise.resolve(false);}
 const previous=queues.get(k)||Promise.resolve();
 status('Guardando en KineCheck · '+group.section+' '+group.id+' cupo '+slot+'…');
 const next=previous.catch(()=>{}).then(()=>submit(k));
 queues.set(k,next);
 void next.then(()=>{if(queues.get(k)===next)syncCounts()}).catch(e=>{
  dirtyLocal.add(k);
  status('GUARDADO CENTRAL NO CONFIRMADO · '+group.section+' '+group.id+' cupo '+slot+': '+String(e?.message||e)+'. Conserva el respaldo local y resuelve el conflicto.','error');
 }).finally(()=>{if(queues.get(k)===next)queues.delete(k);});
 return next.then(()=>true,()=>false);
}
async function resolveConflicts(){
 if(!ready||!conflicts.size)return;
 if(!confirm('Hay '+conflicts.size+' registros con diferencias frente al servidor. Descarga primero el respaldo local. ¿Reemplazar SOLO las copias locales discrepantes con las evaluaciones ya guardadas en Supabase? No se modifica ningún puntaje del servidor.'))return;
 const saved=await request('GET',route+'?select=section,pair_code,slot,levels,note,revision');
 let changed=0;
 for(const r of saved){const k=[r.section,r.pair_code,Number(r.slot)].join('|');if(!conflicts.has(k)||!validLevels(r.levels))continue;
 const target=seat(k);if(!target)continue;
 target.s.levels=[...r.levels];target.s.note=String(r.note||'');
 revisions.set(k,Number(r.revision));conflicts.delete(k);dirtyLocal.delete(k);changed++;
 }
 save();renderAll();syncCounts();
 status(changed+' diferencias resueltas usando datos confirmados del servidor. Conserva el respaldo previo si necesitas comparar.','success');
}
async function migrateLegacy(){
 if(!ready||!legacy.size)return;
 const names=[...legacy];
 if(!confirm('Se detectaron '+names.length+' evaluaciones solo en este navegador. ¿Crear únicamente los registros que aún no existen en Supabase? No se sobrescribirá ningún registro del servidor. Exporta antes tu respaldo JSON.'))return;
 let ok=0,errors=0;
 for(const k of names){
  try{
   // No actualizar un cupo que fue creado en otra pestaña desde la carga inicial.
   if(revisions.has(k))throw Error('Registro ya existente');
   legacy.delete(k);
   await submit(k);ok++;
  }catch(e){legacy.add(k);errors++;status('Migración parcial: '+ok+' guardados, '+errors+' pendientes. '+String(e?.message||e),'error');}
 }
 if(!errors)syncCounts();
}
refreshButton?.addEventListener('click',()=>void refresh());
migrateButton?.addEventListener('click',()=>void migrateLegacy());
resolveButton?.addEventListener('click',()=>void resolveConflicts().catch(e=>status('No se resolvieron las diferencias: '+String(e),'error')));
window.KineCheckScores={saveSeat,refresh,get ready(){return ready},get conflicts(){return conflicts.size},get legacy(){return legacy.size}};
window.addEventListener('focus',()=>{if(!fetching&&Date.now()-lastFetch>60000&&!queues.size)void refresh()});
window.addEventListener('beforeunload',event=>{if(queues.size||dirtyLocal.size||legacy.size||conflicts.size){event.preventDefault();event.returnValue='';}});
void refresh();
})();