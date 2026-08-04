window.KINECHECK_ACADEMY_CONFIG = Object.freeze({
  supabaseUrl: "https://eqhcdclyeoapmqtlduwf.supabase.co",
  supabaseAnonKey: "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_",
  courseKeyFunction: "course-key",
  supportEmail: "soporte.kinecheck@gmail.com",
  ownerEmails: ["emmanuelkine@gmail.com", "emmanuelkine+owner@gmail.com", "emmanuel_fox@hotmail.com"],
  betaTesterEmails: ["emmanuelkine+beta@gmail.com"],
  betaTrialDays: 5,
  appSso: Object.freeze({
    enabled: true,
    baseUrl: "https://kinecheck-clinico.emmanuelkine.chatgpt.site",
    handoffType: "kinecheck-sso-v3-access-only",
    transport: "form-post",
    postPath: "/api/license/sso",
    routes: Object.freeze({
      "kinecheck-clinico": "/sso.html?product=kinecheck-clinico",
      "kinecheck-estudiante": "/sso.html?product=kinecheck-estudiante",
      "kinecheck-recupera": "/sso.html?product=kinecheck-recupera",
    }),
  }),
  courses: [
    { slug: "kinecheck-clinico", title: "KineCheck Clínico", subtitle: "Registro kinésico profesional", productId: "8150019", icon: "CL", status: "active", url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/sso.html?product=kinecheck-clinico", ssoProduct: "kinecheck-clinico" },
    { slug: "comunicacion-clinica", title: "Comunicación Clínica", subtitle: "El arte de comunicar en salud", productId: "8192814", icon: "CC", status: "active", url: "../comunicacion-clinica.html?course=comunicacion-clinica&v=20260803-sessionfix2" },
    { slug: "kinecheck-estudiante", title: "KineCheck Estudiante", subtitle: "Evaluación y razonamiento clínico", productId: "8154796", icon: "KE", status: "active", url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/sso.html?product=kinecheck-estudiante", ssoProduct: "kinecheck-estudiante" },
    { slug: "kinecheck-recupera", title: "KineCheck Recupera", subtitle: "Mi plan y progreso", productId: "8157431", icon: "KR", status: "active", url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/sso.html?product=kinecheck-recupera", ssoProduct: "kinecheck-recupera" },
    { slug: "mas-alla-del-dolor", title: "Más allá del dolor", subtitle: "Evaluación MSK integral", productId: "8194777", icon: "MD", status: "active", url: "https://emmanuelkine.github.io/mas-alla-del-dolor/?course=mas-alla-del-dolor&v=20260803-sessionfix2" },
    { slug: "kinecheck-lab-clinico", title: "KineCheck Lab Clínico", subtitle: "Simulador de razonamiento y decisiones clínicas", productId: "PROPIETARIO", icon: "LB", status: "preparing", url: "../lab/" },
    { slug: "traumatologia-ortopedia-clinica", title: "Traumatología y Ortopedia Clínica", subtitle: "Del mecanismo lesional a la decisión clínica segura", productId: "8205453", icon: "TO", status: "active", url: "../traumatologia/?course=traumatologia-ortopedia-clinica&v=20260803-sessionfix2" }
  ]
});
