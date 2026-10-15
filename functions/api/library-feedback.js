const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
};
const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
const SUPABASE_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";
const AREAS = new Set(["contenido", "navegacion", "diseno", "descargas", "nada", "otro"]);
const PAGES = new Set(["/gratis/", "/gratis/pacientes/", "/gratis/profesionales/"]);
const PREFIX = "feedback:v2:";
const LEGACY_PREFIX = "feedback:";
const RETENTION_SECONDS = 90 * 24 * 60 * 60;

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
const trim = (value, max) => String(value ?? "").trim().slice(0, max);

async function isOwner(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return false;
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/platform-context`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, authorization, "content-type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    if (!response.ok) return false;
    return (await response.json()).owner === true;
  } catch {
    return false;
  }
}

function scrubComment(value) {
  return trim(value, 500)
    .replace(/<[^>]*>/g, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[dato omitido]")
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "[enlace omitido]")
    .replace(/\b(?:\+?56\s*)?9\s*\d{4}\s*\d{4}\b/g, "[teléfono omitido]")
    .replace(/\b\d{1,2}\.??\d{3}\.??\d{3}-?[\dkK]\b/g, "[identificador omitido]")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function containsSensitiveHealthDetails(value) {
  return /\b(mi diagnóstico es|me diagnosticaron|tengo (?:cáncer|diabetes|fibromialgia|depresión|ansiedad|una hernia)|mi ficha clínica|mi tratamiento médico|mi número de ficha)\b/i.test(value);
}

async function readRecords(store) {
  let cursor;
  const rows = [];
  for (let page = 0; page < 10; page += 1) {
    const result = await store.list({ prefix: LEGACY_PREFIX, limit: 1000, ...(cursor ? { cursor } : {}) });
    const values = await Promise.all((result.keys || []).map(async ({ name }) => ({ key: name, value: await store.get(name, "json") })));
    for (const { key, value } of values) {
      if (!value || typeof value !== "object" || !Number.isInteger(Number(value.rating)) || Number(value.rating) < 1 || Number(value.rating) > 5 || !PAGES.has(value.page)) continue;
      rows.push({ ...value, rating: Number(value.rating), area: AREAS.has(value.area) ? value.area : "otro", comment: scrubComment(value.comment), status: value.status === "approved" || value.status === "rejected" ? value.status : "pending", key });
    }
    if (result.list_complete || !result.cursor) break;
    cursor = result.cursor;
  }
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return rows.filter((row) => Date.parse(row.createdAt) >= cutoff);
}

function summarize(records) {
  const approved = records.filter((record) => record.status === "approved");
  const distribution = [1, 2, 3, 4, 5].map((score) => approved.filter((record) => record.rating === score).length);
  const count = approved.length;
  return {
    count,
    average: count ? Math.round(approved.reduce((sum, record) => sum + record.rating, 0) / count * 100) / 100 : null,
    distribution,
    comments: approved.filter((record) => record.comment).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12).map(({ rating, comment, createdAt }) => ({ rating, comment, createdAt })),
    periodDays: 30,
  };
}

export async function onRequestPost({ request, env }) {
  if (!env.CERT_REQUESTS?.put) return json({ message: "Encuesta temporalmente no disponible." }, 503);
  if (Number(request.headers.get("content-length") || 0) > 4096) return json({ message: "Solicitud demasiado extensa." }, 413);
  let input;
  try { input = await request.json(); } catch { return json({ message: "Datos incorrectos." }, 400); }
  if (JSON.stringify(input).length > 4096) return json({ message: "Solicitud demasiado extensa." }, 413);
  if (!input || typeof input !== "object" || Array.isArray(input)) return json({ message: "Datos incorrectos." }, 400);
  if (input.website) return json({ ok: true }, 201);
  if (request.method !== "POST") return json({ message: "Método no permitido." }, 405, { allow: "GET, POST, PUT, OPTIONS" });

  const rating = Number(input.rating);
  const area = trim(input.area, 30);
  const page = trim(input.page, 120);
  const rawComment = String(input.comment || "");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !AREAS.has(area) || !PAGES.has(page) || rawComment.length > 500) {
    return json({ message: "Revisa la valoración y vuelve a intentarlo." }, 400);
  }
  const cookies = request.headers.get("cookie") || "";
  if (/(?:^|;\s*)kc_feedback_submitted=1(?:;|$)/.test(cookies)) {
    return json({ message: "Ya registramos una opinión desde este navegador." }, 429);
  }
  const comment = scrubComment(rawComment);
  if (containsSensitiveHealthDetails(rawComment)) {
    return json({ message: "Por privacidad, elimina los datos clínicos y envía nuevamente tu opinión." }, 400);
  }

  const createdAt = new Date().toISOString();
  const record = {
    rating,
    area,
    page,
    comment,
    status: "pending",
    createdAt,
  };
  try {
    await env.CERT_REQUESTS.put(`${PREFIX}${createdAt}:${crypto.randomUUID()}`, JSON.stringify(record), { expirationTtl: RETENTION_SECONDS });
    return json({ ok: true, moderated: true }, 201, {
      "set-cookie": "kc_feedback_submitted=1; Path=/gratis/; Max-Age=2592000; Secure; SameSite=Lax; HttpOnly",
    });
  } catch {
    return json({ message: "No se pudo guardar. Inténtalo más tarde." }, 503);
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.CERT_REQUESTS?.list || !env.CERT_REQUESTS?.get) return json({ message: "Valoraciones no disponibles." }, 503);
  try {
    const records = await readRecords(env.CERT_REQUESTS);
    const url = new URL(request.url);
    if (url.searchParams.get("admin") === "1") {
      if (!(await isOwner(request))) return json({ message: "Acceso restringido." }, 403);
      const visible = records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return json({ ...summarize(records), pending: visible.filter((row) => row.status === "pending").slice(0, 400), recent: visible.filter((row) => row.status !== "pending").slice(0, 100) });
    }
    return json(summarize(records), 200, { "cache-control": "public, max-age=60, stale-while-revalidate=300" });
  } catch {
    return json({ message: "No se pudieron consultar las valoraciones." }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  if (!(await isOwner(request))) return json({ message: "Acceso restringido." }, 403);
  if (!env.CERT_REQUESTS?.get || !env.CERT_REQUESTS?.put) return json({ message: "Moderación no disponible." }, 503);
  let input;
  try { input = await request.json(); } catch { return json({ message: "Datos incorrectos." }, 400); }
  const key = String(input.key || "");
  const decision = String(input.decision || "");
  if (!key.startsWith(LEGACY_PREFIX) || !["approved", "rejected"].includes(decision)) return json({ message: "Acción inválida." }, 400);
  try {
    const raw = await env.CERT_REQUESTS.get(key, "json");
    if (!raw || raw.status !== "pending") return json({ message: "La opinión ya fue moderada o no existe." }, 404);
    if (decision === "approved" && containsSensitiveHealthDetails(raw.comment)) return json({ message: "El comentario contiene información de salud; recházalo para no publicarlo." }, 400);
    const updated = { rating: Number(raw.rating), area: AREAS.has(raw.area) ? raw.area : "otro", page: raw.page, comment: scrubComment(raw.comment), status: decision, createdAt: raw.createdAt, moderatedAt: new Date().toISOString() };
    const remainingTtl = Math.max(1, Math.ceil((Date.parse(raw.createdAt) + RETENTION_SECONDS * 1000 - Date.now()) / 1000));
    await env.CERT_REQUESTS.put(key, JSON.stringify(updated), { expirationTtl: remainingTtl });
    return json({ ok: true, status: decision });
  } catch {
    return json({ message: "No se pudo actualizar la moderación." }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...JSON_HEADERS, allow: "GET, POST, PUT, OPTIONS" } });
}
