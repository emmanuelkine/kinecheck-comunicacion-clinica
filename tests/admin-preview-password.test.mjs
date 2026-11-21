import assert from "node:assert/strict";
import test from "node:test";
import { onRequestPost } from "../functions/api/admin-preview-password.js";

const origin = "https://codex-academy-admin-release.kinecheck-comunicacion-clinica.pages.dev";
const strongPassword = "Staging-Only!2026";
const request = ({
  url = `${origin}/api/admin-preview-password`,
  requestOrigin = origin,
  token = "recovery-token",
  password = strongPassword,
} = {}) => new Request(url, {
  method: "POST",
  headers: {
    Origin: requestOrigin,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ password }),
});

test("password recovery endpoint is Preview-only, same-origin and token-bound", async () => {
  assert.equal((await onRequestPost({ request: request({ url: "https://kinecheck.cl/api/admin-preview-password", requestOrigin: "https://kinecheck.cl" }) })).status, 404);
  assert.equal((await onRequestPost({ request: request({ requestOrigin: "https://evil.example" }) })).status, 403);
  assert.equal((await onRequestPost({ request: request({ token: "" }) })).status, 401);
});

test("password recovery rejects weak passwords before contacting Supabase", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("must not run"); });
  const response = await onRequestPost({ request: request({ password: "weak-password" }) });
  assert.equal(response.status, 400);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("password recovery refuses a valid token belonging to a non-owner", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    return Response.json({ email: "other@example.test" });
  });
  const response = await onRequestPost({ request: request() });
  assert.equal(response.status, 403);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/auth\/v1\/user$/);
  assert.equal(calls[0].options.method, "GET");
});

test("password recovery updates only the staging owner, proves the new password and opens an owner session", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    if (options.method === "GET") return Response.json({ email: "emmanuelkine@gmail.com" });
    if (String(url).includes("/academy-admin-review")) return Response.json({ owner: true, otec: { status: "BLOQUEADA", certificatesEnabled: false } });
    if (String(url).includes("/auth/v1/token")) return Response.json({ access_token: "updated-password-session", token_type: "bearer" });
    return Response.json({ email: "emmanuelkine@gmail.com" });
  });
  const response = await onRequestPost({ request: request() });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    owner: true,
    academy: true,
    project: "staging",
    session: { access_token: "updated-password-session", token_type: "bearer" },
    otec: "BLOQUEADA",
    certificatesEnabled: false,
  });
  assert.equal(response.headers.get("X-KineCheck-Auth-Project"), "staging");
  assert.equal(calls.length, 5);
  assert.ok(calls.every((call) => call.url.startsWith("https://mhnqtyvwxytppekktvxb.supabase.co/")));
  assert.deepEqual(JSON.parse(calls[1].options.body), { operation: "authorization_probe" });
  assert.equal(JSON.parse(calls[2].options.body).password, strongPassword);
  assert.deepEqual(JSON.parse(calls[3].options.body), { email: "emmanuelkine@gmail.com", password: strongPassword });
  assert.deepEqual(JSON.parse(calls[4].options.body), { operation: "authorization_probe" });
  assert.equal(calls[0].options.headers.Authorization, "Bearer recovery-token");
  assert.equal(calls[1].options.headers.Authorization, "Bearer recovery-token");
  assert.equal(calls[4].options.headers.Authorization, "Bearer updated-password-session");
});

test("password recovery does not report success when the updated password cannot authenticate", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (options.method === "GET") return Response.json({ email: "emmanuelkine@gmail.com" });
    if (String(url).includes("/academy-admin-review")) return Response.json({ owner: true, otec: { status: "BLOQUEADA", certificatesEnabled: false } });
    if (String(url).includes("/auth/v1/token")) return Response.json({ error: "invalid_credentials" }, { status: 400 });
    return Response.json({ email: "emmanuelkine@gmail.com" });
  });
  const response = await onRequestPost({ request: request() });
  assert.equal(response.status, 502);
  assert.match((await response.json()).message, /no pudo validar el nuevo acceso/);
});

test("password recovery fails closed when Academy authorization is not proven", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    if (options.method === "GET") return Response.json({ email: "emmanuelkine@gmail.com" });
    return Response.json({ owner: false }, { status: 403 });
  });
  const response = await onRequestPost({ request: request() });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).message, "La cuenta no tiene autorización activa para Academy.");
});
