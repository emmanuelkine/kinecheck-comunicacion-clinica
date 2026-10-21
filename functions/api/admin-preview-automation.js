const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
const SUPABASE_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";
const PAGES_PROJECT_HOST = "kinecheck-comunicacion-clinica.pages.dev";
const MAX_BODY_BYTES = 4096;
const MAX_AUTHORIZATION_BYTES = 4096;
const CONTROL_ACTIONS = new Set([
  "run_daily",
  "reconcile",
  "triage_beta",
  "run_restore",
  "support_status",
  "beta_status",
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
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) return null;

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null;

  let body;
  try { body = JSON.parse(raw); }
  catch { return null; }
  return body && typeof body === "object" && !Array.isArray(body) ? body : null;
}

async function isOwner(authorization) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/platform-context`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return false;
  const account = await response.json().catch(() => ({}));
  return account.owner === true;
}

function selectOperation(input) {
  if (input.operation === "status") return { endpoint: "automation-status", body: "{}" };
  if (input.operation !== "control" || !input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) return null;
  if (!CONTROL_ACTIONS.has(input.payload.action)) return null;
  return { endpoint: "automation-control", body: JSON.stringify(input.payload) };
}

export async function onRequestPost({ request }) {
  if (!isPreview(request)) return json({ message: "Ruta no disponible." }, 404);
  if (!hasSameOrigin(request)) return json({ message: "Origen no permitido." }, 403);

  const authorization = readAuthorization(request);
  if (!authorization) return json({ message: "Sesión requerida." }, 401);

  const input = await readInput(request);
  const operation = input && selectOperation(input);
  if (!operation) return json({ message: "Solicitud inválida." }, 400);

  try {
    if (!(await isOwner(authorization))) return json({ message: "Acceso administrativo no autorizado." }, 403);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${operation.endpoint}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: operation.body,
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    return json(data, response.status);
  } catch {
    return json({ message: "No fue posible contactar el servicio administrativo." }, 502);
  }
}
