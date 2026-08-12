(() => {
  if (window.__KINECHECK_COMMERCE_V4__) return;
  window.__KINECHECK_COMMERCE_V4__ = true;

  const CHECKOUTS = Object.freeze({
    "kinecheck-clinico": "https://pay.hotmart.com/L106791841D",
    "kinecheck-estudiante": "https://pay.hotmart.com/G106801166S",
    "kinecheck-recupera": "https://pay.hotmart.com/P106806251E",
    "comunicacion-clinica": "https://pay.hotmart.com/T106883983U",
    "mas-alla-del-dolor": "https://pay.hotmart.com/W106888386Q",
    "evidencia-aplicada": "https://pay.hotmart.com/F106921972I",
    "traumatologia-ortopedia-clinica": "https://pay.hotmart.com/B106913952R",
    "pack-kinecheck-estudiante": "https://pay.hotmart.com/Q106891608M",
  });

  const PACK = Object.freeze({
    slug: "pack-kinecheck-estudiante",
    title: "Pack KineCheck Estudiante",
    subtitle: "KineCheck Estudiante + Más allá del dolor.",
    icon: "PK",
    includes: ["kinecheck-estudiante", "mas-alla-del-dolor"],
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  let leavingForCheckout = false;

  function showToast(text) {
    const toast = $("#kc-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3600);
  }

  function isOwned(slug) {
    const button = document.querySelector(`#course-grid [data-course="${CSS.escape(slug)}"]`);
    return Boolean(button && !button.disabled);
  }

  function openCheckout(slug, button) {
    if (leavingForCheckout) return;
    const checkout = CHECKOUTS[slug];
    if (!checkout) {
      showToast("Todavía no hay un checkout configurado para este producto.");
      return;
    }
    leavingForCheckout = true;
    if (button) {
      button.setAttribute("aria-busy", "true");
      button.style.pointerEvents = "none";
    }
    window.location.assign(checkout);
  }

  function injectStyles() {
    if ($("#kc-commerce-styles")) return;
    const style = document.createElement("style");
    style.id = "kc-commerce-styles";
    style.textContent = `
      .kc-commerce-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1rem}
      .kc-commerce-button,.kc-refresh-purchases{border:0;border-radius:14px;padding:.82rem 1rem;font:inherit;font-weight:800;cursor:pointer;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff;box-shadow:0 10px 24px rgba(234,88,12,.2)}
      .kc-refresh-purchases{background:linear-gradient(135deg,#14b8a6,#0f766e)}
      .kc-pack-offer{border:1px solid rgba(124,108,242,.28);background:linear-gradient(145deg,#f7f4ff,#fff7ed)!important}
      .kc-pack-offer .kc-summary-icon{background:linear-gradient(135deg,#7c6cf2,#f59e0b);color:#fff}
      .kc-pack-offer ul{margin:.5rem 0 1rem;padding-left:1.15rem;color:#52616b}
      .kc-commerce-note{font-size:.86rem;color:#667681;margin-top:.55rem}
      .kc-stage-recommendation-card,
      .kc-stage-recommendation-card:hover,
      .kc-summary-card,
      .kc-summary-card:hover,
      .course-card,
      .course-card:hover{transform:none!important}
      .kc-stage-recommendation-card button,
      .kc-stage-recommendation-card button:hover,
      .kc-summary-card button,
      .kc-summary-card button:hover,
      .course-button,
      .course-button:hover,
      [data-kc-path-open],
      [data-kc-path-open]:hover,
      [data-course],
      [data-course]:hover{transform:none!important;translate:none!important;will-change:auto!important}
      [aria-busy="true"]{cursor:progress!important;opacity:.82}
      @media (prefers-reduced-motion:reduce){.kc-stage-recommendation-card,.kc-summary-card,.course-card,button{transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function enhanceExploreButtons() {
    document.querySelectorAll("[data-kc-explore-product], [data-kc-path-explore]").forEach((button) => {
      const slug = button.dataset.kcExploreProduct || button.dataset.kcPathExplore;
      if (!CHECKOUTS[slug]) return;
      if (button.textContent.trim() !== "Comprar en Hotmart") {
        button.textContent = "Comprar en Hotmart";
      }
      button.title = "Abrir el checkout oficial de Hotmart";
    });
  }

  function injectPackOffer() {
    const grid = $("#explore-grid");
    if (!grid) return;

    const alreadyOwned = PACK.includes.every(isOwned);
    const current = $("#kc-pack-estudiante-offer");
    if (alreadyOwned) {
      current?.remove();
      return;
    }
    if (current) return;

    const card = document.createElement("article");
    card.id = "kc-pack-estudiante-offer";
    card.className = "kc-summary-card kc-pack-offer";
    card.innerHTML = `
      <div class="kc-summary-top">
        <span class="kc-summary-icon">${PACK.icon}</span>
        <span class="kc-status">Pack</span>
      </div>
      <div><small>PACK KINECHECK</small><h3>${PACK.title}</h3></div>
      <p>${PACK.subtitle}</p>
      <ul><li>Aplicación KineCheck Estudiante</li><li>Curso Más allá del dolor</li></ul>
      <button type="button" class="kc-commerce-button" data-kc-buy-product="${PACK.slug}">Comprar Pack en Hotmart</button>
      <div class="kc-commerce-note">La compra concede ambas licencias con el mismo correo utilizado en Hotmart.</div>
    `;
    grid.appendChild(card);
  }

  function injectRefreshButtons() {
    const targets = [
      $("#explorar .kc-page-heading"),
      $("#cuenta .kc-page-heading"),
    ].filter(Boolean);

    targets.forEach((target, index) => {
      const id = `kc-refresh-purchases-${index}`;
      if ($(`#${id}`)) return;
      const wrap = document.createElement("div");
      wrap.className = "kc-commerce-actions";
      wrap.innerHTML = `<button id="${id}" class="kc-refresh-purchases" type="button" data-kc-refresh-purchases>Ya compré · Actualizar mis licencias</button>`;
      target.appendChild(wrap);
    });
  }

  function refreshLicenses() {
    showToast("Actualizando tus compras y licencias…");
    const url = new URL(window.location.href);
    url.searchParams.set("purchase", "approved");
    url.searchParams.set("refresh", String(Date.now()));
    url.hash = "biblioteca";
    window.setTimeout(() => window.location.assign(url.toString()), 250);
  }

  function enhance() {
    injectStyles();
    enhanceExploreButtons();
    injectPackOffer();
    injectRefreshButtons();
  }

  document.addEventListener("click", (event) => {
    const purchase = event.target.closest("[data-kc-buy-product]");
    if (purchase) {
      event.preventDefault();
      event.stopPropagation();
      openCheckout(purchase.dataset.kcBuyProduct, purchase);
      return;
    }

    const refresh = event.target.closest("[data-kc-refresh-purchases]");
    if (refresh) {
      event.preventDefault();
      refreshLicenses();
      return;
    }

    const explore = event.target.closest("[data-kc-explore-product], [data-kc-path-explore]");
    if (explore) {
      const slug = explore.dataset.kcExploreProduct || explore.dataset.kcPathExplore;
      if (!CHECKOUTS[slug]) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openCheckout(slug, explore);
    }
  }, true);

  function start() {
    enhance();
    window.setTimeout(enhance, 250);
    window.setTimeout(enhance, 900);
    window.setTimeout(enhance, 2200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

(() => {
  "use strict";

  if (window.__KINECHECK_EXTERNAL_HANDOFF_FIX_V1__) return;
  window.__KINECHECK_EXTERNAL_HANDOFF_FIX_V1__ = true;

  const EXTERNAL = new Set(["mas-alla-del-dolor", "evidencia-aplicada"]);
  const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";

  function toast(text) {
    const element = document.querySelector("#kc-toast");
    if (!element) return;
    element.textContent = text;
    element.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => { element.hidden = true; }, 4500);
  }

  function tokenExpiry(token) {
    try {
      const parts = String(token || "").split(".");
      if (parts.length !== 3) return 0;
      const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
      const claims = JSON.parse(atob(padded));
      return Number(claims?.exp || 0);
    } catch {
      return 0;
    }
  }

  async function currentSession() {
    let session = window.KINECHECK_ACADEMY_SESSION?.get?.() || null;
    const expiry = Number(session?.expires_at || tokenExpiry(session?.access_token));
    if ((!session?.access_token || (expiry && expiry <= Math.floor(Date.now() / 1000) + 30))
      && typeof window.KINECHECK_ACADEMY_SESSION?.refresh === "function") {
      session = await window.KINECHECK_ACADEMY_SESSION.refresh().catch(() => null);
    }
    return session?.access_token ? session : null;
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

  async function validateLicense(session, slug) {
    const config = window.KINECHECK_ACADEMY_CONFIG;
    const response = await fetch(`${config.supabaseUrl}/functions/v1/${config.courseKeyFunction}`, {
      method: "POST",
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseSlug: slug }),
    });
    if (!response.ok) throw new Error("No encontramos una licencia activa para este curso.");
  }

  async function openExternal(slug, button) {
    const config = window.KINECHECK_ACADEMY_CONFIG;
    const course = config?.courses?.find((item) => item.slug === slug);
    if (!course?.url) return;

    if (button) {
      button.setAttribute("aria-busy", "true");
      button.dataset.kcOriginalText ||= button.textContent;
      button.textContent = "Abriendo…";
      button.style.pointerEvents = "none";
    }

    try {
      const session = await currentSession();
      if (!session) throw new Error("Tu sesión terminó. Ingresa nuevamente a KineCheck.");
      await validateLicense(session, slug);

      const payload = {
        type: HANDOFF_TYPE,
        issuedAt: Date.now(),
        product: slug,
        session: {
          access_token: session.access_token,
          expires_at: Number(session.expires_at || tokenExpiry(session.access_token) || 0),
          expires_in: Number(session.expires_in || 0) || null,
          token_type: session.token_type || "bearer",
          handoff_access_only: true,
        },
      };

      const destination = new URL(course.url, window.location.href);
      destination.hash = new URLSearchParams({
        kc_handoff: encodeBase64Url(JSON.stringify(payload)),
      }).toString();
      window.name = "";
      window.location.assign(destination.toString());
    } catch (error) {
      if (button) {
        button.removeAttribute("aria-busy");
        if (button.dataset.kcOriginalText) button.textContent = button.dataset.kcOriginalText;
        button.style.pointerEvents = "";
      }
      toast(error?.message || "No fue posible abrir el curso. Vuelve a intentarlo.");
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-course]");
    if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return;
    const slug = String(button.dataset.course || "").trim();
    if (!EXTERNAL.has(slug)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openExternal(slug, button);
  }, true);
})();
