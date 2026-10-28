import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('KineCheck Ortho stays out of sales while academic and OTEC gates are pending', async () => {
  const config = await read('academy/config.js');
  const item = config.match(/slug: "kinecheck-ortho"[\s\S]*?\n    },/);
  assert.ok(item, 'catalog card is present');
  assert.match(item[0], /status: "preparing"/);
  assert.match(item[0], /url: ""/);
  assert.doesNotMatch(item[0], /productId:/);
});

test('protected course function serves Ortho only through the existing licensed-content gate', async () => {
  const edge = await read('supabase/functions/protected-course-key/index.ts');
  assert.match(edge, /"kinecheck-ortho":\s*\[/);
  assert.match(edge, /kinecheck-ortho\/current\/course-data\.js/);
  assert.match(edge, /kinecheck-ortho\/current\/renderer\.js/);
  assert.match(edge, /kinecheck_ortho_protected_assets/);
  assert.match(edge, /crypto\.subtle\.digest/);
  assert.match(edge, /environment !== "production"/);
  assert.match(edge, /isUsableAccess\(access\)/);
});

test('course route keeps assessment inactive and validates the 12-module version before rendering', async () => {
  const gate = await read('academy/kinecheck-ortho/gate.js');
  const renderer = await read('academy/kinecheck-ortho/renderer.js');
  const page = await read('academy/kinecheck-ortho/index.html');
  assert.match(gate, /functions\/v1\/protected-course-key/);
  assert.match(gate, /Authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(renderer, /data\.modules\.length !== 12/);
  assert.match(renderer, /Evaluación sumativa desactivada/);
  assert.match(renderer, /OTEC deshabilitada/);
  assert.match(page, /noindex,nofollow/);
});
