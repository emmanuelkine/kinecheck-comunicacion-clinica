(() => {
  "use strict";

  const ENDPOINT = "https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1/beta-apply";
  const form = document.querySelector("#beta-form");
  const button = document.querySelector("#beta-submit");
  const message = document.querySelector("#beta-message");

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
      message.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible enviar la postulación.", true);
    } finally {
      button.disabled = false;
      button.textContent = "Enviar postulación";
    }
  });
})();
