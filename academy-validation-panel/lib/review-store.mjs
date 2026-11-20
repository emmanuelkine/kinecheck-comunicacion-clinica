import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GATE_NAMES, SCIENTIFIC_CHECKS } from './panel-data.mjs';

export const REVIEWER = 'Klgo. Mtr. Emmanuel Zúñiga';
export const DECISIONS = ['pending', 'approved', 'approved_with_corrections', 'modification_requested', 'rejected'];
export const GAP_STATUSES = ['pending', 'narrowed_not_closed', 'validated', 'rejected'];
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const RUT = /\b\d{1,2}(?:\.\d{3}){2}-[\dkK]\b|\b\d{7,8}-[\dkK]\b/;
const PHONE = /(?:\+?56\s*)?(?:9\s*)?\d{4}[\s-]?\d{4}/;

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(stable(value)).digest('hex');
}

function cleanText(value, maximum = 12000) {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error('Expected text');
  return value.replace(/\0/g, '').trim().slice(0, maximum);
}

function assertKeys(value, allowed) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`Unexpected field: ${key}`);
  }
}

export function emptyState(instrumentVersion) {
  return {
    schemaVersion: '1.0',
    instrumentVersion,
    reviewer: REVIEWER,
    updatedAt: null,
    pairReviews: {},
    gapReviews: {},
    courseReviews: {},
    pilotRecords: [],
    eventLog: [],
    otec: { status: 'BLOQUEADA', certificatesEnabled: false },
  };
}

function normalizeState(parsed, instrumentVersion) {
  const state = { ...emptyState(instrumentVersion), ...parsed };
  state.instrumentVersion = instrumentVersion;
  state.reviewer = REVIEWER;
  state.otec = { status: 'BLOQUEADA', certificatesEnabled: false };
  state.pairReviews ??= {};
  state.gapReviews ??= {};
  state.courseReviews ??= {};
  state.pilotRecords ??= [];
  state.eventLog ??= [];
  return state;
}

