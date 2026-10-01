(() => {
  const replacements = [
    [/12\s*[–-]\s*14\s*horas?/gi, '10 h 40 min'],
    [/Administrar antibióticos según protocolo y cubrir la herida/g, 'Activar atención urgente para antibióticos por el equipo habilitado y cubrir la herida'],
    [/Aprobaste el curso\. Tu certificado está habilitado\./g, 'Aprobaste el curso. Tu resultado académico quedó registrado en este dispositivo; la certificación OTEC aún no está activa.'],
    [/Certificado bloqueado/g, 'Certificación OTEC aún no activa'],
  ];
  function updateAcademicDisplay() {
    const root = document.getElementById('root');
    if (!root || root.hidden || !root.textContent.trim()) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const before = node.nodeValue || '';
      const after = replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), before);
      if (after !== before) node.nodeValue = after;
    });
    root.querySelectorAll('[data-page="certificate"]').forEach(button => button.remove());
    root.querySelectorAll('.certificate').forEach(section => {
      section.hidden = true;
      section.setAttribute('aria-hidden', 'true');
    });
    root.querySelectorAll('#student-name,#update-cert,#print-cert').forEach(element => {
      element.hidden = true;
      if ('disabled' in element) element.disabled = true;
    });

    if (document.getElementById('kc-trauma-academic-load')) return;
    const panel = document.createElement('section');
    panel.id = 'kc-trauma-academic-load';
    panel.style.cssText = 'width:min(1060px,calc(100% - 28px));margin:24px auto 70px;padding:18px 22px;border:1px solid rgba(82,220,210,.28);border-radius:20px;background:#08232c;color:#eaf8f8;font-family:system-ui,sans-serif';
    panel.innerHTML = '<h2>Programa y bibliografía esencial</h2><p>Duración del programa: <strong>10 h 40 min</strong> (640 minutos distribuidos en seis módulos). Aprobación: 80% en cada evaluación de módulo y en el examen final; en un examen de 12 preguntas se requieren al menos 10 respuestas correctas. El progreso de esta aplicación se guarda en el navegador.</p><p>Las acciones médicas, quirúrgicas y farmacológicas descritas corresponden al equipo habilitado y al protocolo local. El estudiante debe reconocer la urgencia, activar la derivación y actuar dentro de su formación y supervisión.</p><p>La certificación privada mediante OTEC es una posibilidad futura sujeta a convenio formal; este curso no se presenta como curso SENCE.</p><ul><li><a href="https://www.nice.org.uk/guidance/ng37" target="_blank" rel="noopener noreferrer">NICE NG37. Fractures (complex): assessment and management (2016; actualización 2022).</a></li><li><a href="https://www.nice.org.uk/guidance/ng39" target="_blank" rel="noopener noreferrer">NICE NG39. Major trauma: assessment and initial management (2016).</a></li><li><a href="https://www.boa.ac.uk/resource/boast-4-pdf.html" target="_blank" rel="noopener noreferrer">British Orthopaedic Association. BOAST: Open Fractures (2017).</a></li><li><a href="https://doi.org/10.5194/jbji-8-29-2023" target="_blank" rel="noopener noreferrer">Ravn C et al. Guideline for management of septic arthritis in native joints (SANJO). J Bone Jt Infect. 2023;8:29–37.</a></li><li><a href="https://www.nice.org.uk/guidance/ng59" target="_blank" rel="noopener noreferrer">NICE NG59. Low back pain and sciatica in over 16s: assessment and management (2016; actualización 2020).</a></li></ul><p>Versión académica: 2026-10-01. Fecha de revisión: 1 de octubre de 2026.</p>';
    panel.querySelectorAll('a').forEach(a => { a.style.color = '#7de9de'; });
    root.insertAdjacentElement('afterend', panel);
  }
  new MutationObserver(updateAcademicDisplay).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('kinecheck:course-authorized', updateAcademicDisplay);
  document.addEventListener('DOMContentLoaded', updateAcademicDisplay);
})();
