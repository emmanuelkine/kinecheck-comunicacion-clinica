import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

const courseMeta = {
  'kinecheck-clinico-curso': { score: 53, classification: 'NO APTO', plannedHours: 18, priority: 'normal' },
  'comunicacion-clinica': { score: 60, classification: 'REQUIERE MEJORAS', plannedHours: 8, priority: 'normal' },
  'mas-alla-del-dolor': { score: 62, classification: 'REQUIERE MEJORAS', plannedHours: 12, priority: 'normal' },
  'evidencia-aplicada': { score: 62, classification: 'REQUIERE MEJORAS', plannedHours: 10, priority: 'alta' },
  'traumatologia-ortopedia-clinica': { score: 65, classification: 'REQUIERE MEJORAS', plannedHours: 640 / 60, priority: 'normal' },
  'dolor-lumbar-persistente': { score: 56, classification: 'NO APTO', plannedHours: 8, priority: 'normal' },
  'dolor-musculoesqueletico': { score: 62, classification: 'REQUIERE MEJORAS', plannedHours: 8, priority: 'alta' },
  'ejercicio-terapeutico': { score: 61, classification: 'REQUIERE MEJORAS', plannedHours: 6, priority: 'normal' },
};

export const GATE_NAMES = [
  'contentReviewed',
  'bibliographyValidated',
  'evaluationApproved',
  'rubricApproved',
  'equivalenceReviewed',
  'pilotCompleted',
  'hoursValidated',
  'technicalValidationCompleted',
  'certifiabilityAuthorized',
];

export const SCIENTIFIC_CHECKS = [
  'correspondence',
  'methods',
  'applicability',
  'uncertainty',
  'causality',
  'effectMagnitude',
  'limits',
  'currency',
];

export async function loadPanelData() {
  const instrumentPath = path.join(root, 'supabase', 'fixtures', 'internal', 'academy-instruments-review', 'academy-applied-cases.forms-ab.json');
  const remediationPath = path.join(root, 'supabase', 'fixtures', 'internal', 'academy-instruments-review', 'academy-remediation-decisions-2026-11-19.json');
  const ledgerPath = path.join(root, 'docs', 'audits', 'academy-otec-validation-2026-11-13', 'scientific-review-ledger.json');
  const [instrument, remediation, ledger] = await Promise.all([
    readFile(instrumentPath, 'utf8').then(JSON.parse),
    readFile(remediationPath, 'utf8').then(JSON.parse),
    readFile(ledgerPath, 'utf8').then(JSON.parse),
  ]);

  return buildPanelData({ instrument, remediation, ledger });
}

