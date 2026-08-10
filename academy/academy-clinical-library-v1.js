(() => {
  "use strict";

  if (window.__KINECHECK_CLINICAL_LIBRARY_V1__) return;
  window.__KINECHECK_CLINICAL_LIBRARY_V1__ = true;

  const PUBMED = "https://pubmed.ncbi.nlm.nih.gov/";

  function sourceLink(pmid, label = "Ver fuente en PubMed") {
    return `<a class="kc-clinical-source" href="${PUBMED}${pmid}/" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  }

  function scaleCard({ code, title, purpose, population, scoring, use, caution, source, extra = "" }) {
    return `
      <article class="kc-clinical-card">
        <div class="kc-clinical-card-header"><h3>${title}</h3><span class="kc-clinical-code">${code}</span></div>
        <p><strong>Qué mide:</strong> ${purpose}</p>
        <div class="kc-clinical-scale-meta">
          <div><small>Población</small><span>${population}</span></div>
          <div><small>Puntaje</small><span>${scoring}</span></div>
        </div>
        <p><strong>Uso clínico:</strong> ${use}</p>
        ${extra}
        <p class="kc-clinical-note"><strong>Interpretación:</strong> ${caution}</p>
        ${source}
      </article>
    `;
  }

  function testCard({ code, title, target, stats = "", tags = "", interpretation, limitation, source }) {
    return `
      <article class="kc-clinical-card">
        <div class="kc-clinical-card-header"><h3>${title}</h3><span class="kc-clinical-code">${code}</span></div>
        <p><strong>Pregunta clínica:</strong> ${target}</p>
        ${tags ? `<div class="kc-clinical-tags">${tags}</div>` : ""}
        ${stats}
        <p><strong>Cómo usarlo:</strong> ${interpretation}</p>
        <p class="kc-clinical-note"><strong>Límite:</strong> ${limitation}</p>
        ${source}
      </article>
    `;
  }

  function stat(label, value) {
    return `<div class="kc-clinical-stat"><small>${label}</small><strong>${value}</strong></div>`;
  }

  function tag(text, type = "") {
    return `<span class="kc-clinical-tag ${type}">${text}</span>`;
  }

  function scalesMarkup() {
    return `
      <section id="kc-scales-library" class="kc-clinical-library" aria-labelledby="kc-scales-title">
        <div class="kc-clinical-header">
          <div>
            <span class="kc-clinical-kicker">≋ ESCALAS · PROMs</span>
            <h2 id="kc-scales-title">Medición clínica centrada en la persona</h2>
            <p>Selección práctica de instrumentos validados para cuantificar función, síntomas, participación y calidad de vida. La escala correcta depende de la región, población, objetivo de medición y versión lingüística validada.</p>
          </div>
          <span class="kc-clinical-updated">Evidencia revisada · ago 2026</span>
        </div>

        <div class="kc-clinical-principles">
          <div class="kc-clinical-principle"><strong>Medir ≠ diagnosticar</strong><span>Un PROM describe la experiencia y evolución del paciente; no identifica por sí solo una lesión anatómica.</span></div>
          <div class="kc-clinical-principle"><strong>Comparar con la misma versión</strong><span>Usa idioma, formato y condiciones de aplicación consistentes entre evaluaciones.</span></div>
          <div class="kc-clinical-principle"><strong>Cambio clínico contextual</strong><span>MDC y MCID dependen de población, diagnóstico, tiempo y método; evita un umbral universal.</span></div>
        </div>

        <div class="kc-clinical-alert"><strong>Uso profesional:</strong> KineCheck no reproduce aquí los ítems completos de cuestionarios que puedan estar sujetos a derechos o licencias. Utiliza siempre la versión oficial y, cuando exista, una adaptación al español validada para tu población.</div>

        <details class="kc-clinical-group" open>
          <summary>Transversales · función individual y dolor relacionado con actividad</summary>
          <div class="kc-clinical-group-body">
            ${scaleCard({
              code: "PSFS",
              title: "Patient-Specific Functional Scale",
              purpose: "actividades relevantes elegidas por la propia persona y su dificultad funcional percibida.",
              population: "Trastornos musculoesqueléticos diversos",
              scoring: "0–10 por actividad; mayor = mejor función",
              use: "Excelente complemento de escalas regionales cuando el objetivo es seguir actividades concretas que importan al paciente.",
              caution: "Es sensible al cambio, pero su constructo no es idéntico al de una escala regional; documenta siempre las mismas actividades en el seguimiento.",
              source: sourceLink("35128944", "Revisión COSMIN 2022")
            })}
            ${scaleCard({
              code: "PCS",
              title: "Pain Catastrophizing Scale",
              purpose: "rumiación, magnificación e indefensión relacionadas con la experiencia de dolor.",
              population: "Personas con dolor; útil como dominio psicosocial",
              scoring: "Mayor puntaje = mayor pensamiento catastrófico",
              use: "Ayuda a identificar un dominio cognitivo que puede orientar educación, comunicación y objetivos compartidos.",
              caution: "No es un diagnóstico psicológico ni una etiqueta del paciente. Interprétala dentro del contexto clínico, emocional y social.",
              source: '<a class="kc-clinical-source" href="https://doi.org/10.1037/1040-3590.7.4.524" target="_blank" rel="noopener noreferrer">Sullivan et al., 1995 ↗</a>'
            })}
          </div>
        </details>

        <details class="kc-clinical-group" open>
          <summary>Columna cervical y lumbar</summary>
          <div class="kc-clinical-group-body">
            ${scaleCard({
              code: "NDI",
              title: "Neck Disability Index",
              purpose: "discapacidad autopercibida asociada a dolor cervical en actividades de la vida diaria.",
              population: "Dolor cervical y cuadros relacionados",
              scoring: "10 ítems; mayor = mayor discapacidad",
              use: "Seguimiento de impacto funcional cervical y respuesta clínica a lo largo del tiempo.",
              caution: "No conviertas categorías de severidad en diagnóstico. Considera versión, ítems omitidos y cambio longitudinal.",
              source: sourceLink("1834753", "Vernon & Mior 1991")
            })}
            ${scaleCard({
              code: "ODI",
              title: "Oswestry Disability Index",
              purpose: "limitación funcional relacionada con dolor lumbar y trastornos de columna.",
              population: "Dolor lumbar y patología lumbar",
              scoring: "Habitualmente 0–100%; mayor = mayor discapacidad",
              use: "Uno de los PROMs condición-específicos más utilizados para función lumbar.",
              caution: "Existen versiones y modificaciones; identifica exactamente cuál aplicas y usa la misma en reevaluaciones.",
              source: sourceLink("11074683", "Fairbank & Pynsent 2000")
            })}
          </div>
        </details>

        <details class="kc-clinical-group" open>
          <summary>Miembro superior · hombro, brazo y mano</summary>
          <div class="kc-clinical-group-body">
            ${scaleCard({
              code: "QuickDASH",
              title: "QuickDASH",
              purpose: "síntomas y dificultad funcional del miembro superior como una unidad funcional.",
              population: "Hombro, brazo, codo, antebrazo, muñeca y mano",
              scoring: "11 ítems; 0–100, mayor = peor función/síntomas",
              use: "Útil cuando el problema no requiere una escala específica de una sola articulación o involucra varios segmentos.",
              caution: "Usa la versión oficial y su algoritmo de cálculo; no interpretes diferencias pequeñas sin considerar error de medición y contexto.",
              source: sourceLink("15866967", "Desarrollo QuickDASH 2005")
            })}
            ${scaleCard({
              code: "SPADI",
              title: "Shoulder Pain and Disability Index",
              purpose: "dolor y discapacidad asociados a problemas de hombro.",
              population: "Dolor y trastornos del hombro",
              scoring: "13 ítems, subescalas dolor y discapacidad; mayor = peor",
              use: "Seguimiento específico del impacto del hombro cuando dolor y función son objetivos principales.",
              caution: "El puntaje no identifica qué tejido está afectado. Úsalo junto con historia, examen y objetivos funcionales.",
              source: sourceLink("11188601", "Roach et al. 1991")
            })}
          </div>
        </details>

        <details class="kc-clinical-group" open>
          <summary>Cadera e ingle</summary>
          <div class="kc-clinical-group-body">
            ${scaleCard({
              code: "HAGOS",
              title: "Copenhagen Hip and Groin Outcome Score",
              purpose: "dolor, síntomas, función diaria, deporte/recreación, participación y calidad de vida.",
              population: "Adultos jóvenes y de mediana edad físicamente activos con dolor de cadera/ingle",
              scoring: "6 subescalas; mayor = mejor estado",
              use: "Especialmente útil en población activa y deportiva con síntomas persistentes de cadera o ingle.",
              caution: "Interpreta cada subescala; un puntaje global puede ocultar diferencias relevantes entre deporte, participación y calidad de vida.",
              source: sourceLink("21478502", "Desarrollo HAGOS 2011")
            })}
            ${scaleCard({
              code: "iHOT-33",
              title: "International Hip Outcome Tool",
              purpose: "calidad de vida, síntomas, función, deporte, trabajo y aspectos sociales/emocionales relacionados con la cadera.",
              population: "Personas jóvenes y activas con patología sintomática de cadera",
              scoring: "Mayor puntaje = mejor calidad de vida relacionada con la cadera",
              use: "PROM amplio para cadera no artrósica y seguimiento de personas activas; existe versión corta iHOT-12.",
              caution: "El instrumento evalúa impacto, no confirma FAI, lesión labral ni otra estructura específica.",
              source: sourceLink("22542433", "Desarrollo iHOT-33 2012")
            })}
          </div>
        </details>

        <details class="kc-clinical-group" open>
          <summary>Rodilla y extremidad inferior</summary>
          <div class="kc-clinical-group-body">
            ${scaleCard({
              code: "KOOS",
              title: "Knee injury and Osteoarthritis Outcome Score",
              purpose: "dolor, síntomas, actividades diarias, deporte/recreación y calidad de vida relacionada con rodilla.",
              population: "Lesiones de rodilla y osteoartritis; distintas edades según versión/contexto",
              scoring: "5 subescalas; 0 = problemas extremos, 100 = sin problemas",
              use: "Permite separar dominios que pueden evolucionar de manera distinta, especialmente función deportiva y calidad de vida.",
              caution: "Reporta subescalas por separado y usa una adaptación validada para la población evaluada.",
              source: sourceLink("9863983", "Validación KOOS 1998")
            })}
            ${scaleCard({
              code: "LEFS",
              title: "Lower Extremity Functional Scale",
              purpose: "dificultad para realizar actividades funcionales de la extremidad inferior.",
              population: "Trastornos musculoesqueléticos de cadera a pie",
              scoring: "20 ítems; mayor = mejor función",
              use: "Buena opción transversal cuando se busca una medida funcional común entre distintas regiones de la extremidad inferior.",
              caution: "No sustituye medidas específicas de una condición cuando necesitas dominios particulares como deporte o calidad de vida.",
              source: sourceLink("10201543", "Desarrollo LEFS 1999")
            })}
          </div>
        </details>

        <details class="kc-clinical-group" open>
          <summary>Pie, tobillo y tendón de Aquiles</summary>
          <div class="kc-clinical-group-body">
            ${scaleCard({
              code: "FAAM",
              title: "Foot and Ankle Ability Measure",
              purpose: "función física en actividades de la vida diaria y deporte para pie y tobillo.",
              population: "Patología musculoesquelética de pie y tobillo",
              scoring: "Subescalas ADL y Sport; mayor = mejor función",
              use: "Útil para seguimiento funcional y deportivo. En 2026 se publicó una adaptación validada para español de Chile y Latinoamérica.",
              caution: "Usa la versión culturalmente validada correspondiente; los umbrales de cambio dependen de población y contexto.",
              source: `${sourceLink("16309613", "FAAM original 2005")} ${sourceLink("41826191", "Chile/LATAM 2026")}`
            })}
            ${scaleCard({
              code: "VISA-A",
              title: "Victorian Institute of Sport Assessment–Achilles",
              purpose: "severidad clínica de tendinopatía de Aquiles mediante dolor, función y actividad deportiva.",
              population: "Tendinopatía aquílea",
              scoring: "0–100; 100 = mejor estado",
              use: "Seguimiento específico de síntomas y capacidad relacionada con el tendón de Aquiles.",
              caution: "Fue desarrollada como índice de severidad, no como prueba diagnóstica. Un puntaje aislado no confirma tendinopatía.",
              source: sourceLink("11579069", "VISA-A 2001")
            })}
          </div>
        </details>

        <div class="kc-clinical-references">
          <h3>Criterios de interpretación</h3>
          <ol>
            <li>Prioriza cambio dentro de la persona y coherencia con sus metas funcionales, no solo comparación con un punto de corte.</li>
            <li>Combina PROMs con historia, examen físico, medidas de desempeño y contexto de participación.</li>
            <li>Si necesitas MDC/MCID, utiliza el valor estimado para la misma población, versión y horizonte temporal; no extrapoles automáticamente.</li>
            <li>Documenta idioma/versión, fecha, condiciones de aplicación y cualquier ítem omitido.</li>
          </ol>
        </div>
        <p class="kc-clinical-footer-note">Contenido educativo para profesionales de salud. No sustituye juicio clínico, instrucciones oficiales de cada instrumento ni requisitos de licencia/copyright.</p>
        <button class="kc-clinical-back" type="button" data-kc-clinical-back>Volver a Herramientas</button>
      </section>
    `;
  }

  function testsMarkup() {
    const aclStats = `<div class="kc-clinical-stats">${stat("Lachman", "Se 79% · Sp 91%")} ${stat("Pivot shift", "Se 55% · Sp 96%")} ${stat("Lever sign", "LR− 0,21")}</div>`;
    const cuffStats = `<div class="kc-clinical-stats">${stat("Jobe", "Se 88% · Sp 62%")} ${stat("Full can", "Se 70% · Sp 81%")} ${stat("ER lag 0°", "Sp 98% · LR+ 6,06")}</div>`;
    const instabilityStats = `<div class="kc-clinical-stats">${stat("Apprehension", "Se 72% · Sp 96%")} ${stat("Relocation", "Se 81% · Sp 92%")} ${stat("Criterio", "Aprehensión > dolor")}</div>`;
    const sijStats = `<div class="kc-clinical-stats">${stat("≥3/6 positivas", "Se 94%")} ${stat("≥3/6 positivas", "Sp 78%")} ${stat("Referencia", "Bloqueo SIJ")}</div>`;
    const syndesmosisStats = `<div class="kc-clinical-stats">${stat("Dolor ligamento", "Se 92% · LR− 0,28")} ${stat("DF-ER", "Se 71% · LR− 0,46")} ${stat("Squeeze", "Sp 88% · LR+ 2,15")}</div>`;
    const achillesStats = `<div class="kc-clinical-stats">${stat("Calf squeeze", "Se 96%")} ${stat("Matles", "Se 88%")} ${stat("Palpar gap", "Se 73% despierto")}</div>`;
    const meniscusStats = `<div class="kc-clinical-stats">${stat("Thessaly", "Se 64%")} ${stat("Thessaly", "Sp 53%")} ${stat("LR+ / LR−", "1,37 / 0,68")}</div>`;
    const hipStats = `<div class="kc-clinical-stats">${stat("FABER", "Se 82%")} ${stat("IROP", "Se 91%")} ${stat("Stinchfield", "Sp 32%")}</div>`;

    return `
      <section id="kc-special-tests-library" class="kc-clinical-library" aria-labelledby="kc-tests-title">
        <div class="kc-clinical-header">
          <div>
            <span class="kc-clinical-kicker">✓ PRUEBAS ESPECIALES · RAZONAMIENTO DIAGNÓSTICO</span>
            <h2 id="kc-tests-title">Utilidad diagnóstica sin sobreinterpretar</h2>
            <p>Las pruebas físicas modifican probabilidades; rara vez entregan diagnósticos binarios. Aquí se priorizan estudios de exactitud diagnóstica, metaanálisis y el uso combinado con historia, probabilidad preprueba y examen neurológico/funcional.</p>
          </div>
          <span class="kc-clinical-updated">Evidencia revisada · ago 2026</span>
        </div>

        <div class="kc-clinical-principles">
          <div class="kc-clinical-principle"><strong>Antes del test</strong><span>Formula una hipótesis y una probabilidad preprueba. Sin contexto, sensibilidad y especificidad se vuelven fáciles de malinterpretar.</span></div>
          <div class="kc-clinical-principle"><strong>Después del test</strong><span>Prefiere LR+ para confirmar y LR− para descartar. Un resultado solo es útil si cambia una decisión clínica.</span></div>
          <div class="kc-clinical-principle"><strong>Evita el diagnóstico de tejido</strong><span>Dolor provocado no equivale automáticamente a lesión estructural; correlaciona con historia, función e imagen solo cuando esté indicada.</span></div>
        </div>

        <div class="kc-clinical-alert"><strong>Seguridad primero:</strong> trauma con sospecha de fractura, déficit neurológico progresivo, signos de mielopatía/cauda equina, compromiso sistémico u otra bandera roja requieren priorizar evaluación médica o derivación apropiada por sobre acumular pruebas especiales.</div>

        <details class="kc-clinical-group" open>
          <summary>Columna cervical y neurodinámica</summary>
          <div class="kc-clinical-group-body">
            ${testCard({
              code: "CR",
              title: "Cluster para radiculopatía cervical",
              target: "¿Los hallazgos son compatibles con compromiso radicular cervical?",
              tags: `${tag("Cluster > test aislado", "rulein")}${tag("ULTT A ayuda a descartar", "ruleout")}`,
              stats: `<div class="kc-clinical-stats">${stat("4 variables", "LR+ 30,3")}${stat("Muestra", "n = 82")}${stat("Precisión", "IC amplios")}</div>`,
              interpretation: "El estudio de derivación encontró mayor utilidad al combinar cuatro variables clínicas que al usar maniobras aisladas. El ULTT A fue el elemento más útil para disminuir probabilidad cuando era negativo.",
              limitation: "El LR+ original tuvo intervalos de confianza amplios y el cluster requiere validación externa/contextual. No reemplaza miotomos, dermatomas, reflejos, fuerza ni evaluación neurológica completa.",
              source: sourceLink("12544957", "Wainner et al. 2003")
            })}
          </div>
        </details>

        <details class="kc-clinical-group" open>
          <summary>Hombro</summary>
          <div class="kc-clinical-group-body">
            ${testCard({
              code: "RC",
              title: "Manguito rotador: Jobe, Full Can y lag signs",
              target: "¿El patrón aumenta o disminuye la sospecha de una rotura del manguito?",
              tags: `${tag("Jobe sensible", "ruleout")}${tag("ER lag específico", "rulein")}${tag("No usar un solo test", "limited")}`,
              stats: cuffStats,
              interpretation: "Jobe aporta sensibilidad para supraespinoso; Full Can ofrece un balance diferente; un ER lag sign positivo es más útil para aumentar sospecha de rotura de infraespinoso/supraespinoso relevante.",
              limitation: "Dolor, debilidad y edad modifican el rendimiento. Un lag sign negativo no excluye roturas pequeñas y las maniobras no sustituyen la evaluación de fuerza ni imagen si ésta cambiará conducta.",
              source: sourceLink("27386812", "ROW Cohort 2017")
            })}
            ${testCard({
              code: "AI",
              title: "Inestabilidad anterior: Apprehension / Relocation",
              target: "¿Se reproduce la sensación de inestabilidad traumática anterior?",
              tags: `${tag("Alta especificidad", "rulein")}${tag("Aprehensión, no dolor", "limited")}`,
              stats: instabilityStats,
              interpretation: "Una respuesta de verdadera aprehensión tiene más valor que reproducir dolor. En el estudio diagnóstico, Apprehension y Relocation fueron específicos para inestabilidad anterior traumática.",
              limitation: "Realiza con cautela en trauma reciente y evita forzar rangos finales si no se ha descartado fractura o existe riesgo de redislocación. El dolor aislado reduce la exactitud.",
              source: sourceLink("16818971", "Farber et al. 2006")
            })}
          </div>
        </details>

        <details class="kc-clinical-group" open>
          <summary>Cadera, pelvis y articulación sacroilíaca</summary>
          <div class="kc-clinical-group-body">
            ${testCard({
              code: "HIP",
              title: "FADIR / FABER / IROP",
              target: "¿Se reproduce dolor compatible con una fuente intraarticular de cadera?",
              tags: `${tag("Provocación / screening", "ruleout")}${tag("Baja especificidad", "limited")}`,
              stats: hipStats,
              interpretation: "FABER e IROP pueden ser componentes sensibles de una evaluación de dolor de cadera. FADIR tiene utilidad principalmente como prueba de provocación/screening en FAI y lesión labral, no como confirmación anatómica.",
              limitation: "La exactitud varía mucho entre poblaciones y estándares de referencia. Un test positivo no distingue con certeza labrum, FAI, cartílago u otra fuente intraarticular.",
              source: `${sourceLink("20359681", "Maslowski et al. 2010")} ${sourceLink("40692936", "Revisión sistemática 2025")}`
            })}
            ${testCard({
              code: "SIJ",
              title: "Cluster de provocación sacroilíaca",
              target: "¿La articulación sacroilíaca puede ser una fuente del dolor familiar?",
              tags: `${tag("Usar cluster", "rulein")}${tag("Dolor familiar", "limited")}`,
              stats: sijStats,
              interpretation: "Tres o más pruebas de provocación positivas aumentaron la capacidad de identificar una SIJ sintomática frente a bloqueo anestésico. Un conjunto completamente negativo disminuye la probabilidad de una fuente SIJ.",
              limitation: "Evalúa una posible fuente de dolor, no una supuesta 'disfunción posicional' o biomecánica. La validez depende del estándar de referencia y población estudiada.",
              source: sourceLink("16038856", "Laslett et al. 2005")
            })}
          </div>
        </details>

        <details class="kc-clinical-group" open>
          <summary>Rodilla</summary>
          <div class="kc-clinical-group-body">
            ${testCard({
              code: "ACL",
              title: "LCA: Lachman, Pivot Shift y Lever Sign",
              target: "¿El examen apoya una lesión del ligamento cruzado anterior en contexto agudo?",
              tags: `${tag("Pivot shift confirma", "rulein")}${tag("Lever sign ayuda a descartar", "ruleout")}`,
              stats: aclStats,
              interpretation: "En metaanálisis de lesión aguda, Pivot Shift mostró mayor especificidad y LR+; Lever Sign el LR− más bajo. Lachman sigue siendo útil, pero su rendimiento es menor que algunas cifras históricas.",
              limitation: "Dolor, hemartrosis, protección muscular, lesiones asociadas y experiencia del examinador afectan el resultado. Ninguna maniobra debe interpretarse fuera del mecanismo y examen completo.",
              source: sourceLink("35949377", "Metaanálisis lesión aguda 2022")
            })}
            ${testCard({
              code: "MEN",
              title: "Menisco: Thessaly / McMurray",
              target: "¿Una maniobra física aislada identifica o excluye con suficiente certeza una rotura meniscal?",
              tags: `${tag("Utilidad aislada limitada", "limited")}${tag("Historia + examen", "ruleout")}`,
              stats: meniscusStats,
              interpretation: "En una cohorte de 593 pacientes, Thessaly mostró cambios pequeños de probabilidad y la combinación con McMurray tampoco alcanzó una exactitud suficiente para decidir por sí sola.",
              limitation: "Edad, osteoartritis, dolor anterior y otras patologías generan falsos positivos. Integra mecanismo, línea articular, derrame, bloqueo verdadero, función y necesidad real de imagen.",
              source: sourceLink("25420009", "Goossens et al. 2015")
            })}
            ${testCard({
              code: "PFI",
              title: "Moving Patellar Apprehension Test",
              target: "¿Existe un patrón compatible con inestabilidad patelar lateral?",
              tags: `${tag("Aprehensión", "rulein")}${tag("Muestra especializada", "limited")}`,
              stats: `<div class="kc-clinical-stats">${stat("Sensibilidad", "100%")}${stat("Especificidad", "88,4%")}${stat("Muestra", "n = 51")}</div>`,
              interpretation: "La aparición de aprehensión con traslación lateral y su alivio al corregir medialmente mostró buen rendimiento en la cohorte original.",
              limitation: "Estudio pequeño y especializado; la respuesta es subjetiva y la reproducibilidad puede variar. Correlaciona con historia de luxación/subluxación y factores anatómicos.",
              source: sourceLink("19193601", "Ahmad et al. 2009")
            })}
          </div>
        </details>

        <details class="kc-clinical-group" open>
          <summary>Tobillo y tendón de Aquiles</summary>
          <div class="kc-clinical-group-body">
            ${testCard({
              code: "SYND",
              title: "Sindesmosis: palpación, DF-ER y Squeeze",
              target: "¿Un esguince agudo puede involucrar la sindesmosis distal?",
              tags: `${tag("Combinar hallazgos", "rulein")}${tag("No hay test único suficiente", "limited")}`,
              stats: syndesmosisStats,
              interpretation: "La sensibilidad fue mayor para dolor a la palpación de ligamentos sindesmóticos y DF-ER; Squeeze fue más específico. El mejor enfoque combina hallazgos sensibles y específicos.",
              limitation: "El LR+ del Squeeze tuvo intervalo de confianza amplio y ningún test aislado fue suficiente. Considera mecanismo, capacidad de salto/carga, dolor desproporcionado e imagen cuando corresponda.",
              source: sourceLink("24255766", "Sman et al. 2015")
            })}
            ${testCard({
              code: "ATR",
              title: "Rotura de Aquiles: Calf Squeeze / Matles",
              target: "¿El examen es compatible con rotura completa subcutánea del tendón de Aquiles?",
              tags: `${tag("Calf squeeze muy sensible", "ruleout")}${tag("Urgencia funcional", "limited")}`,
              stats: achillesStats,
              interpretation: "En una serie prospectiva grande, el calf squeeze fue la maniobra más sensible, seguido por Matles; palpar un defecto fue menos sensible con el paciente despierto.",
              limitation: "La evidencia citada se centra en rotura completa. Roturas parciales y presentaciones tardías pueden ser más difíciles; si persiste duda clínica, deriva o utiliza imagen según contexto.",
              source: sourceLink("9548122", "Maffulli 1998")
            })}
          </div>
        </details>

        <div class="kc-clinical-references">
          <h3>Reglas para leer sensibilidad, especificidad y LR</h3>
          <ol>
            <li><strong>Sensibilidad alta:</strong> un negativo puede ser más útil para disminuir probabilidad, pero solo si el estudio y la población son comparables.</li>
            <li><strong>Especificidad alta:</strong> un positivo puede aumentar probabilidad, especialmente cuando la maniobra reproduce el fenómeno clínico correcto.</li>
            <li><strong>LR:</strong> resume cuánto cambia la odds preprueba; cuanto más lejos de 1, mayor impacto potencial. Un LR cercano a 1 aporta poco.</li>
            <li><strong>Intervalos de confianza:</strong> cifras impresionantes con IC amplios requieren prudencia y validación externa.</li>
            <li><strong>Referencia estándar:</strong> artroscopia, RM, bloqueo diagnóstico o electrodiagnóstico responden preguntas diferentes; no mezcles resultados como si fueran equivalentes.</li>
          </ol>
        </div>
        <p class="kc-clinical-footer-note">Las cifras mostradas corresponden a las poblaciones y estándares de referencia de los estudios citados; no son constantes biológicas universales. La probabilidad postest depende de la probabilidad pretest de tu paciente.</p>
        <button class="kc-clinical-back" type="button" data-kc-clinical-back>Volver a Herramientas</button>
      </section>
    `;
  }

  function findCategory(name) {
    return [...document.querySelectorAll(".kc-tool-category-grid article")].find((card) => card.querySelector("strong")?.textContent?.trim() === name) || null;
  }

  function upgradeCategory(name, targetId, statusText) {
    const card = findCategory(name);
    if (!card) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "kc-clinical-category-trigger";
    button.dataset.kcClinicalTarget = targetId;
    button.innerHTML = card.innerHTML;
    const status = button.querySelector("b");
    if (status) status.textContent = statusText;
    card.replaceWith(button);
  }

  function scrollToLibrary(id) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.querySelector("summary")?.focus?.({ preventScroll: true });
  }

  function install() {
    const tools = document.querySelector("#herramientas");
    const grid = tools?.querySelector(".kc-tool-category-grid");
    if (!tools || !grid || document.querySelector("#kc-scales-library")) return;

    upgradeCategory("Escalas", "kc-scales-library", "Abrir biblioteca →");
    upgradeCategory("Pruebas especiales", "kc-special-tests-library", "Abrir evidencia →");

    grid.insertAdjacentHTML("afterend", `${scalesMarkup()}${testsMarkup()}`);

    tools.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-kc-clinical-target]");
      if (trigger) {
        event.preventDefault();
        scrollToLibrary(trigger.dataset.kcClinicalTarget);
        return;
      }
      const back = event.target.closest("[data-kc-clinical-back]");
      if (back) {
        event.preventDefault();
        grid.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
