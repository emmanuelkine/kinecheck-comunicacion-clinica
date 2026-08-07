(() => {
  const runtime = window.KINECHECK_RUNTIME || {};
  const STORAGE_KEY = "kinecheck_diag_v1";
  const MAX_EVENTS = 20;

  function redact(value) {
    return String(value || "")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
      .replace(/(access_token|refresh_token|token|apikey|authorization)=?[^&\s]*/gi, "$1=[redacted]")
      .replace(/https?:\/\/[^\s?#]+\?[^\s#]*/gi, (url) => url.split("?")[0] + "?[redacted]")
      .slice(0, 700);
  }

  function readEvents() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function record(type, message, extra = {}) {
    const events = readEvents();
    events.push({
      type,
      message: redact(message),
      path: location.pathname,
      version: runtime.version || "unknown",
      environment: runtime.environment || "unknown",
      timestamp: new Date().toISOString(),
      ...extra,
    });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
    } catch {
      // Diagnóstico de mejor esfuerzo; nunca debe romper la aplicación.
    }
  }

  window.addEventListener("error", (event) => {
    record("error", event.message || "Error de JavaScript", {
      source: redact(event.filename || ""),
      line: Number(event.lineno || 0),
      column: Number(event.colno || 0),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason || "Promesa rechazada");
    record("unhandledrejection", reason);
  });

  async function ping(endpoint) {
    if (!endpoint) return null;
    const started = performance.now();
    try {
      const response = await fetch(endpoint, { cache: "no-store", credentials: "same-origin" });
      const elapsedMs = Math.round(performance.now() - started);
      if (!response.ok) record("health", `Endpoint ${endpoint} respondió ${response.status}`, { elapsedMs });
      return { ok: response.ok, status: response.status, elapsedMs };
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - started);
      record("health", error?.message || `No fue posible consultar ${endpoint}`, { elapsedMs });
      return { ok: false, status: 0, elapsedMs };
    }
  }

  window.KineCheckDiagnostics = Object.freeze({
    events: () => readEvents().map((item) => ({ ...item })),
    clear: () => sessionStorage.removeItem(STORAGE_KEY),
    health: () => ping(runtime.endpoints?.health || "/api/health"),
    ready: () => ping(runtime.endpoints?.ready || "/api/ready"),
  });

  if (document.visibilityState === "visible") {
    window.setTimeout(() => ping(runtime.endpoints?.health || "/api/health"), 1200);
  }
})();
