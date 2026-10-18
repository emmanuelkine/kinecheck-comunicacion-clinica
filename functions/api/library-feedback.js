const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
};
const PAGES = new Set(["/gratis/", "/gratis/pacientes/", "/gratis/profesionales/"]);
const PREFIX = "feedback:v2:";
const LEGACY_PREFIX = "feedback:";
const RETENTION_SECONDS = 90 * 24 * 60 * 60;
const MAX_BYTES = 4096;
const RATE_LIMIT = 5;

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
const trim = (value, max) => String(value ?? "").trim().slice(0, max);
const feedbackStore = (env) => env.LIBRARY_FEEDBACK;
const sameOrigin = (request) => request.headers.get("origin") === new URL(request.url).origin
  && !["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site"));

class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

async function readInput(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) throw new InputError("Formato no permitido.", 415);
  if (Number(request.headers.get("content-length") || 0) > MAX_BYTES) throw new InputError("Solicitud demasiado extensa.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Datos incorrectos.");
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BYTES) { await reader.cancel(); throw new InputError("Solicitud demasiado extensa.", 413); }
    chunks.push(value);
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  let input;
  try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer)); } catch { throw new InputError("Datos incorrectos."); }
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new InputError("Datos incorrectos.");
  return input;
}

async function applyRateLimit(request, env, store) {
  const ip = request.headers.get("cf-connecting-ip");
  const secret = env.FEEDBACK_RATE_LIMIT_SECRET;
  if (!ip || typeof secret !== "string" || secret.length < 32) throw new InputError("Encuesta temporalmente no disponible.", 503);
  const hour = Math.floor(Date.now() / 3600000);
  const encoder = new TextEncoder();
  const hmac = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", hmac, encoder.encode(`${hour}:${ip}`)));
  const key = `rate:${hour}:${Array.from(digest, (n) => n.toString(16).padStart(2, "0")).join("")}`;
  const used = Number(await store.get(key)) || 0;
  if (used >= RATE_LIMIT) throw new InputError("Demasiados envíos. Inténtalo más tarde.", 429);
  await store.put(key, String(used + 1), { expirationTtl: 3700 });
}

function validRecord(value) {
  return value && typeof value === "object" && Number.isInteger(value.rating)
    && value.rating >= 1 && value.rating <= 5 && PAGES.has(value.page)
    && Number.isFinite(Date.parse(value.createdAt)) && Date.parse(value.createdAt) <= Date.now();
}

async function readRecords(store) {
  let cursor;
  const rows = [];
  do {
    const result = await store.list({ prefix: LEGACY_PREFIX, limit: 1000, ...(cursor ? { cursor } : {}) });
    for (let start = 0; start < (result.keys || []).length; start += 16) {
      const values = await Promise.all(result.keys.slice(start, start + 16).map(async ({ name }) => ({
        value: await store.get(name, "json"),
      })));
      for (const { value } of values) {
        if (!validRecord(value)) continue;
        rows.push({
          rating: value.rating,
          createdAt: value.createdAt,
          status: value.status === "approved" || value.status === "rejected" ? value.status : "pending",
        });
      }
    }
    if (result.list_complete || !result.cursor) break;
    cursor = result.cursor;
  } while (cursor);
  const cutoff = Date.now() - RETENTION_SECONDS * 1000;
  return rows.filter((row) => Date.parse(row.createdAt) >= cutoff);
}

function summarize(records) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const approved = records.filter((record) => record.status === "approved" && Date.parse(record.createdAt) >= cutoff);
  const distribution = [1, 2, 3, 4, 5].map((score) => approved.filter((record) => record.rating === score).length);
  const count = approved.length;
  return {
    count,
    average: count ? Math.round(approved.reduce((sum, record) => sum + record.rating, 0) / count * 100) / 100 : null,
    distribution,
    periodDays: 30,
  };
}

export async function onRequestPost({ request, env }) {
  if (request.method !== "POST") return json({ message: "Método no permitido." }, 405, { allow: "GET, POST, OPTIONS" });
  if (!sameOrigin(request)) return json({ message: "Origen no permitido." }, 403);
  const store = feedbackStore(env);
  if (!store?.put || !store?.get) return json({ message: "Encuesta temporalmente no disponible." }, 503);
  let input;
  try { input = await readInput(request); } catch (error) { return json({ message: error.message }, error.status || 400); }
  if (input.website) return json({ ok: true }, 201);
  const rating = ["number", "string"].includes(typeof input.rating) ? Number(input.rating) : NaN;
  const page = trim(input.page, 120);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !PAGES.has(page)) {
    return json({ message: "Selecciona una puntuación de 1 a 5 estrellas." }, 400);
  }
  if (/(?:^|;\s*)kc_feedback_submitted=1(?:;|$)/.test(request.headers.get("cookie") || "")) {
    return json({ message: "Ya registramos una puntuación desde este navegador." }, 429);
  }
  const createdAt = new Date().toISOString();
  try {
    await applyRateLimit(request, env, store);
    await store.put(`${PREFIX}${createdAt}:${crypto.randomUUID()}`, JSON.stringify({ rating, page, status: "approved", createdAt }), { expirationTtl: RETENTION_SECONDS });
    return json({ ok: true }, 201, {
      "set-cookie": "kc_feedback_submitted=1; Path=/api/library-feedback; Max-Age=2592000; Secure; SameSite=Strict; HttpOnly",
    });
  } catch (error) {
    return json({ message: error instanceof InputError ? error.message : "No se pudo guardar. Inténtalo más tarde." }, error.status || 503, error.status === 429 ? { "retry-after": "3600" } : {});
  }
}

export async function onRequestGet({ request, env }) {
  if (request.method !== "GET") return json({ message: "Método no permitido." }, 405, { allow: "GET, POST, OPTIONS" });
  const store = feedbackStore(env);
  if (!store?.list || !store?.get) return json({ message: "Valoraciones no disponibles." }, 503);
  try {
    return json(summarize(await readRecords(store)));
  } catch {
    return json({ message: "No se pudieron consultar las valoraciones." }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...JSON_HEADERS, allow: "GET, POST, OPTIONS" } });
}
