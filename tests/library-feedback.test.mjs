import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, onRequestPost } from '../functions/api/library-feedback.js';

function makeStore() {
  const records = new Map();
  return {
    records,
    async put(key, value, options = {}) {
      if (options.expirationTtl && options.expirationTtl < 60) throw new Error("KV TTL minimum is 60 seconds");
      records.set(key, value);
    },
    async get(key, type) {
      const value = records.get(key);
      return value === undefined ? null : type === 'json' ? JSON.parse(value) : value;
    },
    async list({ prefix }) {
      return { keys: [...records.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })), list_complete: true };
    },
  };
}
const request = (url, { method = 'GET', body, headers = {} } = {}) => new Request(`https://kinecheck.test${url}`, {
  method,
  headers: { origin: 'https://kinecheck.test', 'cf-connecting-ip': '198.51.100.7', ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const context = (req, store, secret = 'synthetic-local-secret-000000000000000000000000') => ({
  request: req,
  env: { LIBRARY_FEEDBACK: store, FEEDBACK_RATE_LIMIT_SECRET: secret },
});
const post = (store, body, headers) => onRequestPost(context(request('/api/library-feedback', { method: 'POST', body, headers }), store));

test('accepts real 1–5 star scores and publishes their average and distribution', async () => {
  const store = makeStore();
  for (let rating = 1; rating <= 5; rating++) {
    const response = await post(store, { rating, page: '/gratis/' });
    assert.equal(response.status, 201);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/);
    assert.match(response.headers.get('set-cookie'), /Path=\/api\/library-feedback;/);
    const publicSummary = await (await onRequestGet(context(request('/api/library-feedback'), store))).json();
    assert.equal(publicSummary.count, rating);
    assert.equal(publicSummary.average, (rating + 1) / 2);
  }
  const summary = await (await onRequestGet(context(request('/api/library-feedback'), store))).json();
  assert.equal(summary.count, 5);
  assert.equal(summary.average, 3);
  assert.deepEqual(summary.distribution, [1, 1, 1, 1, 1]);
  assert.equal(summary.periodDays, 30);
  assert.equal(Object.hasOwn(summary, 'comments'), false);
  for (const [key, value] of store.records) {
    if (!key.startsWith('feedback:')) continue;
    const record = JSON.parse(value);
    assert.equal(record.status, 'approved');
    assert.deepEqual(Object.keys(record).sort(), ['createdAt', 'page', 'rating', 'status']);
  }
});

test('rejects invalid ratings, pages, malformed JSON, and cross-origin submissions', async () => {
  const store = makeStore();
  for (const rating of [true, false, null, [], {}, '', 0, 6, 1.5, 'NaN']) {
    assert.equal((await post(store, { rating, page: '/gratis/' })).status, 400);
  }
  assert.equal((await post(store, { rating: 5, page: '/admin/' })).status, 400);
  assert.equal((await post(store, { rating: 5, page: '/gratis/', website: 'spam' })).status, 201);
  assert.equal(store.records.size, 0);
  assert.equal((await post(store, { rating: 5, page: '/gratis/' }, { origin: 'https://external.test' })).status, 403);
  assert.equal((await post(store, { rating: 5, page: '/gratis/' }, { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await post(store, { rating: 5, page: '/gratis/' }, { 'content-type': 'text/plain' })).status, 415);
  const malformed = new Request('https://kinecheck.test/api/library-feedback', {
    method: 'POST', headers: { origin: 'https://kinecheck.test', 'content-type': 'application/json' }, body: '{',
  });
  assert.equal((await onRequestPost(context(malformed, store))).status, 400);
  assert.equal(store.records.size, 0);
});

test('stores no comments or identifiers and ignores legacy form fields', async () => {
  const store = makeStore();
  const response = await post(store, {
    rating: 4,
    page: '/gratis/',
    comment: 'Texto libre con persona@example.test y datos de salud',
    area: 'contenido',
    name: 'Persona sintética',
    email: 'persona@example.test',
  });
  assert.equal(response.status, 201);
  const saved = JSON.parse([...store.records.values()].find((x) => JSON.parse(x).rating === 4));
  assert.deepEqual(Object.keys(saved).sort(), ['createdAt', 'page', 'rating', 'status']);
  const publicData = JSON.stringify(await (await onRequestGet(context(request('/api/library-feedback'), store))).json());
  assert.doesNotMatch(publicData, /persona@example|Texto libre|salud|Persona sintética/);
});

test('duplicate cookie and network rate limit prevent repeated submissions', async () => {
  const store = makeStore();
  assert.equal((await post(store, { rating: 4, page: '/gratis/' })).status, 201);
  assert.equal((await post(store, { rating: 4, page: '/gratis/' }, { cookie: 'kc_feedback_submitted=1' })).status, 429);
  for (let rating = 1; rating <= 4; rating++) assert.equal((await post(store, { rating, page: '/gratis/pacientes/' })).status, 201);
  const blocked = await post(store, { rating: 5, page: '/gratis/profesionales/' });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('retry-after'), '3600');
  assert.equal([...store.records.keys()].filter((key) => key.startsWith('feedback:')).length, 5);
  assert.doesNotMatch(JSON.stringify([...store.records]), /198\.51\.100\.7/);
});

test('fails closed without the dedicated library KV or rate-limit secret', async () => {
  const unrelated = makeStore();
  const req = () => request('/api/library-feedback', { method: 'POST', body: { rating: 5, page: '/gratis/' } });
  assert.equal((await onRequestPost({ request: req(), env: { CERT_REQUESTS: unrelated } })).status, 503);
  assert.equal((await onRequestGet(context(request('/api/library-feedback'), unrelated))).status, 200);
  assert.equal((await onRequestPost(context(req(), unrelated, 'short-secret'))).status, 503);
  assert.equal(unrelated.records.size, 0);
  const broken = { get: async () => { throw new Error('unavailable'); }, put: async () => { throw new Error('unavailable'); }, list: async () => { throw new Error('unavailable'); } };
  assert.equal((await post(broken, { rating: 3, page: '/gratis/' })).status, 503);
  assert.equal((await onRequestGet(context(request('/api/library-feedback'), broken))).status, 500);
});

test('preserves authentic historical approved ratings and excludes pending or expired records', async () => {
  const store = makeStore();
  const oldApproved = JSON.stringify({ rating: 5, page: '/gratis/', area: 'otro', comment: 'Opinión auténtica antigua', status: 'approved', createdAt: new Date(Date.now() - 86400000).toISOString(), email: 'historic@example.test' });
  const pending = JSON.stringify({ rating: 1, page: '/gratis/', status: 'pending', createdAt: new Date().toISOString() });
  const expired = JSON.stringify({ rating: 2, page: '/gratis/', status: 'approved', createdAt: new Date(Date.now() - 100 * 86400000).toISOString() });
  store.records.set('feedback:historic-authentic', oldApproved);
  store.records.set('feedback:legacy-pending', pending);
  store.records.set('feedback:expired', expired);
  const before = new Map(store.records);
  const summary = await (await onRequestGet(context(request('/api/library-feedback'), store))).json();
  assert.equal(summary.count, 1);
  assert.equal(summary.average, 5);
  assert.deepEqual(summary.distribution, [0, 0, 0, 0, 1]);
  assert.deepEqual(store.records, before);
  assert.equal(JSON.parse(store.records.get('feedback:historic-authentic')).comment, 'Opinión auténtica antigua');
  assert.doesNotMatch(JSON.stringify(summary), /historic@example|Opinión auténtica antigua/);
});

test('paginates every feedback record and counts only valid approved scores from 30 days', async () => {
  const store = makeStore();
  const now = Date.now();
  for (let n = 0; n < 23; n++) {
    store.records.set(`feedback:legacy-${n}`, JSON.stringify({
      rating: n % 5 + 1,
      page: '/gratis/',
      status: n === 22 ? 'pending' : 'approved',
      name: 'SYNTHETIC NAME',
      createdAt: new Date(now - (n === 21 ? 35 : 1) * 86400000).toISOString(),
    }));
  }
  store.records.set('feedback:invalid', JSON.stringify({ rating: 500, page: '/gratis/', status: 'approved', createdAt: new Date().toISOString() }));
  const names = [...store.records.keys()];
  let listCalls = 0;
  store.list = async ({ cursor }) => {
    listCalls++;
    const offset = Number(cursor || 0);
    return { keys: names.slice(offset, offset + 2).map((name) => ({ name })), list_complete: offset + 2 >= names.length, cursor: String(offset + 2) };
  };
  const summary = await (await onRequestGet(context(request('/api/library-feedback'), store))).json();
  assert.equal(summary.count, 21);
  assert.ok(listCalls > 10);
  assert.equal(summary.distribution.reduce((a, b) => a + b), summary.count);
  assert.doesNotMatch(JSON.stringify(summary), /SYNTHETIC NAME|key|status/);
});
