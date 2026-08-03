window.KINECHECK_ACADEMY_CONFIG = Object.freeze({
  supabaseUrl: "https://eqhcdclyeoapmqtlduwf.supabase.co",
  supabaseAnonKey: "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_",
  courseKeyFunction: "course-key",
  supportEmail: "soporte.kinecheck@gmail.com",
  ownerEmails: ["emmanuelkine@gmail.com", "emmanuelkine+owner@gmail.com", "emmanuel_fox@hotmail.com"],
  betaTesterEmails: ["emmanuelkine+beta@gmail.com"],
  betaTrialDays: 5,
  courses: [
    {
      slug: "kinecheck-clinico",
      title: "KineCheck Clínico",
      subtitle: "Evaluación, registro y razonamiento kinésico profesional.",
      productId: "8150019",
      icon: "CL",
      kind: "application",
      audience: "Profesionales",
      audienceKey: "professionals",
      audiences: ["professionals"],
      status: "active",
      url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/sso.html?product=kinecheck-clinico",
      ssoProduct: "kinecheck-clinico"
    },
    {
      slug: "kinecheck-estudiante",
      title: "KineCheck Estudiante",
      subtitle: "Evaluación kinésica guiada y razonamiento clínico paso a paso.",
      productId: "8154796",
      icon: "KE",
      kind: "application",
      audience: "Estudiantes",
      audienceKey: "students",
      audiences: ["students"],
      status: "active",
      url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/sso.html?product=kinecheck-estudiante",
      ssoProduct: "kinecheck-estudiante"
    },
    {
      slug: "kinecheck-recupera",
      title: "KineCheck Recupera",
      subtitle: "Registro de progreso, síntomas y ejercicios para pacientes.",
      productId: "8157431",
      icon: "KR",
      kind: "application",
      audience: "Pacientes",
      audienceKey: "patients",
      audiences: ["patients"],
      status: "active",
      url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/sso.html?product=kinecheck-recupera",
      ssoProduct: "kinecheck-recupera"
    },
    {
      slug: "comunicacion-clinica",
      title: "Comunicación Clínica",
      subtitle: "El arte de comunicar en salud con claridad y propósito.",
      productId: "8192814",
      icon: "CC",
      kind: "course",
      audience: "Profesionales y estudiantes",
      audienceKey: "professionals",
      audiences: ["professionals", "students"],
      modules: 12,
      status: "active",
      url: "/kinecheck-comunicacion-clinica/?course=comunicacion-clinica&v=20260727"
    },
    {
      slug: "mas-alla-del-dolor",
      title: "Más allá del dolor",
      subtitle: "Evaluación musculoesquelética integral y contextualizada.",
      productId: "8194777",
      icon: "MD",
      kind: "course",
      audience: "Profesionales y estudiantes",
      audienceKey: "professionals",
      audiences: ["professionals", "students"],
      status: "active",
      url: "/mas-alla-del-dolor/?course=mas-alla-del-dolor&v=20260727"
    },
    {
      slug: "evidencia-aplicada",
      title: "KineCheck Evidencia Aplicada",
      subtitle: "Razonamiento clínico y aplicación crítica de la evidencia.",
      productId: "8208817",
      icon: "EA",
      kind: "course",
      audience: "Profesionales y estudiantes",
      audienceKey: "professionals",
      audiences: ["professionals", "students"],
      status: "active",
      url: "https://emmanuelkine.github.io/kinecheck-evidencia-aplicada/?v=20260728-6"
    },
    {
      slug: "traumatologia-ortopedia-clinica",
      title: "Traumatología y Ortopedia Clínica",
      subtitle: "Del mecanismo lesional a la decisión clínica segura.",
      productId: "8205453",
      icon: "TO",
      kind: "course",
      audience: "Profesionales y estudiantes",
      audienceKey: "professionals",
      audiences: ["professionals", "students"],
      status: "active",
      url: "/kinecheck-comunicacion-clinica/traumatologia/?course=traumatologia-ortopedia-clinica&v=20260728"
    },
    {
      slug: "kinecheck-lab-clinico",
      title: "KineCheck Lab Clínico",
      subtitle: "Simulación de razonamiento y decisiones clínicas.",
      productId: "PROPIETARIO",
      icon: "LB",
      kind: "tool",
      audience: "Profesionales y estudiantes",
      audienceKey: "professionals",
      audiences: ["professionals", "students"],
      status: "preparing",
      url: "/kinecheck-comunicacion-clinica/lab/"
    }
  ]
});

