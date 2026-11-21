const SUPABASE_URL = "https://mhnqtyvwxytppekktvxb.supabase.co";
const SUPABASE_KEY = "sb_publishable_JLWKq6m0g4yB30iIQLE4bg_AkspSDYD";
const PAGES_PROJECT_HOST = "kinecheck-comunicacion-clinica.pages.dev";
const MAX_BODY_BYTES = 256 * 1024;
const MAX_AUTHORIZATION_BYTES = 8192;
const OPERATIONS = new Set([
  "bootstrap",
  "authorization_probe",
  "pair_review",
  "gap_review",
  "course_review",
  "pilot_add",
  "export",
  "course_report",
]);

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isPreview(request) {
  const hostname = new URL(request.url).hostname.toLowerCase();
  return hostname.endsWith(`.${PAGES_PROJECT_HOST}`) && hostname !== PAGES_PROJECT_HOST;
}

function hasSameOrigin(request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin) && origin === new URL(request.url).origin;
}

function readAuthorization(request) {
  const authorization = request.headers.get("Authorization") || "";
  if (new TextEncoder().encode(authorization).byteLength > MAX_AUTHORIZATION_BYTES) return "";
  return /^Bearer\s+\S+$/i.test(authorization) ? authorization : "";
}

async function readInput(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type") || "")) return null;
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_BODY_BYTES) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null;
  let body;
  try { body = JSON.parse(raw); }
  catch { return null; }
  if (!body || typeof body !== "object" || Array.isArray(body) || !OPERATIONS.has(body.operation)) return null;
  return { body, raw };
}

async function isOwner(authorization) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/academy-admin-review`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ operation: "authorization_probe" }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return false;
  const account = await response.json().catch(() => ({}));
  return account.owner === true;
}

export async function onRequestPost({ request }) {
  if (!isPreview(request)) return json({ message: "Ruta no disponible." }, 404);
  if (!hasSameOrigin(request)) return json({ message: "Origen no permitido." }, 403);
  const authorization = readAuthorization(request);
  if (!authorization) return json({ message: "Sesión requerida." }, 401);
  const input = await readInput(request);
  if (!input) return json({ message: "Solicitud inválida." }, 400);

  try {
    if (!(await isOwner(authorization))) return json({ message: "Acceso administrativo no autorizado." }, 403);
    const response = await fetch(`${SUPABASE_URL}/functions/v1/academy-admin-review`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: authorization,
        "Content-Type": "application/json",
        Origin: new URL(request.url).origin,
        "X-KC-Review": "1",
      },
      body: input.raw,
      signal: AbortSignal.timeout(30000),
    });
    const headers = new Headers({
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    const disposition = response.headers.get("Content-Disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return json({ message: "No fue posible contactar el servicio de validación académica." }, 502);
  }
}
