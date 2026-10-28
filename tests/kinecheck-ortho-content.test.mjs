import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('../private-course-assets/kinecheck-ortho/course-data.js', import.meta.url), 'utf8').catch(() => null);
let course = null;
if (source) {
  const context = { window: {} };
  vm.runInNewContext(source, context, { timeout: 1000 });
  course = context.window.KC_ORTHO_DATA;
}
const protectedPayloadSkip = course ? false : 'protected authoring payload is checked locally and kept out of the public repository';

test('protected Ortho authoring payload contains 12 full modules and 12 sequential cases', { skip: protectedPayloadSkip }, () => {
  assert.equal(course.modules.length, 12);
  assert.equal(new Set(course.modules.map(module => module.id)).size, 12);
  const cases = course.modules.flatMap(module => module.lessons.map(lesson => lesson.case).filter(Boolean));
  assert.equal(cases.length, 12);
  assert.equal(new Set(cases.map(item => item.id)).size, 12);
  for (const module of course.modules) {
    assert.ok(module.outcomes.length >= 3, `${module.id}: outcomes`);
    assert.ok(module.prerequisites.length >= 2, `${module.id}: prerequisites`);
    assert.equal(module.lessons.length, 1, `${module.id}: authored lesson`);
    const lesson = module.lessons[0];
    for (const field of ['introduction','sections','diagram','clinicalExample','recommendations','uncertainty','algorithm','activity','questions','summary','references']) {
      assert.ok(lesson[field], `${module.id}: ${field}`);
    }
    assert.ok(lesson.sections.length >= 4, `${module.id}: substantive sections`);
    assert.ok(lesson.questions.length >= 3, `${module.id}: formative questions`);
    for (const caseItem of [lesson.case]) {
      assert.ok(caseItem.stages.length >= 5, `${module.id}: progressive case stages`);
      assert.ok(caseItem.rubric.some(row => row.critical), `${module.id}: critical safety rubric`);
      assert.ok(caseItem.rubric.length >= 5, `${module.id}: analytical rubric`);
      for (const stage of caseItem.stages) {
        assert.ok(stage.title && stage.reveal && stage.prompt && stage.focus, `${module.id}: staged case fields`);
        assert.ok(stage.options.length >= 3, `${module.id}: plausible alternatives`);
        assert.ok(stage.options.every(item => item.text && item.feedback && item.quality), `${module.id}: option feedback`);
      }
    }
  }
});

