import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, onRequestPost, onRequestPut } from '../functions/api/library-feedback.js';

function makeStore() {
  const records = new Map();
  return {
    records,
    async put(key, value, options = {}) {
      if (options.expirationTtl && options.expirationTtl < 60) throw new Error("KV TTL minimum is 60 seconds");
      records.set(key, value);
    },
    async get(key, type) { const value = records.get(key); return value === undefined ? null : type === 'json' ? JSON.parse(value) : value; },
    async list({ prefix }) { return { keys: [...records.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; },
  };
}
const request = (url, { method = 'GET', body, headers = {} } = {}) => new Request(`https://kinecheck.test${url}`, { method, headers: { origin: 'https://kinecheck.test', 'cf-connecting-ip': '198.51.100.7', ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
const context = (req, store) => ({ request: req, env: { CERT_REQUESTS: store, FEEDBACK_RATE_LIMIT_SECRET: 'synthetic-local-secret-000000000000000000000000' } });

test('library feedback validates input, stores anonymous pending records, moderates, and publishes only approved data', async () => {
  const store = makeStore();
  const bad = await onRequestPost(context(request('/api/library-feedback', { method: 'POST', body: { rating: 6, area: 'nada', page: '/gratis/', comment: '' } }), store));
  assert.equal(bad.status, 400);
  assert.equal(store.records.size, 0);

  const submitted = await onRequestPost(context(request('/api/library-feedback', { method: 'POST', body: { rating: 5, area: 'contenido', page: '/gratis/', comment: 'Buen recurso. Contacto emma@example.cl, +56 9 1234 5678' } }), store));
  assert.equal(submitted.status, 201);
  assert.match(submitted.headers.get('set-cookie'), /HttpOnly/);
  assert.match(submitted.headers.get('set-cookie'), /Path=\/api\/library-feedback;/);
  const key = [...store.records.keys()].find(key => key.startsWith('feedback:'));
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

    const approved = await onRequestPut(context(request('/api/library-feedback', { method: 'PUT', headers: { authorization: 'Bearer owner-token' }, body: { key, privacyReviewed: true, decision: 'approved' } }), store));
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

const input = (overrides = {}) => ({ rating: 4, area: 'contenido', page: '/gratis/', comment: 'PRUEBA SINTÉTICA LOCAL: texto de verificación.', ...overrides });
const post = (store, body, headers) => onRequestPost(context(request('/api/library-feedback', { method: 'POST', body, headers }), store));
const ownerHeaders = { authorization: 'Bearer synthetic-owner-token' };
async function withOwner(action, owner = true) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ owner });
  try { return await action(); } finally { globalThis.fetch = original; }
}

test('server rejects incorrect types, invalid values, oversized UTF-8 and unexpected origins', async () => {
  const store = makeStore();
  for (const rating of [true, false, null, [], {}, '', 0, 6, 1.5, 'NaN']) assert.equal((await post(store, input({ rating }))).status, 400);
  for (const body of [null, [], 42, input({ page: '/admin/' }), input({ area: {} }), input({ comment: {} }), input({ comment: 'x'.repeat(501) })]) assert.equal((await post(store, body)).status, 400);
  assert.equal((await post(store, input(), { origin: 'https://external.test' })).status, 403);
  assert.equal((await post(store, input(), { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await post(store, input(), { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await post(store, input({ extra: 'é'.repeat(3000) }))).status, 413);
  const malformed = new Request('https://kinecheck.test/api/library-feedback', { method: 'POST', headers: { origin: 'https://kinecheck.test', 'content-type': 'application/json' }, body: '{' });
  assert.equal((await onRequestPost(context(malformed, store))).status, 400);
  assert.equal(store.records.size, 0);
});

test('server network throttle survives cookie removal and stores no raw IP or contact identity', async () => {
  const store = makeStore();
  for (let rating = 1; rating <= 5; rating++) assert.equal((await post(store, input({ rating }))).status, 201);
  const blocked = await post(store, input());
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('retry-after'), '3600');
  assert.equal([...store.records.keys()].filter(key => key.startsWith('feedback:')).length, 5);
  assert.doesNotMatch(JSON.stringify([...store.records]), /198\.51\.100\.7/);
});

test('Preview CERT_REQUESTS and rate secret fail closed without falling back to another KV', async () => {
  const unrelated = makeStore();
  const req = () => request('/api/library-feedback', { method: 'POST', body: input() });
  assert.equal((await onRequestPost({ request: req(), env: {} })).status, 503);
  assert.equal((await onRequestGet({ request: request('/api/library-feedback'), env: {} })).status, 503);
  assert.equal((await onRequestPost({ request: req(), env: { CERT_REQUESTS: unrelated } })).status, 503);
  assert.equal((await onRequestGet({ request: request('/api/library-feedback'), env: { CERT_REQUESTS: unrelated } })).status, 200);
  assert.equal((await onRequestPost({ request: req(), env: { LIBRARY_FEEDBACK: unrelated, FEEDBACK_RATE_LIMIT_SECRET: 'synthetic-local-secret-000000000000000000000000' } })).status, 503);
  assert.equal(unrelated.records.size, 0);
  const broken = { get: async () => { throw new Error('unavailable'); }, put: async () => { throw new Error('unavailable'); }, list: async () => { throw new Error('unavailable'); } };
  assert.equal((await post(broken, input())).status, 503);
  assert.equal((await onRequestGet(context(request('/api/library-feedback'), broken))).status, 500);
});

test('unauthenticated, expired, non-owner and unavailable auth cannot read or moderate', async () => {
  let reads = 0;
  const store = { ...makeStore(), list: async () => { reads++; throw new Error('must not read'); } };
  const noAuth = await onRequestGet(context(request('/api/library-feedback?admin=1'), store));
  assert.equal(noAuth.status, 403);
  await withOwner(async () => {
    assert.equal((await onRequestGet(context(request('/api/library-feedback?admin=1', { headers: ownerHeaders }), store))).status, 403);
    assert.equal((await onRequestPut(context(request('/api/library-feedback', { method: 'PUT', headers: ownerHeaders, body: { key: 'feedback:1', decision: 'approved', privacyReviewed: true } }), store))).status, 403);
  }, false);
  const original = globalThis.fetch;
  try {
    for (const response of [new Response('expired', { status: 401 }), new Response('{}', { status: 503 })]) {
      globalThis.fetch = async () => response;
      assert.equal((await onRequestGet(context(request('/api/library-feedback?admin=1', { headers: ownerHeaders }), store))).status, 403);
    }
    globalThis.fetch = async () => { throw new Error('network failure'); };
    assert.equal((await onRequestGet(context(request('/api/library-feedback?admin=1', { headers: ownerHeaders }), store))).status, 403);
  } finally { globalThis.fetch = original; }
  assert.equal(reads, 0);
});

test('moderation requires privacy review, supports redaction, rejects safely, and preserves all five scores', async () => {
  const store = makeStore();
  for (let rating = 1; rating <= 5; rating++) await post(store, input({ rating, comment: `PRUEBA LOCAL ${rating}: <img src=x onerror=alert(1)> referencia example@example.test, +56 9 1234 5678, 12.345.678-5` }));
  const keys = [...store.records.keys()].filter(key => key.startsWith('feedback:'));
  const moderate = (key, fields) => onRequestPut(context(request('/api/library-feedback', { method: 'PUT', headers: ownerHeaders, body: { key, decision: 'approved', ...fields } }), store));
  await withOwner(async () => {
    assert.equal((await moderate(keys[0], {})).status, 400);
    assert.equal((await moderate(keys[0], { privacyReviewed: true, comment: 'Mi diagnóstico es asma' })).status, 400);
    assert.equal((await moderate('cert:unrelated', { privacyReviewed: true })).status, 400);
    for (const key of keys) assert.equal((await moderate(key, { privacyReviewed: true, comment: 'PRUEBA SINTÉTICA LOCAL: texto anonimizado.' })).status, 200);
    assert.equal((await moderate(keys[0], { privacyReviewed: true })).status, 404);
  });
  const summary = await (await onRequestGet(context(request('/api/library-feedback'), store))).json();
  assert.equal(summary.count, 5);
  assert.equal(summary.average, 3);
  assert.deepEqual(summary.distribution, [1, 1, 1, 1, 1]);
  assert.doesNotMatch(JSON.stringify(summary), /example@|1234|12\.345|<img|key|status/);
  assert.match((await onRequestGet(context(request('/api/library-feedback'), store))).headers.get('cache-control'), /no-store/);
  const rejectedStore = makeStore();
  await post(rejectedStore, input());
  const rejectedKey = [...rejectedStore.records.keys()].find(key => key.startsWith('feedback:'));
  await withOwner(async () => assert.equal((await onRequestPut(context(request('/api/library-feedback', { method: 'PUT', headers: ownerHeaders, body: { key: rejectedKey, decision: 'rejected' } }), rejectedStore))).status, 200));
  assert.equal(JSON.parse(rejectedStore.records.get(rejectedKey)).comment, '');
  assert.equal((await (await onRequestGet(context(request('/api/library-feedback'), rejectedStore))).json()).count, 0);
});

test('sensitive disclosures are rejected before storage, including accents and third-person patients', async () => {
  const store = makeStore();
  for (const comment of ['MI DIAGNÓSTICO: prueba', 'mi hija tiene asma', 'mi paciente tiene dolor', 'Me llamo Persona Ficticia', 'mi dirección es Calle Ficticia']) {
    assert.equal((await post(store, input({ comment }))).status, 400);
  }
  assert.equal(store.records.size, 0);
});

test('pagination, legacy pending records, retention and projection do not leak identity or distort totals', async () => {
  const store = makeStore();
  const now = Date.now();
  for (let n = 0; n < 23; n++) store.records.set(`feedback:legacy-${n}`, JSON.stringify({ ...input({ rating: n % 5 + 1 }), status: n === 22 ? undefined : 'approved', name: 'SYNTHETIC NAME', email: 'synthetic@example.test', createdAt: new Date(now - (n === 22 ? 45 : n === 21 ? 35 : 1) * 86400000).toISOString() }));
  store.records.set('feedback:invalid', JSON.stringify({ ...input(), rating: 500, createdAt: new Date().toISOString(), status: 'approved' }));
  const names = [...store.records.keys()];
  let listCalls = 0;
  store.list = async ({ cursor }) => { listCalls++; const offset = Number(cursor || 0); return { keys: names.slice(offset, offset + 2).map(name => ({ name })), list_complete: offset + 2 >= names.length, cursor: String(offset + 2) }; };
  const summary = await (await onRequestGet(context(request('/api/library-feedback'), store))).json();
  assert.equal(summary.count, 21);
  assert.ok(listCalls > 10);
  assert.equal(summary.distribution.reduce((a, b) => a + b), summary.count);
  await withOwner(async () => {
    const admin = await (await onRequestGet(context(request('/api/library-feedback?admin=1', { headers: ownerHeaders }), store))).json();
    assert.equal(admin.pendingCount, 1);
    assert.doesNotMatch(JSON.stringify(admin), /SYNTHETIC NAME|synthetic@example/);
    assert.equal((await onRequestPut(context(request('/api/library-feedback', { method: 'PUT', headers: ownerHeaders, body: { key: 'feedback:legacy-22', decision: 'approved', privacyReviewed: true } }), store))).status, 200);
  });
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
  assert.equal([...store.records.keys()].filter(key => key.startsWith('feedback:')).length, 1);
});
