(() => {
  "use strict";

  const GUIDE_VERSION = "2026-08-05-v1";
  const GUIDE_KEY = "kinecheck_onboarding_completed";
  const HELP_URL = "../ayuda/";
  const SUPPORT_URL = "../soporte/";

  function ensureStylesheet() {
    if (document.querySelector('link[data-kc-onboarding]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./onboarding.css?v=20260805-1";
    link.dataset.kcOnboarding = "true";
    document.head.append(link);
  }

  function enhanceSupportLinks() {
    document.querySelectorAll('a[href^="mailto:soporte.kinecheck@gmail.com"]').forEach((link) => {
      link.href = SUPPORT_URL;
      if (/contactar soporte/i.test(link.textContent || "")) link.textContent = "Abrir soporte automatizado";
    });

    const authLinks = document.querySelector(".auth-links");
    if (authLinks && !authLinks.querySelector('[data-kc-help-link]')) {
      const help = document.createElement("a");
      help.href = HELP_URL;
      help.textContent = "Centro de Ayuda y preguntas frecuentes";
      help.dataset.kcHelpLink = "true";
      authLinks.append(help);
    }
  }

  function createDialog() {
    if (document.querySelector("#kc-onboarding")) return document.querySelector("#kc-onboarding");

    const dialog = document.createElement("dialog");
    dialog.id = "kc-onboarding";
    dialog.className = "kc-onboarding";
    dialog.setAttribute("aria-labelledby", "kc-onboarding-title");
    dialog.innerHTML = `
      <div class="kc-onboarding-shell">
        <div class="kc-onboarding-head">
          <div><span class="eyebrow">RECORRIDO DE PRIMER INGRESO</span><h2 id="kc-onboarding-title">Conoce tu espacio KineCheck</h2></div>
          <button class="kc-onboarding-close" type="button" aria-label="Cerrar recorrido" data-guide-close>×</button>
        </div>
        <div class="kc-onboarding-progress" aria-label="Progreso del recorrido">
          <span class="active" data-guide-progress="0"></span><span data-guide-progress="1"></span><span data-guide-progress="2"></span><span data-guide-progress="3"></span>
        </div>
        <div class="kc-onboarding-body">
          <section class="kc-onboarding-step active" data-guide-step="0">
            <span class="kc-onboarding-icon">▤</span><h3>Tu biblioteca reconoce las compras</h3>
            <p>Los productos asociados al correo de tu cuenta aparecen como activos. Los demás permanecen bloqueados y no generan cobros automáticos.</p>
            <ul><li>Revisa la vigencia desde Configuración.</li><li>Usa siempre el correo exacto de la compra en Hotmart.</li><li>No vuelvas a comprar si un producto no aparece.</li></ul>
          </section>
          <section class="kc-onboarding-step" data-guide-step="1">
            <span class="kc-onboarding-icon">◫</span><h3>Los espacios se adaptan a tus licencias</h3>
            <p>KineCheck organiza las acciones disponibles según tu perfil profesional, estudiantil, docente o de recuperación.</p>
            <ul><li>Selecciona tu espacio principal en Configuración.</li><li>Continúa los trabajos recientes desde Mi espacio.</li><li>Tu apariencia puede seguir el sistema, modo claro u oscuro.</li></ul>
          </section>
          <section class="kc-onboarding-step" data-guide-step="2">
            <span class="kc-onboarding-icon">◇</span><h3>Crea casos sin datos identificables</h3>
            <p>Los casos y proyectos permiten organizar trabajo y aprendizaje, pero deben mantenerse anonimizados.</p>
            <div class="kc-onboarding-note"><strong>No ingreses</strong> nombres, RUT, teléfonos, direcciones, números de ficha, fotografías identificables ni otros datos que permitan reconocer a un paciente.</div>
          </section>
          <section class="kc-onboarding-step" data-guide-step="3">
            <span class="kc-onboarding-icon">?</span><h3>Ayuda antes de perder tiempo</h3>
            <p>El Centro de Ayuda resuelve las dudas habituales. Si el problema continúa, el soporte automatizado revisa compra, licencia, correo, vencimiento y reembolso antes de crear la solicitud.</p>
            <div class="kc-help-links"><a href="${HELP_URL}">Centro de Ayuda</a><a href="${SUPPORT_URL}">Soporte automatizado</a><a href="../bienvenida/">Guía de primeros pasos</a></div>
          </section>
        </div>
        <div class="kc-onboarding-actions">
          <button class="kc-onboarding-button" type="button" data-guide-skip>Omitir recorrido</button>
          <div><button class="kc-onboarding-button" type="button" data-guide-back hidden>Anterior</button><button class="kc-onboarding-button primary" type="button" data-guide-next>Siguiente</button></div>
        </div>
      </div>`;
    document.body.append(dialog);
    return dialog;
  }

  function addReopenButton(openGuide) {
    const settingsCard = [...document.querySelectorAll(".settings-card")].find((card) => /ayuda y soporte/i.test(card.textContent || ""));
    if (!settingsCard || settingsCard.querySelector(".kc-reopen-guide")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "kc-reopen-guide";
    button.textContent = "Ver recorrido de la plataforma";
    button.addEventListener("click", openGuide);
    settingsCard.append(button);

    if (!settingsCard.querySelector('[data-kc-help-center]')) {
      const help = document.createElement("a");
      help.href = HELP_URL;
      help.className = "button secondary";
      help.textContent = "Abrir Centro de Ayuda";
      help.dataset.kcHelpCenter = "true";
      settingsCard.append(help);
    }
  }

  function initializeGuide() {
    ensureStylesheet();
    enhanceSupportLinks();
    const dialog = createDialog();
    const steps = [...dialog.querySelectorAll("[data-guide-step]")];
    const progress = [...dialog.querySelectorAll("[data-guide-progress]")];
    const back = dialog.querySelector("[data-guide-back]");
    const next = dialog.querySelector("[data-guide-next]");
    let current = 0;

    const render = () => {
      steps.forEach((step, index) => step.classList.toggle("active", index === current));
      progress.forEach((item, index) => item.classList.toggle("active", index <= current));
      back.hidden = current === 0;
      next.textContent = current === steps.length - 1 ? "Finalizar" : "Siguiente";
    };

    const complete = () => {
      localStorage.setItem(GUIDE_KEY, GUIDE_VERSION);
      if (dialog.open) dialog.close();
    };

    const openGuide = () => {
      current = 0;
      render();
      if (!dialog.open) dialog.showModal();
    };

    dialog.querySelector("[data-guide-close]").addEventListener("click", complete);
    dialog.querySelector("[data-guide-skip]").addEventListener("click", complete);
    back.addEventListener("click", () => { current = Math.max(0, current - 1); render(); });
    next.addEventListener("click", () => {
      if (current >= steps.length - 1) complete();
      else { current += 1; render(); }
    });
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); complete(); });

    addReopenButton(openGuide);

    if (localStorage.getItem(GUIDE_KEY) !== GUIDE_VERSION) {
      window.setTimeout(openGuide, 450);
    }
  }

  function waitForPlatform() {
    enhanceSupportLinks();
    const app = document.querySelector("#app-view");
    if (!app) return;
    if (!app.hidden) {
      initializeGuide();
      return;
    }

    const observer = new MutationObserver(() => {
      enhanceSupportLinks();
      if (!app.hidden) {
        observer.disconnect();
        initializeGuide();
      }
    });
    observer.observe(app, { attributes: true, attributeFilter: ["hidden"] });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitForPlatform, { once: true });
  else waitForPlatform();
})();