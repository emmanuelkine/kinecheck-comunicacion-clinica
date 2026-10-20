/* KineCheck · Audioguía para la biblioteca pública. No envía texto a servicios externos. */
(()=>{"use strict";
if(window.__KC_FREE_NARRATION__||!/^\/gratis(?:\/|$)/.test(location.pathname))return;
window.__KC_FREE_NARRATION__=true;
const synth=window.speechSynthesis;
if(!synth||typeof window.SpeechSynthesisUtterance!=="function")return;
let chunks=[],index=0,active=false,paused=false,session=0;
const css=document.createElement("style");
css.textContent=`
#kc-audio-guide{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:min(350px,calc(100vw - 36px));color:#edfafa;background:#0b3038;border:1px solid #73ddd7;border-radius:16px;box-shadow:0 14px 36px #0009;padding:14px;font:15px/1.4 system-ui,sans-serif}
#kc-audio-guide button{border-radius:9px;padding:9px 12px;font:600 14px system-ui;cursor:pointer;border:1px solid #77e6dc;background:#87ede3;color:#062f36}
#kc-audio-guide button:disabled{opacity:.5;cursor:not-allowed}
#kc-audio-guide button.secondary{background:transparent;color:#d5f9f6}
#kc-audio-guide .kc-audio-buttons{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
#kc-audio-guide .kc-audio-title{font-weight:800;font-size:15px}
#kc-audio-guide .kc-audio-status{font-size:12px;color:#d1e8e8;margin-top:5px}
#kc-audio-guide .kc-audio-collapse{float:right;padding:3px 8px;background:transparent;color:white}
#kc-audio-guide button:focus-visible{outline:3px solid #ffc87a;outline-offset:2px}
@media(max-width:700px){#kc-audio-guide{position:relative;inset:auto;right:auto;bottom:auto;z-index:1;width:100%;max-width:100%;margin:16px 0 22px;box-shadow:0 5px 18px #0004}#kc-audio-guide .kc-audio-buttons button{min-height:44px}}\n@media print{#kc-audio-guide{display:none!important}}
`;
document.head.appendChild(css);
const root=document.createElement("section");root.id="kc-audio-guide";root.setAttribute("aria-label","Escuchar explicación de KineCheck");
root.innerHTML='<button type="button" class="kc-audio-collapse secondary" aria-label="Minimizar controles de audio" aria-expanded="true">−</button><div class="kc-audio-title">♫ Escuchar explicación</div><div class="kc-audio-content"><div class="kc-audio-status" role="status" aria-live="polite">Escucha el contenido educativo de esta página.</div><div class="kc-audio-buttons"><button type="button" data-audio="play">Escuchar</button><button type="button" class="secondary" data-audio="pause" disabled>Pausar</button><button type="button" class="secondary" data-audio="stop" disabled>Detener</button></div><div style="font-size:11px;margin-top:8px;color:#badbdc">Voz disponible según tu navegador. El audio no se guarda ni se envía a KineCheck.</div></div>';
const contentMain=document.querySelector("main");
if(contentMain)contentMain.insertBefore(root,contentMain.firstChild);else document.body.insertBefore(root,document.body.firstChild);
const $=s=>root.querySelector(s),status=$(".kc-audio-status"),play=$('[data-audio="play"]'),pause=$('[data-audio="pause"]'),stop=$('[data-audio="stop"]');
function update(message){status.textContent=message;play.textContent=active?"Reiniciar":"Escuchar";pause.disabled=!active;pause.textContent=paused?"Continuar":"Pausar";stop.disabled=!active;}
function cancel(){session++;active=false;paused=false;chunks=[];index=0;synth.cancel();update("Reproducción detenida.");}
function getText(){
const target=document.querySelector("main")||document.querySelector("article:not([hidden])")||document.querySelector("article")||document.querySelector('[role="main"]');
if(!target)return "";
const copy=target.cloneNode(true);
copy.querySelectorAll('script,style,svg,nav,aside,footer,form,button,input,select,textarea,video,audio,iframe,[hidden],[aria-hidden="true"],[inert],.lock,.lockcard,.locked,.paywall,[data-locked],[data-premium],#kc-audio-guide').forEach(n=>n.remove());
const parts=[...copy.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,figcaption')].filter(el=>!el.closest('[hidden],[aria-hidden="true"],[inert],.lock,.lockcard,.locked,.paywall,[data-locked],[data-premium]')).map(el=>(el.textContent||"").replace(/\s+/g," ").trim()).filter(t=>t.length>3);
return [...new Set(parts)].join(". ").slice(0,36000);
}
function splitSpeech(text){let sentences=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[text],out=[],curr="";for(const s of sentences){if((curr+" "+s).length>190){if(curr)out.push(curr);curr=s.trim();while(curr.length>220){out.push(curr.slice(0,200));curr=curr.slice(200);}}else curr+=" "+s;}if(curr.trim())out.push(curr.trim());return out;}
function say(token){if(!active||token!==session)return;if(index>=chunks.length){active=false;paused=false;update("Explicación finalizada.");return;}
const u=new SpeechSynthesisUtterance(chunks[index]);u.lang="es-CL";u.rate=.93;u.pitch=1;
const voces=synth.getVoices();const chosen=voces.find(v=>v.lang.toLowerCase()==="es-cl")||voces.find(v=>v.lang.toLowerCase().startsWith("es"));if(chosen)u.voice=chosen;
u.onend=()=>{if(token!==session)return;index++;say(token)};
u.onerror=(e)=>{if(token!==session)return;if(e.error==="interrupted"||e.error==="canceled")return;active=false;paused=false;update("No fue posible reproducir audio. Comprueba la voz del navegador.");};
update("Reproduciendo fragmento "+(index+1)+" de "+chunks.length+".");synth.speak(u);
}
play.addEventListener("click",()=>{cancel();const text=getText();if(!text){update("Esta página no tiene texto principal disponible para lectura.");return;}chunks=splitSpeech(text);index=0;active=true;paused=false;const token=session;setTimeout(()=>say(token),80);});
pause.addEventListener("click",()=>{if(!active)return;if(paused){synth.resume();paused=false;update("Reproducción reanudada.");}else{synth.pause();paused=true;update("Audio en pausa.");}});
stop.addEventListener("click",cancel);
const collapse=$(".kc-audio-collapse"),details=$(".kc-audio-content");
collapse.addEventListener("click",()=>{details.hidden=!details.hidden;collapse.textContent=details.hidden?"+":"−";collapse.setAttribute("aria-expanded",String(!details.hidden));collapse.setAttribute("aria-label",details.hidden?"Expandir controles de audio":"Minimizar controles de audio");});
window.addEventListener("pagehide",()=>{if(active)cancel()});
})();