export function createReviewStore({ dataDir, instrumentVersion, now = () => new Date(), persistence = null }) {
  const file = persistence ? null : path.join(dataDir, 'decisions.json');
  let state = emptyState(instrumentVersion);
  let revision = 0;
  let writeQueue = Promise.resolve();

  async function load() {
    if (persistence) {
      const loaded = await persistence.load();
      state = normalizeState(loaded?.state ?? emptyState(instrumentVersion), instrumentVersion);
      revision = Number(loaded?.revision ?? 0);
      if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid persisted review revision');
      verifyEventChain(state.eventLog);
      if (state.eventLog.length !== revision) throw new Error('Persisted review revision does not match the decision history');
      return structuredClone(state);
    }
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8'));
      state = normalizeState(parsed, instrumentVersion);
      verifyEventChain(state.eventLog);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return structuredClone(state);
  }

  async function persist(event) {
    if (persistence) {
      const nextRevision = await persistence.save({
        state: structuredClone(state),
        event: structuredClone(event),
        expectedRevision: revision,
      });
      if (Number(nextRevision) !== revision + 1) throw new Error('Invalid persisted review revision response');
      revision = Number(nextRevision);
      return;
    }
    await mkdir(dataDir, { recursive: true, mode: 0o700 });
    const temp = `${file}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(temp, file);
  }

  function appendEvent(type, entityId, payload) {
    const previousHash = state.eventLog.at(-1)?.hash ?? null;
    const event = {
      sequence: state.eventLog.length + 1,
      type,
      entityId,
      reviewer: REVIEWER,
      instrumentVersion,
      at: now().toISOString(),
      previousHash,
      payload,
    };
    event.hash = sha256(event);
    state.eventLog.push(event);
    state.updatedAt = event.at;
    return event;
  }

  function mutate(type, entityId, apply) {
    writeQueue = writeQueue.catch(() => undefined).then(async () => {
      const payload = apply();
      const event = appendEvent(type, entityId, payload);
      await persist(event);
      return { event, state: structuredClone(state) };
    });
    return writeQueue;
  }

  return {
    file,
    load,
    snapshot: () => structuredClone(state),
    revision: () => revision,
    reviewPair(pairId, input) {
      return mutate('pair_reviewed', pairId, () => {
        assertKeys(input, ['decision', 'notes', 'correctionReason', 'proposedFormA', 'proposedFormB', 'proposedExpectedElements', 'proposedRationale']);
        if (!DECISIONS.includes(input.decision)) throw new Error('Invalid pair decision');
        const notes = cleanText(input.notes);
        const correctionReason = cleanText(input.correctionReason, 4000);
        if (['approved_with_corrections', 'modification_requested', 'rejected'].includes(input.decision) && correctionReason.length < 12) {
          throw new Error('A correction or rejection requires a specific reason');
        }
        const review = {
          decision: input.decision,
          notes,
          correctionReason,
          proposedFormA: cleanText(input.proposedFormA),
          proposedFormB: cleanText(input.proposedFormB),
          proposedExpectedElements: Array.isArray(input.proposedExpectedElements)
            ? input.proposedExpectedElements.map((item) => cleanText(item, 1000)).filter(Boolean).slice(0, 12)
            : [],
          proposedRationale: cleanText(input.proposedRationale),
          reviewer: REVIEWER,
          instrumentVersion,
          reviewedAt: now().toISOString(),
        };
        state.pairReviews[pairId] = review;
        return review;
      });
    },
    reviewGap(pairId, input) {
      return mutate('source_gap_reviewed', pairId, () => {
        assertKeys(input, ['status', 'checks', 'notes', 'decisionRationale']);
        if (!GAP_STATUSES.includes(input.status)) throw new Error('Invalid source-gap status');
        const checks = {};
        for (const check of SCIENTIFIC_CHECKS) checks[check] = input.checks?.[check] === true;
        const rationale = cleanText(input.decisionRationale, 8000);
        if (input.status === 'validated' && (!SCIENTIFIC_CHECKS.every((check) => checks[check]) || rationale.length < 30)) {
          throw new Error('A gap can be validated only after all scientific checks and a reasoned decision');
        }
        const review = {
          status: input.status,
          checks,
          notes: cleanText(input.notes),
          decisionRationale: rationale,
          reviewer: REVIEWER,
          instrumentVersion,
          reviewedAt: now().toISOString(),
        };
        state.gapReviews[pairId] = review;
        return review;
      });
    },
    reviewCourse(slug, input, prerequisites) {
      return mutate('course_reviewed', slug, () => {
        assertKeys(input, ['gates', 'notes', 'dictum', 'validatedScore', 'technicalEvidence']);
        const gates = {};
        for (const gate of GATE_NAMES) gates[gate] = input.gates?.[gate] === true;
        const validatedScore = input.validatedScore === '' || input.validatedScore == null ? null : Number(input.validatedScore);
        const technicalEvidence = cleanText(input.technicalEvidence, 8000);
        if (validatedScore != null && (!Number.isFinite(validatedScore) || validatedScore < 0 || validatedScore > 100)) throw new Error('Validated score must be between 0 and 100');
        if ((gates.pilotCompleted || gates.hoursValidated) && !prerequisites?.pilotEvidence) {
          throw new Error('Pilot and hours gates require at least one real pseudonymized pilot record');
        }
        if (gates.technicalValidationCompleted && technicalEvidence.length < 20) {
          throw new Error('Technical validation requires specific test evidence');
        }
        if (gates.certifiabilityAuthorized) {
          const missing = GATE_NAMES.slice(0, -1).filter((gate) => !gates[gate]);
          if (missing.length || !prerequisites?.allPairsApproved || !prerequisites?.allGapsValidated || !prerequisites?.pilotEvidence || validatedScore == null || validatedScore < 85) {
            throw new Error('Certifiability cannot be authorized while a prerequisite remains open');
          }
        }
        const dictum = cleanText(input.dictum, 4000) || 'NO APTO';
        if (!['NO APTO', 'REQUIERE MEJORAS', 'APTO'].includes(dictum)) throw new Error('Invalid course dictum');
        if (dictum === 'APTO' && !gates.certifiabilityAuthorized) throw new Error('APTO requires explicit certifiability authorization');
        const review = {
          gates,
          notes: cleanText(input.notes),
          dictum,
          validatedScore,
          technicalEvidence,
          reviewer: REVIEWER,
          instrumentVersion,
          reviewedAt: now().toISOString(),
          certificateActivation: false,
          otecStatus: 'BLOQUEADA',
        };
        state.courseReviews[slug] = review;
        return review;
      });
    },
    addPilot(input) {
      return mutate('pilot_recorded', input.participantCode ?? 'unknown', () => {
        assertKeys(input, ['participantCode', 'courseSlug', 'form', 'observedMinutes', 'scorePercent', 'itemDifficulty', 'itemDiscrimination', 'competencyResults', 'comprehensionIssues', 'formComparison', 'feedbackQuality', 'notes', 'improvements']);
        const participantCode = cleanText(input.participantCode, 80);
        const text = JSON.stringify(input);
        if (!/^P-[A-Z0-9_-]{3,30}$/i.test(participantCode)) throw new Error('Use a pseudonymous participant code such as P-001');
        if (EMAIL.test(text) || RUT.test(text) || PHONE.test(text)) throw new Error('Pilot records must not contain email, RUT or phone data');
        if (!['A', 'B'].includes(input.form)) throw new Error('Pilot form must be A or B');
        const observedMinutes = Number(input.observedMinutes);
        if (!Number.isFinite(observedMinutes) || observedMinutes <= 0 || observedMinutes > 10000) throw new Error('Observed minutes are invalid');
        const scorePercent = input.scorePercent === '' || input.scorePercent == null ? null : Number(input.scorePercent);
        if (scorePercent != null && (!Number.isFinite(scorePercent) || scorePercent < 0 || scorePercent > 100)) throw new Error('Pilot score must be between 0 and 100');
        const record = {
          id: `${Date.now()}-${state.pilotRecords.length + 1}`,
          participantCode,
          courseSlug: cleanText(input.courseSlug, 120),
          form: input.form,
          observedMinutes,
          scorePercent,
          itemDifficulty: cleanText(input.itemDifficulty, 4000),
          itemDiscrimination: cleanText(input.itemDiscrimination, 4000),
          competencyResults: cleanText(input.competencyResults, 4000),
          comprehensionIssues: cleanText(input.comprehensionIssues, 4000),
          formComparison: cleanText(input.formComparison, 4000),
          feedbackQuality: cleanText(input.feedbackQuality, 4000),
          notes: cleanText(input.notes),
          improvements: cleanText(input.improvements),
          recordedAt: now().toISOString(),
          reviewer: REVIEWER,
        };
        state.pilotRecords.push(record);
        return record;
      });
    },
  };
}

export function verifyEventChain(events) {
  let previousHash = null;
  for (let index = 0; index < events.length; index += 1) {
    const { hash, ...unsigned } = events[index];
    if (unsigned.sequence !== index + 1 || unsigned.previousHash !== previousHash || sha256(unsigned) !== hash) {
      throw new Error(`Invalid decision history at event ${index + 1}`);
    }
    previousHash = hash;
  }
  return true;
}

export function coursePrerequisites(data, state, slug) {
  const course = data.courses.find((item) => item.slug === slug);
  if (!course) throw new Error('Unknown course');
  return {
    allPairsApproved: course.pairs.every((pair) => state.pairReviews[pair.pairId]?.decision === 'approved'),
    allGapsValidated: course.pairs.filter((pair) => pair.sourceGap).every((pair) => state.gapReviews[pair.pairId]?.status === 'validated'),
    pilotEvidence: state.pilotRecords.some((record) => record.courseSlug === slug),
  };
}
