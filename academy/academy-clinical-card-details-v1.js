(() => {
  "use strict";

  if (window.__KINECHECK_CLINICAL_CARD_DETAILS_V1__) return;
  window.__KINECHECK_CLINICAL_CARD_DETAILS_V1__ = true;

  const DETAILS = Object.freeze({
    "kc-scales-library": Object.freeze({
      headline: "Medición clínica y seguimiento de resultados",
      coverage: "Columna, hombro, miembro superior, cadera/ingle, rodilla, extremidad inferior, pie y tobillo.",
      record: "Población objetivo, dirección del puntaje, utilidad clínica, interpretación, limitaciones y fuente científica.",
      use: "Evaluación inicial, seguimiento longitudinal, objetivos compartidos y documentación de cambios funcionales.",
      examples: ["PSFS", "PCS", "NDI", "ODI", "QuickDASH", "SPADI", "HAGOS", "iHOT", "KOOS", "LEFS", "FAAM", "VISA-A"],
      note: "Un PROM cuantifica función, síntomas, participación o calidad de vida; no identifica por sí solo una lesión anatómica. El cambio debe interpretarse según población, versión utilizada, error de medición y contexto clínico.",
    }),
    "kc-special-tests-library": Object.freeze({
      headline: "Examen físico orientado por probabilidad clínica",
      coverage: "Columna cervical, hombro, cadera, articulación sacroilíaca, rodilla, sindesmosis, tobillo y tendón de Aquiles.",
      record: "Pregunta clínica, sensibilidad, especificidad, cocientes de probabilidad cuando corresponden, interpretación, limitaciones y referencia.",
      use: "Seleccionar maniobras pertinentes, actualizar la probabilidad clínica y reconocer cuándo un hallazgo aislado aporta poco.",
      examples: ["Spurling", "ULTT", "Hawkins-Kennedy", "Apprehension", "FADIR", "FABER", "SIJ cluster", "Lachman", "McMurray", "Thessaly", "Squeeze", "Calf squeeze"],
      note: "Una prueba especial no debe utilizarse como diagnóstico aislado. Su valor depende de la probabilidad pretest, la calidad de la ejecución, la población estudiada y la integración con historia, examen completo e imagen cuando esté indicada.",
    }),
  });

  function injectStyles() {
    if (document.querySelector("#kc-clinical-card-details-styles")) return;
    const style = document.createElement("style");
    style.id = "kc-clinical-card-details-styles";
    style.textContent = `
      .kc-clinical-catalog-card{
        min-height:610px!important;
      }
      .kc-professional-detail{
        display:grid;gap:14px;margin:16px 0 18px;padding:16px;
        border:1px solid rgba(91,213,212,.18);border-radius:18px;
        background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(46,210,207,.035));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.025)
      }
      .kc-professional-detail-head{
        display:flex;align-items:flex-start;justify-content:space-between;gap:14px
      }
      .kc-professional-detail-head span{
        display:inline-flex;flex:0 0 auto;padding:5px 8px;border-radius:999px;
        background:rgba(46,210,207,.11);border:1px solid rgba(46,210,207,.22);
        color:#77e8e2;font-size:.64rem;font-weight:950;letter-spacing:.1em;text-transform:uppercase
      }
      .kc-professional-detail-head strong{
        color:#f5fcfd;font-size:.86rem;line-height:1.35;text-align:right
      }
      .kc-professional-detail-grid{
        display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px
      }
      .kc-professional-detail-item{
        min-width:0;padding:11px;border-radius:13px;background:rgba(2,18,25,.34);
        border:1px solid rgba(255,255,255,.055)
      }
      .kc-professional-detail-item small{
        display:block;margin-bottom:5px;color:#62dcd7;font-size:.6rem;font-weight:950;
        letter-spacing:.08em;text-transform:uppercase
      }
      .kc-professional-detail-item p{
        margin:0!important;color:#c8dbde!important;font-size:.72rem!important;line-height:1.46!important
      }
      .kc-professional-examples{
        display:flex;flex-wrap:wrap;gap:6px;margin:0
      }
      .kc-professional-examples span{
        display:inline-flex;padding:5px 8px;border:1px solid rgba(113,209,214,.16);
        border-radius:999px;background:rgba(4,32,41,.62);color:#d9ecee;font-size:.65rem;font-weight:760
      }
      .kc-professional-evidence-note{
        margin:0!important;padding:11px 12px;border-left:3px solid #2ed2cf;
        border-radius:0 11px 11px 0;background:rgba(46,210,207,.055);
        color:#bcd2d6!important;font-size:.69rem!important;line-height:1.5!important
      }
      .kc-professional-evidence-note strong{color:#ecffff}
      .kc-clinical-catalog-card .course-meta{
        margin-top:0!important
      }
      @media(max-width:1100px){
        .kc-professional-detail-grid{grid-template-columns:1fr}
        .kc-clinical-catalog-card{min-height:0!important}
      }
      @media(max-width:760px){
        .kc-professional-detail{padding:14px;border-radius:15px}
        .kc-professional-detail-head{display:grid;gap:8px}
        .kc-professional-detail-head strong{text-align:left}
        .kc-professional-examples span{font-size:.63rem}
      }
    `;
    document.head.appendChild(style);
  }

  function detailMarkup(info) {
    return `
      <section class="kc-professional-detail" aria-label="Información de aplicación profesional">
        <div class="kc-professional-detail-head">
          <span>Aplicación profesional</span>
          <strong>${info.headline}</strong>
        </div>
        <div class="kc-professional-detail-grid">
          <div class="kc-professional-detail-item">
            <small>Cobertura clínica</small>
            <p>${info.coverage}</p>
          </div>
          <div class="kc-professional-detail-item">
            <small>En cada ficha</small>
            <p>${info.record}</p>
          </div>
          <div class="kc-professional-detail-item">
            <small>Uso en consulta</small>
            <p>${info.use}</p>
          </div>
        </div>
        <div class="kc-professional-examples" aria-label="Ejemplos incluidos">
          ${info.examples.map((item) => `<span>${item}</span>`).join("")}
        </div>
        <p class="kc-professional-evidence-note"><strong>Interpretación segura:</strong> ${info.note}</p>
      </section>
    `;
  }

  function enrichCard(card) {
    if (!(card instanceof Element) || card.querySelector(".kc-professional-detail")) return;
    const targetId = String(card.getAttribute("data-kc-clinical-catalog-card") || "");
    const info = DETAILS[targetId];
    if (!info) return;

    const meta = card.querySelector(".course-meta");
    if (meta) meta.insertAdjacentHTML("beforebegin", detailMarkup(info));
    else card.querySelector(".course-button")?.insertAdjacentHTML("beforebegin", detailMarkup(info));
  }

  function apply() {
    injectStyles();
    document.querySelectorAll(".kc-clinical-catalog-card[data-kc-clinical-catalog-card]").forEach(enrichCard);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }

  window.setTimeout(apply, 120);
  window.setTimeout(apply, 500);
  window.setTimeout(apply, 1200);
})();
