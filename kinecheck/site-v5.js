(()=>{try{const url=new URL(window.location.href);const before=url.search;const removable=new Set(['gclid','fbclid','msclkid','mc_cid','mc_eid']);[...url.searchParams.keys()].forEach(key=>{const lower=key.toLowerCase();if(lower.startsWith('utm_')||removable.has(lower))url.searchParams.delete(key)});if(url.search!==before){history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`)}}catch{}})();

(()=>{
  if(document.querySelector('script[data-kc-runtime]'))return;
  const runtime=document.createElement('script');runtime.src='../assets/runtime-config.js?v=20260807-1';runtime.async=false;runtime.dataset.kcRuntime='true';
  runtime.addEventListener('load',()=>{if(document.querySelector('script[data-kc-observability]'))return;const obs=document.createElement('script');obs.src='../assets/observability.js?v=20260807-1';obs.async=false;obs.dataset.kcObservability='true';document.head.appendChild(obs);});document.head.appendChild(runtime);
})();

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.kc-stars').forEach(stars=>stars.remove());

  const path=location.pathname;
  const educational=path.includes('/estudiantes')||path.includes('/profesionales');
  if(educational){const main=document.querySelector('main');if(main&&!document.querySelector('.kc-privacy-notice')){const n=document.createElement('div');n.className='kc-privacy-notice';n.innerHTML='<strong>Uso educativo y formativo.</strong> KineCheck Clínico y KineCheck Estudiante no son fichas clínicas ni repositorios de pacientes. En ejercicios, casos, notas o campos de práctica utiliza exclusivamente información ficticia, simulada o debidamente anonimizada. No ingreses nombres, RUT, teléfonos, correos, fotografías identificables, números de ficha ni otros datos que permitan identificar a un paciente real.';main.insertBefore(n,main.children[1]||null);}}

  document.querySelectorAll('a[href*="kinecheck-recupera"],a[href="./recupera/"],a[href="../recupera/"]').forEach(a=>{a.removeAttribute('target');a.href='/recupera/';const text=(a.textContent||'').trim();if(text&&!text.toLowerCase().includes('próximamente'))a.textContent=text+' · Próximamente';});
  document.querySelectorAll('.audience-card.rec').forEach(card=>{const p=card.querySelector('p');if(p)p.textContent='KineCheck Recupera está en revisión de privacidad y protección de datos antes de su habilitación.';const b=card.querySelector('b');if(b)b.textContent='Próximamente →';});

  const button=document.querySelector('[data-menu-button]'),nav=document.querySelector('[data-public-nav]');if(button&&nav){button.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Abrir menú');}));document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('open')){nav.classList.remove('open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Abrir menú');button.focus();}});}
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');if(id&&id.length>1){const target=document.querySelector(id);if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}}}));
  const support=document.querySelectorAll('[data-support-email]');if(support.length){const address='soporte.kinecheck@gmail.com';support.forEach(link=>{link.href=`mailto:${address}`;link.textContent=address;});}
});
