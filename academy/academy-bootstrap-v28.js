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
      url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/app?mode=clinico"
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
      url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/app?mode=student"
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
      url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/patient-access.html#activar"
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

  window.fetch = async (input, init = {}) => {
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
  };
})();