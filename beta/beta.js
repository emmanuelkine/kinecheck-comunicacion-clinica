(() => {
  "use strict";

  const metricsSource = new URL("../metrics-v1.js?v=20260806-launch-metrics1", location.href).toString();
  if (![...document.scripts].some((script) => script.src === metricsSource)) {
    const script = document.createElement("script");
    script.src = metricsSource;
    script.async = false;
    document.head.appendChild(script);
  }

  const ENDPOINT = "https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1/beta-apply";
  const form = document.querySelector("#beta-form");
  const button = document.querySelector("#beta-submit");
  const message = document.querySelector("#beta-message");
  const PAUSED_PRODUCT = "kinecheck-recupera";
  const PAUSED_ROLE = "patient";
  const BETA_ACCESS_COPY = "Si eres seleccionado, KineCheck te asignará el acceso temporal de prueba. No necesitas comprar un producto para participar en la beta.";

  function applyCurrentBetaEligibility() {
    const productSelect = document.querySelector("#productInterest");
    productSelect?.querySelector(`option[value="${PAUSED_PRODUCT}"]`)?.remove();
    if (productSelect?.value === PAUSED_PRODUCT) productSelect.value = "";

    const roleSelect = document.querySelector("#role");
    roleSelect?.querySelector(`option[value="${PAUSED_ROLE}"]`)?.remove();
    if (roleSelect?.value === PAUSED_ROLE) roleSelect.value = "";

    document.querySelectorAll(".track").forEach((track) => {
      const title = String(track.querySelector("h3")?.textContent || "").trim();
      if (title === "Personas en recuperación") track.remove();
    });

    document.querySelectorAll(".section-heading h2").forEach((heading) => {
      if (heading.textContent?.includes("Cuatro miradas")) {
        heading.textContent = heading.textContent.replace("Cuatro miradas", "Tres miradas");
      }
    });

    const heroCard = document.querySelector(".hero-card .check-list");
    if (heroCard && !heroCard.querySelector("[data-beta-no-purchase]")) {
      const item = document.createElement("div");
      item.dataset.betaNoPurchase = "true";
      item.innerHTML = `<b>✓</b><span>${BETA_ACCESS_COPY}</span>`;
      heroCard.appendChild(item);
    }

    const formCopy = document.querySelector(".form-copy");
    if (formCopy && !formCopy.querySelector("[data-beta-access-note]")) {
      const note = document.createElement("p");
      note.dataset.betaAccessNote = "true";
      note.textContent = BETA_ACCESS_COPY;
      formCopy.appendChild(note);
    }
  }

  applyCurrentBetaEligibility();

  function setMessage(text, error = false) {
    message.textContent = text;
    message.classList.toggle("error", error);
    message.hidden = !text;
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("");

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const payload = {
      fullName: String(data.get("fullName") || "").trim(),
      email: String(data.get("email") || "").trim(),
      role: String(data.get("role") || ""),
      productInterest: String(data.get("productInterest") || ""),
      experience: String(data.get("experience") || "").trim(),
      device: String(data.get("device") || ""),
      availability: String(data.get("availability") || "").trim(),
      consentPrivacy: data.get("consentPrivacy") === "on",
      consentContact: data.get("consentContact") === "on",
      company: String(data.get("company") || ""),
    };

    if (payload.productInterest === PAUSED_PRODUCT || payload.role === PAUSED_ROLE) {
      setMessage("Esta convocatoria beta no está aceptando pruebas de KineCheck Recupera mientras el producto permanece Próximamente.", true);
      return;
    }

    button.disabled = true;
    button.textContent = "Enviando postulación…";

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "No fue posible enviar la postulación.");
      form.reset();
      setMessage(result?.message || "Postulación recibida.");
      window.KINECHECK_METRIC?.("beta_submit_success", {
        productSlug: payload.productInterest,
        metadata: { role: payload.role, device: payload.device },
      });
      message.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible enviar la postulación.", true);
    } finally {
      button.disabled = false;
      button.textContent = "Enviar postulación";
    }
  });
})();
