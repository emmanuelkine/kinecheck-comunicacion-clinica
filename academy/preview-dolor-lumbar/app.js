(function(){
'use strict';
var modules=[
{t:'Reencuadrar el dolor lumbar',c:'#55e6ce',d:'Dolor, función, historia y contexto antes de reducir el problema a una estructura.',l:[
['Más que una estructura','Integra historia, función y contexto para comprender el problema más allá de una etiqueta diagnóstica.'],
['Modelo biopsicosocial aplicado','Biología, cogniciones, emociones y contexto se combinan para decidir qué variables son modificables.'],
['Curso y evolución','La trayectoria del dolor lumbar se entiende como un proceso dinámico que necesita seguimiento.']]},
{t:'Historia, pronóstico y riesgo',c:'#6cc8ff',d:'Entrevista clínica, triage, factores pronósticos y variables modificables.',l:[
['Entrevista con dirección','La entrevista debe producir hipótesis y prioridades, no una acumulación de preguntas.'],
['Triage y seguridad','Antes de intervenir, discrimina situaciones que requieren una ruta clínica distinta.'],
['Factores pronósticos','El pronóstico orienta seguimiento e identifica variables potencialmente modificables.']]},
{t:'Evaluación estructurada',c:'#7c73ff',d:'Entrevista, medidas de resultado, observación, examen físico y síntesis.',l:[
['Arquitectura de evaluación','Cada etapa agrega información y evita transformar el examen en una batería indiscriminada.'],
['Medidas de resultado','Las escalas apoyan seguimiento, pero no reemplazan el razonamiento clínico.'],
['Examen físico con propósito','El examen debe responder preguntas generadas por la historia y relacionarse con función.']]},
{t:'Razonamiento y clasificación',c:'#ffb85c',d:'Niveles local, regional y global; sensibilidad y construcción de hipótesis.',l:[
['Local · regional · global','Amplía el análisis cuando una explicación local no alcanza para ordenar el problema.'],
['Sensibilidad y modulación','El dolor persistente puede acompañarse de una respuesta protectora aumentada.'],
['De hallazgos a hipótesis','La síntesis debe orientar una intervención y una forma concreta de reevaluarla.']]},
{t:'Dolor persistente y conducta',c:'#ff6fae',d:'Protección, miedo, evitación, confianza, autoeficacia y lenguaje clínico.',l:[
['Dolor no equivale a daño','La intensidad del dolor no puede interpretarse automáticamente como una medida directa de daño.'],
['Miedo, evitación y autoeficacia','Explora qué movimientos y actividades se evitan y qué significado tienen para la persona.'],
['Lenguaje clínico','Las palabras del profesional pueden modificar amenaza, confianza y conducta.']]},
{t:'Comunicación y educación',c:'#55e6ce',d:'Alianza terapéutica, expectativas, objetivos compartidos y educación que cambia conducta.',l:[
['Alianza terapéutica','Escuchar, validar, acordar metas y explicar el plan forman parte de la intervención.'],
['Educación que cambia conducta','La educación tiene valor cuando mejora decisiones y facilita acciones útiles.'],
['Metas y expectativas','Define de manera explícita qué significará progreso para esa persona.']]},
{t:'Intervención activa',c:'#70e3a2',d:'Movimiento, fuerza, capacidad, exposición y progresión individualizada.',l:[
['Movimiento como herramienta','Usa movimiento para recuperar tolerancia, opciones y confianza.'],
['Fuerza y capacidad','El entrenamiento amplía capacidad física cuando se dosifica según objetivo y respuesta.'],
['Exposición progresiva','Una jerarquía graduada puede organizar el retorno a movimientos o tareas temidas.']]},
{t:'Terapias y dosificación',c:'#ffb85c',d:'Ubicar estrategias pasivas dentro de un plan activo y ajustar la dosis según respuesta.',l:[
['Terapia manual como adjunto','Si se utiliza, debe facilitar actividad y autonomía, no dependencia.'],
['Dosificación individual','Carga, volumen, frecuencia y complejidad se ajustan a respuesta y contexto.'],
['Reevaluar para progresar','Evalúa, interviene, mide y decide si mantener, progresar o modificar.']]},
{t:'Integración clínica',c:'#7c73ff',d:'Los 11 pasos del abordaje, caso integrador y cierre del sistema.',l:[
['Los 11 pasos del abordaje','Convierte el contenido del curso en una ruta clínica reproducible.'],
['Caso integrador','Integra triage, creencias, función, exposición, dosificación y retorno funcional.'],
['Cierre: de apuntes a sistema','Transforma información dispersa en una forma de pensar, decidir y reevaluar.']]}
];
var KEY='kc_dlp_preview_v3';
var state={m:0,l:0,done:{}};
var app=document.getElementById('app');
function load(){try{var x=window.localStorage.getItem(KEY);if(x){state.done=JSON.parse(x)||{};}}catch(e){}}
function save(){try{window.localStorage.setItem(KEY,JSON.stringify(state.done));}catch(e){}}
function pct(){var n=0,k;for(k in state.done){if(state.done.hasOwnProperty(k)&&state.done[k])n++;}return Math.round((n/27)*100);}
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(typeof html!=='undefined')e.innerHTML=html;return e;}
function clear(){while(app.firstChild)app.removeChild(app.firstChild);}
function button(txt,cls,fn){var b=el('button',cls,txt);b.type='button';b.onclick=fn;return b;}
function top(shell){var t=el('div','top');var brand=el('div','brand','<div class="logo"></div><div class="words">KineCheck<small>Preview · Formación clínica</small></div>');brand.onclick=home;t.appendChild(brand);var a=el('div','actions');a.appendChild(button('⌂ Inicio','btn',home));t.appendChild(a);shell.appendChild(t);}
function mobile(shell){var m=el('div','mobile');m.appendChild(button('⌂ Inicio','',home));m.appendChild(button('▶ Continuar','',resume));shell.appendChild(m);}
function home(){
clear();var shell=el('main','shell');top(shell);
var hero=el('section','hero');var main=el('div','glass hero-main');main.innerHTML='<div class="eyebrow">● Preview privado · KineCheck</div><h1>Dolor lumbar<br><span>persistente.</span></h1><p>Razonamiento clínico, pronóstico, evaluación estructurada, comunicación, exposición, ejercicio y progresión convertidos en una aplicación educativa dinámica.</p>';
var ctas=el('div','ctas');ctas.appendChild(button(firstPending()?'Continuar curso →':'Comenzar curso →','primary',resume));ctas.appendChild(button('Explorar integración clínica','btn',function(){openLesson(8,0);}));main.appendChild(ctas);hero.appendChild(main);
var side=el('aside','glass side');side.innerHTML='<div class="ring" style="--p:'+pct()+'"><b>'+pct()+'%</b><small>progreso</small></div><div class="metric"><strong>9</strong><span>módulos</span></div><div class="metric"><strong>27</strong><span>microlecciones</span></div>';hero.appendChild(side);shell.appendChild(hero);
var hd=el('div','head','<div><h2>Ruta de aprendizaje</h2><p>Avanza en secuencia o entra directamente al tema que necesites.</p></div><span class="tag">Progreso guardado</span>');shell.appendChild(hd);
var grid=el('section','grid');for(var i=0;i<modules.length;i++){(function(mi){var m=modules[mi];var card=el('article','glass module');card.style.setProperty('--mc',m.c);var done=0;for(var j=0;j<3;j++){if(state.done[mi+'-'+j])done++;}card.innerHTML='<small>Módulo '+('0'+(mi+1)).slice(-2)+'</small><h3>'+m.t+'</h3><p>'+m.d+'</p><div class="mfoot"><div class="bar"><i style="width:'+(done/3*100)+'%"></i></div><span class="tag">'+done+'/3</span></div>';card.onclick=function(){openLesson(mi,0);};grid.appendChild(card);})(i);}shell.appendChild(grid);
var hd2=el('div','head','<div><h2>Herramientas rápidas</h2><p>Accesos directos a decisiones clínicas clave.</p></div>');shell.appendChild(hd2);
var tools=el('section','tools');var ts=[['🧭','Ruta de evaluación',2,0],['🚦','Triage',1,1],['⚙️','Dosificación',7,1],['🧠','Caso integrador',8,1]];for(var q=0;q<ts.length;q++){(function(x){var t=el('article','glass tool','<div class="ico">'+x[0]+'</div><b>'+x[1]+'</b><p>Toca para abrir este contenido.</p>');t.onclick=function(){openLesson(x[2],x[3]);};tools.appendChild(t);})(ts[q]);}shell.appendChild(tools);
var foot=el('div','foot','Versión de prueba aislada. No modifica el Academy de producción ni habilita compras o licencias.');shell.appendChild(foot);mobile(shell);app.appendChild(shell);window.scrollTo(0,0);
}
function ideas(mi,li){var base=[
['Comprender','El hallazgo clínico debe interpretarse dentro de la historia completa de la persona.'],
['Aplicar','Selecciona información que cambie una decisión, una conducta o la dosificación.'],
['Integrar','Define de antemano qué variable usarás para reevaluar si la estrategia está funcionando.']
];if(mi===1&&li===1){base[0][1]='Una bandera clínica no debe funcionar como una regla automática aislada.';base[1][1]='Combina historia, evolución y examen para decidir si cambia la ruta clínica.';}
if(mi===6){base[1][1]='Gradúa rango, carga, volumen, velocidad o complejidad según tolerancia y objetivo.';}
if(mi===8&&li===0){base[0][1]='La integración final conecta seguridad, función, factores psicosociales, capacidad y objetivos.';}
return base;}
function openLesson(mi,li){state.m=mi;state.l=li;clear();var shell=el('main','shell');top(shell);var course=el('div','course');var side=el('aside','glass sidebar');side.innerHTML='<div class="sidehead"><b>'+modules[mi].t+'</b><small>Módulo '+(mi+1)+' · 3 lecciones</small></div>';for(var i=0;i<3;i++){(function(x){var link=el('div','lessonlink'+(x===li?' active':'')+(state.done[mi+'-'+x]?' done':''),'<div class="dot">'+(state.done[mi+'-'+x]?'✓':(x+1))+'</div><span>'+modules[mi].l[x][0]+'</span>');link.onclick=function(){openLesson(mi,x);};side.appendChild(link);})(i);}course.appendChild(side);
var lesson=el('article','glass lesson');lesson.innerHTML='<div class="crumb">Módulo '+(mi+1)+' · Lección '+(li+1)+'</div><h1>'+modules[mi].l[li][0]+'</h1><p class="lead">'+modules[mi].l[li][1]+'</p>';
var goals=el('div','goals');var gs=['Comprender el concepto','Aplicarlo al razonamiento','Definir una decisión clínica'];for(var g=0;g<3;g++)goals.appendChild(el('div','goal','<b>0'+(g+1)+'</b>'+gs[g]));lesson.appendChild(goals);
var it=ideas(mi,li);for(var p=0;p<it.length;p++){var block=el('section','block','<h2>'+['Idea clave','En la práctica','Decisión clínica'][p]+'</h2><div class="callout" style="--cc:'+modules[mi].c+'"><b>'+it[p][0]+'</b>'+it[p][1]+'</div>');lesson.appendChild(block);}
if(mi===8&&li===0)lesson.appendChild(stepsWidget());if(mi===8&&li===1)lesson.appendChild(caseWidget());lesson.appendChild(quizWidget(mi,li));
var nav=el('div','lessonnav');nav.appendChild(button('← Anterior','btn',prev));nav.appendChild(button(state.done[mi+'-'+li]?'Siguiente →':'Completar y continuar →','primary',complete));lesson.appendChild(nav);course.appendChild(lesson);shell.appendChild(course);mobile(shell);app.appendChild(shell);window.scrollTo(0,0);
}
function quizWidget(mi,li){var w=el('section','check');w.innerHTML='<div class="eyebrow">Checkpoint</div><h3>¿Qué opción representa mejor el razonamiento de esta lección?</h3>';var opts=['Aplicar una regla fija sin considerar contexto','Integrar la información y vincularla con una decisión clínica','Acumular pruebas aunque no cambien la conducta'];for(var i=0;i<3;i++){(function(ix){var b=button(String.fromCharCode(65+ix)+'. '+opts[ix],'choice',function(){var bs=w.getElementsByTagName('button');for(var j=0;j<bs.length;j++){bs[j].disabled=true;}b.className+=' '+(ix===1?'correct':'wrong');fb.innerHTML=ix===1?'Correcto. La información cobra valor cuando modifica una decisión y puede reevaluarse.':'Revisa la lógica: el curso prioriza integración, contexto y decisiones verificables.';});w.appendChild(b);})(i);}var fb=el('div','feedback','');w.appendChild(fb);return w;}
function stepsWidget(){var box=el('section','block');box.innerHTML='<h2>Ruta interactiva de 11 pasos</h2>';var names=['Centrar en la persona','Triage de seguridad','Factores psicosociales','Evitar amenaza','Examen dirigido','Medidas de resultado','Información útil','Actividad y ejercicio','Adjuntos sin dependencia','Ajustar dosis','Retorno y progresión'];var st=el('div','stepper');var detail=el('div','stepdetail','<h3>1. '+names[0]+'</h3><p>Objetivos, contexto, preferencias y aquello que necesita recuperar orientan la ruta.</p>');for(var i=0;i<names.length;i++){(function(ix){var b=button('<b>'+(ix+1)+'</b><small>'+names[ix]+'</small>','step'+(ix===0?' active':''),function(){var all=st.getElementsByTagName('button');for(var j=0;j<all.length;j++)all[j].className='step';b.className='step active';detail.innerHTML='<h3>'+(ix+1)+'. '+names[ix]+'</h3><p>Este paso organiza una decisión clínica específica dentro de una ruta centrada en la persona y su progreso.</p>';});st.appendChild(b);})(i);}box.appendChild(st);box.appendChild(detail);return box;}
function caseWidget(){var box=el('section','block');box.innerHTML='<h2>Simulador clínico</h2><div class="case"><div class="patient"><div class="avatar">◒</div><b>Paciente virtual</b><p>Dolor lumbar persistente, reducción de actividad, miedo a flexionarse y preocupación por una imagen previa. Quiere volver a entrenar y trabajar con confianza.</p></div><div class="casepanel"><h3>¿Qué priorizas primero?</h3><div id="caseButtons"></div><div class="caseresult" id="caseResult">Selecciona una opción.</div></div></div>';setTimeout(function(){var c=document.getElementById('caseButtons'),r=document.getElementById('caseResult');if(!c)return;var os=['Batería extensa de pruebas estructurales','Confirmar seguridad, explorar creencias y función, y acordar una hipótesis','Reposo hasta que el dolor desaparezca'];for(var i=0;i<os.length;i++){(function(ix){c.appendChild(button(String.fromCharCode(65+ix)+'. '+os[ix],'casebtn',function(){r.innerHTML=ix===1?'Buena decisión. Integra triage, significado del dolor, función y objetivos antes de escoger la intervención.':'La prioridad debe organizar seguridad, función, contexto y una hipótesis que pueda reevaluarse.';}));})(i);}},0);return box;}
function complete(){state.done[state.m+'-'+state.l]=true;save();next();}
function next(){var m=state.m,l=state.l+1;if(l>2){m++;l=0;}if(m>8){home();return;}openLesson(m,l);}
function prev(){var m=state.m,l=state.l-1;if(l<0){m--;l=2;}if(m<0){home();return;}openLesson(m,l);}
function firstPending(){for(var m=0;m<9;m++)for(var l=0;l<3;l++)if(!state.done[m+'-'+l])return {m:m,l:l};return null;}
function resume(){var x=firstPending();if(!x){openLesson(8,2);return;}openLesson(x.m,x.l);}
load();home();
})();