import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, onRequestPost, onRequestPut } from '../functions/api/library-feedback.js';

function makeStore() {
  const records = new Map();
  return {
    records,
    async put(key, value) { records.set(key, value); },
    async get(key, type) { const value = records.get(key); return value === undefined ? null : type === 'json' ? JSON.parse(value) : value; },
    async list({ prefix }) { return { keys: [...records.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; },
  };
}
const request = (url, { method = 'GET', body, headers = {} } = {}) => new Request(`https://kinecheck.test${url}`, { method, headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
const context = (req, store) => ({ request: req, env: { CERT_REQUESTS: store } });

test('library feedback validates input, stores anonymous pending records, moderates, and publishes only approved data', async () => {
  const store = makeStore();
  const bad = await onRequestPost(context(request('/api/library-feedback', { method: 'POST', body: { rating: 6, area: 'nada', page: '/gratis/', comment: '' } }), store));
  assert.equal(bad.status, 400);
  assert.equal(store.records.size, 0);

  const submitted = await onRequestPost(context(request('/api/library-feedback', { method: 'POST', body: { rating: 5, area: 'contenido', page: '/gratis/', comment: 'Buen recurso. Contacto emma@example.cl, +56 9 1234 5678' } }), store));
  assert.equal(submitted.status, 201);
  assert.match(submitted.headers.get('set-cookie'), /HttpOnly/);
  const key = [...store.records.keys()][0];
  const saved = JSON.parse(store.records.get(key));
  assert.equal(saved.status, 'pending');
  assert.doesNotMatch(saved.comment, /emma@example\.cl|\+56 9 1234 5678/);
  assert.equal(Object.hasOwn(saved, 'name'), false);
  assert.equal(Object.hasOwn(saved, 'email'), false);
  assert.equal(Object.hasOwn(saved, 'ip'), false);

  const publicBefore = await onRequestGet(context(request('/api/library-feedback'), store));
  assert.deepEqual(await publicBefore.json(), { count: 0, average: null, distribution: [0, 0, 0, 0, 0], comments: [], periodDays: 30 });

  const noAuth = await onRequestGet(context(request('/api/library-feedback?admin=1'), store));
  assert.equal(noAuth.status, 403);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ owner: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    const adminResponse = await onRequestGet(context(request('/api/library-feedback?admin=1', { headers: { authorization: 'Bearer owner-token' } }), store));
    const admin = await adminResponse.json();
    assert.equal(admin.pending.length, 1);
    assert.equal(admin.pending[0].key, key);

    const approved = await onRequestPut(context(request('/api/library-feedback', { method: 'PUT', headers: { authorization: 'Bearer owner-token' }, body: { key, decision: 'approved' } }), store));
    assert.equal(approved.status, 200);
    const publicAfter = await onRequestGet(context(request('/api/library-feedback'), store));
    const publicSummary = await publicAfter.json();
    assert.equal(publicSummary.count, 1);
    assert.equal(publicSummary.average, 5);
    assert.deepEqual(publicSummary.distribution, [0, 0, 0, 0, 1]);
    assert.equal(publicSummary.comments[0].comment.includes('<script>'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('library feedback honeypot, duplicate cookie, and health detail protections work', async () => {
  const store = makeStore();
  const spam = await onRequestPost(context(request('/api/library-feedback', { method: 'POST', body: { website: 'filled', rating: 5, area: 'nada', page: '/gratis/' } }), store));
  assert.equal(spam.status, 201);
  assert.equal(store.records.size, 0);
  const sensitive = await onRequestPost(context(request('/api/library-feedback', { method: 'POST', body: { rating: 4, area: 'otro', page: '/gratis/', comment: 'Me diagnosticaron fibromialgia en la Clínica Central.' } }), store));
  assert.equal(sensitive.status, 400);
  const first = await onRequestPost(context(request('/api/library-feedback', { method: 'POST', body: { rating: 4, area: 'nada', page: '/gratis/', comment: '' } }), store));
  assert.equal(first.status, 201);
  const duplicate = await onRequestPost(context(request('/api/library-feedback', { method: 'POST', headers: { cookie: 'kc_feedback_submitted=1' }, body: { rating: 4, area: 'nada', page: '/gratis/', comment: '' } }), store));
  assert.equal(duplicate.status, 429);
  assert.equal(store.records.size, 1);
});
