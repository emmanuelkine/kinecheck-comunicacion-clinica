(() => {
  "use strict";
  const criteria = [
    "Explicita seguridad y condiciones que cambiarían la ruta",
    "Relaciona medidas de resultado con decisiones concretas",
    "Evita atribuir causalidad automática a la imagen",
    "Propone intervención, dosis, progresión y reevaluación individualizadas",
  ];
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function render() {
    const root = document.querySelector("#root");
    if (!root || root.hidden || document.querySelector("#kc-academic-final")) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("kc-academic:dolor-lumbar-persistente") || "null"); } catch {}
    const section = document.createElement("section");
    section.id = "kc-academic-final";
    section.style.cssText = "width:min(1060px,calc(100% - 28px));margin:24px auto 70px;padding:22px;border:1px solid rgba(82,220,210,.28);border-radius:22px;background:#08232c;color:#eaf8f8;font-family:system-ui,sans-serif";
    section.innerHTML = '<h2 style="color:#fff">Actividad integradora · 40 minutos</h2><h3 style="color:#fff">Dolor Lumbar Persistente</h3><p>Caso simulado: persona de 39 años con dolor lumbar persistente de 14 meses, temor a flexionarse, resonancia con cambios degenerativos, baja actividad y preocupación por volver a su trabajo. Construye una representación del problema; prioriza seguridad; selecciona dos PROMs o medidas funcionales justificadas; propone educación, ejercicio o exposición inicial; define dosis y criterios de progresión y reevaluación.</p><p>Trabaja con este caso simulado o con un caso completamente anonimizado. No incluyas nombres, RUT, contactos ni otros datos que permitan identificar a un paciente.</p><label for="kc-af-r">Desarrollo del caso</label><textarea id="kc-af-r" style="width:100%;min-height:200px;padding:12px;border-radius:10px">'+escapeHtml(saved?.text || "")+'</textarea><p>Revisa tu respuesta con los cuatro criterios antes de enviarla.</p>'+criteria.map((text,i)=>'<label style="display:block;margin:9px 0"><input type="checkbox" data-kc-af="'+i+'" '+(saved?.completed ? 'checked' : '')+'> '+escapeHtml(text)+'</label>').join('')+'<button id="kc-af-save" style="min-height:44px;padding:0 16px;border:0;border-radius:10px;background:#65ddd5;font-weight:800">'+(saved?.serverCompleted ? 'Actividad registrada ✓' : 'Guardar actividad')+'</button><p id="kc-af-status">'+(saved?.serverCompleted ? 'Actividad registrada en KineCheck.' : 'Desarrolla al menos 550 caracteres y revisa los cuatro criterios.')+'</p>';
    root.insertAdjacentElement("afterend", section);
  }
  new MutationObserver(render).observe(document.documentElement, {subtree:true,childList:true,attributes:true,attributeFilter:["hidden"]});
  window.addEventListener("kinecheck:course-authorized", render);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render); else render();
})();
