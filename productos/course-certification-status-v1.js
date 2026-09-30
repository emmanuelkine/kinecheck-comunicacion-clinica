(() => {
  "use strict";

  if (window.__KINECHECK_COURSE_CERTIFICATION_STATUS_V1__) return;
  window.__KINECHECK_COURSE_CERTIFICATION_STATUS_V1__ = true;

  const COURSE_LABELS = Object.freeze({
    "banderas-clinicas": "KineCheck Banderas Clínicas",
    "comunicacion-clinica": "Comunicación Clínica",
    "dolor-lumbar-persistente": "Dolor Lumbar Persistente",
    "dolor-musculoesqueletico": "Dolor Musculoesquelético",
    "evidencia-aplicada": "Evidencia Aplicada",
    "kinecheck-clinico": "KineCheck Clínico",
    "mas-alla-del-dolor": "Más allá del dolor",
    "traumatologia-ortopedia-clinica": "Traumatología y Ortopedia Clínica",
  });

  function courseSlug() {
    const parts = location.pathname.split("/").filter(Boolean);
    const productIndex = parts.indexOf("productos");
    return productIndex >= 0 ? String(parts[productIndex + 1] || "") : "";
  }

  function injectStyles() {
    if (document.querySelector("#kc-course-certification-status-styles")) return;
    const style = document.createElement("style");
    style.id = "kc-course-certification-status-styles";
    style.textContent = `
      .kc-certification-status{width:min(1120px,calc(100% - 32px));margin:28px auto;padding:24px;border:1px solid rgba(68,210,202,.28);border-radius:22px;background:linear-gradient(145deg,rgba(8,54,63,.96),rgba(5,33,42,.98));box-shadow:0 18px 55px rgba(0,0,0,.16);color:#eaf7f8}
      .kc-certification-status__top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .kc-certification-status__eyebrow{color:#79e4da;font-size:.72rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase}
      .kc-certification-status__badge{display:inline-flex;align-items:center;min-height:30px;padding:6px 10px;border:1px solid rgba(121,228,218,.3);border-radius:999px;background:rgba(72,203,194,.09);color:#9aeee6;font-size:.7rem;font-weight:900}
      .kc-certification-status h2{margin:10px 0 8px;color:#fff;font-size:clamp(1.35rem,3vw,1.9rem);line-height:1.12}
      .kc-certification-status p{margin:0;color:#c8dcdf;font-size:.92rem;line-height:1.6}
      .kc-certification-status__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:17px}
      .kc-certification-status__item{padding:13px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.035)}
      .kc-certification-status__item strong{display:block;margin-bottom:5px;color:#f4ffff;font-size:.78rem}
      .kc-certification-status__item span{display:block;color:#adc7cb;font-size:.73rem;line-height:1.45}
      .kc-certification-status__note{margin-top:14px!important;padding-top:13px;border-top:1px solid rgba(255,255,255,.08);color:#9fb9bd!important;font-size:.74rem!important}
      @media(max-width:760px){.kc-certification-status{width:min(100% - 24px,1120px);padding:19px;border-radius:18px}.kc-certification-status__grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function markup(name) {
    return `
      <section class="kc-certification-status" aria-labelledby="kc-certification-status-title">
        <div class="kc-certification-status__top">
          <span class="kc-certification-status__eyebrow">CERTIFICACIÓN DEL CURSO</span>
          <span class="kc-certification-status__badge">OTEC en preparación</span>
        </div>
        <h2 id="kc-certification-status-title">Certificación privada OTEC en proceso de implementación</h2>
        <p><strong>${name}</strong> es un curso privado de KineCheck. KineCheck está preparando un convenio con una OTEC para que, una vez formalizado y aprobado el programa bajo los criterios acordados, los participantes que cumplan los requisitos puedan obtener un certificado emitido por la OTEC.</p>
        <div class="kc-certification-status__grid">
          <div class="kc-certification-status__item"><strong>Uso laboral</strong><span>El certificado podrá presentarse como antecedente de capacitación o formación complementaria en procesos públicos o privados, sujeto a las bases o criterios de cada institución.</span></div>
          <div class="kc-certification-status__item"><strong>Trazabilidad</strong><span>La certificación prevista incorporará identificación del participante, curso, horas, aprobación, folio y verificación mediante QR.</span></div>
          <div class="kc-certification-status__item"><strong>Alcance</strong><span>No corresponde a un curso SENCE, no posee código SENCE y no utiliza franquicia tributaria.</span></div>
        </div>
        <p class="kc-certification-status__note">La certificación OTEC aún no se encuentra activa. Su disponibilidad quedará sujeta a la formalización del convenio y a la aprobación previa del programa por parte de la OTEC.</p>
      </section>
    `;
  }

  function apply() {
    if (document.querySelector(".kc-certification-status")) return;
    const slug = courseSlug();
    const name = COURSE_LABELS[slug];
    if (!name) return;

    injectStyles();
    const main = document.querySelector("main");
    if (!main) return;
    main.insertAdjacentHTML("beforeend", markup(name));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once: true });
  else apply();
})();