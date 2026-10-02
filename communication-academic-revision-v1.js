// Academic revisions supported by original sources. Navigation and progress remain unchanged.
const revisions = new Map([
  {
    "number": 11,
    "title": "Validar e intentar comprender",
    "text": "Reconoce la experiencia sin juzgar. Pregunta qué significa el dolor para la persona y comprueba tu comprensión; validar no exige confirmar una explicación de daño ni dejar de explorar clínicamente.",
    "sources": [
      "https://www.iasp-pain.org/resources/terminology/",
      "https://doi.org/10.2522/ptj.20150240"
    ]
  },
  {
    "number": 13,
    "title": "Dolor, tejidos y seguridad",
    "text": "El dolor es una experiencia personal y no mide directamente el estado de los tejidos. La intensidad debe interpretarse junto con historia, examen, función y seguridad clínica.",
    "sources": [
      "https://www.iasp-pain.org/resources/terminology/"
    ]
  },
  {
    "number": 14,
    "title": "Imagen y síntomas: interpretar el contexto",
    "text": "Los cambios degenerativos también aparecen en personas sin síntomas. Este hallazgo no permite concluir que toda imagen carezca de relevancia ni excluir patología seria. Integra la imagen con la pregunta clínica.",
    "sources": [
      "https://doi.org/10.3174/ajnr.A4173"
    ]
  },
  {
    "number": 63,
    "title": "Empatía: beneficios y límites",
    "text": "Los ensayos de comunicación empática muestran beneficios pequeños y variables en algunos desenlaces. Una buena interacción no garantiza la adherencia ni la prevención de complicaciones y no sustituye la evaluación clínica.",
    "sources": [
      "https://doi.org/10.1177/0141076818769477"
    ]
  },
  {
    "number": 64,
    "title": "Aplicar la empatía con criterio",
    "text": "Escucha, comprueba lo que entendiste y acuerda el siguiente paso. Evalúa experiencia, síntomas y función por separado: la evidencia no permite prometer un beneficio universal de la empatía.",
    "sources": [
      "https://doi.org/10.1177/0141076818769477"
    ]
  },
  {
    "number": 76,
    "title": "Validar sin prometer efectos",
    "text": "Validar reconoce la experiencia de la persona y facilita la conversación. Las percepciones sobre esa interacción no prueban prevención de trastornos mentales ni recuperación clínica.",
    "sources": [
      "https://doi.org/10.2522/ptj.20150240"
    ]
  },
  {
    "number": 77,
    "title": "Validación en la entrevista clínica",
    "text": "Reconocer emociones, explorar preocupaciones y escuchar son habilidades de comunicación. No atribuyas a la validación, por sí sola, prevención de trastornos psicológicos o resultados clínicos garantizados.",
    "sources": [
      "https://doi.org/10.2522/ptj.20150240"
    ]
  },
  {
    "number": 80,
    "title": "Practicar la validación",
    "text": "Pregunta, reconoce la perspectiva de la persona y comprueba tu comprensión. Adapta el lenguaje al contexto y revisa la respuesta con feedback; reconocer una emoción no confirma una interpretación clínica.",
    "sources": [
      "https://doi.org/10.2522/ptj.20150240"
    ]
  },
  {
    "number": 81,
    "title": "Validación e invalidación",
    "text": "Validar consiste en reconocer la experiencia y explorar su significado. Puedes hacerlo manteniendo desacuerdo respetuoso e incertidumbre clínica; no necesitas confirmar una explicación de daño.",
    "sources": [
      "https://doi.org/10.2522/ptj.20150240"
    ]
  },
  {
    "number": 82,
    "title": "Reconocer y explorar",
    "text": "Usa una pregunta abierta, una reformulación y una comprobación de comprensión. Son conductas que se practican con feedback; no constituyen por sí solas un tratamiento de salud mental.",
    "sources": [
      "https://doi.org/10.2522/ptj.20150240"
    ]
  },
  {
    "number": 83,
    "title": "Evitar descalificar la experiencia",
    "text": "Minimizar o rechazar lo que la persona cuenta puede dificultar la interacción. Explora sus preocupaciones con respeto y evita inferir un diagnóstico psicológico a partir de la conversación.",
    "sources": [
      "https://doi.org/10.2522/ptj.20150240"
    ]
  },
  {
    "number": 85,
    "title": "Validar y mantener el razonamiento",
    "text": "Validar la experiencia y mantener abiertas las hipótesis son tareas compatibles. Las percepciones sobre la relación clínica no equivalen a demostración de eficacia terapéutica.",
    "sources": [
      "https://doi.org/10.2522/ptj.20150240"
    ]
  },
  {
    "number": 90,
    "title": "Comunicación y límites de la evidencia",
    "text": "Las personas valoran escucha, explicación y colaboración. Esta evidencia sobre la interacción no demuestra que una técnica aislada reduzca síntomas o asegure el éxito del tratamiento.",
    "sources": [
      "https://doi.org/10.2522/ptj.20150240"
    ]
  },
  {
    "number": 118,
    "title": "Preferencias sin estereotipos",
    "text": "Explora qué información, participación y condiciones de atención prefiere cada persona. Las diferencias descritas en estudios de satisfacción no justifican asignar preferencias individuales por género o edad.",
    "sources": [
      "https://doi.org/10.2522/ptj.20100061"
    ]
  },
  {
    "number": 120,
    "title": "Comunicación y desenlaces",
    "text": "La comunicación que respeta la autonomía se asocia con satisfacción. Esta relación no demuestra una mejora clínica causal ni establece cuánto tiempo de cada sesión debe dedicarse a conversar.",
    "sources": [
      "https://doi.org/10.1016/S1836-9553(12)70123-6"
    ]
  },
  {
    "number": 125,
    "title": "PNE y entrevista motivacional",
    "text": "Nijs y colaboradores proponen integrar educación en dolor y entrevista motivacional en una guía práctica. La complementariedad conceptual no demuestra, por sí sola, eficacia adicional de la combinación.",
    "sources": [
      "https://doi.org/10.1093/ptj/pzaa021"
    ]
  },
  {
    "number": 127,
    "title": "Comunicación no verbal y consentimiento",
    "text": "Adapta mirada, postura y tono a las preferencias y al contexto cultural. El contacto físico requiere consentimiento; una conducta no verbal aislada no garantiza el éxito del tratamiento.",
    "sources": [
      "https://doi.org/10.2522/ptj.20150240"
    ]
  },
  {
    "number": 135,
    "title": "Explicar y comprobar",
    "text": "Ofrece una explicación comprensible de los hallazgos y de la incertidumbre, y comprueba lo que la persona entendió. La satisfacción con una explicación no equivale a demostrar eficacia clínica.",
    "sources": [
      "https://doi.org/10.2522/ptj.20100061"
    ]
  },
  {
    "number": 136,
    "title": "Autonomía, satisfacción y resultados",
    "text": "La comunicación que facilita la autonomía se asocia con satisfacción. La satisfacción y el resultado clínico son constructos diferentes; estas revisiones no establecen una duración o frecuencia universal de sesiones.",
    "sources": [
      "https://doi.org/10.1016/S1836-9553(12)70123-6",
      "https://doi.org/10.2522/ptj.20100061"
    ]
  },
  {
    "number": 137,
    "title": "Calidad de la experiencia de atención",
    "text": "Explora privacidad, acceso, continuidad y preferencias de la persona. Una experiencia menos satisfactoria no demuestra por sí sola menor eficacia de una intervención ni identifica su causa.",
    "sources": [
      "https://doi.org/10.2522/ptj.20100061"
    ]
  },
  {
    "number": 139,
    "title": "Entorno y satisfacción",
    "text": "Un entorno cómodo y privado contribuye a la experiencia de atención. La revisión de satisfacción no demuestra que iluminación, música o aromas produzcan recuperación clínica; mide experiencia y resultados por separado.",
    "sources": [
      "https://doi.org/10.2522/ptj.20100061"
    ]
  },
  {
    "number": 141,
    "title": "Educación en artrosis",
    "text": "La educación se integra con ejercicio, autocuidado y decisiones individualizadas en el manejo no farmacológico de artrosis de cadera y rodilla. Su función dentro de un plan no demuestra una dosis educativa universal.",
    "sources": [
      "https://doi.org/10.1136/ard-2023-225041"
    ]
  },
  {
    "number": 142,
    "title": "Del conocimiento a la acción",
    "text": "Relaciona la información sobre artrosis con una meta funcional, una actividad viable y seguimiento de respuesta. Evita presentar educación aislada como garantía de mejora del dolor o la función.",
    "sources": [
      "https://doi.org/10.1136/ard-2023-225041"
    ]
  },
  {
    "number": 144,
    "title": "Dolor y daño: explicación prudente",
    "text": "El dolor no mide directamente el daño de los tejidos. Esto no excluye una lesión ni patología seria: integra historia, examen y seguridad antes de adaptar la explicación y el plan.",
    "sources": [
      "https://www.iasp-pain.org/resources/terminology/"
    ]
  },
  {
    "number": 149,
    "title": "Educar dentro de un plan activo",
    "text": "La educación en dolor debe adaptarse a la persona y puede integrarse con ejercicio y otras intervenciones. Dedicar más tiempo a explicar no garantiza reducir catastrofización ni mejorar todos los desenlaces.",
    "sources": [
      "https://doi.org/10.3389/fnins.2023.1272068",
      "https://www.who.int/publications/i/item/9789240081789"
    ]
  },
  {
    "number": 150,
    "title": "Movimiento, confianza y lenguaje",
    "text": "Explora movimiento con metas y tolerancia acordadas, monitorizando la respuesta. Evita culpar a la persona o al profesional y prometer que una experiencia sin dolor eliminará el miedo o la evitación.",
    "sources": [
      "https://www.who.int/publications/i/item/9789240081789"
    ]
  },
  {
    "number": 154,
    "title": "Integración de la consulta",
    "text": "Practica una consulta que incluya seguridad, escucha, explicación de incertidumbre, opciones compartidas y reevaluación de función. Comprueba el logro con una actuación observable; completar la lectura no demuestra competencia clínica.",
    "sources": [
      "https://www.who.int/publications/i/item/9789240081789"
    ]
  }
].map(item => [item.number, item]));
export function communicationRevision(number) { return revisions.get(Number(number)) || null; }
export function communicationSlideNumber(label) { return Number(String(label).match(/\d+/)?.[0]) || 0; }
function makeCard(revision, compact = false) {
  const card = document.createElement('article');
  card.className = compact ? 'kc-academic-slide kc-academic-slide-compact' : 'kc-academic-slide';
  card.dataset.academicSlide = String(revision.number);
  const label = document.createElement('small'); label.textContent = 'COMUNICACIÓN CLÍNICA · VERSIÓN ACADÉMICA 2026-10-01';
  const title = document.createElement(compact ? 'strong' : 'h2'); title.textContent = revision.title;
  const body = document.createElement('p'); body.textContent = revision.text;
  card.append(label, title, body);
  if (!compact) revision.sources.forEach((url, i) => {
    const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = i ? 'Otra fuente original ↗' : 'Fuente original ↗'; card.append(link);
  });
  return card;
}
function refresh() {
  const root = document.getElementById('root'); if (!root || root.hidden) return;
  root.querySelectorAll('p').forEach(p => { if (p.textContent === 'La aplicación conserva las diapositivas y su texto extraído. La guía pedagógica ordena el estudio, agrega ejercicios y práctica sin reemplazar el material original.') p.textContent = 'La aplicación conserva la secuencia de 154 diapositivas. La guía pedagógica incorpora práctica y revisiones académicas documentadas con fuentes originales.'; });
  const viewer = root.querySelector('.viewer');
  if (viewer) {
    const number = communicationSlideNumber(viewer.querySelector('.viewer-bar b')?.textContent);
    const revision = communicationRevision(number), img = viewer.querySelector('#slideImage');
    const previous = viewer.querySelector(':scope > .kc-academic-slide');
    if (revision && img) {
      img.hidden = true;
      if (previous?.dataset.academicSlide !== String(number)) { previous?.remove(); img.after(makeCard(revision)); }
      const transcript = viewer.querySelector('.transcript');
      if (transcript && transcript.textContent !== revision.text) transcript.textContent = revision.text;
    } else { if (img) img.hidden = false; previous?.remove(); }
  }
  root.querySelectorAll('img[alt^="Miniatura diapositiva"]').forEach(img => {
    const number = communicationSlideNumber(img.alt), revision = communicationRevision(number);
    if (!revision) return;
    img.hidden = true;
    const parent = img.parentElement;
    const previous = parent.querySelector('.kc-academic-slide-compact');
    if (previous?.dataset.academicSlide !== String(number)) { previous?.remove(); img.after(makeCard(revision, true)); }
    const caption = parent.querySelector(':scope > div > p');
    if (caption && caption.textContent !== revision.text) caption.textContent = revision.text;
  });
}
function start() {
  const style = document.createElement('style');
  style.textContent = '#root #slideImage[hidden],#root img[alt^="Miniatura diapositiva"][hidden]{display:none!important}.kc-academic-slide{padding:clamp(22px,5vw,64px);min-height:260px;background:#eef8f5;color:#143f43;border:1px solid #bedbd2;border-radius:16px;line-height:1.65}.kc-academic-slide small{display:block;color:#316e66;font-size:.7rem;letter-spacing:.08em}.kc-academic-slide h2{font-size:clamp(1.4rem,3vw,2.3rem);line-height:1.2;margin:22px 0}.kc-academic-slide p{font-size:clamp(1rem,1.7vw,1.3rem);max-width:70ch}.kc-academic-slide a{display:inline-block;color:#075f69;margin:12px 20px 0 0;text-decoration:underline}.kc-academic-slide-compact{min-height:0;padding:16px}.kc-academic-slide-compact p{font-size:.85rem}.kc-academic-slide-compact strong{display:block;margin:12px 0}';
  document.head.append(style);
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return; scheduled = true;
    requestAnimationFrame(() => { scheduled = false; observer.disconnect(); refresh(); observer.observe(document.getElementById('root'), {childList:true,subtree:true,characterData:true}); });
  });
  refresh(); observer.observe(document.getElementById('root'), {childList:true,subtree:true,characterData:true});
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start(); }
