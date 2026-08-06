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

  const form = document.querySelector("#support-form");
  const emailInput = document.querySelector("#support-email");
  const submit = document.querySelector("#support-submit");
  const result = document.querySelector("#support-result");

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function setResult(message, isError = false) {
    result.textContent = message;
    result.classList.toggle("error", isError);
    result.hidden = !message;
  }

  const session = readSession();
  if (session?.user?.email && emailInput) emailInput.value = session.user.email;

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setResult("");

    const payload = {
      email: emailInput.value.trim().toLowerCase(),
      category: document.querySelector("#support-category").value,
      productSlug: document.querySelector("#support-product").value,
      transactionId: document.querySelector("#support-transaction").value.trim(),
      message: document.querySelector("#support-message").value.trim(),
      website: document.querySelector("#support-website").value,
    };

    if (!payload.email || payload.message.length < 10) {
      setResult("Completa el correo y describe el problema con al menos 10 caracteres.", true);
      return;
    }

    submit.disabled = true;
    submit.textContent = "Revisando compra y licencia…";

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

      setResult(`${data.message} Código de solicitud: ${data.ticketId}. Prioridad asignada: ${data.priority}.`);
      window.KINECHECK_METRIC?.("support_submit_success", {
        productSlug: payload.productSlug,
        metadata: { category: payload.category, priority: data.priority || "unknown" },
      });
      form.reset();
      if (session?.user?.email) emailInput.value = session.user.email;
    } catch (error) {
      setResult(error?.message || "No fue posible registrar la solicitud.", true);
    } finally {
      submit.disabled = false;
      submit.textContent = "Revisar y crear solicitud";
    }
  });
})();
