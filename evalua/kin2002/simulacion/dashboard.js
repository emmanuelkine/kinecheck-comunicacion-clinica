/* Dashboard local sin almacenamiento ni red */
const $d=id=>document.getElementById(id);
const newEl=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=String(value??'');if(cls)n.className=cls;return n;};
const tabs=['overview','simulation','records','student','alerts','backup'];
const persons=()=>((window.KC_SIM_read?.()||[]).flatMap(g=>g.members.filter(m=>m.name.trim()).map(m=>({g,m,p:window.KC_SIM_points(m),n:window.KC_SIM_grade(window.KC_SIM_points(m))}))));
function selectTab(key){tabs.forEach(t=>$d('dash-'+t).classList.toggle('view-hide',t!==key));document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===key;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
function bar(target,label,number,total){const wrap=newEl('div','','barrow'),track=newEl('div','','overview-track'),fill=newEl('div','','overview-fill');fill.style.width=(total?Math.round(number/total*100):0)+'%';track.append(fill);wrap.append(newEl('p',label+' · '+number+'/'+total,'hint'),track);target.append(wrap);}
function update(){
 const groups=window.KC_SIM_read?.()||[],rows=persons(),complete=rows.filter(x=>x.p!==null);
 const totals=[['Parejas',groups.length],['Estudiantes',rows.length],['Evaluados',complete.length],['Pendientes',rows.length-complete.length],['Parejas listas',groups.filter(x=>x.ready).length]];
 const kpis=$d('dash-kpis');kpis.replaceChildren();for(const [title,value] of totals){const card=newEl('div','','overview-card');card.append(newEl('small',title),newEl('strong',value));kpis.append(card);}
 const chart=$d('dash-progress');chart.replaceChildren();for(const s of ['S1','S2']){const cohort=rows.filter(x=>x.g.section===s);bar(chart,s,cohort.filter(x=>x.p!==null).length,cohort.length);}
 const hist=$d('dash-histogram');hist.replaceChildren();for(const [a,b] of [[1,2.9],[3,3.9],[4,4.9],[5,5.9],[6,7]])bar(hist,a+'–'+b,complete.filter(x=>x.n>=a&&x.n<=b).length,complete.length);
 $d('dash-insight').textContent=rows.length?complete.length+' de '+rows.length+' estudiantes evaluados. '+(rows.length-complete.length)+' pendientes. Calificaciones individuales sujetas a validación docente.':'No hay estudiantes cargados en esta sesión. Usa la pestaña Simulación para crear o importar parejas.';
 const picker=$d('dash-student-select'),old=picker.value;picker.replaceChildren(newEl('option','Seleccionar estudiante'));picker.options[0].value='';
 rows.forEach((x,i)=>{const o=newEl('option',x.g.section+' · '+x.g.pair+' · '+x.m.name);o.value=String(i);picker.append(o);});if([...picker.options].some(o=>o.value===old))picker.value=old;
 studentCard();
 const issues=[],names=new Map();rows.forEach(x=>{const k=x.g.section+'|'+x.m.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();names.set(k,(names.get(k)||0)+1);});
 rows.forEach(x=>{const k=x.g.section+'|'+x.m.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();if(names.get(k)>1)issues.push(x.g.section+' · '+x.m.name+': identidad duplicada.');});
 const out=$d('dash-incidents');out.replaceChildren();if(!issues.length)out.append(newEl('p','Sin identidades repetidas detectadas. No se ha realizado un estudio de similitud textual.'));else {const list=newEl('ul');issues.forEach(x=>list.append(newEl('li',x)));out.append(list);}
}
function studentCard(){
 const out=$d('dash-student-card'),rows=persons(),picker=$d('dash-student-select'),i=Number(picker.value);out.replaceChildren();if(picker.value===''||!rows[i]){out.append(newEl('p','Selecciona un estudiante para revisar su evaluación.'));return;}
 const {g,m,p,n}=rows[i],labels=['Comunicación','Anamnesis','Seguridad','Hipótesis','Examen','Integración','Objetivos','Síntesis'];out.append(newEl('h3',m.name),newEl('p',g.section+' · '+g.pair+' · Evaluador '+g.evaluator+' · '+g.day+' '+g.time));
 const list=newEl('ol');labels.forEach((x,j)=>list.append(newEl('li',x+': nivel '+(m.levels[j]??'pendiente'))));out.append(list,newEl('p','Puntos: '+(p??'Pendiente')+'/100 · Nota: '+(n??'Pendiente')),newEl('p','Observaciones: '+(m.notes||'Sin observaciones')));
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.view)));
$d('dash-student-select').addEventListener('change',studentCard);$d('dash-print').addEventListener('click',()=>window.print());$d('dash-export').addEventListener('click',()=>$d('export').click());
document.addEventListener('kinecheck-simulacion-cambio',update);update();selectTab('overview');
