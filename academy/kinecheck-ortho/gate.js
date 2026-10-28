(() => {
  "use strict";
  const CONFIG = window.KINECHECK_ACADEMY_CONFIG || {};
  const COURSE = "kinecheck-ortho";
  const gate = document.querySelector("#gate");
  const root = document.querySelector("#course-root");
  const sessionKey = "kinecheck_secure_session_v1";
  const academyUrl = "../#biblioteca";

  function currentSession() {
    for (const store of [window.sessionStorage, window.localStorage]) {
      try {
        const session = JSON.parse(store.getItem(sessionKey) || "null");
        if (session?.access_token && (!session.expires_at || session.expires_at > Date.now() / 1000 + 20)) return session;
      } catch { /* Continue to the other session store. */ }
    }
    return null;
  }

  function deny(message) {
    gate.innerHTML = `<p class="kicker">CURSO PRIVADO</p><h1>Abre MSK Advanced desde Academy</h1><p>${message}</p><a class="button" href="${academyUrl}">Volver a Academy</a>`;
  }

  async function load() {
    const session = currentSession();
    if (!session) return deny("Inicia sesión en Academy con una cuenta que tenga acceso activo a KineCheck MSK Advanced.");
    const cfg = CONFIG;
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return deny("La conexión segura del curso no está configurada.");
    try {
      const response = await fetch(`${cfg.supabaseUrl}/functions/v1/protected-course-key`, {
        method: "POST", cache: "no-store",
        headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ courseSlug: COURSE }),
      });
      const source = await response.text();
      if (!response.ok || !source.includes("KC_ORTHO_DATA")) {
        if (response.status === 403) return deny("No encontramos una licencia activa asociada a esta cuenta.");
        if (response.status === 400) return deny("El acceso comercial de MSK Advanced aún no está habilitado.");
        return deny("No fue posible cargar el material protegido. Inténtalo desde Academy más tarde.");
      }
      const script = document.createElement("script");
      script.src = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      script.onload = () => {
        URL.revokeObjectURL(script.src);
        if (!window.KC_ORTHO_DATA || !window.KC_ORTHO_RENDER) return deny("La edición del curso no está disponible.");
        gate.hidden = true;
        root.hidden = false;
        window.KC_ORTHO_RENDER(root, window.KC_ORTHO_DATA);
      };
      script.onerror = () => deny("No se pudo iniciar la edición protegida del curso.");
      document.head.append(script);
    } catch {
      deny("No fue posible validar la sesión. Comprueba tu conexión y vuelve a intentarlo.");
    }
  }
  load();
})();
