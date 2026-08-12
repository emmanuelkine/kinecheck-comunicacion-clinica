(()=>{try{const url=new URL(window.location.href);const before=url.search;const removable=new Set(['gclid','fbclid','msclkid','mc_cid','mc_eid']);[...url.searchParams.keys()].forEach(key=>{const lower=key.toLowerCase();if(lower.startsWith('utm_')||removable.has(lower))url.searchParams.delete(key)});if(url.search!==before){history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`)}}catch{}})();

(()=>{
  if(document.querySelector('script[data-kc-runtime]'))return;
  const runtime=document.createElement('script');
  runtime.src='../assets/runtime-config.js?v=20260807-1';
  runtime.async=false;
  runtime.dataset.kcRuntime='true';
  runtime.addEventListener('load',()=>{
    if(document.querySelector('script[data-kc-observability]'))return;
    const obs=document.createElement('script');
    obs.src='../assets/observability.js?v=20260807-1';
    obs.async=false;
    obs.dataset.kcObservability='true';
    document.head.appendChild(obs);
  });
  document.head.appendChild(runtime);
})();

document.addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');
  style.textContent='.recommendation-badge{display:inline-flex;align-self:flex-start;margin:0 0 .85rem;padding:.38rem .7rem;border-radius:999px;background:var(--green);color:#05241b;font-size:.72rem;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.recommendation-badge[hidden]{display:none}.product.recommended{border-color:rgba(85,214,165,.8);box-shadow:0 0 0 2px rgba(85,214,165,.16),0 24px 60px rgba(0,0,0,.28);transform:translateY(-5px)}.purchase-trust{margin:.55rem 0 0!important;padding:.7rem .8rem;border-radius:.75rem;background:rgba(255,255,255,.04);font-size:.78rem!important;line-height:1.4;color:#c8dadd!important;text-align:center}.product{transition:.25s transform,.25s border-color,.25s box-shadow}.product:focus{outline:3px solid rgba(85,214,165,.42);outline-offset:4px}@media(max-width:620px){.product.recommended{transform:none}}';
  document.head.appendChild(style);

  const isPublicHome=location.pathname==='/'||location.pathname==='/index.html';
  if(isPublicHome&&!document.querySelector('.hero-explore')){
    const heroCopy=document.querySelector('.hero > div');
    if(heroCopy){
      if(!document.querySelector('#kc-explore-runtime-style')){
        const exploreStyle=document.createElement('style');
        exploreStyle.id='kc-explore-runtime-style';
        exploreStyle.textContent='.hero-explore{width:min(780px,100%);margin-top:2.15rem;padding-top:1.15rem;border-top:1px solid rgba(255,255,255,.09)}.hero-explore-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.75rem}.hero-explore-label{color:#72e7df;font-size:.7rem;font-weight:900;letter-spacing:.17em;text-transform:uppercase}.hero-explore-head small{color:#82a4aa;font-size:.69rem;white-space:nowrap}.hero-explore-rail{display:flex;gap:.65rem;width:100%;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x proximity;padding:.12rem 0 .58rem;scrollbar-width:thin;scrollbar-color:rgba(190,218,218,.55) rgba(255,255,255,.05)}.hero-explore-pill{flex:0 0 auto;display:inline-flex;align-items:center;gap:.55rem;min-height:42px;padding:.42rem .78rem .42rem .46rem;border:1px solid rgba(158,232,224,.22);border-radius:999px;background:rgba(7,34,40,.8);color:#f4fbfb;font-size:.78rem;font-weight:850;text-decoration:none;scroll-snap-align:start;box-shadow:inset 0 1px 0 rgba(255,255,255,.04);transition:transform .18s ease,border-color .18s ease,background .18s ease}.hero-explore-pill:hover,.hero-explore-pill:focus-visible{transform:translateY(-2px);border-color:rgba(114,231,223,.48);background:rgba(12,54,61,.94);text-decoration:none}.hero-explore-pill b{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#74e3cf,#63d9e6);color:#073036;font-size:.63rem;letter-spacing:.03em}@media(max-width:700px){.hero-explore{margin-top:1.7rem}.hero-explore-head{align-items:flex-start;flex-direction:column;gap:.25rem}.hero-explore-head small{white-space:normal}}';
        document.head.appendChild(exploreStyle);
      }
      const explore=document.createElement('div');
      explore.className='hero-explore';
      explore.setAttribute('aria-label','Explora productos KineCheck');
      explore.innerHTML='<div class="hero-explore-head"><span class="hero-explore-label">Explora KineCheck</span><small>Toca un producto para conocerlo</small></div><div class="hero-explore-rail"><a class="hero-explore-pill" href="/productos/kinecheck-clinico/"><b>KC</b><span>KineCheck Clínico</span></a><a class="hero-explore-pill" href="/productos/comunicacion-clinica/"><b>CC</b><span>Comunicación Clínica</span></a><a class="hero-explore-pill" href="/productos/kinecheck-estudiante/"><b>KE</b><span>KineCheck Estudiante</span></a><a class="hero-explore-pill" href="/productos/kinecheck-recupera/"><b>KR</b><span>KineCheck Recupera</span></a></div>';
      heroCopy.appendChild(explore);
    }
  }

  const button=document.querySelector('[data-menu-button]');
  const nav=document.querySelector('[data-public-nav]');
  if(button&&nav){
    button.addEventListener('click',()=>{
      const open=nav.classList.toggle('open');
      button.setAttribute('aria-expanded',String(open));
      button.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
    });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      nav.classList.remove('open');
      button.setAttribute('aria-expanded','false');
      button.setAttribute('aria-label','Abrir menú');
    }));
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&nav.classList.contains('open')){
        nav.classList.remove('open');
        button.setAttribute('aria-expanded','false');
        button.setAttribute('aria-label','Abrir menú');
        button.focus();
      }
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const id=a.getAttribute('href');
    if(id&&id.length>1){
      const target=document.querySelector(id);
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth',block:'start'});
      }
    }
  }));

  const support=document.querySelectorAll('[data-support-email]');
  if(support.length){
    const user='soporte.kinecheck';
    const domain='gmail.com';
    const address=`${user}@${domain}`;
    support.forEach(link=>{
      link.href=`mailto:${address}`;
      link.textContent=address;
    });
  }

  const products=[...document.querySelectorAll('.product-showcase .product')];
  products.forEach((card,index)=>{
    card.dataset.profile=['pro','est','rec'][index]||'';
    const badge=document.createElement('span');
    badge.className='recommendation-badge';
    badge.textContent='Recomendado para comenzar';
    badge.hidden=index!==0;
    card.insertBefore(badge,card.querySelector('.product-preview'));
    const trust=document.createElement('p');
    trust.className='purchase-trust';
    trust.textContent='Compra procesada por Hotmart. Revisa las condiciones de pago y reembolso antes de finalizar.';
    const actions=card.querySelector('.product-actions');
    if(actions)actions.appendChild(trust);
  });
});
