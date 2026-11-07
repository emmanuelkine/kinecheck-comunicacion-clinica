/* KIN2002 · Simulación local. Sin servidor, sin almacenamiento de calificaciones. */
const $ = id => document.getElementById(id);
const weights=[8,16,16,12,20,12,8,8];
const labels=['Comunicación, consentimiento y trato','Anamnesis y contexto','Seguridad clínica','Hipótesis y razonamiento','Selección y ejecución del examen','Integración diagnóstica y derivación','Objetivos y educación','Síntesis y contribución individual'];
const guides=[
['Sin consentimiento o relación profesional','Explica poco y genera confusión','Trato correcto, escucha o explicaciones incompletas','Comunica y solicita permiso; omisión menor','Escucha activamente, consiente continuamente y comunica sin alarmismo'],
['Sin historia útil','Anamnesis fragmentada','Explora síntomas, omite función/contexto relevante','Recoge datos relevantes con omisiones menores','Prioriza evolución, función, carga, contexto y expectativas'],
['Conducta insegura o ignora señal de alarma','Omite riesgos relevantes','Pesquisa incompleta, aunque generalmente segura','Pesquisa y actúa de manera segura; omisión menor','Identifica riesgos, decide suspensión/derivación y adapta conductas'],
['Sin hipótesis coherente','Etiqueta sin fundamento','Hipótesis plausible con justificación parcial','Hipótesis coherente con contraste limitado','Contrasta alternativas, reconoce incertidumbre y adapta decisiones'],
['Examen inexistente o inseguro','Pruebas sin propósito y técnica deficiente','Parte del examen pertinente; ejecución o interpretación parcial','Examen pertinente y seguro; errores menores','Selecciona, ejecuta, adapta e interpreta pruebas justificadas'],
['Conclusión incompatible con datos','Enumera hallazgos sin integrar','Integración parcial y pronóstico débil','Síntesis coherente, omisión menor','Integra función, examen, pronóstico y decisiones de derivación'],
['Plan ausente o contraindicado','Conducta vaga o descontextualizada','Objetivos y educación poco operativos','Conducta inicial segura con omisión menor','Objetivo funcional, educación, progresión y reevaluación razonados'],
['Sin aporte individual observable','Dependencia casi total del compañero','Participación irregular, síntesis parcial','Contribución individual competente','Colabora y sintetiza autónomamente con fundamentos']
];
let groups=[],active=null,seq=0,remaining=720,running=false,lastTick=0;
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const student=()=>({name:'',levels:Array(8).fill(null),notes:''});
const points=s=>Array.isArray(s.levels)&&s.levels.length===8&&s.levels.every(x=>Number.isInteger(x)&&x>=0&&x<=4)?s.levels.reduce((a,x,i)=>a+x*weights[i]/4,0):null;
const grade=n=>n===null?null:Math.round((n<=60?1+3*n/60:4+3*(n-60)/40)*10)/10;
const el=(kind,value,cls)=>{const n=document.createElement(kind);n.textContent=value??'';if(cls)n.className=cls;return n;};
const tell=s=>{$('feedback').textContent=s;};
const csvCell=v=>{let s=String(v??'');if(/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
function parseCSV(input) {
 const rows=[];let line=[],field='',quoted=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(quoted){if(c==='"'&&input[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===';'||c===','){line.push(field);field='';}else if(c==='\n'){line.push(field.replace(/\r$/,''));rows.push(line);line=[];field='';}else field+=c;}
 if(quoted)throw Error('CSV con comillas incompletas');if(line.length||field){line.push(field);rows.push(line);}return rows;
}
function addGroup(section,pair,evaluator,day,time,number=2){
 if(!['S1','S2'].includes(section)||!pair||groups.some(g=>g.section===section&&norm(g.pair)===norm(pair)))throw Error('Pareja duplicada o sección inválida: '+section+' '+pair);
 const g={id:'g'+(++seq),section,pair,evaluator,day,time,ready:false,members:Array.from({length:Math.max(1,Math.min(3,number))},student)};groups.push(g);active=g.id;return g;
}
function complete(g){const named=g.members.filter(m=>m.name.trim());return named.length>0&&named.every(m=>points(m)!==null);}
function labelInput(label,value,update){const container=el('label',label),input=document.createElement('input');input.value=value;input.maxLength=140;input.addEventListener('input',()=>update(input.value));container.append(input);return container;}
function summary(){
 document.dispatchEvent(new Event('kinecheck-simulacion-cambio'));
 const all=groups.flatMap(g=>g.members.filter(m=>m.name.trim()).map(m=>({g,m,score:points(m)}))),finished=all.filter(x=>x.score!==null);
 $('stats').replaceChildren(...[['Parejas',groups.length],['Estudiantes',all.length],['Evaluados',finished.length],['Parejas listas',groups.filter(g=>g.ready).length],['Pendientes',all.length-finished.length]].map(([label,value])=>{const d=el('div','','stat');d.append(el('span',label),el('strong',String(value)));return d;}));
 const body=$('grades');body.replaceChildren();
 for(const {g,m,score} of all){const tr=el('tr');for(const value of [g.section,g.pair,m.name,'E'+g.evaluator,m.levels.filter(x=>x!==null).length+'/8',score??'—',grade(score)??'—',g.ready?'Lista':'Pendiente'])tr.append(el('td',String(value)));body.append(tr);}
 const selected=groups.find(g=>g.id===active);$('ready').textContent=selected?.ready?'Reabrir pareja':'Marcar pareja lista';
}
function render(){
 const q=norm($('search').value),section=$('filtersection').value,evaluator=$('filtereval').value,state=$('filterstate').value;
 const shown=groups.filter(g=>(!section||g.section===section)&&(!evaluator||g.evaluator===evaluator)&&(!state||(state==='ready'?g.ready:!g.ready))&&norm([g.section,g.pair,...g.members.map(x=>x.name)].join(' ')).includes(q));
 $('pairsmeta').textContent=shown.length+' parejas de '+groups.length;
 const p=$('pairs');p.replaceChildren();
 for(const g of shown){const done=g.members.filter(m=>m.name&&points(m)!==null).length,number=g.members.filter(m=>m.name).length;const b=el('button',g.section+' · '+g.pair+' · E'+g.evaluator+' · '+done+'/'+number+' evaluados'+(g.ready?' · LISTA':''),'pair'+(active===g.id?' active':'')+(g.ready?' ready':''));b.type='button';b.addEventListener('click',()=>{active=g.id;render();});p.append(b);}
 const g=groups.find(x=>x.id===active),members=$('members');members.replaceChildren();
 $('addmember').disabled=!g||g.members.length>=3;$('ready').disabled=!g||(!g.ready&&!complete(g));$('remove').disabled=!g;
 if(!g){$('selected-title').textContent='Selecciona o crea una pareja';$('selected-info').textContent='Rúbrica individual por estudiante.';summary();return;}
 $('selected-title').textContent=g.section+' · '+g.pair+' · Evaluador '+g.evaluator;
 $('selected-info').textContent=g.day+' '+g.time+' · '+(g.section==='S1'?'Paciente lumbar':'Paciente hombro')+' · '+g.members.length+' integrantes';
 g.members.forEach((m,index)=>{
  const a=el('article','','member');a.append(el('h3','Estudiante '+(index+1)+(m.name?' · '+m.name:'')));
  a.append(labelInput('Nombre del estudiante',m.name,value=>{m.name=value;g.ready=false;summary();}));
  a.append(el('p',m.levels.filter(x=>x!==null).length+'/8 criterios','hint'));
  labels.forEach((label,i)=>{
   const c=el('div','','criterion');c.append(el('b',(i+1)+'. '+label+' ('+weights[i]+' puntos)'));
   const wrapper=el('label','Nivel 0–4'),s=document.createElement('select');
   for(const v of ['',0,1,2,3,4]){const option=document.createElement('option');option.value=String(v);option.textContent=v===''?'Sin evaluar':'Nivel '+v+' · '+v*weights[i]/4+'/'+weights[i]+' pts';s.append(option);}s.value=m.levels[i]===null?'':String(m.levels[i]);
   const desc=el('p',m.levels[i]===null?'Selecciona un nivel.':guides[i][m.levels[i]],'hint');
   s.addEventListener('change',()=>{m.levels[i]=s.value===''?null:Number(s.value);g.ready=false;desc.textContent=m.levels[i]===null?'Selecciona un nivel.':guides[i][m.levels[i]];const score=points(m);scoreline.textContent='Puntaje '+(score??'—')+'/100 · Nota '+(grade(score)??'—');summary();});
   wrapper.append(s);c.append(wrapper,desc);a.append(c);
  });
  const score=points(m),scoreline=el('p','Puntaje '+(score??'—')+'/100 · Nota '+(grade(score)??'—'));a.append(scoreline);
  const lab=el('label','Observaciones y retroalimentación'),notes=document.createElement('textarea');notes.rows=4;notes.value=m.notes;notes.maxLength=2500;notes.addEventListener('input',()=>{m.notes=notes.value;g.ready=false;summary();});lab.append(notes);a.append(lab);members.append(a);
 });
 summary();
}
$('create').addEventListener('click',()=>{try{const g=addGroup($('section').value,$('pairname').value.trim(),$('evaluator').value,$('day').value,$('time').value);render();tell('Pareja '+g.pair+' creada.');}catch(e){tell(e.message);}});
for(const field of ['search','filtersection','filtereval','filterstate'])$(field).addEventListener(field==='search'?'input':'change',render);
$('addmember').addEventListener('click',()=>{const g=groups.find(x=>x.id===active);if(!g||g.members.length>=3)return;g.members.push(student());g.ready=false;render();});
$('ready').addEventListener('click',()=>{const g=groups.find(x=>x.id===active);if(!g)return;if(!g.ready&&!complete(g)){tell('Completa ocho criterios de cada estudiante con nombre.');return;}g.ready=!g.ready;render();});
$('remove').addEventListener('click',()=>{const g=groups.find(x=>x.id===active);if(!g||!window.confirm('¿Quitar '+g.section+' '+g.pair+' de esta sesión?'))return;groups=groups.filter(x=>x.id!==g.id);active=groups[0]?.id??null;render();});
$('reset').addEventListener('click',()=>{if(!window.confirm('¿Descartar los datos de esta sesión? Exporta un respaldo antes.'))return;groups=[];active=null;render();tell('Sesión vaciada.');});
$('export').addEventListener('click',()=>{
 const rows=[['Sección','Pareja','Evaluador','Día','Hora','Estudiante','Caso','C1','C2','C3','C4','C5','C6','C7','C8','Puntos','Nota','Pareja lista','Observaciones']];
 for(const g of groups)for(const m of g.members)if(m.name.trim())rows.push([g.section,g.pair,g.evaluator,g.day,g.time,m.name,g.section==='S1'?'Lumbar':'Hombro',...m.levels.map(x=>x??''),points(m)??'',grade(points(m))??'',g.ready?'Sí':'No',m.notes]);
 const csv='\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='KineCheck_KIN2002_Simulacion_Respaldo.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
});
$('importcsv').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;if(file.size>1024*1024){tell('CSV demasiado grande (máximo 1 MB).');return;}
 try{
  const rows=parseCSV(await file.text());if(rows.length>400)throw Error('CSV excede 400 filas');
  const head=rows[0].map(norm),col=key=>head.indexOf(norm(key));
  const sec=col('Sección'),pair=col('Pareja'),name=col('Estudiante'),evalCol=col('Evaluador'),day=col('Día'),time=col('Hora');
  if(sec<0||pair<0||name<0)throw Error('CSV requiere Sección, Pareja y Estudiante');
  const pending=new Map();for(const row of rows.slice(1)){const s=String(row[sec]||'').toUpperCase().trim(),p=String(row[pair]||'').trim(),n=String(row[name]||'').trim();if(!n||!p||!['S1','S2'].includes(s))continue;
   const id=s+'|'+norm(p);if(!pending.has(id))pending.set(id,[]);pending.get(id).push({row,s,p,n});}
  if(!pending.size)throw Error('No hay estudiantes válidos');
  if(pending.size>180)throw Error('Demasiadas parejas');
  const next=[];for(const entries of pending.values()){if(entries.length>3)throw Error('Pareja con más de 3 integrantes');
   const first=entries[0];if(groups.some(x=>x.section===first.s&&norm(x.pair)===norm(first.p)))throw Error('Pareja ya existente: '+first.s+' '+first.p);
   const g={id:'g'+(++seq),section:first.s,pair:first.p,evaluator:evalCol<0?'1':String(first.row[evalCol]||'1').replace(/^E/i,''),day:day<0?'Martes':first.row[day]||'Martes',time:time<0?'':first.row[time]||'',ready:false,members:entries.map(x=>({...student(),name:x.n}))};
   const cols=Array.from({length:8},(_,i)=>col('C'+(i+1)));const notes=col('Observaciones');
   entries.forEach(({row},i)=>{if(cols.every(c=>c>=0))g.members[i].levels=cols.map(c=>row[c]===''?null:/^[0-4]$/.test(row[c])?Number(row[c]):null);if(notes>=0)g.members[i].notes=String(row[notes]||'').slice(0,2500);});
   next.push(g);
  }groups.push(...next);active=next[0].id;render();tell('Importadas '+next.length+' parejas; revisa y valida los resultados.');
 }catch(error){tell('No se pudo importar: '+error.message);}
 finally{e.target.value='';}
});
function clockDraw(){$('countdown').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');}
$('timer12').addEventListener('click',()=>{running=false;remaining=720;clockDraw();});
$('timer3').addEventListener('click',()=>{running=false;remaining=180;clockDraw();});
$('timerstart').addEventListener('click',()=>{running=!running;lastTick=performance.now();$('timerstart').textContent=running?'Pausar':'Iniciar';});
setInterval(()=>{if(!running)return;const now=performance.now();if(now-lastTick>=1000){remaining=Math.max(0,remaining-Math.floor((now-lastTick)/1000));lastTick=now;clockDraw();if(!remaining){running=false;$('timerstart').textContent='Iniciar';}}},400);
window.KC_SIM_read=()=>groups.map(g=>({...g,members:g.members.map(m=>({...m,levels:[...m.levels]}))}));
window.KC_SIM_points=points;
window.KC_SIM_grade=grade;
clockDraw();render();
