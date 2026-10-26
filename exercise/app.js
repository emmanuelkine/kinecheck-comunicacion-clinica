(() => {
  "use strict";

  const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
  const SUPABASE_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const API = `${SUPABASE_URL}/functions/v1/exercise-pro-api`;
  const conditions = [
    { id: "low-back-pain", name: "Dolor lumbar inespecífico", demo: true, note: "Evidencia para adultos con dolor lumbar primario crónico: alcance específico." },
    { id: "patellar-tendinopathy", name: "Tendinopatía rotuliana", demo: true, note: "Hallazgo de un ensayo en atletas de 18 a 35 años." },
    { id: "neck-pain", name: "Cervicalgia", demo: false },
    { id: "knee-osteoarthritis", name: "Artrosis de rodilla", demo: false },
    { id: "hip-osteoarthritis", name: "Artrosis de cadera", demo: false },
    { id: "achilles-tendinopathy", name: "Tendinopatía aquílea", demo: false },
    { id: "rotator-cuff-related-shoulder-pain", name: "Dolor de hombro relacionado con manguito rotador", demo: false },
    { id: "patellofemoral-pain", name: "Dolor femoropatelar", demo: false },
    { id: "lateral-epicondylalgia", name: "Epicondilalgia lateral", demo: false },
    { id: "lateral-ankle-sprain", name: "Esguince lateral de tobillo", demo: false }
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const refs = { conditions: $("#condition-list"), consult: $("#consultation"), result: $("#results"), evidence: $("#evidence-result"), form: $("#clinical-form"), message: $("#form-message"), proMessage: $("#pro-message"), proTools: $("#pro-tools") };
  let currentCondition = null;
  let sourceData = [];
  let proAuthorized = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function buildConditions() {
    for (const condition of conditions) {
      const card = element("article", `condition-card${condition.demo ? "" : " is-pro"}`);
      const title = element("h3", "", condition.name);
      const note = element("p", "", condition.demo ? condition.note : "Contenido ampliado, herramientas clínicas y referencias verificables disponibles en Pro.");
      const button = element("button", `button ${condition.demo ? "button-secondary" : "button-quiet"}`, condition.demo ? "Ver evidencia" : "🔒 Pro · Ver beneficios");
      button.type = "button";
      if (condition.demo) {
        button.setAttribute("aria-label", `Ver evidencia de ${condition.name}`);
        button.addEventListener("click", () => selectCondition(condition));
      } else {
        button.setAttribute("aria-label", `${condition.name}, bloqueada hasta activar Pro`);
        button.addEventListener("click", () => {
          refs.proMessage.textContent = `Pro para ${condition.name}: resúmenes clínicos ampliados, referencias con límites de aplicabilidad y calculadoras con acceso verificado. Compra pendiente de configuración.`;
          $("#pro-access").scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
      card.append(title, note, button);
      refs.conditions.append(card);
    }
  }

  async function selectCondition(condition) {
    currentCondition = condition;
    $("#consult-title").textContent = `Criterios para contextualizar: ${condition.name}`;
    refs.consult.hidden = false;
    refs.result.hidden = true;
    refs.form.reset();
    refs.message.textContent = "";
    refs.consult.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!sourceData.length) {
      try {
        const response = await fetch("/exercise/evidence.json", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) throw new Error("No fue posible cargar las referencias.");
        const payload = await response.json();
        sourceData = Array.isArray(payload.items) ? payload.items : [];
      } catch {
        refs.message.textContent = "La evidencia no está disponible en este momento. Intenta nuevamente.";
      }
    }
  }

  function addDefinition(list, term, value) {
    const row = element("div");
    row.append(element("dt", "", term), element("dd", "", value || "No determinado por la fuente consultada."));
    list.append(row);
  }

  function renderEvidence(item, context) {
    refs.evidence.replaceChildren();
    const card = element("article", "result-card");
    const badge = element("span", "tag", item.kind === "clinical-guideline" ? "RECOMENDACIÓN DE GUÍA" : "HALLAZGO DE ESTUDIO");
    card.append(badge, element("h3", "", item.title), element("p", "", item.citation));
    const contextLine = element("p", "", `Contexto seleccionado: ${context.activity || "actividad no indicada"}; irritabilidad ${context.irritability || "no indicada"}; tolerancia a carga ${context.tolerance || "no indicada"}. Estos campos se usan solo en esta sesión y no se interpretan como diagnóstico.`);
    card.append(contextLine);
    const details = element("dl");
    addDefinition(details, "Población estudiada", item.population);
    addDefinition(details, "Intervención", item.intervention);
    addDefinition(details, "Resultado", item.result);
    addDefinition(details, "Certeza / diseño", item.recommendation || item.certainty || "No se asignó certeza GRADE en esta aplicación.");
    addDefinition(details, "Aplicabilidad y límites", item.limitations);
    addDefinition(details, "FITT-VP", item.condition === "low-back-pain" ? "La guía no establece aquí una dosis universal: modalidad, frecuencia, intensidad, volumen y progresión requieren revisión individual." : "El protocolo del ensayo describe etapas y respuesta al dolor, pero no es una dosis universal. La ficha no resume un volumen completo por ejercicio.");
    card.append(details);
    const editorial = element("p", "", `Decisión editorial: ${item.editorialDecision}`);
    card.append(editorial);
    const link = element("a", "", "Abrir fuente verificable ↗");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    card.append(link);
    refs.evidence.append(card);
    const banner = element("div", "notice notice-review");
    banner.setAttribute("role", "note");
    banner.append(element("strong", "", "Sin recomendación individual"), element("span", "", "Este resultado muestra evidencia contextualizada. No calcula dosis, progresión ni autorización para hacer ejercicio. Revisión profesional pendiente."));
    refs.evidence.append(banner);
    refs.result.hidden = false;
    refs.result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  refs.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentCondition) return;
    const data = new FormData(refs.form);
    const ageRaw = String(data.get("age") || "").trim();
    const age = ageRaw ? Number(ageRaw) : null;
    if (ageRaw && (!Number.isInteger(age) || age < 1 || age > 120)) {
      refs.message.textContent = "Ingresa una edad entre 1 y 120 años o deja el campo vacío.";
      $("[name=age]").focus();
      return;
    }
    if (!data.get("safety-read")) {
      refs.message.textContent = "Confirma que revisaste los criterios de seguridad antes de continuar.";
      $("[name=safety-read]").focus();
      return;
    }
    if (data.get("limitations") !== "No identificadas en evaluación") {
      refs.message.textContent = "La opción seleccionada indica que se requiere evaluación o revisión antes de continuar. No se muestra orientación de ejercicio.";
      return;
    }
    const item = sourceData.find((entry) => entry.condition === currentCondition.id);
    if (!item) {
      refs.message.textContent = "No hay una ficha de evidencia disponible para esta condición.";
      return;
    }
    refs.message.textContent = "";
    renderEvidence(item, {
      age,
      activity: String(data.get("activity") || ""),
      irritability: String(data.get("irritability") || ""),
      tolerance: String(data.get("tolerance") || ""),
      goal: String(data.get("goal") || ""),
      experience: String(data.get("experience") || "")
    });
  });

  $("#clear-result").addEventListener("click", () => {
    refs.result.hidden = true;
    refs.evidence.replaceChildren();
    refs.form.reset();
  });

  function readSession() {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!session?.access_token) return null;
      return session;
    } catch { return null; }
  }

  async function refreshSession(session) {
    if (!session?.refresh_token) return null;
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST", cache: "no-store", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!response.ok) return null;
    const updated = await response.json();
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    return updated;
  }

  async function verifyPro(session) {
    if (!session?.access_token) return { authorized: false, code: "NO_SESSION" };
    const response = await fetch(API, {
      method: "POST", cache: "no-store", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "access" })
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && session.refresh_token) {
      const refreshed = await refreshSession(session);
      if (refreshed) return verifyPro(refreshed);
    }
    if (!response.ok || payload.authorized !== true) return { authorized: false, code: payload.code || "ACCESS_NOT_ACTIVE", message: payload.message };
    return { authorized: true, session };
  }

  $("#verify-pro").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    refs.proMessage.textContent = "Verificando sesión y licencia activa en el servidor…";
    try {
      const session = readSession();
      const result = await verifyPro(session);
      proAuthorized = result.authorized;
      refs.proTools.hidden = !proAuthorized;
      refs.proMessage.textContent = proAuthorized ? "Acceso Pro validado por el servidor. Cada calculadora volverá a validar la autorización." : (result.code === "NO_SESSION" ? "Inicia sesión en KineCheck y vuelve a verificar. No hay datos Pro en esta página." : result.message || "No existe un acceso Pro activo para esta cuenta.");
      if (proAuthorized) refs.proTools.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      proAuthorized = false;
      refs.proTools.hidden = true;
      refs.proMessage.textContent = "No pudimos verificar el acceso en este momento. El contenido Pro sigue bloqueado.";
    } finally { button.disabled = false; }
  });

  document.querySelectorAll(".calculator").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const output = $("output", form);
    output.textContent = "";
    if (!proAuthorized) {
      refs.proTools.hidden = true;
      refs.proMessage.textContent = "Vuelve a verificar una sesión autorizada antes de usar las calculadoras.";
      return;
    }
    const inputs = Object.fromEntries(new FormData(form).entries());
    for (const key of Object.keys(inputs)) inputs[key] = Number(inputs[key]);
    const button = $("button[type=submit]", form);
    button.disabled = true;
    try {
      const session = readSession();
      const access = await verifyPro(session);
      if (!access.authorized) {
        proAuthorized = false;
        refs.proTools.hidden = true;
        refs.proMessage.textContent = "La licencia no está activa; el contenido Pro se bloqueó.";
        return;
      }
      const response = await fetch(API, {
        method: "POST", cache: "no-store", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${access.session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: form.dataset.action, inputs })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No fue posible completar el cálculo.");
      output.textContent = payload.label;
    } catch (error) {
      output.textContent = error instanceof Error ? error.message : "Error de cálculo.";
    } finally { button.disabled = false; }
  }));

  async function renderReferences() {
    const list = $("#reference-list");
    try {
      const response = await fetch("/exercise/evidence.json", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      for (const item of [...(payload.items || []), ...(payload.additionalSources || [])]) {
        const card = element("article", "reference-card");
        const heading = element("h3", "", item.citation);
        const info = element("p", "", `${item.kind === "clinical-guideline" ? "Guía clínica" : item.kind === "randomized-clinical-trial" ? "Ensayo clínico" : item.kind === "safety-guideline" ? "Seguridad clínica" : "Método de cálculo"} · ${item.year} · Revisión bibliográfica ${payload.reviewedOn}. Revisión clínica pendiente.`);
        const a = element("a", "", item.doi ? `DOI ${item.doi}` : "Enlace oficial de WHO");
        a.href = item.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        card.append(heading, info, a);
        list.append(card);
      }
    } catch { list.append(element("p", "muted", "No fue posible cargar las referencias.")); }
  }

  buildConditions();
  renderReferences();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/exercise/sw.js", { scope: "/exercise/" }).catch(() => {});
})();
