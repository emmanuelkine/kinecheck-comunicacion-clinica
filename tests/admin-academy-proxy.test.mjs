import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestPost } from '../functions/api/admin-academy-review.js';

const preview = 'https://academy-panel.kinecheck-comunicacion-clinica.pages.dev/api/admin-academy-review';
const request = ({ origin = 'https://academy-panel.kinecheck-comunicacion-clinica.pages.dev', token = 'token', body = { operation: 'bootstrap' } } = {}) => new Request(preview, {
  method: 'POST',
  headers: {
    Origin: origin,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

test('Academy preview proxy is unavailable on production and rejects cross-origin calls', async () => {
  const production = new Request('https://kinecheck.cl/api/admin-academy-review', {
    method: 'POST', headers: { Origin: 'https://kinecheck.cl', Authorization: 'Bearer token', 'Content-Type': 'application/json' }, body: '{"operation":"bootstrap"}',
  });
  assert.equal((await onRequestPost({ request: production })).status, 404);
  assert.equal((await onRequestPost({ request: request({ origin: 'https://evil.example' }) })).status, 403);
  assert.equal((await onRequestPost({ request: request({ token: '' }) })).status, 401);
  assert.equal((await onRequestPost({ request: request({ body: { operation: 'activate_certificates' } }) })).status, 400);
});

test('Academy preview proxy verifies owner and forwards the existing bearer session', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/platform-context')) return Response.json({ owner: true });
    return new Response('course,decision\r\nExample,pending\r\n', {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="kinecheck-academy-pairs.csv"' },
    });
  };
  const response = await onRequestPost({ request: request({ body: { operation: 'export', kind: 'pairs.csv' } }) });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /platform-context$/);
  assert.match(calls[1].url, /academy-admin-review$/);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer token');
  assert.equal(calls[1].options.headers.Origin, 'https://academy-panel.kinecheck-comunicacion-clinica.pages.dev');
  assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="kinecheck-academy-pairs.csv"');
  assert.match(await response.text(), /Example,pending/);
});

test('Academy preview proxy fails closed when platform-context does not prove ownership', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({ owner: false });
  assert.equal((await onRequestPost({ request: request() })).status, 403);
});
