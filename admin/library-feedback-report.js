(() => {
  "use strict";
  const root = document.getElementById("kc-feedback-report");
  if (!root) return;
  const load = async () => {
    let session;
    try { session = JSON.parse(sessionStorage.getItem("kinecheck_admin_session_v1") || "null"); } catch {}
    if (!session?.access_token) { root.textContent = "Inicia sesión para ver las opiniones."; return; }
    root.textContent = "Cargando valoraciones…";
    try {
      const response = await fetch("/api/library-feedback?admin=1", {
        headers: { Authorization: `Bearer ${session.access_token}`, Accept: "application/json" },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudieron consultar las valoraciones.");
      const summary = document.createElement("p");
      summary.textContent = `${data.count} evaluaciones aprobadas · promedio ${data.average === null ? "sin datos" : `${data.average}/5`} · ${data.pending.length} pendientes de moderación · últimos 30 días`;
      const distribution = document.createElement("div");
      distribution.setAttribute("aria-label", "Distribución de las valoraciones aprobadas");
      distribution.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin:12px 0";
      [1, 2, 3, 4, 5].forEach((rating) => {
        const badge = document.createElement("span");
        badge.textContent = `${rating} ★: ${data.distribution[rating - 1]}`;
        badge.style.cssText = "display:inline-block;background:#10343c;border:1px solid #427b82;border-radius:9px;padding:8px 11px;color:#dff8f6";
        distribution.append(badge);
      });
      const moderationLink = document.createElement("a");
      moderationLink.href = "/admin/feedback/";
      moderationLink.textContent = data.pending.length ? `Revisar ${data.pending.length} opinión(es) pendientes →` : "Abrir moderación de opiniones →";
      moderationLink.style.cssText = "display:inline-block;margin:7px 0;color:#70e8de;font-weight:800";
      root.replaceChildren(summary, distribution, moderationLink);
    } catch (error) {
      root.textContent = error.message || "No se pudieron consultar las valoraciones.";
    }
  };
  document.getElementById("kc-feedback-reload")?.addEventListener("click", load);
  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("#admin-login button")) setTimeout(load, 1400);
  });
  load();
})();
