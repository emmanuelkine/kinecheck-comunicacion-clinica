import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/admin-preview-login.js";

const previewOrigin = "https://cafef00d.kinecheck-comunicacion-clinica.pages.dev";
const request = (origin = previewOrigin, body = { email: "owner@example.test", password: "synthetic-secret" }) => new Request(`${previewOrigin}/api/admin-preview-login`, {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

test("preview login is unavailable outside Preview and rejects cross-origin posts", async () => {
  const production = new Request("https://kinecheck.cl/api/admin-preview-login", {
    method: "POST",
    headers: { Origin: "https://kinecheck.cl", "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal((await onRequestPost({ request: production })).status, 404);
  assert.equal((await onRequestPost({ request: request("https://attacker.example") })).status, 403);
});

test("preview login rejects malformed or oversized credentials", async () => {
  assert.equal((await onRequestPost({ request: request(previewOrigin, { email: "", password: "" }) })).status, 400);
  assert.equal((await onRequestPost({ request: request(previewOrigin, { email: "owner@example.test", password: "x".repeat(1025) }) })).status, 400);
});

test("preview login returns a session only after owner verification", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/auth/v1/token")) {
      return Response.json({ access_token: "synthetic-owner-token", refresh_token: "synthetic-refresh" });
    }
    return Response.json({ owner: true });
  });

  const response = await onRequestPost({ request: request() });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal((await response.json()).access_token, "synthetic-owner-token");
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/auth\/v1\/token\?grant_type=password$/);
  assert.equal(JSON.parse(calls[0].options.body).email, "owner@example.test");
  assert.equal(calls[1].options.headers.Authorization, "Bearer synthetic-owner-token");
});

test("preview login does not return a session to a non-owner", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => String(url).includes("/auth/v1/token")
    ? Response.json({ access_token: "synthetic-non-owner-token" })
    : Response.json({ owner: false }));

  const response = await onRequestPost({ request: request() });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).message, "Esta cuenta no tiene acceso de propietario.");
});

test("preview login hides upstream auth details and handles outages", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ message: "upstream detail" }, { status: 400 }));
  const denied = await onRequestPost({ request: request() });
  assert.equal(denied.status, 401);
  assert.equal((await denied.json()).message, "Correo o contraseña incorrectos.");

  globalThis.fetch.mock.mockImplementation(async () => { throw new Error("network detail"); });
  const unavailable = await onRequestPost({ request: request() });
  assert.equal(unavailable.status, 502);
  assert.equal((await unavailable.json()).message, "No fue posible contactar el servicio de acceso.");
});
