import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../academy/kinecheck-ortho/curriculum-draft.json', import.meta.url), 'utf8'));

test('draft curriculum has twelve mapped modules and a 50-hour unvalidated estimate', () => {
  assert.equal(manifest.modules.length, 12);
  assert.equal(manifest.modules.reduce((sum, module) => sum + module.hours, 0), 50);
  assert.equal(manifest.proposedHours, 50);
  assert.equal(manifest.hoursStatus, 'unvalidated_estimate');
  assert.ok(manifest.modules.every(module => module.outcomes.length >= 3 && module.topics.length >= 6 && module.caseId));
});

test('draft assessment proportions total 100 and require an independent safety gate', () => {
  const assessment = manifest.assessment;
  assert.equal(assessment.formativeModulesPercent + assessment.integrativeCasesPercent + assessment.finalExamPercent, 100);
  assert.equal(assessment.passPercent, 70);
  assert.equal(assessment.criticalSafetyGate, true);
  assert.equal(assessment.humanReviewRequiredForOpenResponses, true);
});

test('eight independent specializations reuse modules and have their own case assessment', () => {
  assert.equal(manifest.specializations.length, 8);
  for (const route of manifest.specializations) {
    assert.ok(route.modules.length >= 4);
    assert.ok(route.assessmentCase.length > 30);
    assert.ok(route.modules.every(id => manifest.modules.some(module => module.id === id)));
  }
});

test('clinical reference registry uses direct accessible source URLs', () => {
  assert.ok(manifest.references.length >= 10);
  assert.ok(manifest.references.every(ref => /^https:\/\//.test(ref.url) && /^https:\/\//.test(ref.url)));
  assert.ok(manifest.references.every(ref => ref.modules.every(id => manifest.modules.some(module => module.id === id))));
});
