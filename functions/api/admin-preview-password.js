const SUPABASE_URL = "https://mhnqtyvwxytppekktvxb.supabase.co";
const SUPABASE_KEY = "sb_publishable_JLWKq6m0g4yB30iIQLE4bg_AkspSDYD";
const OWNER_EMAIL = "emmanuelkine@gmail.com";
const PAGES_PROJECT_HOST = "kinecheck-comunicacion-clinica.pages.dev";
const MAX_BODY_BYTES = 2048;
const MAX_AUTHORIZATION_BYTES = 8192;

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

async function readPassword(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type") || "")) return "";
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_BODY_BYTES) return "";
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return "";
  let body;
  try { body = JSON.parse(raw); }
  catch { return ""; }
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 12 || password.length > 128 || /\s/.test(password)) return "";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return "";
  return password;
}

async function fetchUser(authorization) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    cache: "no-store",
    headers: { apikey: SUPABASE_KEY, Authorization: authorization },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

async function proveAcademyOwner(authorization) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/academy-admin-review`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ operation: "authorization_probe" }),
    signal: AbortSignal.timeout(10000),
  });
  const access = await response.json().catch(() => ({}));
  return response.ok
    && access.owner === true
    && access.otec?.status === "BLOQUEADA"
    && access.otec?.certificatesEnabled === false;
}

export async function onRequestPost({ request }) {
  if (!isPreview(request)) return json({ message: "Ruta no disponible." }, 404);
  if (!hasSameOrigin(request)) return json({ message: "Origen no permitido." }, 403);
  const authorization = readAuthorization(request);
  if (!authorization) return json({ message: "Enlace de recuperación no válido o vencido." }, 401);
  const password = await readPassword(request);
  if (!password) return json({ message: "La contraseña debe tener 12–128 caracteres, mayúscula, minúscula, número y símbolo, sin espacios." }, 400);

  try {
    const user = await fetchUser(authorization);
    if (String(user?.email || "").trim().toLowerCase() !== OWNER_EMAIL) {
      return json({ message: "El enlace no corresponde al propietario autorizado." }, 403);
    }
    if (!(await proveAcademyOwner(authorization))) {
      return json({ message: "La cuenta no tiene autorización activa para Academy." }, 403);
    }

    const update = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: "PUT",
      cache: "no-store",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
      signal: AbortSignal.timeout(10000),
    });
    if (!update.ok) return json({ message: "No fue posible actualizar la contraseña. Solicita un enlace nuevo." }, 422);
    return json({ ok: true, owner: true, academy: true, otec: "BLOQUEADA", certificatesEnabled: false });
  } catch {
    return json({ message: "No fue posible completar la recuperación segura." }, 502);
  }
}
