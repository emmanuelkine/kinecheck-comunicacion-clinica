/* KIN2002 - bitácora de tiempos por pareja. Acceso solo docente; no se registran nombres. */
(() => {
'use strict';
const base=String(window.KINECHECK_CONFIG?.supabaseUrl||'');
const anon=String(window.KINECHECK_CONFIG?.supabaseAnonKey||'');
const token='kinecheck_secure_session_v1';
const route='/rest/v1/kc_kin2002_pair_times';
const staff=new Set(['emmanuelkine@gmail.com','jorge.miranda@docencia.uoh.cl','jmarceloma@gmail.com','constanzaa.correa@pregrado.uoh.cl','emmanuel.zuniga@edu.ipchile.cl']);
const records=new Map(), pending=new Set();
let ready=false,notice='Conectando con el registro privado de tiempos…';
const key=g=>[g.section,g.id,Number(g.station)].join('|');
const seconds=(n)=>{n=Math.max(0,Math.round(n));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function session(){try{return JSON.parse(sessionStorage.getItem(token)||localStorage.getItem(token)||'null');}catch{return null;}}
async function identity(){
 if(!base.startsWith('https://')||!anon)throw Error('Configuración Supabase incompleta');
 let s=session();if(!s?.access_token)throw Error('Inicia sesión docente en KineCheck');
 if(s.expires_at&&Number(s.expires_at)<Date.now()/1000+60){
  if(typeof refreshToken!=='function')throw Error('Sesión vencida: vuelve a ingresar');
  s=await refreshToken(s);
 }
 const r=await fetch(base+'/auth/v1/user',{headers:{apikey:anon,authorization:'Bearer '+s.access_token},cache:'no-store'});
 if(!r.ok)throw Error('Sesión no válida');
 const u=await r.json();
 if(!u.id||!staff.has(String(u.email||'').toLowerCase()))throw Error('Cuenta docente no autorizada');
 return {access:s.access_token,uid:u.id};
}
async function request(method,path,body){
 const {access,uid}=await identity();
 const headers={apikey:anon,authorization:'Bearer '+access,accept:'application/json'};
 if(body!==undefined){headers['content-type']='application/json';headers.prefer='return=representation';}
 const r=await fetch(base+path,{method,cache:'no-store',headers,body:body===undefined?undefined:JSON.stringify({...body,modified_by:uid})});
 const json=await r.json().catch(()=>[]);
 if(!r.ok)throw Error('Servidor '+r.status);
 return json;
}
function state(events,phase,now=Date.now()){
 let elapsed=0,running=null,finished=false,started=false;
 for(const e of events||[]){
  if(e.phase!==phase||!['start','pause','finish'].includes(e.action))continue;
  const at=Date.parse(e.at);if(!Number.isFinite(at))continue;
  if(e.action==='start'&&!finished&&running===null){running=at;started=true;}
  if((e.action==='pause'||e.action==='finish')&&running!==null){elapsed+=Math.max(0,at-running);running=null;}
  if(e.action==='finish'){finished=true;running=null;}
 }
 if(running!==null)elapsed+=Math.max(0,now-running);
 return {started,finished,running:running!==null,secs:Math.round(elapsed/1000)};
}
function current(){return groups.find(g=>g.id===selected);}
function render(){
 const panel=document.getElementById('pairTimePanel');if(!panel)return;
 const g=current();if(!g){panel.innerHTML='<p>Selecciona una pareja para registrar su tiempo.</p>';return;}
 const k=key(g),r=records.get(k),events=r?.events||[];
 const a=state(events,'attention'),b=state(events,'complement');
 const busy=pending.has(k);
 const button=(action,label,disabled=false)=>'<button type="button" class="btn" data-time-action="'+action+'" '+(disabled||busy||!ready?'disabled':'')+'>'+label+'</button>';
 const ae=a.finished,be=b.finished;
 const nextAttention= !a.started?button('attention.start','Iniciar simulación (12 min)',false):
   !ae?(a.running?button('attention.pause','Pausar simulación'):button('attention.start','Reanudar simulación')):'';
 const endAttention=a.started&&!ae?button('attention.finish','Finalizar simulación'):'';
 const nextComplement=ae&&!b.finished?(!b.started?button('complement.start','Iniciar briefing/debriefing (3 min)'):b.running?button('complement.pause','Pausar bloque 3 min'):button('complement.start','Reanudar bloque 3 min')):'';
 const endComplement=b.started&&!be?button('complement.finish','Finalizar bloque 3 min'):'';
 const difference=(a.secs+b.secs)-900;
 panel.innerHTML='<div class="heading"><div><h3>Registro de tiempos · '+esc(g.id)+' · '+esc(g.day)+' '+esc(g.time)+'</h3><p class="muted">Control por pareja y estación '+esc(g.station)+' · 12 min de simulación + 3 min para briefing/debriefing (bloque conjunto)</p></div><button type="button" class="btn" id="timeRefresh" '+(busy?'disabled':'')+'>Actualizar tiempos</button></div>'+
 '<div class="cards"><div class="card"><span class="muted">Simulación real / 12:00</span><strong>'+seconds(a.secs)+'</strong><small>'+(!a.started?'Sin iniciar':ae?'Finalizada':a.running?'En curso':'En pausa')+'</small></div>'+
 '<div class="card"><span class="muted">Briefing/debriefing / 03:00</span><strong>'+seconds(b.secs)+'</strong><small>'+(!b.started?'Sin iniciar':be?'Finalizado':b.running?'En curso':'En pausa')+'</small></div>'+
 '<div class="card"><span class="muted">Total real / 15:00</span><strong>'+seconds(a.secs+b.secs)+'</strong><small>'+(be?(difference>0?'Exceso +'+seconds(difference):'Dentro de tiempo, margen '+seconds(-difference)):'Registro no finalizado')+'</small></div>'+
 '<div class="card"><span class="muted">Registro</span><strong>'+(be?'Completo':a.started?'En progreso':'Pendiente')+'</strong><small>Solo docentes autorizados</small></div></div>'+
 '<div class="toolbar">'+nextAttention+endAttention+nextComplement+endComplement+'</div>'+
 '<p id="timeStatus" class="help" role="status" aria-live="polite">'+esc(notice)+'</p>'+
 '<p class="help">Cada acción se guarda con fecha y hora en la base privada. Los períodos de pausa se excluyen del tiempo real. El cronómetro no modifica notas ni rúbricas y no recupera duraciones de evaluaciones anteriores.</p>';
 panel.querySelectorAll('[data-time-action]').forEach(btn=>btn.addEventListener('click',()=>void recordAction(g,btn.dataset.timeAction)));
 panel.querySelector('#timeRefresh')?.addEventListener('click',()=>void refresh());
}
async function refresh(){
 notice='Consultando tiempos confirmados…';
 try{
  const rows=await request('GET',route+'?select=section,pair_code,station,events,revision,updated_at&order=section.asc,pair_code.asc,station.asc');
  if(!Array.isArray(rows))throw Error('Respuesta inválida');
  records.clear();for(const r of rows)if(Array.isArray(r.events))records.set([r.section,r.pair_code,r.station].join('|'),r);
  ready=true;notice=rows.length+' parejas con registro de tiempos centralizado.';
 }catch(e){ready=false;notice='Registro no disponible: '+String(e.message||e)+'. No se guardarán tiempos sin confirmación.';}
 render();
}
async function recordAction(g,command){
 const k=key(g);if(pending.has(k)||!ready)return;
 const [phase,action]=command.split('.');
 const old=records.get(k);const events=old?.events||[];
 if(!['attention','complement'].includes(phase)||!['start','pause','finish'].includes(action))return;
 const a=state(events,'attention'),b=state(events,'complement'),s=phase==='attention'?a:b;
 if(phase==='complement'&&!a.finished)return;
 if(s.finished || (action==='start'&&s.running) || (action!=='start'&&!s.running))return;
 if(action==='finish'&&!confirm('¿Confirmar finalización del '+(phase==='attention'?'tiempo de simulación':'bloque de briefing/debriefing')+' para '+g.id+'?'))return;
 const next=[...events,{phase,action,at:new Date().toISOString()}];
 pending.add(k);notice='Guardando '+g.id+' en Supabase…';render();
 try{
  let result;
  if(old){
   const where='?section=eq.'+encodeURIComponent(g.section)+'&pair_code=eq.'+encodeURIComponent(g.id)+'&station=eq.'+g.station+'&revision=eq.'+old.revision;
   result=await request('PATCH',route+where,{events:next,revision:old.revision+1,updated_at:new Date().toISOString()});
  }else{
   result=await request('POST',route,{section:g.section,pair_code:g.id,station:Number(g.station),events:next,revision:1});
  }
  if(!Array.isArray(result)||result.length!==1)throw Error('Conflicto de edición: otro docente modificó el registro');
  records.set(k,result[0]);notice='Registro confirmado en servidor · '+g.id+'.';
 }catch(e){notice='No se confirmó el guardado: '+String(e.message||e)+'. Actualiza los tiempos antes de continuar.';ready=false;}
 finally{pending.delete(k);render();}
}
function downloadCSV(){
 const rows=[['Sección','Día','Hora programada','Pareja','Estación','Inicio real','Fin real','Simulación real (segundos)','Briefing/debriefing real (segundos)','Total real (segundos)','Planificado (segundos)','Diferencia (segundos)','Estado']];
 for(const g of [...groups].sort((a,b)=>['Martes','Miércoles','Jueves','Viernes'].indexOf(a.day)-['Martes','Miércoles','Jueves','Viernes'].indexOf(b.day)||a.time.localeCompare(b.time)||Number(a.station)-Number(b.station))){
  const ev=records.get(key(g))?.events||[],a=state(ev,'attention'),b=state(ev,'complement');
  const first=ev.find(x=>x.action==='start')?.at||'',last=[...ev].reverse().find(x=>x.action==='finish'&&x.phase==='complement')?.at||'';
  const status=b.finished?'Finalizado':a.started?'Incompleto':'Sin registro';
  rows.push([g.section,g.day,g.time,g.id,g.station,first,last,a.started?a.secs:'',b.started?b.secs:'',a.started?a.secs+b.secs:'',900,b.finished?a.secs+b.secs-900:'',status]);
 }
 const csv='\ufeff'+rows.map(r=>r.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='KIN2002_registro_tiempos_parejas.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
const sim=document.getElementById('simulation');
if(sim){
 const pane=document.createElement('section');pane.className='pane';pane.id='pairTimePanel';pane.style.marginTop='16px';
 sim.appendChild(pane);
 const exportBtn=document.createElement('button');exportBtn.className='btn';exportBtn.type='button';exportBtn.textContent='Exportar tiempos CSV';exportBtn.addEventListener('click',downloadCSV);
 sim.querySelector('.controls')?.appendChild(exportBtn);
}
window.KineCheckTimes={render,refresh};
setInterval(()=>{if(document.getElementById('simulation')&&!document.getElementById('simulation').classList.contains('hidden')&&ready)render();},1000);
void refresh();
})();