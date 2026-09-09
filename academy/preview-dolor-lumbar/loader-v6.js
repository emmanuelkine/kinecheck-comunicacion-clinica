(function(){
'use strict';
function css(href){var l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l);}
function script(src,cb){var s=document.createElement('script');s.src=src;s.defer=true;s.onload=cb||function(){};s.onerror=function(){var a=document.getElementById('app');if(a)a.innerHTML='<main class="shell boot"><section class="hero"><div class="glass hero-main"><div class="eyebrow">KineCheck · error de carga</div><h1>Dolor lumbar<br><span>persistente.</span></h1><p>No se pudo cargar un recurso del preview. Recarga la página o abre nuevamente el enlace.</p></div></section></main>';};document.body.appendChild(s);}
css('./premium-v6.css?v=20260816-6');
script('./data-v6.js?v=20260816-6',function(){script('./app-v6.js?v=20260816-6');});
})();