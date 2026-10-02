(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list = items => '<ul>'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
  const block = (title,body,wide=false) => '<section class="block'+(wide?' wide':'')+'"><h3>'+esc(title)+'</h3>'+body+'</section>';
  let data;
  function render() {
    const slug=location.hash.slice(1),c=data.courses.find(x=>x.slug===slug)||data.courses[0];
    document.querySelectorAll('#course-nav a').forEach(a=>a.setAttribute('aria-current',String(a.hash==='#'+c.slug)));
    const modules=c.modules.map((m,i)=>'<article class="module"><h4>'+esc((i+1)+'. '+m.title)+'</h4><small>'+m.minutes+' minutos planificados</small>'+list(m.lessons)+(m.case?'<p>'+esc(m.case)+'</p>':'')+'</article>').join('');
    const references=c.bibliography.map(id=>data.references.find(r=>r.id===id)).filter(Boolean).map(r=>{
      const url=new URL(r.url);if(!/^https?:$/.test(url.protocol))return '';
      return '<li>'+esc(r.authors)+' ('+r.year+'). '+esc(r.title)+'. '+esc(r.publication)+'. <a href="'+esc(url.href)+'" target="_blank" rel="noopener noreferrer">Fuente original ↗</a>'+(r.doi?' <span>DOI: '+esc(r.doi)+'</span>':'')+(r.pmid?' <span>PMID: '+esc(r.pmid)+'</span>':'')+'</li>';
    }).join('');
    const evaluation=list([c.assessment.diagnostic,c.assessment.formative,c.assessment.summative,c.assessment.points,'Intentos: '+c.assessment.attempts]);
    document.getElementById('program').innerHTML='<div class="program-head"><p class="eyebrow">PROGRAMA DEL CURSO</p><h2>'+esc(c.name)+'</h2><p>'+esc(c.description)+'</p><div class="metrics"><span>'+c.modules.length+' módulos</span><span>'+esc(c.publicHours)+'</span><span>Revisión '+esc(c.reviewDate)+'</span></div></div><div class="content-grid">'+
      block('Propósito y destinatarios','<p>'+esc(c.purpose)+'</p><p><strong>Público objetivo:</strong> '+esc(c.target)+'</p><p><strong>Requisitos:</strong> '+esc(c.prerequisites)+'</p>')+
      block('Resultados de aprendizaje',list(c.results))+
      block('Módulos y contenidos','<div class="modules">'+modules+'</div>',true)+
      block('Metodología y actividades',list(c.methodology)+'<p class="notice">'+esc(c.privacy)+'</p>')+
      block('Sistema de evaluación',evaluation)+
      block('Aprobación y finalización','<p>'+esc(c.approval)+'</p><p><strong>Finalización:</strong> '+esc(c.completion)+'</p>',true)+
      block('Carga académica','<p>'+c.load.minutes+' minutos planificados ('+Math.floor(c.load.minutes/60)+' h '+c.load.minutes%60+' min).</p><p>'+esc(c.load.method)+'</p><p>Las duraciones son planificación de estudio, interacción y actividades; no un cronómetro ni acreditación de tiempo efectivo. No se incrementaron las horas declaradas.</p>')+
      block('Certificación','<p>'+esc(c.certification)+'</p>')+
      block('Bibliografía esencial','<ol class="refs">'+references+'</ol>',true)+
      block('Recurso complementario: Banderas Clínicas','<p>Herramienta formativa con trece fichas, filtros, favoritos y cuatro casos. No es un curso certificable y no tiene horas ni aprobación de curso asignadas.</p>',true)+
      '</div><p class="version">Versión académica '+esc(c.version)+' · Fecha de revisión '+esc(c.reviewDate)+'</p>';
  }
  fetch('../../docs/academic/programas-validados-2026-10-01.json?v=20261001-1').then(r=>{if(!r.ok)throw Error('program');return r.json();}).then(d=>{
    data=d;document.getElementById('course-nav').innerHTML=data.courses.map(c=>'<a href="#'+esc(c.slug)+'">'+esc(c.name)+'</a>').join('');render();window.addEventListener('hashchange',render);
  }).catch(()=>{document.getElementById('program').textContent='No fue posible cargar el programa en este momento. Vuelve a intentarlo desde Academy.';});
})();
