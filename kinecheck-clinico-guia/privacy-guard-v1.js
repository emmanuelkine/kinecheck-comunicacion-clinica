(() => {
  "use strict";

  if (window.__KINECHECK_CLINICO_PRIVACY_GUARD_V1__) return;
  window.__KINECHECK_CLINICO_PRIVACY_GUARD_V1__ = true;

  const WARNING = "Uso educativo: utiliza exclusivamente información ficticia, simulada o debidamente anonimizada. No ingreses nombre, RUT, teléfono, correo, número de ficha ni otros identificadores reales.";
  const DOCUMENT_LABEL = "Documento educativo — no corresponde a una ficha clínica";

  const style = document.createElement("style");
  style.textContent = `
    .kc-privacy-field-warning{display:block;margin:7px 0 8px;padding:8px 10px;border-left:3px solid #63d8ca;border-radius:8px;background:rgba(81,211,195,.08);color:inherit;font-size:.76rem;line-height:1.45}
    .kc-educational-document-label{margin:0 0 14px;padding:9px 12px;border:1px solid rgba(99,216,202,.35);border-radius:10px;font-size:.78rem;font-weight:850;letter-spacing:.02em;text-align:center}
    @media print{.kc-privacy-field-warning{display:none!important}.kc-educational-document-label{display:block!important;border:1px solid #444!important;color:#111!important;background:#fff!important;break-inside:avoid}}
  `;
  document.head.appendChild(style);

  function enhanceField(field) {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
    if (field instanceof HTMLInputElement && !["text", "search"].includes(field.type)) return;
    if (!field.closest("#guide-form")) return;
    if (field.previousElementSibling?.classList?.contains("kc-privacy-field-warning")) return;
    const warning = document.createElement("small");
    warning.className = "kc-privacy-field-warning";
    warning.textContent = WARNING;
    field.parentElement?.insertBefore(warning, field);
  }

  function ensureDocumentLabel() {
    const panel = document.querySelector(".synthesis-panel");
    if (!panel || panel.querySelector(".kc-educational-document-label")) return;
    const label = document.createElement("div");
    label.className = "kc-educational-document-label";
    label.textContent = DOCUMENT_LABEL;
    panel.prepend(label);
  }

  function apply() {
    document.querySelectorAll("#guide-form input[type='text'], #guide-form input[type='search'], #guide-form textarea").forEach(enhanceField);
    ensureDocumentLabel();
  }

  const observer = new MutationObserver(apply);
  const start = () => {
    const form = document.querySelector("#guide-form");
    if (!form) return window.setTimeout(start, 80);
    observer.observe(form, { childList: true, subtree: true });
    apply();
  };

  window.addEventListener("beforeprint", apply);
  start();
})();
