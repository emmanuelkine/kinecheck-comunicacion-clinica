(function(){
'use strict';
var s=document.createElement('script');
s.src='./loader-v6.js?v=20260816-6';
s.defer=true;
s.onerror=function(){var a=document.getElementById('app');if(a){a.innerHTML='<main class="shell boot"><section class="hero"><div class="glass hero-main"><div class="eyebrow">KineCheck · error de carga</div><h1>Dolor lumbar<br><span>persistente.</span></h1><p>No se pudo activar la versión premium del preview. Recarga la página.</p></div></section></main>';}};
document.body.appendChild(s);
})();