export function buildPanelData({ instrument, remediation, ledger }) {
  if (remediation.instrumentVersion !== instrument.instrumentVersion) {
    throw new Error('Academic remediation package and instrument versions do not match');
  }

  const ledgerBySlug = new Map(ledger.courses.map((course) => [course.slug, course]));
  const remediationBySlug = new Map(remediation.courses.map((course) => [course.slug, course]));
  const correctionByPair = new Map(remediation.corrections.map((correction) => [correction.pairId, correction]));
  const gapsByPair = new Map(ledger.sourceGapDecisions.map((gap) => [gap.pairId, gap]));
  const references = Object.fromEntries(instrument.supplementalReferences.map((reference) => [reference.id, reference]));
  const resolveReferences = (ids, context) => ids.map((id) => {
    const reference = references[id];
    if (!reference) throw new Error(`Unknown supplemental reference ${id} in ${context}`);
    return reference;
  });
  const coveredPairIds = new Set();

  const courses = instrument.courses.map((course) => {
    const review = ledgerBySlug.get(course.slug);
    const remediationCourse = remediationBySlug.get(course.slug);
    const meta = courseMeta[course.slug];
    if (!review || !meta || !remediationCourse) throw new Error(`Missing audit metadata for ${course.slug}`);
    const retained = new Set(remediationCourse.retainedPairIds);
    const corrected = new Set(remediationCourse.correctedPairIds);
    return {
      ...course,
      ...meta,
      remediation: remediationCourse,
      priorAudit: {
        contentReview: review.contentReview,
        alignment: review.alignment,
        humanDecision: review.humanDecision,
      },
      pairs: course.pairs.map((pair) => {
        const correction = correctionByPair.get(pair.pairId) ?? null;
        if (retained.has(pair.pairId) === corrected.has(pair.pairId)) {
          throw new Error(`Pair ${pair.pairId} must be covered exactly once as retained or corrected`);
        }
        if (corrected.has(pair.pairId) && !correction) throw new Error(`Missing correction dossier for ${pair.pairId}`);
        if (retained.has(pair.pairId) && correction) throw new Error(`Retained pair ${pair.pairId} has an unexpected correction`);
        coveredPairIds.add(pair.pairId);
        return {
          ...pair,
          remediationDecision: correction ?? {
            pairId: pair.pairId,
            problem: 'No verifiable conceptual error requiring an automatic wording change was found in this review.',
            before: { formA: pair.formA, formB: pair.formB, expectedElements: pair.expectedElements },
            afterSummary: 'Candidate wording retained; protected key, rubric anchors and academic approval remain pending.',
            scientificJustification: 'Existing course sources remain the evidence basis; retention is not equivalent to validation.',
            referenceIds: pair.sourceValidation?.supplementalRefs ?? [],
            alternativeDefensibleAnswers: 'Any response meeting the protected criteria and supported by appropriate evidence remains subject to human scoring.',
            recommendation: 'retain_candidate_pending_human_review',
            decisionStatus: 'pending_human_review',
          },
          remediationType: correction ? 'corrected_candidate' : 'retained_candidate',
          sourceGapDecision: gapsByPair.get(pair.pairId) ?? null,
          supplementalReferences: resolveReferences(pair.sourceValidation?.supplementalRefs ?? [], pair.pairId),
        };
      }),
    };
  });

  const counts = {
    courses: courses.length,
    pairs: courses.reduce((total, course) => total + course.pairs.length, 0),
    variants: courses.reduce((total, course) => total + course.pairs.length * 2, 0),
    responseCriteria: courses.reduce((total, course) => total + course.pairs.length, 0),
    gaps: courses.reduce((total, course) => total + course.pairs.filter((pair) => pair.sourceGap).length, 0),
  };

  if (counts.courses !== 8 || counts.pairs !== 40 || counts.variants !== 80 || counts.gaps !== 8) {
    throw new Error(`Unexpected instrument coverage: ${JSON.stringify(counts)}`);
  }
  if (coveredPairIds.size !== 40 || correctionByPair.size !== 8) {
    throw new Error(`Unexpected remediation coverage: ${coveredPairIds.size} pairs, ${correctionByPair.size} corrections`);
  }

  const decisionQueue = courses
    .flatMap((course) => course.pairs.map((pair) => ({
      ...pair.remediationDecision,
      pairId: pair.pairId,
      remediationType: pair.remediationType,
      courseSlug: course.slug,
      courseName: course.name,
      priorityRank: course.remediation.priorityRank,
      current: { formA: pair.formA, formB: pair.formB, expectedElements: pair.expectedElements, rationale: pair.rationale },
      references: resolveReferences(pair.remediationDecision.referenceIds, pair.pairId),
    })))
    .sort((left, right) => left.priorityRank - right.priorityRank || Number(right.remediationType === 'corrected_candidate') - Number(left.remediationType === 'corrected_candidate') || left.pairId.localeCompare(right.pairId));

  return {
    schemaVersion: instrument.schemaVersion,
    instrumentVersion: instrument.instrumentVersion,
    instrumentStatus: instrument.status,
    keyProtection: instrument.keyProtection,
    scorable: instrument.scorable,
    currentPassRequirementsUnchanged: instrument.currentPassRequirementsUnchanged,
    rubric: instrument.rubric,
    references,
    remediation: {
      packageVersion: remediation.packageVersion,
      status: remediation.status,
      reviewerRequired: remediation.reviewerRequired,
      scope: remediation.scope,
      rules: remediation.rules,
      decisionQueue,
    },
    courses,
    counts,
    auditTotals: ledger.totals,
    baseline: { overallPreparation: 60, coursesApto: 0, otec: 'BLOQUEADA', certificates: 'BLOQUEADOS' },
  };
}

export function publicHealth(data) {
  return {
    ok: true,
    service: 'KineCheck Academy academic validation panel',
    instrumentVersion: data.instrumentVersion,
    counts: data.counts,
    otec: 'BLOQUEADA',
  };
}
