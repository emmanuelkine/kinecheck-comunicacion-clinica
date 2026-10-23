import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { inspectWebP, brandTerms } from '../scripts/audit-public-assets.mjs';

test('restored treatment graphic has a complete WebP container and the expected lossless payload', () => {
  const bytes = readFileSync(new URL('../assets/evidence/kinecheck-mecanismos-tratamiento.webp', import.meta.url));
  const container = inspectWebP(bytes);
  assert.equal(container.declaredBytes, bytes.length);
  assert.ok(container.chunks.includes('VP8L'));
});

test('truncated WebP is rejected even when its signature still looks valid', () => {
  const bytes = readFileSync(new URL('../assets/evidence/kinecheck-mecanismos-tratamiento.webp', import.meta.url));
  assert.throws(() => inspectWebP(bytes.subarray(0, 14729)), /RIFF length mismatch/);
  const forged = Buffer.from(bytes.subarray(0, 40));
  forged.writeUInt32LE(forged.length - 8, 4);
  assert.throws(() => inspectWebP(forged), /Truncated WebP/);
});

test('brand detection catches mixed case in extracted lettering and leaves the clinical brand alone', () => {
  assert.deepEqual(brandTerms('KineCheck - razonamiento clínico'), []);
  assert.deepEqual(brandTerms('powered by CHAT' + 'GPT and Open' + 'AI'), ['chat' + 'gpt', 'open' + 'ai']);
});
