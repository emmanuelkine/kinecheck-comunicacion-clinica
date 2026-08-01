(() => {
  const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
  const MAX_AGE_MS = 120000;
  const POST_URL = "https://kinecheck-clinico.emmanuelkine.chatgpt.site/api/license/sso";
  const PRODUCTS = new Set([
    "kinecheck-clinico",
    "kinecheck-estudiante",
    "kinecheck-recupera",
  ]);

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
    fail("La aplicación solicitada no está permitida.");
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

  document.body.appendChild(form);
  if (status) status.textContent = "Acceso validado. Abriendo la aplicación…";
  form.submit();
})();
