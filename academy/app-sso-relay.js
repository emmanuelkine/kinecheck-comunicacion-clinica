(() => {
  "use strict";

  const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
  const MAX_AGE_MS = 120000;
  const POST_URL = "https://apps.kinecheck.cl/api/license/sso";
  const PRODUCTS = new Set([
    "kinecheck-estudiante",
    "kinecheck-recupera",
  ]);
  const RECUPERA_CONSENT_VERSION = "2026-08-09-health-v1";
  const RECUPERA_CONSENT_KEY = "kinecheck_recupera_health_consent_v1";
  const RECUPERA_HANDOFF_KEY = "kinecheck_recupera_consent_handoff_v1";

  const status = document.querySelector("#relay-status");
  const errorBox = document.querySelector("#relay-error");
  const back = document.querySelector("#relay-back");

  function fail(message) {
    window.name = "";
    if (status) status.textContent = "No fue posible completar el acceso automático.";
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.hidden = false;
    }
    if (back) back.hidden = false;
  }

  function hidden(form, name, value) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value ?? "");
    form.appendChild(input);
  }

  function readHandoff() {
    if (!window.name) return null;
    try {
      return JSON.parse(window.name);
    } catch {
      return null;
    } finally {
      window.name = "";
    }
  }

  function currentRecuperaConsent() {
    try {
      const record = JSON.parse(localStorage.getItem(RECUPERA_CONSENT_KEY) || "null");
      if (record?.version !== RECUPERA_CONSENT_VERSION || !record?.acceptedAt) return null;
      return record;
    } catch {
      return null;
    }
  }

  const handoff = readHandoff();
  const issuedAt = Number(handoff?.issuedAt);
  const product = String(handoff?.product || "").trim();
  const accessToken = String(
    handoff?.access_token || handoff?.session?.access_token || "",
  ).trim();
  const expiresAt = Number(
    handoff?.expires_at || handoff?.session?.expires_at || 0,
  );
  const nowMs = Date.now();
  const nowSeconds = Math.floor(nowMs / 1000);

  if (!handoff || handoff.type !== HANDOFF_TYPE) {
    fail("El traspaso de acceso no es válido. Vuelve a KineCheck e inténtalo nuevamente.");
    return;
  }
  if (!Number.isFinite(issuedAt) || Math.abs(nowMs - issuedAt) > MAX_AGE_MS) {
    fail("El acceso temporal venció. Vuelve a KineCheck e inténtalo nuevamente.");
    return;
  }
  if (!PRODUCTS.has(product)) {
    fail("La aplicación solicitada no está permitida. KineCheck Clínico se abre mediante su curso y guía complementaria dentro del ecosistema.");
    return;
  }
  if (!accessToken) {
    fail("No se encontró una sesión activa de KineCheck.");
    return;
  }
  if (expiresAt && expiresAt <= nowSeconds) {
    fail("La sesión venció. Vuelve a KineCheck e inicia sesión nuevamente.");
    return;
  }

  const recuperaConsent = product === "kinecheck-recupera" ? currentRecuperaConsent() : null;
  if (product === "kinecheck-recupera" && !recuperaConsent) {
    try {
      sessionStorage.setItem(RECUPERA_HANDOFF_KEY, JSON.stringify({
        type: HANDOFF_TYPE,
        issuedAt,
        product,
        access_token: accessToken,
        expires_at: expiresAt || "",
        session: {
          access_token: accessToken,
          expires_at: expiresAt || "",
          token_type: "bearer",
          handoff_access_only: true,
        },
      }));
      location.assign("../recupera/consentimiento.html");
      return;
    } catch {
      fail("No fue posible preparar el consentimiento de privacidad de KineCheck Recupera.");
      return;
    }
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = POST_URL;
  form.acceptCharset = "UTF-8";
  form.style.display = "none";

  hidden(form, "product", product);
  hidden(form, "access_token", accessToken);
  hidden(form, "expires_at", expiresAt || "");
  hidden(form, "issued_at", issuedAt);
  hidden(form, "handoff_type", HANDOFF_TYPE);
  if (recuperaConsent) {
    hidden(form, "privacy_consent_version", recuperaConsent.version);
    hidden(form, "privacy_consent_at", recuperaConsent.acceptedAt);
  }

  document.body.appendChild(form);
  if (status) status.textContent = `Validando la licencia específica de ${product === "kinecheck-estudiante" ? "KineCheck Estudiante" : "KineCheck Recupera"}…`;
  form.submit();
})();
