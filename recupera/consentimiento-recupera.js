(() => {
  "use strict";

  const CONSENT_VERSION = "2026-08-09-health-v1";
  const CONSENT_KEY = "kinecheck_recupera_health_consent_v1";
  const HANDOFF_KEY = "kinecheck_recupera_consent_handoff_v1";
  const SSO_URL = "/api/license/sso";
  const form = document.querySelector("#recupera-consent-form");
  const checkbox = document.querySelector("#recupera-consent");
  const errorBox = document.querySelector("#recupera-consent-error");

  function fail(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hidden(target, name, value) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value ?? "");
    target.appendChild(input);
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!checkbox?.checked) {
      fail("Debes aceptar expresamente antes de continuar a KineCheck Recupera.");
      return;
    }

    let handoff;
    try {
      handoff = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || "null");
    } catch {
      handoff = null;
    }
    sessionStorage.removeItem(HANDOFF_KEY);

    if (!handoff?.access_token || handoff?.product !== "kinecheck-recupera") {
      fail("El acceso temporal venció o no está disponible. Vuelve a Mi KineCheck e inténtalo nuevamente.");
      return;
    }

    const acceptedAt = new Date().toISOString();
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        version: CONSENT_VERSION,
        acceptedAt,
        scope: "kinecheck-recupera-health-data",
      }));
    } catch {
      fail("Tu navegador no permitió guardar la confirmación. Revisa la configuración de privacidad e inténtalo nuevamente.");
      return;
    }

    const ssoForm = document.createElement("form");
    ssoForm.method = "POST";
    ssoForm.action = SSO_URL;
    ssoForm.hidden = true;
    hidden(ssoForm, "product", handoff.product);
    hidden(ssoForm, "access_token", handoff.access_token);
    hidden(ssoForm, "expires_at", handoff.expires_at || "");
    hidden(ssoForm, "issued_at", handoff.issued_at || "");
    hidden(ssoForm, "handoff_type", handoff.handoff_type || "kinecheck-sso-v3-access-only");
    hidden(ssoForm, "privacy_consent_version", CONSENT_VERSION);
    hidden(ssoForm, "privacy_consent_at", acceptedAt);
    document.body.appendChild(ssoForm);
    ssoForm.submit();
  });
})();
