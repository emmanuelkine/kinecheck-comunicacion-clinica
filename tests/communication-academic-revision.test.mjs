import test from 'node:test';
import assert from 'node:assert/strict';
import { communicationRevision, communicationSlideNumber } from '../communication-academic-revision-v1.js';

test('academic revisions resolve actual viewer counters and thumbnail labels', () => {
  assert.equal(communicationSlideNumber(' 13 / 154'), 13);
  assert.equal(communicationSlideNumber('Miniatura diapositiva 149'), 149);
  assert.equal(communicationSlideNumber(''), 0);
  assert.equal(communicationRevision(communicationSlideNumber('13 / 154')).number, 13);
  assert.equal(communicationRevision(16), null);
  assert.equal(communicationRevision(0), null);
});

test('revised clinical passages retain verified original sources and bounded claims', () => {
  assert.match(communicationRevision(14).text, /no.*excluir patología seria/i);
  assert.match(communicationRevision(125).text, /no demuestra.*eficacia adicional/i);
  assert.match(communicationRevision(139).text, /no demuestra.*recuperación clínica/i);
  assert.match(communicationRevision(150).text, /Evita culpar/i);
  assert.match(communicationRevision(11).text,/comprensión/);
  for (const n of [11,13,14,63,64,76,77,80,81,82,83,85,90,118,120,125,127,135,136,137,139,141,142,144,149,150,154]) {
    const revision = communicationRevision(n);
    assert.ok(revision?.sources.length);
    for (const source of revision.sources) assert.equal(new URL(source).protocol, 'https:');
  }
});
