(() => {
  "use strict";

  if (window.__KINECHECK_OPEN_V6__) return;
  window.__KINECHECK_OPEN_V6__ = true;

  const SESSION_KEY = "kinecheck_secure_session_v1";
  const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
  const RELEASE = "20260809-private1";

  const SAME_ORIGIN = Object.freeze({
    "kinecheck-clinico": `../kinecheck-clinico-guia/?product=kinecheck-clinico&v=${RELEASE}`,
    "kinecheck-clinico-curso": `../kinecheck-clinico-curso/?course=kinecheck-clinico-curso&v=${RELEASE}`,
    "comunicacion-clinica": `../comunicacion-clinica.html?course=comunicacion-clinica&v=${RELEASE}`,
    "traumatologia-ortopedia-clinica": `../traumatologia/?course=traumatologia-ortopedia-clinica&v=${RELEASE}`,
  });

  const EXTERNAL = Object.freeze({
    "mas-alla-del-dolor": `https://emmanuelkine.github.io/mas-alla-del-dolor/?course=mas-alla-del-dolor&v=${RELEASE}`,
    "evidencia-aplicada": `https://emmanuelkine.github.io/kinecheck-evidencia-aplicada/?course=evidencia-aplicada&v=${RELEASE}`,
  });

  const APPLICATIONS = new Set(["kinecheck-estudiante", "kinecheck-recupera"]);
  const KNOWN = new Set([...Object.keys(SAME_ORIGIN), ...Object.keys(EXTERNAL), ...APPLICATIONS]);
  let navigating = false;

  function parse(storage) {
    try {
      const value = JSON.parse(storage.getItem(SESSION_KEY) || "null");
      return value?.access_token ? value : null;
    } catch {
      return null;
    }
  }

  function currentSession() {
    const supplied = window.KINECHECK_ACADEMY_SESSION?.get?.();
    if (supplied?.access_token) return supplied;
    return parse(sessionStorage) || parse(localStorage);
  }

  async function usableSession() {
    let session = currentSession();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = Number(session?.expires_at || 0);
    if ((!session?.access_token || (expiresAt && expiresAt <= now + 60))
      && typeof window.KINECHECK_ACADEMY_SESSION?.refresh === "function") {
      session = await window.KINECHECK_ACADEMY_SESSION.refresh().catch(() => null);
    }
    const finalExpiry = Number(session?.expires_at || 0);
    if (!session?.access_token || (finalExpiry && finalExpiry <= Math.floor(Date.now() / 1000) + 20)) return null;
    return session;
  }

  function accessOnly(session) {
    return {
      access_token: session.access_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type || "bearer",
      handoff_access_only: true,
    };
  }

  function payload(session, product) {
    return {
      type: HANDOFF_TYPE,
      issuedAt: Date.now(),
      product,
      session: accessOnly(session),
    };
  }

  function encodeBase64Url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function externalHandoffUrl(targetUrl, session, product) {
    const url = new URL(targetUrl);
    const encoded = encodeBase64Url(JSON.stringify(payload(session, product)));
    url.hash = new URLSearchParams({ kc_handoff: encoded }).toString();
    return url.toString();
  }

  function toast(text) {
    const element = document.querySelector("#kc-toast");
    if (!element) return;
    element.textContent = text;
    element.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { element.hidden = true; }, 5000);
  }

  function restoreButton(button) {
    if (!button) return;
    button.removeAttribute("aria-busy");
    if (button.dataset.kcOriginalText) button.textContent = button.dataset.kcOriginalText;
    button.style.pointerEvents = "";
    delete button.dataset.kcOpening;
  }

  function resetNavigationState() {
    navigating = false;
    document.querySelectorAll('[aria-busy="true"], [data-kc-opening="true"]').forEach(restoreButton);
  }

  function setBusy(button, value) {
    navigating = value;
    if (!button) return;
    if (value) {
      button.setAttribute("aria-busy", "true");
      button.dataset.kcOpening = "true";
      button.dataset.kcOriginalText ||= button.textContent;
      button.textContent = "Abriendo…";
      button.style.pointerEvents = "none";
    } else {
      restoreButton(button);
    }
  }

  function saveSharedSession(session) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // La sesión en memoria del ecosistema sigue disponible.
    }
  }

  async function openSameOrigin(product, button) {
    setBusy(button, true);
    const session = await usableSession();
    if (!session) {
      setBusy(button, false);
      toast("Tu sesión terminó. Ingresa nuevamente a KineCheck una sola vez.");
      return;
    }
    saveSharedSession(session);
    window.name = JSON.stringify(payload(session, product));
    try {
      location.assign(SAME_ORIGIN[product]);
    } catch {
      setBusy(button, false);
      toast("No fue posible abrir el producto. Vuelve a intentarlo.");
    }
  }

  async function openExternal(product, button) {
    const targetUrl = EXTERNAL[product];
    setBusy(button, true);
    const session = await usableSession();
    if (!session) {
      setBusy(button, false);
      toast("Tu sesión terminó. Ingresa nuevamente a KineCheck una sola vez.");
      return;
    }

    try {
      window.name = "";
      location.assign(externalHandoffUrl(targetUrl, session, product));
    } catch {
      setBusy(button, false);
      toast("No fue posible transferir el acceso al curso. Vuelve a intentarlo.");
    }
  }

  async function openApplication(product, button) {
    setBusy(button, true);
    const session = await usableSession();
    if (!session) {
      setBusy(button, false);
      toast("Tu sesión terminó. Ingresa nuevamente a KineCheck una sola vez.");
      return;
    }
    const transfer = payload(session, product);
    window.name = JSON.stringify({
      ...transfer,
      access_token: transfer.session.access_token,
      expires_at: transfer.session.expires_at,
    });
    try {
      location.assign(`./app-sso-relay.html?product=${encodeURIComponent(product)}&v=${RELEASE}`);
    } catch {
      setBusy(button, false);
      toast("No fue posible abrir la aplicación. Vuelve a intentarlo.");
    }
  }

  async function openProduct(product, button = null) {
    if (!KNOWN.has(product)) return;
    if (navigating) resetNavigationState();
    if (SAME_ORIGIN[product]) return openSameOrigin(product, button);
    if (EXTERNAL[product]) return openExternal(product, button);
    if (APPLICATIONS.has(product)) return openApplication(product, button);
  }

  window.KINECHECK_OPEN_PRODUCT = openProduct;
  window.KINECHECK_RESET_PRODUCT_NAVIGATION = resetNavigationState;

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-kc-path-open]");
    if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return;
    const product = String(button.dataset.kcPathOpen || "").trim();
    if (!KNOWN.has(product)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openProduct(product, button);
  }, true);

  window.addEventListener("pageshow", resetNavigationState);
  window.addEventListener("pagehide", () => { navigating = false; });
})();
