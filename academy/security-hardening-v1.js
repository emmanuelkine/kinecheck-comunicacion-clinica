(() => {
  "use strict";

  if (window.__KINECHECK_SECURITY_HARDENING_V1__) return;
  window.__KINECHECK_SECURITY_HARDENING_V1__ = true;

  const GENERIC_RECOVERY_MESSAGE = "Si existe una cuenta asociada a este correo, recibirás instrucciones para recuperar el acceso.";

  function config() {
    return window.KINECHECK_ACADEMY_CONFIG || {};
  }

  function recoveryHeaders() {
    const cfg = config();
    return {
      apikey: cfg.supabaseAnonKey || "",
      "Content-Type": "application/json",
    };
  }

  async function secureRecovery(email) {
    const cfg = config();
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error("Configuración de autenticación no disponible.");
    const redirectTo = `${location.origin}${location.pathname}`;
    const url = new URL(`${cfg.supabaseUrl}/auth/v1/recover`);
    url.searchParams.set("redirect_to", redirectTo);

    try {
      await fetch(url, {
        method: "POST",
        headers: recoveryHeaders(),
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      window.KineCheckDiagnostics?.events?.();
      console.warn("KineCheck recovery request failed", error?.name || "request_error");
    }
  }

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "recovery-request-form") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const input = form.querySelector("#recovery-email");
    const message = document.querySelector("#recovery-request-message");
    const email = String(input?.value || "").trim().toLowerCase();
    if (!email || !message) return;

    message.hidden = false;
    message.className = "notice";
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
    message.textContent = "Procesando solicitud…";

    await secureRecovery(email);
    message.className = "notice";
    message.textContent = GENERIC_RECOVERY_MESSAGE;
  }, true);

  function reduceRoadmapNoise() {
    const grid = document.querySelector(".kc-tool-category-grid");
    if (!grid || grid.dataset.kcRoadmapReduced === "true") return;
    grid.dataset.kcRoadmapReduced = "true";

    const items = [...grid.querySelectorAll(":scope > article")];
    if (items.length <= 1) return;

    const summary = document.createElement("article");
    summary.className = "kc-roadmap-summary";
    summary.innerHTML = "<span>+</span><strong>Nuevas herramientas</strong><p>Calculadoras, escalas, pruebas, plantillas, casos y simulación clínica se incorporarán progresivamente cuando estén validados.</p><b>Próximamente</b>";
    items.forEach((item) => item.remove());
    grid.appendChild(summary);
  }

  function reduceLibraryPlaceholders() {
    document.querySelectorAll('.kc-library-shortcuts [data-kc-coming-soon]').forEach((button) => button.remove());
  }

  function normalizeBrandCopy() {
    document.querySelectorAll("#home-news-grid article strong").forEach((node) => {
      if (node.textContent.trim() === "KineCheck 4.0") node.textContent = "Novedades KineCheck";
    });
  }

  function improveStatusSemantics() {
    ["#auth-message", "#library-message", "#kc-toast", "#recovery-update-message"].forEach((selector) => {
      const node = document.querySelector(selector);
      if (!node) return;
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
    });
  }

  function apply() {
    reduceRoadmapNoise();
    reduceLibraryPlaceholders();
    normalizeBrandCopy();
    improveStatusSemantics();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once: true });
  else apply();

  new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
})();
