(() => {
  "use strict";
  const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
  const ANON_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";
  const SESSION_KEY = "kinecheck_admin_session_v1";
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const stateLabel = { using:"Uso real", login_only:"Solo login", inactive:"Sin actividad" };

  function mount(){
    if ($("#kinecheck-status-center")) return;
    const anchor = $("#metric-grid");
    if (!anchor) return;
    const section = document.createElement("section");
    section.id = "kinecheck-status-center";
    section.className = "status-center";
    section.innerHTML = '<div class="status-empty">Cargando KineCheck Status Center…</div>';
    anchor.insertAdjacentElement("beforebegin", section);
  }

  function readSession(){ try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");}catch{return null;} }
  async function fetchData(){
    const session = readSession();
    if (!session?.access_token) return null;
    const response = await fetch(`${SUPABASE_URL}/functions/v1/automation-status`,{
      method:"POST",cache:"no-store",headers:{apikey:ANON_KEY,Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:"{}"
    });
    const data = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data?.message||"No fue posible cargar Status Center.");
    return data;
  }

  function render(data){
    const root = $("#kinecheck-status-center"); if(!root) return;
    const sc = data.statusCenter;
    if(!sc){root.innerHTML='<div class="status-empty">Status Center aún no disponible.</div>';return;}
    const overallText = sc.overall === "stable" ? "Estable" : "Requiere atención";
    const testers = sc.beta?.testers || sc.testers || [];
    root.innerHTML = `
      <div class="status-head">
        <div><span class="eyebrow">KINECHECK STATUS CENTER</span><h2>Salud real del ecosistema</h2><p>Producción · testers · incidencias · correcciones globales</p></div>
        <span class="status-badge ${esc(sc.overall)}">${overallText}</span>
      </div>
      <div class="status-grid">
        <article class="status-card"><h3>Estado por sistema</h3><div class="health-list">${(sc.health||[]).map(h=>`<div class="health-row ${esc(h.status)}"><span>${esc(h.label)}</span><div class="health-track"><div class="health-fill" style="width:${Math.max(0,Math.min(100,Number(h.score)||0))}%"></div></div><div class="health-score">${esc(h.score)}%</div></div>`).join("")}</div></article>
        <article class="status-card"><h3>Beta ahora</h3><div class="beta-kpis"><article><strong>${esc(sc.beta?.totalActiveSlots||0)}</strong><small>Cupos vigentes</small></article><article><strong>${esc(sc.beta?.using||0)}</strong><small>Uso real</small></article><article><strong>${esc(sc.beta?.loginOnly||0)}</strong><small>Solo login</small></article><article><strong>${esc(sc.beta?.inactive||0)}</strong><small>Inactivos</small></article></div><p style="margin:12px 0 0;color:#9fb9be;font-size:.8rem">Activación: <strong style="color:#fff">${esc(sc.beta?.activationRate||0)}%</strong> · Incidencias críticas abiertas: <strong style="color:#fff">${esc(sc.openCriticalIssues||0)}</strong></p></article>
        <article class="status-card"><h3>Testers</h3><div class="tester-list">${(sc.testers||[]).length?(sc.testers||[]).map(t=>`<div class="tester-row"><strong>${esc(t.email)}</strong><small>${esc((t.activeCourses||[]).join(" · ")||"Sin acceso vigente")}</small><span class="activity-pill ${esc(t.activityState)}">${esc(stateLabel[t.activityState]||t.activityState)}</span></div>`).join(""):'<div class="status-empty">Sin testers registrados.</div>'}</div></article>
        <article class="status-card"><h3>Correcciones globales</h3><div class="fix-list">${(sc.recentFixes||[]).map(f=>`<div class="fix-item"><span class="fix-dot"></span><div><strong>${esc(f.title)}</strong><small>${esc(f.note)} · Alcance: ${esc(f.scope)}</small></div></div>`).join("")}</div></article>
      </div>`;
  }

  async function refresh(){
    mount();
    try{const data=await fetchData(); if(data) render(data);}catch(error){const root=$("#kinecheck-status-center"); if(root) root.innerHTML=`<div class="status-empty">${esc(error.message)}</div>`;}
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>{mount(); refresh();},{once:true}); else {mount(); refresh();}
  window.addEventListener("focus",refresh);
  $("#refresh-button")?.addEventListener("click",()=>window.setTimeout(refresh,250));
})();