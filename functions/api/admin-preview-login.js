const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
const SUPABASE_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";
const PAGES_PROJECT_HOST = "kinecheck-comunicacion-clinica.pages.dev";
const MAX_BODY_BYTES = 4096;

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

async function readCredentials(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) return null;

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null;

  let body;
  try { body = JSON.parse(raw); }
  catch { return null; }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || email.length > 254 || !password || password.length > 1024) return null;
  return { email, password };
}

export async function onRequestPost({ request }) {
  if (!isPreview(request)) return json({ message: "Ruta no disponible." }, 404);
  if (!hasSameOrigin(request)) return json({ message: "Origen no permitido." }, 403);

  const credentials = await readCredentials(request);
  if (!credentials) return json({ message: "Solicitud inválida." }, 400);

  try {
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    const session = await authResponse.json().catch(() => ({}));
    if (!authResponse.ok || !session?.access_token) {
      return json({ message: "Correo o contraseña incorrectos." }, 401);
    }

    const ownerResponse = await fetch(`${SUPABASE_URL}/functions/v1/platform-context`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const account = await ownerResponse.json().catch(() => ({}));
    if (!ownerResponse.ok || account.owner !== true) {
      return json({ message: "Esta cuenta no tiene acceso de propietario." }, 403);
    }

    return json(session);
  } catch {
    return json({ message: "No fue posible contactar el servicio de acceso." }, 502);
  }
}
