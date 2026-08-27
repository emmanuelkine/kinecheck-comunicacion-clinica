(() => {
  "use strict";

  const BRAND_NAME = "Mi KineCheck";
  const BRAND_DESCRIPTOR = "UN SOLO ACCESO";

  const PUBLIC_PRODUCTS = Object.freeze([
    {
      slug: "kinecheck-clinico",
      icon: "KC",
      title: "KineCheck Clínico",
      type: "Curso + guía clínica",
      audience: "Profesionales",
      summary: "Evaluación musculoesquelética, seguridad clínica y razonamiento estructurado para apoyar decisiones profesionales.",
      points: ["Seguridad y banderas clínicas", "Evaluación y razonamiento MSK", "Reevaluación y toma de decisiones"],
      detailUrl: "../productos/kinecheck-clinico/",
    },
    {
      slug: "comunicacion-clinica",
      icon: "CC",
      title: "Comunicación Clínica",
      type: "Curso",
      audience: "Profesionales y estudiantes",
      summary: "Formación aplicada para fortalecer entrevista, explicación clínica y comunicación centrada en la persona.",
      points: ["Entrevista clínica", "Explicación comprensible", "Comunicación centrada en la persona"],
      detailUrl: "../productos/comunicacion-clinica/",
    },
    {
      slug: "kinecheck-estudiante",
      icon: "KE",
      title: "KineCheck Estudiante",
      type: "Aplicación",
      audience: "Estudiantes",
      summary: "Herramienta para practicar evaluación y razonamiento clínico con una estructura orientada a la formación en kinesiología.",
      points: ["Organización de la evaluación", "Razonamiento clínico", "Apoyo al aprendizaje"],
      detailUrl: "../productos/kinecheck-estudiante/",
    },
    {
      slug: "kinecheck-recupera",
      icon: "KR",
      title: "KineCheck Recupera",
      type: "Próximamente",
      audience: "Personas y pacientes",
      summary: "Próximamente. No disponible para compra, activación ni registro de información mientras se revisa privacidad y protección de datos.",
      points: ["Acceso bloqueado", "Sin registro de información", "Revisión de privacidad en curso"],
      detailUrl: "../productos/kinecheck-recupera/",
    },
    {
      slug: "mas-alla-del-dolor",
      icon: "MD",
      title: "Más allá del dolor",
      type: "Curso",
      audience: "Estudiantes y profesionales",
      summary: "Evaluación musculoesquelética integral para relacionar dolor, función, contexto y hallazgos clínicos.",
      points: ["Evaluación MSK integral", "Función y contexto", "Interpretación clínica"],
      detailUrl: "../productos/mas-alla-del-dolor/",
    },
    {
      slug: "evidencia-aplicada",
      icon: "EA",
      title: "Evidencia Aplicada",
      type: "Curso",
      audience: "Profesionales y estudiantes",
      summary: "Lectura crítica y aplicación de evidencia para sostener decisiones clínicas contextualizadas.",
      points: ["Lectura crítica", "Aplicación de evidencia", "Decisiones contextualizadas"],
      detailUrl: "../productos/evidencia-aplicada/",
    },
    {
      slug: "traumatologia-ortopedia-clinica",
      icon: "TO",
      title: "Traumatología y Ortopedia Clínica",
      type: "Curso",
      audience: "Profesionales y estudiantes",
      summary: "Del mecanismo lesional y la presentación clínica a una toma de decisiones más segura en traumatología y ortopedia.",
      points: ["Mecanismo lesional", "Presentación clínica", "Decisión clínica segura"],
      detailUrl: "../productos/traumatologia-ortopedia-clinica/",
    },
    {
      slug: "pack-estudiante",
      icon: "PK",
      title: "Pack KineCheck Estudiante",
      type: "Pack",
      audience: "Estudiantes",
      summary: "Ruta combinada con KineCheck Estudiante y Más allá del dolor para practicar evaluación y razonamiento musculoesquelético.",
      points: ["KineCheck Estudiante", "Más allá del dolor", "Ruta combinada de aprendizaje"],
      detailUrl: "../productos/pack-estudiante/",
    },
  ]);

  let publicPrices = null;

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element && element.textContent !== value) element.textContent = value;
  }

  function setNavigationLabels() {
    document.querySelectorAll('[data-kc-view-link="inicio"]').forEach((item) => {
      const label = item.querySelector("b") || item.querySelector("span:last-child") || item;
      if (label && label.textContent.trim() !== "Inicio") label.textContent = "Inicio";
    });
    document.querySelectorAll('[data-kc-view-link="biblioteca"]').forEach((item) => {
      const label = item.querySelector("b") || item.querySelector("span:last-child") || item;
      if (label && !item.hasAttribute("data-kc-scroll-target")) label.textContent = "Biblioteca";
    });
    document.querySelectorAll('[data-kc-view-link="herramientas"]').forEach((item) => {
      const label = item.querySelector("b") || item.querySelector("span:last-child") || item;
      if (label) label.textContent = "Recursos";
    });
    document.querySelectorAll('[data-kc-view-link="perfil"]').forEach((item) => {
      const label = item.querySelector("b") || item.querySelector("span:last-child") || item;
      if (label) label.textContent = "Cuenta y ayuda";
    });
  }

  function activateInicioAfterLogin() {
    const previousUrl = window.location.href;
    const nextUrl = new URL(previousUrl);
    nextUrl.hash = "inicio";

    try {
      window.history.replaceState(window.history.state, "", nextUrl.href);
    } catch {
      window.location.hash = "inicio";
      return;
    }

    document.body.dataset.kcView = "inicio";
    document.querySelectorAll("[data-kc-view-link]").forEach((item) => {
      item.classList.toggle("active", item.dataset.kcViewLink === "inicio");
    });

    try {
      window.dispatchEvent(new HashChangeEvent("hashchange", {
        oldURL: previousUrl,
        newURL: nextUrl.href,
      }));
    } catch {
      window.dispatchEvent(new Event("hashchange"));
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function wireLoginHomeRedirect() {
    if (window.__KINECHECK_LOGIN_HOME_REDIRECT__) return;
    window.__KINECHECK_LOGIN_HOME_REDIRECT__ = true;

    const form = document.querySelector("#auth-form");
    const dashboard = document.querySelector("#dashboard-view");
    if (!form || !dashboard) return;

    let explicitLoginPending = false;

    form.addEventListener("submit", () => {
      explicitLoginPending = true;
    }, { capture: true });

    const observer = new MutationObserver(() => {
      if (!explicitLoginPending || dashboard.hidden) return;
      explicitLoginPending = false;
      activateInicioAfterLogin();
    });

    observer.observe(dashboard, {
      attributes: true,
      attributeFilter: ["hidden"],
    });
  }

  function injectPublicLandingStyles() {
    if (document.querySelector("#kc-public-landing-v2-styles")) return;
    const style = document.createElement("style");
    style.id = "kc-public-landing-v2-styles";
    style.textContent = `
      .login-layout::before{
        background-image:
          linear-gradient(90deg,rgba(2,13,20,.96) 0%,rgba(2,13,20,.86) 42%,rgba(2,13,20,.55) 100%),
          url("./academy-hero-ecosistema-v1.webp")!important;
        background-size:cover!important;
        background-position:center center!important;
        opacity:.82!important;
      }
      .login-layout::after{
        background:
          radial-gradient(circle at 72% 22%,rgba(77,219,216,.10),transparent 28rem),
          linear-gradient(180deg,rgba(1,12,18,.08),rgba(2,13,20,.92))!important;
      }
      .kc-public-products-v2{margin-top:20px;max-width:100%;}
      .kc-public-products-v2__head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:10px;}
      .kc-public-products-v2__head strong{color:#70e4d3;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;}
      .kc-public-products-v2__head span{color:#9db9bf;font-size:.68rem;}
      .kc-public-products-v2__buttons{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 7px;scrollbar-width:thin;overscroll-behavior-x:contain;}
      .kc-public-product-v2{display:inline-flex;align-items:center;gap:8px;flex:0 0 auto;min-height:42px;padding:7px 11px;border:1px solid rgba(111,230,215,.24);border-radius:999px;background:rgba(4,31,39,.78);color:#eef9fa;cursor:pointer;font-size:.73rem;font-weight:850;white-space:nowrap;backdrop-filter:blur(10px);transition:transform .16s ease,border-color .16s ease,background .16s ease;}
      .kc-public-product-v2:hover{transform:translateY(-1px);border-color:rgba(111,230,215,.55);background:rgba(63,203,194,.13);}
      .kc-public-product-v2 b{display:grid;place-items:center;width:25px;height:25px;border-radius:8px;background:linear-gradient(135deg,#4fd8d3,#72dbba);color:#052a31;font-size:.58rem;font-weight:950;}
      .kc-public-products-v2--card{display:none;}
      #kc-public-product-modal-v2[hidden]{display:none!important;}
      #kc-public-product-modal-v2{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:rgba(1,10,15,.80);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);}
      .kc-public-product-dialog-v2{position:relative;width:min(640px,100%);max-height:calc(100dvh - 36px);overflow:auto;padding:28px;border:1px solid rgba(111,230,215,.25);border-radius:24px;background:radial-gradient(circle at 92% 0,rgba(108,188,255,.16),transparent 36%),linear-gradient(145deg,#0b3741,#061f27 72%);box-shadow:0 34px 100px rgba(0,0,0,.52);color:#f3fbfc;}
      .kc-public-product-close-v2{position:absolute;top:14px;right:14px;display:grid;place-items:center;width:39px;height:39px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.05);color:#fff;font-size:1.25rem;cursor:pointer;}
      .kc-public-product-dialog-v2__icon{display:grid;place-items:center;width:50px;height:50px;margin-bottom:14px;border-radius:15px;background:linear-gradient(135deg,#4fd8d3,#72dbba);color:#052a31;font-weight:950;}
      .kc-public-product-dialog-v2__type{display:block;color:#70e4d3;font-size:.7rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase;}
      .kc-public-product-dialog-v2 h2{margin:7px 48px 8px 0;color:#fff;font-size:clamp(1.7rem,4vw,2.35rem);line-height:1.08;}
      .kc-public-product-dialog-v2__audience{display:inline-flex;margin:2px 0 15px;padding:6px 10px;border:1px solid rgba(111,230,215,.24);border-radius:999px;background:rgba(65,207,193,.08);color:#90e7da;font-size:.72rem;font-weight:850;}
      .kc-public-product-dialog-v2 p{margin:0;color:#c7dadd;line-height:1.58;}
      .kc-public-product-dialog-v2 ul{display:grid;gap:8px;margin:18px 0 22px;padding:0;list-style:none;}
      .kc-public-product-dialog-v2 li{position:relative;padding-left:21px;color:#dce9eb;font-size:.86rem;line-height:1.4;}
      .kc-public-product-dialog-v2 li::before{content:"✓";position:absolute;left:0;color:#55d8c8;font-weight:950;}
      .kc-public-product-dialog-v2__footer{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
      .kc-public-product-dialog-v2__price{display:flex;flex-direction:column;gap:3px;}
      .kc-public-product-dialog-v2__price strong{color:#fff;font-size:1.12rem;}
      .kc-public-product-dialog-v2__price small{color:#8eaeb4;font-size:.7rem;}
      .kc-public-product-dialog-v2__cta{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 18px;border-radius:14px;background:linear-gradient(90deg,#4fd6d3,#67b9f5);color:#04252d;text-decoration:none;font-size:.8rem;font-weight:950;}
      @media(max-width:980px){
        .kc-public-products-v2--showcase{display:none!important;}
        .kc-public-products-v2--card{display:block;margin:18px 0 7px;}
      }
      @media(max-width:640px){
        .kc-public-products-v2__head{align-items:flex-start;flex-direction:column;gap:3px;}
        .kc-public-product-v2{min-height:40px;padding:6px 10px;font-size:.7rem;}
        #kc-public-product-modal-v2{padding:11px;}
        .kc-public-product-dialog-v2{padding:23px 18px 20px;border-radius:20px;}
        .kc-public-product-dialog-v2__footer{align-items:stretch;}
        .kc-public-product-dialog-v2__cta{width:100%;}
      }
      @media(prefers-reduced-motion:reduce){.kc-public-product-v2{transition:none!important;}}
    `;
    document.head.appendChild(style);
  }

  function publicProductStripMarkup(variant) {
    return `
      <section class="kc-public-products-v2 kc-public-products-v2--${variant}" data-kc-public-products-v2 aria-label="Productos KineCheck">
        <div class="kc-public-products-v2__head">
          <strong>Explora KineCheck</strong>
          <span>Toca un producto para conocerlo</span>
        </div>
        <div class="kc-public-products-v2__buttons">
          ${PUBLIC_PRODUCTS.map((product) => `
            <button class="kc-public-product-v2" type="button" data-kc-public-product-v2="${product.slug}">
              <b aria-hidden="true">${product.icon}</b>${product.title}
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }

  async function ensurePublicPrices() {
    if (publicPrices) return publicPrices;
    try {
      const response = await fetch("../commercial-prices-cl.json?v=20260811", { cache: "no-cache" });
      if (!response.ok) return null;
      const data = await response.json();
      publicPrices = data?.products || null;
      return publicPrices;
    } catch {
      return null;
    }
  }

  function productPrice(product) {
    const record = publicPrices?.[product.slug];
    return {
      display: record?.display || "Ver precio",
      term: record?.term || "Detalle en la ficha del producto",
    };
  }

  function ensurePublicProductModal() {
    let modal = document.querySelector("#kc-public-product-modal-v2");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "kc-public-product-modal-v2";
    modal.hidden = true;
    modal.innerHTML = `
      <article class="kc-public-product-dialog-v2" role="dialog" aria-modal="true" aria-labelledby="kc-public-product-title-v2">
        <button class="kc-public-product-close-v2" type="button" aria-label="Cerrar">×</button>
        <div data-kc-public-product-content-v2></div>
      </article>
    `;
    document.body.appendChild(modal);

    const close = () => {
      modal.hidden = true;
      document.body.classList.remove("kc-public-product-modal-open");
    };

    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest(".kc-public-product-close-v2")) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) close();
    });
    return modal;
  }

  async function openPublicProduct(slug) {
    const product = PUBLIC_PRODUCTS.find((item) => item.slug === slug) || PUBLIC_PRODUCTS[0];
    await ensurePublicPrices();
    const price = productPrice(product);
    const modal = ensurePublicProductModal();
    const content = modal.querySelector("[data-kc-public-product-content-v2]");
    if (!content) return;

    content.innerHTML = `
      <span class="kc-public-product-dialog-v2__icon" aria-hidden="true">${product.icon}</span>
      <span class="kc-public-product-dialog-v2__type">${product.type}</span>
      <h2 id="kc-public-product-title-v2">${product.title}</h2>
      <span class="kc-public-product-dialog-v2__audience">${product.audience}</span>
      <p>${product.summary}</p>
      <ul>${product.points.map((point) => `<li>${point}</li>`).join("")}</ul>
      <div class="kc-public-product-dialog-v2__footer">
        <div class="kc-public-product-dialog-v2__price"><strong>${price.display}</strong><small>${price.term}</small></div>
        <a class="kc-public-product-dialog-v2__cta" href="${product.detailUrl}">Conocer producto →</a>
      </div>
    `;

    modal.hidden = false;
    document.body.classList.add("kc-public-product-modal-open");
    modal.querySelector(".kc-public-product-close-v2")?.focus();
  }

  function mountPublicProductExplorer() {
    const login = document.querySelector("#login-view");
    if (!login) return;

    document.querySelectorAll("[data-kc-public-product-strip]").forEach((element) => element.remove());
    document.querySelectorAll("[data-kc-public-products-v2]").forEach((element) => element.remove());

    const showcase = login.querySelector(".login-showcase");
    const trustRow = showcase?.querySelector(".trust-row");
    if (showcase && trustRow) trustRow.insertAdjacentHTML("beforebegin", publicProductStripMarkup("showcase"));

    const loginCard = login.querySelector(".login-card");
    const support = loginCard?.querySelector(".support-link");
    if (loginCard && support) support.insertAdjacentHTML("beforebegin", publicProductStripMarkup("card"));

    if (!login.dataset.kcPublicProductsV2Wired) {
      login.dataset.kcPublicProductsV2Wired = "true";
      login.addEventListener("click", (event) => {
        const button = event.target.closest("[data-kc-public-product-v2]");
        if (!button) return;
        openPublicProduct(button.dataset.kcPublicProductV2);
      });
    }
  }

  function applyIdentity() {
    document.title = BRAND_NAME;

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        "content",
        "Mi KineCheck: una sola entrada para acceder a tus cursos y herramientas activas.",
      );
    }

    setText(".login-showcase .brand > div > span", "UNA CUENTA · UN ACCESO");
    setText(".login-showcase > .eyebrow", "MI KINECHECK");

    const loginTitle = document.querySelector("#login-title");
    const loginHtml = "Entra una vez.<br><em>Continúa desde aquí.</em>";
    if (loginTitle && loginTitle.innerHTML !== loginHtml) loginTitle.innerHTML = loginHtml;

    setText(".mobile-brand > div > span", "UN SOLO ACCESO");
    setText(".sidebar-brand > div > span", BRAND_DESCRIPTOR);
    setText(".topbar-brand > div > span", BRAND_DESCRIPTOR);
    setText(".kc-home-hero > .eyebrow", "MI KINECHECK");
    setNavigationLabels();
    wireLoginHomeRedirect();
    injectPublicLandingStyles();
    mountPublicProductExplorer();

    const topbarBrand = document.querySelector(".topbar-brand");
    if (topbarBrand) topbarBrand.setAttribute("aria-label", `${BRAND_NAME}, inicio`);

    const onboardingAction = document.querySelector("#onboarding-action");
    if (onboardingAction) {
      onboardingAction.setAttribute("data-kc-view-link", "biblioteca");
      onboardingAction.setAttribute("aria-label", "Ver biblioteca");
      onboardingAction.textContent = "Ver biblioteca";
    }

    const catalogButton = document.querySelector(".kc-catalog-button");
    if (catalogButton) catalogButton.setAttribute("href", "../#productos");

    document.querySelectorAll('a[hidden][aria-hidden="true"]:empty').forEach((anchor) => anchor.remove());

    const loginCard = document.querySelector(".login-card");
    if (loginCard && !document.querySelector("#purchase-access-help")) {
      const help = document.createElement("details");
      help.id = "purchase-access-help";
      help.className = "kc-purchase-access-help";
      help.innerHTML = `
        <summary>Compré y todavía no aparece mi acceso</summary>
        <div>
          <p>Primero confirma que estás usando el mismo correo utilizado en Hotmart. La activación puede tardar unos minutos mientras se procesa la compra.</p>
          <p>Si el acceso sigue sin aparecer, contacta a soporte e incluye el correo de compra y el código de transacción de Hotmart.</p>
          <p><strong>No envíes contraseñas, datos clínicos ni información sensible.</strong></p>
          <a href="mailto:soporte.kinecheck@gmail.com?subject=Compra%20Hotmart%20sin%20acceso%20en%20KineCheck">Contactar soporte por una compra</a>
        </div>
      `;
      const support = loginCard.querySelector(".support-link");
      if (support) support.before(help);
      else loginCard.appendChild(help);
    }

    const footerCopyright = document.querySelector(".academy-footer > span:first-child");
    if (footerCopyright) {
      const year = document.querySelector("#current-year")?.textContent || String(new Date().getFullYear());
      const copy = `© <span id="current-year">${year}</span> KineCheck`;
      if (footerCopyright.innerHTML !== copy) footerCopyright.innerHTML = copy;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyIdentity, { once: true });
  } else {
    applyIdentity();
  }
})();
