(() => {
  "use strict";

  if (window.__KINECHECK_EXERCISE_PROGRESS_SYNC_V1__) return;
  window.__KINECHECK_EXERCISE_PROGRESS_SYNC_V1__ = true;

  const COURSE_SLUG = "ejercicio-terapeutico";
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const LOCAL_KEY = "kinecheck-exercise-progress";
  const TOTAL_MODULES = 5;
  let lastPayload = "";
  let timer = 0;

  function readJson(storage, key, fallback = null) {
    try { return JSON.parse(storage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
  }

  function readSession() {
    for (const storage of [sessionStorage, localStorage]) {
      const session = readJson(storage, SESSION_KEY);
      if (session?.access_token) return session;
    }
    return null;
  }

  function normalizedModules() {
    const raw = readJson(localStorage, LOCAL_KEY, []);
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, TOTAL_MODULES);
  }

  async function resolveUserId(session, config) {
    const embedded = String(session?.user?.id || "");
    if (embedded) return embedded;
    try {
      const response = await fetch(`${String(config.supabaseUrl).replace(/\/$/, "")}/auth/v1/user`, {
        cache: "no-store",
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) return "";
      const user = await response.json().catch(() => ({}));
      return String(user?.id || "");
    } catch {
      return "";
    }
  }

  async function syncNow() {
    const config = {
      supabaseUrl: "https://eqhcdclyeoapmqtlduwf.supabase.co",
      supabaseAnonKey: "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_",
    };
    const session = readSession();
    if (!session?.access_token) return;

    const completedModules = normalizedModules();
    const userId = await resolveUserId(session, config);
    if (!userId) return;

    const state = {
      schemaVersion: 1,
      source: "exercise-therapeutic",
      completedModules,
      completedModuleCount: completedModules.length,
      totalModules: TOTAL_MODULES,
      routeComplete: completedModules.length === TOTAL_MODULES,
      updatedAt: new Date().toISOString(),
    };
    const payloadKey = JSON.stringify({
      completedModules,
      routeComplete: state.routeComplete,
    });
    if (payloadKey === lastPayload) return;

    try {
      const response = await fetch(
        `${config.supabaseUrl}/rest/v1/learning_progress?on_conflict=user_id,course_slug`,
        {
          method: "POST",
          headers: {
            apikey: config.supabaseAnonKey,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({
            user_id: userId,
            course_slug: COURSE_SLUG,
            profile: "course",
            state,
            updated_at: state.updatedAt,
          }),
        },
      );
      if (response.ok) lastPayload = payloadKey;
    } catch {
      // El curso continúa funcionando aunque la sincronización temporal falle.
    }
  }

  function scheduleSync() {
    clearTimeout(timer);
    timer = setTimeout(syncNow, 250);
  }

  function start() {
    scheduleSync();
    window.addEventListener("focus", scheduleSync);
    window.addEventListener("storage", (event) => {
      if (event.key === LOCAL_KEY) scheduleSync();
    });
    setInterval(scheduleSync, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();