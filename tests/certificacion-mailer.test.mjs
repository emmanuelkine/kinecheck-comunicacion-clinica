import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/certificacion.js';
import mailer from '../workers/certificacion-mailer/src/index.js';

const form = (overrides = {}) => new Request('https://kinecheck.cl/api/certificacion', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ nombre: 'Prueba <Nombre>', email: 'prueba@example.org', curso: 'Ruta profesional KineCheck', consentimiento: 'on', ...overrides }),
});

test('formulario → Pages Function → Worker → Email Service confirma el envío', async () => {
  const messages = [];
  const env = {
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
