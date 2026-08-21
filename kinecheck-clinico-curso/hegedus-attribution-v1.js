(() => {
  "use strict";

  const ID = "kc-hegedus-attribution";

  function buildCard() {
    const section = document.createElement("section");
    section.id = ID;
    section.setAttribute("aria-labelledby", `${ID}-title`);
    section.style.cssText = "margin:24px auto;max-width:980px;padding:20px 22px;border:1px solid rgba(117,230,205,.28);border-radius:18px;background:rgba(8,31,36,.78);color:#eaf7f4;line-height:1.55";
    section.innerHTML = `
      <p style="margin:0 0 6px;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:#8de8d2">Atribución metodológica</p>
      <h2 id="${ID}-title" style="margin:0 0 10px;font-size:1.15rem">Interpretación de pruebas diagnósticas y evidencia de Hegedus</h2>
      <p style="margin:0 0 10px">KineCheck utiliza sensibilidad, especificidad, razones de verosimilitud (LR+/LR−) y probabilidad pretest/postest como herramientas estándar de razonamiento diagnóstico. Para la utilidad clínica y la exactitud de pruebas físicas de hombro se atribuye explícitamente la evidencia sintetizada por <strong>Hegedus et al.</strong>; no se presenta este enfoque como un “modelo de Hegedus” universal ni como metodología original de KineCheck.</p>
      <p style="margin:0;font-size:.92rem;color:#cfe8e2">
        Hegedus EJ, Goode AP, Cook CE, et al. <em>Which physical examination tests provide clinicians with the most value when examining the shoulder?</em> Br J Sports Med. 2012;46(14):964–978. DOI: 10.1136/bjsports-2012-091066 ·
        <a href="https://pubmed.ncbi.nlm.nih.gov/22773322/" target="_blank" rel="noopener noreferrer" style="color:#9cf0dc">PubMed</a>.
        Complemento: Hegedus EJ, Cook C, Lewis J, Wright A, Park JY. <em>Combining orthopedic special tests to improve diagnosis of shoulder pathology.</em> Phys Ther Sport. 2015;16(2):87–92. DOI: 10.1016/j.ptsp.2014.08.001 ·
        <a href="https://pubmed.ncbi.nlm.nih.gov/25178255/" target="_blank" rel="noopener noreferrer" style="color:#9cf0dc">PubMed</a>.
      </p>`;
    return section;
  }

  function mount() {
    if (document.getElementById(ID)) return true;
    const root = document.getElementById("root");
    if (!root) return false;
    root.appendChild(buildCard());
    return true;
  }

  if (!mount()) {
    const observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
