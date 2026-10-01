(() => {
  'use strict';
  const script=document.currentScript,slug=script?.dataset.course;
  if(!slug)return;
  const base=new URL('.',script.src);
  function apply(){
    if(document.getElementById('kc-academic-program-link'))return;
    const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('academic-program-link-v1.css?v=20261001-1',base).href;document.head.append(style);
    const section=document.createElement('aside');section.id='kc-academic-program-link';section.setAttribute('aria-label','Programa y privacidad formativa');
    const link=document.createElement('a');link.href=new URL('academy/programas/#'+slug,base).href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Ver programa académico ↗';
    const note=document.createElement('p');note.textContent='Usa casos simulados o anonimizados. No ingreses datos identificables de pacientes; este entorno formativo no reemplaza una ficha clínica.';
    section.append(link,note);document.body.append(section);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
