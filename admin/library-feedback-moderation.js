(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const escapeText = (value) => String(value ?? "");
  const status = $("#status");
  let session;
  try { session = JSON.parse(sessionStorage.getItem("kinecheck_admin_session_v1") || "null"); } catch {}

  const areaNames = { contenido: "Más contenido", navegacion: "Navegación", diseno: "Diseño e imágenes", descargas: "Descargas y PDF", nada: "Sin mejoras sugeridas", otro: "Otra sugerencia" };
  function makeReview(row, pending) {
    const article = document.createElement("article"); article.className = "review";
    const head = document.createElement("div"); head.className = "review-head";
    const meta = document.createElement("span"); meta.textContent = `${"★".repeat(row.rating)}${"☆".repeat(5-row.rating)} · ${areaNames[row.area] || "Experiencia"} · ${row.page}`;
    const date = document.createElement("time"); date.dateTime = row.createdAt; date.textContent = new Date(row.createdAt).toLocaleString("es-CL");
    head.append(meta, date); article.append(head);
    const comment = document.createElement("p"); comment.className = "comment"; comment.textContent = row.comment || "Sin comentario escrito."; article.append(comment);
    if (pending) {
      const controls = document.createElement("div"); controls.className = "actions";
      const approve = document.createElement("button"); approve.type = "button"; approve.textContent = "Aprobar y publicar";
      const reject = document.createElement("button"); reject.type = "button"; reject.className = "reject"; reject.textContent = "Rechazar";
      approve.addEventListener("click", () => moderate(row.key, "approved", approve, reject));
      reject.addEventListener("click", () => moderate(row.key, "rejected", approve, reject));
      controls.append(approve, reject); article.append(controls);
    } else {
      const decision = document.createElement("p"); decision.className = "muted"; decision.textContent = row.status === "approved" ? "Aprobado y visible en la biblioteca" : "Rechazado; no se muestra al público"; article.append(decision);
    }
    return article;
  }

  async function moderate(key, decision, approve, reject) {
    approve.disabled = reject.disabled = true;
    try {
      const response = await fetch("/api/library-feedback", { method: "PUT", headers: { "content-type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ key, decision }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo guardar la decisión.");
      await load();
    } catch (error) {
      status.textContent = error.message;
      approve.disabled = reject.disabled = false;
    }
  }

  async function load() {
    if (!session?.access_token) { status.textContent = "Inicia sesión primero en /admin/ desde esta misma pestaña."; return; }
    status.textContent = "Cargando valoraciones…";
    try {
      const response = await fetch("/api/library-feedback?admin=1", { headers: { Authorization: `Bearer ${session.access_token}`, Accept: "application/json" }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudieron consultar las valoraciones.");
      $("#count").textContent = String(data.count);
      $("#average").textContent = data.average === null ? "Sin datos" : `${data.average}/5`;
      $("#pending-count").textContent = String(data.pending.length);
      const distribution = $("#distribution"); distribution.replaceChildren();
      [1, 2, 3, 4, 5].forEach((n) => { const item = document.createElement("div"); item.className = "dist"; item.textContent = `${n} ★ · ${data.distribution[n-1]}`; distribution.append(item); });
      const pending = $("#pending"); pending.replaceChildren();
      data.pending.forEach((row) => pending.append(makeReview(row, true)));
      if (!data.pending.length) { const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = "No hay opiniones pendientes."; pending.append(empty); }
      const recent = $("#recent"); recent.replaceChildren();
      data.recent.forEach((row) => recent.append(makeReview(row, false)));
      if (!data.recent.length) { const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = "Todavía no hay decisiones de moderación."; recent.append(empty); }
      $("#results").hidden = false;
      status.textContent = "Datos actualizados. Los resultados públicos incluyen solo valoraciones aprobadas.";
    } catch (error) { status.textContent = error.message; }
  }
  $("#load").addEventListener("click", load);
  load();
})();
