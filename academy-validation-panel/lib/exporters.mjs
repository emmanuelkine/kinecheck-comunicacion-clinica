import { GATE_NAMES } from './panel-data.mjs';
import { Buffer } from 'node:buffer';

function csvCell(value) {
  let text = value == null ? '' : Array.isArray(value) ? value.join(' | ') : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(headers, rows) {
  return `${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export function pairRows(data, state) {
  return data.courses.flatMap((course) => course.pairs.map((pair) => {
    const review = state.pairReviews[pair.pairId] ?? {};
    return [
      course.name, course.slug, pair.pairId, pair.remediationType, pair.outcomeId, pair.cognitiveLevel,
      pair.safetyGate ? 'Sí' : 'No', pair.formA, pair.formB,
      pair.expectedElements.join(' | '), pair.rationale, pair.sourceRefs.join(' | '),
      review.decision ?? 'pending', review.correctionReason ?? '', review.notes ?? '',
      review.reviewer ?? '', review.reviewedAt ?? '',
    ];
  }));
}

export function remediationRows(data, state) {
  return data.remediation.decisionQueue.map((item) => {
    const review = state.pairReviews[item.pairId] ?? {};
    return [
      item.priorityRank, item.courseName, item.courseSlug, item.pairId, item.remediationType,
      item.problem, item.before.formA, item.before.formB, item.before.expectedElements,
      item.current.formA, item.current.formB, item.current.expectedElements,
      item.scientificJustification, item.referenceIds, item.alternativeDefensibleAnswers,
      item.recommendation, review.decision ?? 'pending', review.correctionReason ?? '', review.notes ?? '',
      review.reviewer ?? '', review.reviewedAt ?? '',
    ];
  });
}

export function variantRows(data, state) {
  return data.courses.flatMap((course) => course.pairs.flatMap((pair) => ['A', 'B'].map((form) => {
    const review = state.pairReviews[pair.pairId] ?? {};
    return [
      course.name, course.slug, pair.pairId, form, pair.outcomeId, pair.cognitiveLevel,
      pair.safetyGate ? 'Sí' : 'No', pair[`form${form}`], pair.expectedElements.join(' | '),
      pair.rationale, pair.sourceRefs.join(' | '), review.decision ?? 'pending', review.notes ?? '',
    ];
  })));
}

export function gapRows(data, state) {
  return data.courses.flatMap((course) => course.pairs.filter((pair) => pair.sourceGap).map((pair) => {
    const review = state.gapReviews[pair.pairId] ?? {};
    return [
      course.name, pair.pairId, pair.sourceGap, pair.sourceGapDecision?.pending ?? '',
      pair.supplementalReferences.map((item) => `${item.id}: ${item.citation}`).join(' | '),
      pair.supplementalReferences.map((item) => item.doi ?? '').filter(Boolean).join(' | '),
      review.status ?? 'pending',
      Object.entries(review.checks ?? {}).filter(([, checked]) => checked).map(([check]) => check).join(' | '),
      review.decisionRationale ?? '', review.notes ?? '', review.reviewer ?? '', review.reviewedAt ?? '',
    ];
  }));
}

export function courseRows(data, state) {
  return data.courses.map((course) => {
    const review = state.courseReviews[course.slug] ?? {};
    const pairReviews = course.pairs.filter((pair) => state.pairReviews[pair.pairId]?.decision === 'approved').length;
    const gaps = course.pairs.filter((pair) => pair.sourceGap);
    const closedGaps = gaps.filter((pair) => state.gapReviews[pair.pairId]?.status === 'validated').length;
    return [
      course.name, course.slug, course.classification, course.score, course.priority,
      course.plannedHours, pairReviews, course.pairs.length, closedGaps, gaps.length,
      review.dictum ?? course.classification, review.validatedScore ?? '', review.technicalEvidence ?? '', review.notes ?? '',
      ...GATE_NAMES.map((gate) => review.gates?.[gate] ? 'Sí' : 'No'),
      'BLOQUEADA', 'No',
    ];
  });
}

export function rubricRows(data) {
  return data.rubric.dimensions.map((dimension) => [
    dimension,
    ...Object.entries(data.rubric.scale).map(([score, description]) => `${score}: ${description}`),
    data.rubric.maximumPerCase,
    data.rubric.criticalSafetyRule,
  ]);
}

export function observationRows(data) {
  return data.courses.map((course) => [
    course.name, course.priorAudit.contentReview, course.priorAudit.alignment, course.priorAudit.humanDecision,
  ]);
}

export const HEADERS = {
  pairs: ['Curso', 'Slug', 'Par', 'Tipo de remediación', 'RA', 'Nivel cognitivo', 'Gate seguridad', 'Forma A', 'Forma B', 'Criterios esperados', 'Justificación', 'Referencias', 'Decisión', 'Motivo corrección', 'Notas', 'Revisor', 'Fecha'],
  proposals: ['Prioridad', 'Curso', 'Slug', 'Par', 'Tipo', 'Problema', 'Forma A antes', 'Forma B antes', 'Criterios antes', 'Forma A candidata', 'Forma B candidata', 'Criterios candidatos', 'Justificación científica', 'Referencias', 'Alternativas defendibles', 'Recomendación', 'Decisión humana', 'Motivo', 'Notas', 'Revisor', 'Fecha'],
  variants: ['Curso', 'Slug', 'Par', 'Forma', 'RA', 'Nivel cognitivo', 'Gate seguridad', 'Pregunta/caso', 'Criterios esperados', 'Justificación', 'Referencias', 'Decisión', 'Notas'],
  gaps: ['Curso', 'Par', 'Brecha', 'Pendiente previo', 'Referencias identificadas', 'DOI', 'Estado', 'Controles revisados', 'Fundamento', 'Notas', 'Revisor', 'Fecha'],
  courses: ['Curso', 'Slug', 'Clasificación base', 'Puntaje base', 'Prioridad', 'Horas planificadas', 'Pares aprobados', 'Pares totales', 'Brechas validadas', 'Brechas totales', 'Dictamen revisor', 'Puntaje validado', 'Evidencia técnica', 'Notas', ...GATE_NAMES, 'OTEC', 'Certificados activos'],
  rubrics: ['Dimensión', 'Nivel 0', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Máximo por caso', 'Regla crítica'],
  observations: ['Curso', 'Revisión de contenido', 'Alineación', 'Decisión humana pendiente'],
  pilots: ['Código seudónimo', 'Curso', 'Forma', 'Minutos observados', 'Puntaje (%)', 'Dificultad', 'Discriminación', 'Resultados por competencia', 'Problemas de comprensión', 'Comparación de formas', 'Calidad de retroalimentación', 'Notas', 'Mejoras', 'Fecha', 'Revisor'],
};

function pilotRows(state) {
  return state.pilotRecords.map((record) => [record.participantCode, record.courseSlug, record.form, record.observedMinutes, record.scorePercent ?? '', record.itemDifficulty, record.itemDiscrimination ?? '', record.competencyResults, record.comprehensionIssues, record.formComparison, record.feedbackQuality ?? '', record.notes, record.improvements, record.recordedAt, record.reviewer]);
}

function decisionRows(state) {
  return state.eventLog.map((event) => [event.sequence, event.type, event.entityId, event.reviewer, event.instrumentVersion, event.at, event.previousHash ?? '', event.hash]);
}

export function exportCsv(kind, data, state) {
  const exporters = {
    pairs: () => toCsv(HEADERS.pairs, pairRows(data, state)),
    proposals: () => toCsv(HEADERS.proposals, remediationRows(data, state)),
    variants: () => toCsv(HEADERS.variants, variantRows(data, state)),
    rubrics: () => toCsv(HEADERS.rubrics, rubricRows(data)),
    gaps: () => toCsv(HEADERS.gaps, gapRows(data, state)),
    observations: () => toCsv(HEADERS.observations, observationRows(data)),
    pilots: () => toCsv(HEADERS.pilots, pilotRows(state)),
  };
  if (!exporters[kind]) throw new Error('Unknown CSV export');
  return exporters[kind]();
}

function md(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function courseReport(course, data, state) {
  const review = state.courseReviews[course.slug] ?? {};
  const pairs = course.pairs.map((pair) => `| ${pair.pairId} | ${pair.outcomeId} | ${pair.cognitiveLevel} | ${pair.safetyGate ? 'Sí' : 'No'} | ${md(state.pairReviews[pair.pairId]?.decision ?? 'Pendiente')} |`).join('\n');
  const gates = GATE_NAMES.map((gate) => `- [${review.gates?.[gate] ? 'x' : ' '}] ${gate}`).join('\n');
  const verification = Object.entries(course.remediation.verification).map(([key, value]) => `- **${md(key)}:** ${md(value)}`).join('\n');
  return `# ${course.name} — informe de validación\n\n` +
    `Instrumento: \`${data.instrumentVersion}\`  \nRevisor académico: ${state.reviewer}  \n` +
    `Clasificación base: **${course.classification} (${course.score}/100)**  \nDictamen registrado: **${review.dictum ?? 'Pendiente'}**  \nPuntaje humano validado: **${review.validatedScore ?? 'Pendiente'}/100**  \n` +
    `OTEC: **BLOQUEADA**  \nCertificados: **BLOQUEADOS**\n\n` +
    `## Verificación académica preparada\n\n${verification}\n\n` +
    `Decisión humana pendiente: ${course.remediation.humanDecision}\n\n` +
    `## Pares A/B\n\n| Par | RA | Nivel | Gate | Decisión |\n|---|---|---|---|---|\n${pairs}\n\n` +
    `## Gates\n\n${gates}\n\n## Evidencia técnica\n\n${review.technicalEvidence || 'Pendiente.'}\n\n## Observaciones\n\n${review.notes || 'Sin observaciones registradas.'}\n`;
}

export function validationAct(data, state) {
  const reviewedPairs = Object.values(state.pairReviews).filter((review) => review.decision !== 'pending').length;
  const validatedGaps = Object.values(state.gapReviews).filter((review) => review.status === 'validated').length;
  return `# Acta de validación académica — borrador local\n\n` +
    `Fecha de exportación: ${new Date().toISOString()}  \nRevisor: ${state.reviewer}  \nInstrumento: ${data.instrumentVersion}\n\n` +
    `- Cursos: ${data.counts.courses}\n- Pares revisados con decisión: ${reviewedPairs}/${data.counts.pairs}\n` +
    `- Brechas validadas: ${validatedGaps}/${data.counts.gaps}\n- Registros de pilotaje real: ${state.pilotRecords.length}\n` +
    `- OTEC: BLOQUEADA\n- Certificados: BLOQUEADOS\n\n` +
    `Esta acta no autoriza certificabilidad ni activa certificados. Requiere firma y aprobación humana fuera de este panel local.\n`;
}

function xml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function columnName(index) {
  let value = index + 1;
  let name = '';
  while (value) {
    value -= 1;
    name = String.fromCharCode(65 + value % 26) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function worksheet(headers, rows) {
  const all = [headers, ...rows];
  const body = all.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${rowIndex === 0 ? ' s="1"' : ''}><v>${value}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${rowIndex === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  const end = `${columnName(Math.max(headers.length - 1, 0))}${Math.max(all.length, 1)}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${end}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${headers.map((header, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.min(Math.max(String(header).length + 3, 12), 38)}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData><autoFilter ref="A1:${columnName(headers.length - 1)}${Math.max(all.length, 1)}"/></worksheet>`;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(0, 8); header.writeUInt16LE(0, 10); header.writeUInt16LE(0, 12); header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26); header.writeUInt16LE(0, 28);
    local.push(header, name, data);

    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt16LE(0x800, 8);
    directory.writeUInt16LE(0, 10); directory.writeUInt16LE(0, 12); directory.writeUInt16LE(0, 14); directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(data.length, 20); directory.writeUInt32LE(data.length, 24); directory.writeUInt16LE(name.length, 28);
    directory.writeUInt16LE(0, 30); directory.writeUInt16LE(0, 32); directory.writeUInt16LE(0, 34); directory.writeUInt16LE(0, 36);
    directory.writeUInt32LE(0, 38); directory.writeUInt32LE(offset, 42);
    central.push(directory, name);
    offset += header.length + name.length + data.length;
  }
  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...local, centralBuffer, end]);
}