test('clinical claim registry has source links and every lesson recommendation resolves to a claim', { skip: protectedPayloadSkip }, () => {
  assert.ok(Object.keys(course.evidenceClaims).length >= 20);
  for (const [id, claim] of Object.entries(course.evidenceClaims)) {
    assert.ok(claim.statement.length > 40, `${id}: substantive statement`);
    assert.ok(claim.certainty && claim.scope, `${id}: certainty/scope`);
    assert.ok(claim.sources.length, `${id}: source ids`);
    for (const sourceId of claim.sources) assert.ok(course.sources[sourceId]?.url, `${id}: ${sourceId}`);
  }
  for (const module of course.modules) {
    const lesson = module.lessons[0];
    for (const section of lesson.sections) {
      assert.ok(section.claimIds.length, `${module.id}/${section.title}: claim citation`);
      for (const claimId of section.claimIds) assert.ok(course.evidenceClaims[claimId], `${module.id}: ${claimId}`);
    }
    for (const recommendation of lesson.recommendations) assert.ok(course.evidenceClaims[recommendation.claimId], `${module.id}: recommendation claim`);
    for (const question of lesson.questions) {
      assert.ok(question.sourceIds.length, `${module.id}: question sources`);
      for (const id of question.sourceIds) assert.ok(course.sources[id]?.url, `${module.id}: ${id}`);
    }
    for (const reference of lesson.references) assert.match(reference.url, /^https:\/\//);
  }
});

test('all specialization routes identify prerequisites, competencies and an assessment case', { skip: protectedPayloadSkip }, () => {
  assert.equal(course.specializations.length, 8);
  const moduleIds = new Set(course.modules.map(module => module.id));
  const caseIds = new Set(course.modules.flatMap(module => module.lessons.map(lesson => lesson.case?.id)));
  for (const route of course.specializations) {
    assert.ok(route.modules.length >= 4);
    assert.ok(route.modules.every(id => moduleIds.has(id)));
    assert.ok(caseIds.has(route.caseId));
    assert.ok(route.competencies.length >= 4);
    assert.ok(route.assessment.length > 30);
  }
});

test('integrative exam draft links all twelve cases, uses plausible options and marks critical safety items', { skip: protectedPayloadSkip }, () => {
  assert.equal(course.finalExam.status, 'draft_not_active');
  assert.equal(course.finalExam.items.length, 12);
  assert.equal(new Set(course.finalExam.items.map(item => item.caseId)).size, 12);
  assert.ok(course.finalExam.items.filter(item => item.critical).length >= 4);
  const caseIds = new Set(course.modules.flatMap(module => module.lessons.map(lesson => lesson.case?.id)));
  for (const item of course.finalExam.items) {
    assert.ok(caseIds.has(item.caseId));
    assert.equal(item.options.length, 3);
    assert.equal(item.options.filter(option => option.correct).length, 1);
    assert.ok(item.options.every(option => option.feedback.length > 20));
    assert.ok(item.sourceIds.length >= 1);
    for (const id of item.sourceIds) assert.ok(course.sources[id]?.url);
  }
});

test('commercial, OTEC and sumative evaluation remain inactive pending real validation', { skip: protectedPayloadSkip }, () => {
  assert.equal(course.commercial.hotmart, 'sin configurar');
  assert.equal(course.commercial.productIds, null);
  assert.equal(course.commercial.prices, null);
  assert.equal(course.commercial.licenseTerms, null);
  assert.equal(course.commercial.otec.issuanceEnabled, false);
  assert.match(course.reviewStatus.clinical, /pendiente/);
  assert.match(course.reviewStatus.scientific, /pendiente/);
  assert.match(course.reviewStatus.pedagogical, /pendiente/);
  assert.equal(course.grading.formativeModulesPercent + course.grading.integrativeCasesPercent + course.grading.finalExamPercent, 100);
  assert.equal(course.grading.passPercent, 70);
  assert.equal(course.grading.criticalSafetyGate, true);
  assert.equal(course.finalExam.serverSideKeyRequired, true);
});

test('release migration keeps external activation disabled and requires review, pilot and OTEC evidence', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261028143118_kinecheck_ortho_release_controls.sql', import.meta.url), 'utf8');
  assert.match(migration, /qa_access_enabled boolean not null default false/);
  assert.match(migration, /learner_access_enabled boolean not null default false/);
  assert.match(migration, /summative_assessment_enabled boolean not null default false/);
  assert.match(migration, /commercial_enabled boolean not null default false/);
  assert.match(migration, /otec_issuance_enabled boolean not null default false/);
  assert.match(migration, /Human reviews and an accepted pilot are required/);
  assert.match(migration, /agreement_reference/);
  assert.match(migration, /authorization_reference/);
  assert.match(migration, /status text not null default 'unconfigured'/);
  assert.match(migration, /2026\.10-authoring-2/);
});

test('protected asset manifest records the staged version and exact verified hashes', async () => {
  const manifest = await readFile(new URL('../docs/academic/kinecheck-ortho/ASSET_MANIFEST.md', import.meta.url), 'utf8');
  assert.match(manifest, /2026\.10-authoring-2/);
  assert.match(manifest, /50b03333ae8ede9387d55e17bb6b6e66b9714c10b1820f8c325b7e9fa2f91815/);
  assert.match(manifest, /0ba54c4bd6f1b562f05d1e6bc07b20e8c2d55f4fd925c88b4a50c842b5e45c0b/);
  assert.match(manifest, /acceso alumno permanecen apagados/);
});