(() => {
  if (window.__KINECHECK_NETWORK_GUARD__) return;
  window.__KINECHECK_NETWORK_GUARD__ = true;

  const nativeFetch = window.fetch.bind(window);
  const TIMEOUT_MS = 12000;
  const BATCH_WINDOW_MS = 0;
  const batchQueue = [];
  let batchTimer = null;

  function headerValue(headers, name) {
    if (!headers) return "";
    if (headers instanceof Headers) return headers.get(name) || "";
    if (Array.isArray(headers)) {
      const found = headers.find(([key]) => String(key).toLowerCase() === name.toLowerCase());
      return found ? String(found[1]) : "";
    }
    const key = Object.keys(headers).find((item) => item.toLowerCase() === name.toLowerCase());
    return key ? String(headers[key]) : "";
  }

  function responseJson(payload, status) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  }

  async function fetchWithTimeout(input, init = {}) {
    const url = typeof input === "string" ? input : String(input?.url || "");
    const isSupabaseRequest = url.includes(".supabase.co");
    if (!isSupabaseRequest || init.signal) return nativeFetch(input, init);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      return await nativeFetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("La conexión tardó demasiado. Revisa tu señal o Wi-Fi y vuelve a intentar.");
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function isBatchableCourseKeyRequest(input, init = {}) {
    const url = typeof input === "string" ? input : String(input?.url || "");
    const method = String(init.method || (typeof input !== "string" ? input?.method : "GET") || "GET").toUpperCase();

    if (
      method !== "POST"
      || !url.includes(`.supabase.co/functions/v1/${window.KINECHECK_ACADEMY_CONFIG.courseKeyFunction}`)
      || init.signal
    ) {
      return false;
    }

    try {
      const body = JSON.parse(String(init.body || "{}"));
      return typeof body.courseSlug === "string" && body.courseSlug.trim() && !body.courseSlugs;
    } catch {
      return false;
    }
  }

  function enqueueCourseKeyRequest(input, init) {
    return new Promise((resolve, reject) => {
      const body = JSON.parse(String(init.body || "{}"));
      batchQueue.push({
        input,
        init,
        courseSlug: body.courseSlug.trim(),
        resolve,
        reject,
      });

      if (batchTimer !== null) return;
      batchTimer = window.setTimeout(flushCourseKeyQueue, BATCH_WINDOW_MS);
    });
  }

  async function flushCourseKeyQueue() {
    batchTimer = null;
    const pending = batchQueue.splice(0, batchQueue.length);
    if (!pending.length) return;

    const groups = new Map();
    pending.forEach((item) => {
      const url = typeof item.input === "string" ? item.input : String(item.input?.url || "");
      const authorization = headerValue(item.init.headers, "authorization");
      const apikey = headerValue(item.init.headers, "apikey");
      const key = `${url}\n${authorization}\n${apikey}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    await Promise.all([...groups.values()].map(async (group) => {
      if (group.length === 1) {
        const item = group[0];
        try {
          item.resolve(await fetchWithTimeout(item.input, item.init));
        } catch (error) {
          item.reject(error);
        }
        return;
      }

      const first = group[0];
      const courseSlugs = [...new Set(group.map((item) => item.courseSlug))];

      try {
        const response = await fetchWithTimeout(first.input, {
          ...first.init,
          body: JSON.stringify({ courseSlugs }),
        });
        const raw = await response.text();
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = {};
        }

        if (!response.ok) {
          await Promise.all(group.map(async (item) => {
            try {
              item.resolve(await fetchWithTimeout(item.input, item.init));
            } catch (error) {
              item.reject(error);
            }
          }));
          return;
        }

        const active = new Set(
          Array.isArray(data.activeCourseSlugs)
            ? data.activeCourseSlugs.map((slug) => String(slug))
            : [],
        );

        group.forEach((item) => {
          if (active.has(item.courseSlug)) {
            item.resolve(responseJson({
              active: true,
              courseSlug: item.courseSlug,
            }, 200));
          } else {
            item.resolve(responseJson({
              message: "No encontramos una compra activa asociada a este correo.",
            }, 403));
          }
        });
      } catch (error) {
        group.forEach((item) => item.reject(error));
      }
    }));
  }

  window.fetch = (input, init = {}) => {
    if (isBatchableCourseKeyRequest(input, init)) {
      return enqueueCourseKeyRequest(input, init);
    }
    return fetchWithTimeout(input, init);
  };
})();

(() => {
  if (document.querySelector('script[data-kc-brand-identity]')) return;
  const script = document.createElement("script");
  script.src = "./academy-brand-identity.js?v=20260802-brand1";
  script.async = false;
  script.dataset.kcBrandIdentity = "true";
  document.head.appendChild(script);
})();
