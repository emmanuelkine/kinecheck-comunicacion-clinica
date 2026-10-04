import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/certificacion.js';
import mailer from '../workers/certificacion-mailer/src/index.js';

const form = (overrides = {}) => new Request('https://kinecheck.cl/api/certificacion', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ nombre: 'Prueba <Nombre>', email: 'prueba@example.org', curso: 'Ruta profesional KineCheck', consentimiento: 'on', tema: 'costos', consulta: '¿Cuánto cuesta?', ...overrides }),
});

test('formulario → Pages Function → Worker → Email Service confirma el envío', async () => {
  const messages = [];
  const stored = [];
  const env = {
    CERT_REQUESTS: { put: async (key, value, options) => stored.push({ key, value: JSON.parse(value), options }) },
    CERT_EMAIL_SERVICE: {
      fetch: (url, options) => mailer.fetch(new Request(url, options), {
        EMAIL: { send: async (message) => { messages.push(message); return { messageId: 'test-message-1' }; } },
      }),
    },
  };
  const response = await onRequestPost({ request: form(), env });
  assert.equal(response.status, 200);
  assert.match((await response.json()).message, /enviamos/);
  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0].from, { email: 'certificacion@kinecheck.cl', name: 'KineCheck' });
  assert.equal(messages[0].to, 'prueba@example.org');
  assert.match(messages[0].html, /Prueba &lt;Nombre&gt;/);
  assert.match(messages[0].text, /Los recursos gratuitos de KineCheck no incluyen certificación/);
  assert.doesNotMatch(messages[0].text, /\b[0-9]+ horas\b/);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].value.tema, 'costos');
  assert.equal(stored[0].value.consulta, '¿Cuánto cuesta?');
  assert.equal(stored[0].options.expirationTtl, 7776000);
});

test('no anuncia un envío si el Worker rechaza el mensaje', async () => {
  const response = await onRequestPost({ request: form(), env: {
    CERT_EMAIL_SERVICE: { fetch: async () => new Response('failed', { status: 503 }) },
  } });
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /No pudimos enviar/);
});

test('no anuncia un envío si Email Service no confirma la aceptación', async () => {
  const response = await onRequestPost({ request: form(), env: {
    CERT_EMAIL_SERVICE: {
      fetch: (url, options) => mailer.fetch(new Request(url, options), {
        EMAIL: { send: async () => ({}) },
      }),
    },
  } });
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /No pudimos enviar/);
});

test('no acepta solicitudes sin consentimiento ni anuncia correo sin binding', async () => {
  assert.equal((await onRequestPost({ request: form({ consentimiento: '' }), env: {} })).status, 400);
  const response = await onRequestPost({ request: form(), env: {} });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /no está disponible/);
});

test('Pages Function envía mediante Resend con remitente fijo y confirma el id', async () => {
  const originalFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers.authorization, 'Bearer test-only-key');
    sent = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: 'resend-test-id' }), { status: 200 });
  };
  try {
    const response = await onRequestPost({ request: form(), env: { RESEND_API_KEY: 'test-only-key' } });
    assert.equal(response.status, 200);
    assert.deepEqual(sent.to, ['prueba@example.org']);
    assert.equal(sent.from, 'KineCheck <certificacion@kinecheck.cl>');
    assert.match(sent.html, /Prueba &lt;Nombre&gt;/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('un rechazo de Resend no confirma el envío', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'denied' }), { status: 403 });
  try {
    const response = await onRequestPost({ request: form(), env: { RESEND_API_KEY: 'test-only-key' } });
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /No pudimos enviar/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
