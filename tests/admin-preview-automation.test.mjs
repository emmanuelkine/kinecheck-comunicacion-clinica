import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/admin-preview-automation.js";

const previewOrigin = "https://cafef00d.kinecheck-comunicacion-clinica.pages.dev";
const request = ({
  origin = previewOrigin,
  authorization = "Bearer synthetic-owner-token",
  body = { operation: "status" },
  url = `${previewOrigin}/api/admin-preview-automation`,
} = {}) => new Request(url, {
  method: "POST",
  headers: {
    Origin: origin,
    Authorization: authorization,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

test("Preview automation proxy is unavailable in production and rejects cross-origin requests", async () => {
  const production = request({ origin: "https://kinecheck.cl", url: "https://kinecheck.cl/api/admin-preview-automation" });
  assert.equal((await onRequestPost({ request: production })).status, 404);
  assert.equal((await onRequestPost({ request: request({ origin: "https://attacker.example" }) })).status, 403);
});

test("Preview automation proxy requires a bearer token and a permitted operation", async () => {
  assert.equal((await onRequestPost({ request: request({ authorization: "" }) })).status, 401);
  assert.equal((await onRequestPost({ request: request({ body: { operation: "unknown" } }) })).status, 400);
  assert.equal((await onRequestPost({ request: request({ body: { operation: "control", payload: { action: "delete_everything" } } }) })).status, 400);
});

test("Preview status proves owner authorization before forwarding the bearer token server-side", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/platform-context")) return Response.json({ owner: true });
    return Response.json({ generatedAt: "2026-10-20T00:00:00.000Z", email: "owner@example.test" });
  });

  const response = await onRequestPost({ request: request() });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal((await response.json()).email, "owner@example.test");
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/platform-context$/);
  assert.match(calls[1].url, /\/automation-status$/);
  assert.equal(calls[1].options.headers.Authorization, "Bearer synthetic-owner-token");
  assert.equal(calls[1].options.body, "{}");
});

test("Preview automation proxy never forwards a non-owner request", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    return Response.json({ owner: false });
  });

  const response = await onRequestPost({ request: request() });
  assert.equal(response.status, 403);
  assert.equal(calls, 1);
  assert.equal((await response.json()).message, "Acceso administrativo no autorizado.");
});

test("Preview control forwards only allowlisted administrative actions", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    return String(url).endsWith("/platform-context")
      ? Response.json({ owner: true })
      : Response.json({ ok: true });
  });

  const payload = { action: "support_status", id: "synthetic-id", status: "resolved" };
  const response = await onRequestPost({ request: request({ body: { operation: "control", payload } }) });
  assert.equal(response.status, 200);
  assert.match(calls[1].url, /\/automation-control$/);
  assert.deepEqual(JSON.parse(calls[1].options.body), payload);
});

test("Preview automation proxy converts upstream network failures into explicit JSON errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("synthetic network detail"); });
  const response = await onRequestPost({ request: request() });
  assert.equal(response.status, 502);
  assert.equal((await response.json()).message, "No fue posible contactar el servicio administrativo.");
});
