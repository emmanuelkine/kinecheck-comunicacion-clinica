(() => {
  "use strict";
  const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
  const ANON_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";
  const SESSION_KEY = "kinecheck_admin_session_v1";
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const stateLabel = { using:"Uso real", login_only:"Solo login", inactive:"Sin actividad" };
  let session = null;

  function readSession(){ try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");}catch{return null;} }
  function saveSession(value){ session=value; sessionStorage.setItem(SESSION_KEY,JSON.stringify(value)); }
  function clearSession(){ session=null; sessionStorage.removeItem(SESSION_KEY); }
  function formatDate(v){ if(!v) return "—"; try{return new Intl.DateTimeFormat("es-CL",{dateStyle:"short",timeStyle:"short"}).format(new Date(v));}catch{return String(v);} }

  async function login(email,password){
    const response=await fetch(`${SUPABASE_URL}/functions/v1/platform-login`,{method:"POST",cache:"no-store",headers:{apikey:ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data?.error_description||data?.message||"No fue posible ingresar.");
    saveSession(data);
  }

  async function fetchStatus(){
    if(!session?.access_token) throw new Error("Sesión requerida.");
    const response=await fetch(`${SUPABASE_URL}/functions/v1/automation-status`,{method:"POST",cache:"no-store",headers:{apikey:ANON_KEY,Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:"{}"});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data?.message||"No fue posible cargar el estado.");
    return data;
  }

  function render(data){
    const root=$("#kinecheck-status-center");
    const sc=data.statusCenter;
    $("#status-account").textContent=data.email||"";
    $("#status-generated").textContent=`Actualizado: ${formatDate(data.generatedAt)}`;
    if(!sc){root.innerHTML='<div class="status-empty">Status Center no disponible.</div>';return;}
    const overallText=sc.overall==="stable"?"Estable":"Requiere atención";
    root.innerHTML=`
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

  async function load(){
    const data=await fetchStatus();
    $("#status-login").hidden=true;
    $("#status-app").hidden=false;
    render(data);
  }

  $("#status-login-form")?.addEventListener("submit",async(e)=>{
    e.preventDefault();
    const button=$("#status-login-button"),msg=$("#status-login-message");
    msg.hidden=true; button.disabled=true; button.textContent="Verificando…";
    try{await login($("#status-email").value.trim().toLowerCase(),$("#status-password").value); await load();}
    catch(error){clearSession(); msg.textContent=error.message; msg.hidden=false;}
    finally{button.disabled=false; button.textContent="Ingresar";}
  });

  $("#status-refresh")?.addEventListener("click",()=>load().catch((e)=>{const root=$("#kinecheck-status-center");root.innerHTML=`<div class="status-empty">${esc(e.message)}</div>`;}));
  $("#status-logout")?.addEventListener("click",()=>{clearSession();location.reload();});
  session=readSession();
  if(session?.access_token) load().catch(()=>{clearSession();});
})();