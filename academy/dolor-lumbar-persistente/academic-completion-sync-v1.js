(() => {
  "use strict";

  if (window.__KINECHECK_DLP_COMPLETION_SYNC_V1__) return;
  window.__KINECHECK_DLP_COMPLETION_SYNC_V1__ = true;

  const COURSE_SLUG = "dolor-lumbar-persistente";
  const COURSE_SESSION_KEY = "kinecheck_course_session_v2:dolor-lumbar-persistente";
  const SHARED_SESSION_KEY = "kinecheck_secure_session_v1";
  const LOCAL_KEY = "kc-academic:dolor-lumbar-persistente";

  function readSession() {
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of [COURSE_SESSION_KEY, SHARED_SESSION_KEY]) {
        try {
          const session = JSON.parse(storage.getItem(key) || "null");
          if (session?.access_token) return session;
        } catch {}
      }
    }
    return null;
  }

  async function submit(text, checks) {
    const config = window.KINECHECK_CONFIG || {};
    const session = readSession();
    if (!session?.access_token) throw new Error("Tu sesión expiró. Vuelve a ingresar desde KineCheck.");
    if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error("La verificación académica no está disponible.");

    const response = await fetch(
      String(config.supabaseUrl).replace(/\/$/, "") + "/functions/v1/course-completion-submit",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: "Bearer " + session.access_token,
          apikey: config.supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseSlug: COURSE_SLUG,
          activityKey: "final",
          responseText: text,
          criteriaConfirmed: checks.map((item) => Boolean(item.checked)),
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.activityComplete) {
      throw new Error(payload?.message || "No fue posible registrar la actividad en KineCheck.");
    }
    return payload;
  }

  document.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target.closest("#kc-af-save") : null;
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const section = target.closest("#kc-academic-final");
    if (!section) return;

    const text = String(section.querySelector("#kc-af-r")?.value || "").trim();
    const checks = [...section.querySelectorAll("[data-kc-af]")];
    const status = section.querySelector("#kc-af-status");

    if (text.length < 550) {
      if (status) status.textContent = "Desarrolla al menos 550 caracteres.";
      return;
    }
    if (checks.length !== 4 || !checks.every((item) => item.checked)) {
      if (status) status.textContent = "Marca todos los criterios antes de completar.";
      return;
    }

    target.disabled = true;
    target.textContent = "Registrando…";
    if (status) status.textContent = "Guardando actividad en KineCheck…";

    try {
      const payload = await submit(text, checks);
      const completedAt = payload.completedAt || new Date().toISOString();
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify({
          text,
          completed: true,
          serverCompleted: true,
          completedAt,
          minutes: 40,
        }));
      } catch {}
      target.textContent = "Actividad completada ✓";
      if (status) status.textContent = "Actividad registrada en KineCheck.";
    } catch (error) {
      target.textContent = "Guardar actividad";
      if (status) status.textContent = error instanceof Error ? error.message : "No fue posible registrar la actividad.";
    } finally {
      target.disabled = false;
    }
  }, true);

  function repairStatus() {
    const section = document.querySelector("#kc-academic-final");
    if (!section) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"); } catch {}
    const status = section.querySelector("#kc-af-status");
    if (saved?.serverCompleted) {
      if (status && status.textContent !== "Actividad registrada en KineCheck.") status.textContent = "Actividad registrada en KineCheck.";
    } else if (saved?.completed) {
      const message = "Actividad guardada localmente. Guarda nuevamente para registrarla en KineCheck.";
      if (status && status.textContent !== message) status.textContent = message;
    }
  }

  const observer = new MutationObserver(repairStatus);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("kinecheck:course-authorized", () => setTimeout(repairStatus, 300));
  setTimeout(repairStatus, 900);
})();
