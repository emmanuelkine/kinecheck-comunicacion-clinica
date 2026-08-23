(() => {
  "use strict";

  const metricsSource = new URL("../metrics-v1.js?v=20260806-launch-metrics1", location.href).toString();
  if (![...document.scripts].some((script) => script.src === metricsSource)) {
    const script = document.createElement("script");
    script.src = metricsSource;
    script.async = false;
    document.head.appendChild(script);
  }

  const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
  const ANON_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";
  const SESSION_KEY = "kinecheck_secure_session_v1";
  const params = new URLSearchParams(window.location.search);
  const accessRescue = params.get("flow") === "hotmart-access";

  const form = document.querySelector("#support-form");
  const emailInput = document.querySelector("#support-email");
  const nameInput = document.querySelector("#support-name");
  const transactionInput = document.querySelector("#support-transaction");
  const categoryInput = document.querySelector("#support-category");
  const productInput = document.querySelector("#support-product");
  const messageInput = document.querySelector("#support-message");
  const submit = document.querySelector("#support-submit");
  const result = document.querySelector("#support-result");

  function readSession() {
    for (const store of [sessionStorage, localStorage]) {
      try {
        const session = JSON.parse(store.getItem(SESSION_KEY) || "null");
        if (session?.access_token || session?.user?.email) return session;
      } catch {
        // Continúa con el siguiente almacenamiento.
      }
    }
    return null;
  }

  function setResult(message, isError = false) {
    result.textContent = message;
    result.classList.toggle("error", isError);
    result.hidden = !message;
  }

  function configureAccessRescue() {
    if (!accessRescue) return;
    document.body.dataset.supportFlow = "hotmart-access";

    const guide = document.querySelector("#access-rescue-guide");
    const nameField = document.querySelector("#rescue-name-field");
    const sla = document.querySelector("#rescue-sla");
    if (guide) guide.hidden = false;
    if (nameField) nameField.hidden = false;
    if (sla) sla.hidden = false;

    document.querySelectorAll("[data-generic-only]").forEach((node) => {
      node.hidden = true;
    });

    const eyebrow = document.querySelector("#support-eyebrow");
    const title = document.querySelector("#support-title");
    const intro = document.querySelector("#support-intro-copy");
    const sideEyebrow = document.querySelector("#support-side-eyebrow");
    const sideSteps = document.querySelector("#support-side-steps");
    const sideCopy = document.querySelector("#support-side-copy");

    if (eyebrow) eyebrow.textContent = "ACCESO DESPUÉS DE COMPRA";
    if (title) title.textContent = "¿Hotmart aprobó tu compra y aún no puedes entrar?";
    if (intro) intro.textContent = "Sigue estos pasos antes de contactar soporte. Si el acceso continúa sin aparecer, registra una solicitud trazable con tu correo y código de transacción.";
    if (sideEyebrow) sideEyebrow.textContent = "FAST-TRACK";
    if (sideSteps) {
      sideSteps.innerHTML = `
        <li><b>1</b><span>Validamos los datos de la solicitud.</span></li>
        <li><b>2</b><span>Contrastamos compra y licencia cuando la información disponible lo permite.</span></li>
        <li><b>3</b><span>Si existe una desincronización segura, KineCheck puede intentar conciliarla.</span></li>
        <li><b>4</b><span>Si requiere revisión humana, conservas un código de solicitud único.</span></li>
      `;
    }
    if (sideCopy) sideCopy.textContent = "No actives una segunda cuenta ni vuelvas a comprar el mismo producto mientras el caso está en revisión.";

    if (nameInput) nameInput.required = true;
    if (transactionInput) transactionInput.required = true;
    const transactionSmall = document.querySelector("#support-transaction-label small");
    if (transactionSmall) transactionSmall.textContent = "Obligatorio para fast-track";

    if (categoryInput) categoryInput.value = "access";
    const requestedProduct = String(params.get("product") || "").trim();
    if (productInput && requestedProduct && [...productInput.options].some((option) => option.value === requestedProduct)) {
      productInput.value = requestedProduct;
    } else if (productInput) {
      productInput.value = "general";
    }

    submit.textContent = "Solicitar revisión de acceso";
  }

  const session = readSession();
  if (session?.user?.email && emailInput) emailInput.value = session.user.email;
  configureAccessRescue();

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setResult("");

    const requesterName = String(nameInput?.value || "").trim();
    const transactionId = String(transactionInput?.value || "").trim();
    const category = accessRescue ? "access" : categoryInput.value;
    const productSlug = accessRescue ? (productInput?.value || "general") : productInput.value;
    const message = accessRescue
      ? `Solicitud de rescate de acceso posterior a compra. Nombre: ${requesterName}. El usuario indica que verificó el correo de compra y que Hotmart muestra el pago como aprobado, pero KineCheck aún no presenta el acceso.`
      : messageInput.value.trim();

    const payload = {
      email: emailInput.value.trim().toLowerCase(),
      category,
      productSlug,
      transactionId,
      message,
      website: document.querySelector("#support-website").value,
    };

    if (!payload.email || payload.message.length < 10) {
      setResult("Completa el correo y la información solicitada.", true);
      return;
    }
    if (accessRescue && (!requesterName || !transactionId)) {
      setResult("Para el fast-track necesitamos tu nombre y el código de transacción de Hotmart.", true);
      return;
    }

    submit.disabled = true;
    submit.textContent = accessRescue ? "Registrando revisión…" : "Revisando compra y licencia…";

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/support-request`, {
        method: "POST",
        cache: "no-store",
        headers: {
          apikey: ANON_KEY,
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "No fue posible crear la solicitud.");

      const statusMessage = accessRescue ? `Solicitud registrada. ${data.message}` : data.message;
      setResult(`${statusMessage} Código de solicitud: ${data.ticketId}. Prioridad asignada: ${data.priority}.`);
      window.KINECHECK_METRIC?.("support_submit_success", {
        productSlug: payload.productSlug,
        metadata: {
          category: payload.category,
          priority: data.priority || "unknown",
          flow: accessRescue ? "hotmart-access" : "generic",
          diagnosisCode: data.diagnosisCode || "unknown",
        },
      });
      form.reset();
      if (session?.user?.email) emailInput.value = session.user.email;
      if (accessRescue) configureAccessRescue();
    } catch (error) {
      setResult(error?.message || "No fue posible registrar la solicitud.", true);
    } finally {
      submit.disabled = false;
      submit.textContent = accessRescue ? "Solicitar revisión de acceso" : "Revisar y crear solicitud";
    }
  });
})();
