window.KINECHECK_ACADEMY_CONFIG = Object.freeze({
  supabaseUrl: "https://eqhcdclyeoapmqtlduwf.supabase.co",
  supabaseAnonKey: "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_",
  courseKeyFunction: "course-key",
  supportEmail: "emmanuelkine@gmail.com",
  ownerEmails: ["emmanuelkine@gmail.com", "emmanuelkine+owner@gmail.com", "emmanuel_fox@hotmail.com"],
  betaTesterEmails: ["emmanuelkine+beta@gmail.com"],
  betaTrialDays: 5,
  courses: [
    { slug: "kinecheck-clinico", title: "KineCheck Clínico", subtitle: "Registro kinésico profesional", productId: "8150019", icon: "CL", status: "active", url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/app?mode=clinico" },
    { slug: "comunicacion-clinica", title: "Comunicación Clínica", subtitle: "El arte de comunicar en salud", productId: "8192814", icon: "CC", status: "active", url: "/kinecheck-comunicacion-clinica/?course=comunicacion-clinica&v=20260727" },
    { slug: "kinecheck-estudiante", title: "KineCheck Estudiante", subtitle: "Evaluación y razonamiento clínico", productId: "8154796", icon: "KE", status: "active", url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/app?mode=student" },
    { slug: "kinecheck-recupera", title: "KineCheck Recupera", subtitle: "Mi plan y progreso", productId: "8157431", icon: "KR", status: "active", url: "https://kinecheck-clinico.emmanuelkine.chatgpt.site/patient-access.html#activar" },
    { slug: "mas-alla-del-dolor", title: "Más allá del dolor", subtitle: "Evaluación MSK integral", productId: "8194777", icon: "MD", status: "active", url: "/mas-alla-del-dolor/?course=mas-alla-del-dolor&v=20260727" },
    { slug: "kinecheck-lab-clinico", title: "KineCheck Lab Clínico", subtitle: "Simulador de razonamiento y decisiones clínicas", productId: "PROPIETARIO", icon: "LB", status: "preparing", url: "/kinecheck-comunicacion-clinica/lab/" },
    { slug: "traumatologia-ortopedia-clinica", title: "Traumatología y Ortopedia Clínica", subtitle: "Del mecanismo lesional a la decisión clínica segura", productId: "8205453", icon: "TO", status: "active", url: "/kinecheck-comunicacion-clinica/traumatologia/?course=traumatologia-ortopedia-clinica&v=20260728" }
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
        throw new Error("La conexión tardó demasiado. Revisa tu señal o Wi‑Fi y vuelve a intentar.");
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  };
})();

(() => {
  const PRODUCT_META = {
    CL: { category: "application", label: "APLICACIÓN CLÍNICA", checkoutUrl: "https://pay.hotmart.com/L106791841D" },
    KE: { category: "application", label: "APLICACIÓN PARA ESTUDIANTES", checkoutUrl: "https://pay.hotmart.com/G106801166S" },
    KR: { category: "tool", label: "HERRAMIENTA DE SEGUIMIENTO", checkoutUrl: "https://pay.hotmart.com/P106806251E" },
    CC: { category: "course", label: "CURSO / MASTERCLASS", checkoutUrl: "https://pay.hotmart.com/T106883983U" },
    MD: { category: "course", label: "CURSO / MASTERCLASS", checkoutUrl: "https://pay.hotmart.com/W106888386Q" },
    LB: { category: "tool", label: "SIMULADOR CLÍNICO" },
    TO: { category: "course", label: "CURSO CLÍNICO", checkoutUrl: "https://pay.hotmart.com/B106913952R", isNew: true }
  };

  let enhancementScheduled = false;

  function enhanceCards() {
    enhancementScheduled = false;

    document.querySelectorAll(".course-card").forEach((card) => {
      const icon = card.querySelector(".course-icon")?.textContent?.trim();
      const meta = PRODUCT_META[icon];
      if (!meta) return;

      const categoryClass = `category-${meta.category}`;
      if (!card.classList.contains(categoryClass)) {
        card.classList.remove("category-application", "category-course", "category-tool");
        card.classList.add(categoryClass);
      }

      const type = card.querySelector(".course-type");
      if (type && type.textContent !== meta.label) type.textContent = meta.label;

      if (meta.isNew && !card.querySelector(".new-badge")) {
        const badge = document.createElement("span");
        badge.className = "new-badge";
        badge.textContent = "NUEVO";
        card.appendChild(badge);
      }

      const button = card.querySelector(".course-button");
      if (!button || !button.disabled || button.textContent.trim() !== "Sin acceso" || card.querySelector(".purchase-button")) return;

      const link = document.createElement("a");
      link.className = "purchase-button";
      link.href = meta.checkoutUrl || `mailto:emmanuelkine@gmail.com?subject=${encodeURIComponent("Quiero comprar " + (card.querySelector("h3")?.textContent || "KineCheck"))}`;
      link.textContent = meta.checkoutUrl ? "Comprar ahora" : "Solicitar enlace";
      if (meta.checkoutUrl) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      button.replaceWith(link);
    });
  }

  function scheduleEnhancement() {
    if (enhancementScheduled) return;
    enhancementScheduled = true;
    window.requestAnimationFrame(enhanceCards);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const grid = document.querySelector("#course-grid");
    if (grid) {
      new MutationObserver(scheduleEnhancement).observe(grid, { childList: true });
    }
    scheduleEnhancement();
  });
})();