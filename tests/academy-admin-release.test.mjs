import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('safe release contains the private route but no protected academic payload', async () => {
  const [html, app, edge] = await Promise.all([
    read('admin/academy/index.html'),
    read('academy-validation-panel/app.js'),
    read('supabase/functions/academy-admin-review/index.ts'),
  ]);
  assert.match(html, /academy-validation-panel\/app\.js/);
  assert.match(app, /kinecheck_admin_session_v1/);
  assert.match(edge, /academy_academic_review_instruments/);
  assert.match(edge, /auth\.getUser\(token\)/);
  assert.doesNotMatch(edge, /academy-applied-cases\.forms-ab\.json|academy-remediation-decisions/);
  await assert.rejects(() => access(new URL('../supabase/fixtures/internal/academy-instruments-review/academy-applied-cases.forms-ab.json', import.meta.url)));
});

test('release migration is client-deny-by-default and fail-closed', async () => {
  const sql = await read('supabase/migrations/20261119173000_academy_admin_review.sql');
  assert.match(sql, /force row level security/gi);
  assert.match(sql, /revoke all on table public\.academy_academic_review_instruments from public, anon, authenticated/i);
  assert.match(sql, /grant execute[\s\S]+to service_role/i);
  assert.match(sql, /academy_instrument_eighty_variants/);
  assert.match(sql, /academy_review_otec_blocked/);
  assert.match(sql, /40001/);
});

test('Cloudflare guards private source while allowing only keyless panel assets', async () => {
  const [supabaseGuard, panelGuard, headers] = await Promise.all([
    read('functions/supabase/_middleware.js'),
    read('functions/academy-validation-panel/_middleware.js'),
    read('_headers'),
  ]);
  assert.match(supabaseGuard, /status:\s*404/);
  assert.match(panelGuard, /PUBLIC_ASSETS/);
  assert.match(panelGuard, /status:\s*404/);
  assert.match(headers, /\/admin\/academy\/\*/);
  assert.match(headers, /frame-ancestors 'none'/);
});