export function consolidatedXlsx(data, state) {
  const summaryHeaders = ['Indicador', 'Valor'];
  const summaryRows = [
    ['Versión del instrumento', data.instrumentVersion], ['Cursos', data.counts.courses], ['Pares A/B', data.counts.pairs],
    ['Variantes', data.counts.variants], ['Criterios de respuesta', data.counts.responseCriteria], ['Brechas bibliográficas', data.counts.gaps],
    ['Preparación base', `${data.baseline.overallPreparation}%`], ['Cursos APTO', 0], ['OTEC', 'BLOQUEADA'], ['Certificados', 'BLOQUEADOS'],
    ['Revisor', state.reviewer], ['Última actualización', state.updatedAt ?? 'Sin decisiones registradas'],
  ];
  const sheets = [
    ['Resumen', summaryHeaders, summaryRows],
    ['Cursos', HEADERS.courses, courseRows(data, state)],
    ['Propuestas', HEADERS.proposals, remediationRows(data, state)],
    ['Pares', HEADERS.pairs, pairRows(data, state)],
    ['Variantes', HEADERS.variants, variantRows(data, state)],
    ['Rubricas', HEADERS.rubrics, rubricRows(data)],
    ['Brechas', HEADERS.gaps, gapRows(data, state)],
    ['Observaciones', HEADERS.observations, observationRows(data)],
    ['Pilotaje', HEADERS.pilots, pilotRows(state)],
    ['Decisiones', ['Secuencia', 'Tipo', 'Entidad', 'Revisor', 'Instrumento', 'Fecha', 'Hash previo', 'Hash'], decisionRows(state)],
  ];
  const workbookSheets = sheets.map(([name], index) => `<sheet name="${xml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('');
  const workbookRels = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('');
  const sheetOverrides = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  const entries = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetOverrides}</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B5D63"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>` },
    ...sheets.map(([name, headers, rows], index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, data: worksheet(headers, rows) })),
  ];
  return zip(entries);
}

export function decisionsJson(data, state) {
  return `${JSON.stringify({ exportedAt: new Date().toISOString(), instrumentVersion: data.instrumentVersion, ...state }, null, 2)}\n`;
}
