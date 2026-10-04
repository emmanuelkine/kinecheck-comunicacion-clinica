import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/certificacion-solicitudes.js';
const makeRequest = (token = 'owner-token') => new Request('https://kinecheck.cl/api/certificacion-solicitudes', { headers: token ? { authorization: `Bearer ${token}` } : {} });

test('requiere sesión y rechaza cuentas que no son owner', async () => {
  assert.equal((await onRequestGet({ request: makeRequest(''), env: {} })).status, 401);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ owner: false }), { status: 200 });
  try {
    assert.equal((await onRequestGet({ request: makeRequest(), env: { CERT_REQUESTS: { list: async () => ({ keys: [], list_complete: true }), get: async () => null } } })).status, 403);
  } finally { globalThis.fetch = originalFetch; }
});

test('owner ve los campos necesarios y no el HTML guardado del correo', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ owner: true }), { status: 200 });
  const store = new Map([["cert:1", JSON.stringify({ nombre: "Emilia", email: "emilia@example.org", curso: "KineCheck Clínico", tema: "costos", consulta: "¿Cuál es el valor?", fecha: "2026-10-04T12:00:00.000Z", replyHtml: "<script>secreto</script>", replyText: "contenido no necesario" })]]);
  const env = { CERT_REQUESTS: { list: async () => ({ keys: [{ name: "cert:1" }], list_complete: true }), get: async (key) => store.get(key) } };
  try {
    const response = await onRequestGet({ request: makeRequest(), env });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.total, 1);
    assert.deepEqual(result.requests[0], { nombre: "Emilia", email: "emilia@example.org", curso: "KineCheck Clínico", tema: "Costos", consulta: "¿Cuál es el valor?", fecha: "2026-10-04T12:00:00.000Z" });
    assert.doesNotMatch(JSON.stringify(result), /secreto|contenido no necesario/);
  } finally { globalThis.fetch = originalFetch; }
});
