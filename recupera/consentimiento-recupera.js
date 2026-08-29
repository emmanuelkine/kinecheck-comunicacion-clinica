(() => {
  "use strict";

  const HANDOFF_KEY = "kinecheck_recupera_consent_handoff_v1";
  const form = document.querySelector("#recupera-consent-form");
  window.name = "";
  try { sessionStorage.removeItem(HANDOFF_KEY); } catch {}
  form?.remove();
  document.querySelectorAll("input, textarea, select, button").forEach((control) => {
    control.disabled = true;
    control.setAttribute("aria-disabled", "true");
  });
})();
