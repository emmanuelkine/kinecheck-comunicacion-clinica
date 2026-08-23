(() => {
  "use strict";

  if (window.__KINECHECK_OPEN_V6__) return;
  window.__KINECHECK_OPEN_V6__ = true;

  const SESSION_KEY = "kinecheck_secure_session_v1";
  const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
  const RELEASE = "20260819-library-hotfix1";

  const SAME_ORIGIN = Object.freeze({
    "kinecheck-clinico": `../kinecheck-clinico-guia/?product=kinecheck-clinico&v=${RELEASE}`,
    "kinecheck-clinico-curso": `../kinecheck-clinico-curso/?course=kinecheck-clinico-curso&v=${RELEASE}`,
    "comunicacion-clinica": `../comunicacion-clinica.html?course=comunicacion-clinica&v=${RELEASE}`,
    "mas-alla-del-dolor": `./mas-alla-del-dolor.html?v=${RELEASE}`,
    "traumatologia-ortopedia-clinica": `../traumatologia/?course=traumatologia-ortopedia-clinica&v=${RELEASE}`,
    "dolor-lumbar-persistente": `./dolor-lumbar-persistente/?course=dolor-lumbar-persistente&v=${RELEASE}`,
    "banderas-clinicas": `../banderas-clinicas/?course=banderas-clinicas&v=${RELEASE}`,
    "ejercicio-terapeutico": `./ejercicio-terapeutico/?course=ejercicio-terapeutico&v=${RELEASE}`,
  });

  const EXTERNAL = Object.freeze({
    "evidencia-aplicada": `https://emmanuelkine.github.io/kinecheck-evidencia-aplicada/?course=evidencia-aplicada&v=${RELEASE}`,
    "dolor-musculoesqueletico": `https://emmanuelkine.github.io/kinecheck-evidencia-aplicada/dolor-musculoesqueletico/?course=dolor-musculoesqueletico&v=${RELEASE}`,
  });

  const APPLICATIONS = new Set(["kinecheck-estudiante", "kinecheck-recupera"]);
  const KNOWN = new Set([...Object.keys(SAME_ORIGIN), ...Object.keys(EXTERNAL), ...APPLICATIONS]);
  let navigating = false;

  const masAllaCourse = window.KINECHECK_ACADEMY_CONFIG?.courses?.find?.(
    (course) => course?.slug === "mas-alla-del-dolor",
  );
  if (masAllaCourse) masAllaCourse.url = SAME_ORIGIN["mas-alla-del-dolor"];

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

  function installVisualHotfix() {
    if (document.querySelector('style[data-kc-hotfix="20260819-library"]')) return;
    const style = document.createElement("style");
    style.dataset.kcHotfix = "20260819-library";
    style.textContent = `
      #dashboard-view .kc-clinical-library{
        --kc-ink:#17333b!important;
        --kc-muted:#5d747d!important;
      }
      #dashboard-view .kc-clinical-library.kc-interior-enhanced{
        background:#eaf3f3!important;
      }
      #dashboard-view .kc-interior-enhanced .kc-interior-guide,
      #dashboard-view .kc-interior-enhanced .kc-interior-quicknav,
      #dashboard-view .kc-interior-enhanced .kc-clinical-group,
      #dashboard-view .kc-interior-enhanced .kc-clinical-card,
      #dashboard-view .kc-interior-enhanced .kc-clinical-references{
        background:#f7fbfb!important;
        color:#17333b!important;
      }
      #dashboard-view .kc-interior-enhanced .kc-interior-guide h3,
      #dashboard-view .kc-interior-enhanced .kc-interior-guide p,
      #dashboard-view .kc-interior-enhanced .kc-interior-step strong,
      #dashboard-view .kc-interior-enhanced .kc-interior-step span,
      #dashboard-view .kc-interior-enhanced .kc-interior-quicknav>strong,
      #dashboard-view .kc-interior-enhanced .kc-clinical-group>summary,
      #dashboard-view .kc-interior-enhanced .kc-clinical-card h3,
      #dashboard-view .kc-interior-enhanced .kc-clinical-card p,
      #dashboard-view .kc-interior-enhanced .kc-clinical-card p strong,
      #dashboard-view .kc-interior-enhanced .kc-clinical-scale-meta span,
      #dashboard-view .kc-interior-enhanced .kc-clinical-references h3,
      #dashboard-view .kc-interior-enhanced .kc-clinical-references,
      #dashboard-view .kc-interior-enhanced .kc-clinical-pro-value span{
        color:#17333b!important;
      }
      #dashboard-view .kc-interior-enhanced .kc-interior-step,
      #dashboard-view .kc-interior-enhanced .kc-clinical-card,
      #dashboard-view .kc-interior-enhanced .kc-clinical-group>summary,
      #dashboard-view .kc-interior-enhanced .kc-clinical-scale-meta div{
        background:#ffffff!important;
      }
      #dashboard-view .kc-interior-enhanced .kc-interior-navbutton{
        color:#36565e!important;
        background:#f6fafa!important;
      }
      #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product]{
        position:relative!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:stretch!important;
        min-height:430px!important;
        height:auto!important;
        overflow:hidden!important;
      }
      #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product]>span,
      #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product]>strong,
      #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product]>p,
      #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product] .kc-clinical-product-label,
      #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product] .kc-clinical-product-points,
      #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product] .kc-clinical-price,
      #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product]>b{
        position:static!important;
        inset:auto!important;
        transform:none!important;
      }
      #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product]>span{
        flex:0 0 auto!important;
        align-self:flex-start!important;
      }
      #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product] .kc-clinical-product-points{
        flex:1 1 auto!important;
      }
      #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product]>b{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        width:100%!important;
        min-height:54px!important;
        margin:16px 0 0!important;
        padding:0 16px!important;
        flex:0 0 54px!important;
        border-radius:14px!important;
      }
      #support-launcher{
        width:48px!important;
        min-width:48px!important;
        height:48px!important;
        min-height:48px!important;
        right:18px!important;
        bottom:18px!important;
        padding:0!important;
        border-radius:50%!important;
        display:grid!important;
        place-items:center!important;
      }
      #support-launcher>span{
        margin:0!important;
        line-height:1!important;
      }
      #support-launcher>b{
        position:absolute!important;
        width:1px!important;
        height:1px!important;
        padding:0!important;
        margin:-1px!important;
        overflow:hidden!important;
        clip:rect(0,0,0,0)!important;
        white-space:nowrap!important;
        border:0!important;
      }
      @media(max-width:760px){
        #dashboard-view .kc-clinical-category-trigger[data-kc-clinical-product]{min-height:400px!important}
        #support-launcher{right:12px!important;bottom:76px!important;width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important}
      }
    `;
    document.head.appendChild(style);
    document.querySelector("#support-launcher")?.setAttribute("aria-label", "Abrir soporte KineCheck");
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
    } catch {}
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
    if (product === "mas-alla-del-dolor") window.name = "";
    else window.name = JSON.stringify(payload(session, product));
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
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const nativeCourseButton = target.closest("#course-grid [data-course]");
    if (nativeCourseButton && !nativeCourseButton.disabled && nativeCourseButton.getAttribute("aria-disabled") !== "true") {
      const product = String(nativeCourseButton.dataset.course || "").trim();
      if (EXTERNAL[product] || APPLICATIONS.has(product)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void openProduct(product, nativeCourseButton);
        return;
      }
    }

    const button = target.closest("[data-kc-path-open]");
    if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return;
    const product = String(button.dataset.kcPathOpen || "").trim();
    if (!KNOWN.has(product)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void openProduct(product, button);
  }, true);

  window.addEventListener("pageshow", resetNavigationState);
  window.addEventListener("pagehide", () => { navigating = false; });

  installVisualHotfix();

  if (!document.querySelector('script[data-kc-personalization="v1"]')) {
    const script = document.createElement("script");
    script.src = `./academy-personalization-v1.js?v=${RELEASE}`;
    script.defer = true;
    script.dataset.kcPersonalization = "v1";
    document.head.appendChild(script);
  }
})();