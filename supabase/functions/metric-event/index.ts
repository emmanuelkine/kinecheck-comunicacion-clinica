import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://kinecheck.cl",
  "https://www.kinecheck.cl",
]);

const allowedEvents = new Set([
  "page_view",
  "product_view",
  "checkout_start",
  "academy_open",
  "beta_view",
  "beta_submit_success",
  "support_view",
  "support_submit_success",
  "platform_login_view",
  "platform_login_success",
  "course_open",
  "academy_opened",
  "product_opened",
  "first_activity",
]);

const authenticatedFunnelEvents = new Set([
  "academy_opened",
  "product_opened",
  "first_activity",
]);

const allowedProducts = new Set([
  "kinecheck-clinico",
  "kinecheck-estudiante",
  "kinecheck-recupera",
  "comunicacion-clinica",
  "mas-alla-del-dolor",
  "evidencia-aplicada",
  "traumatologia-ortopedia-clinica",
  "pack-estudiante",
]);

function cors(origin: string | null) {
  const selected = origin && allowedOrigins.has(origin) ? origin : "https://kinecheck.cl";
  return {
    "Access-Control-Allow-Origin": selected,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}

function json(origin: string | null, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const output: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(source).slice(0, 8)) {
    const safeKey = clean(key, 40).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeKey) continue;
    if (typeof raw === "boolean" || typeof raw === "number") output[safeKey] = raw;
    else output[safeKey] = clean(raw, 120);
  }
  return output;
}

function cleanPath(value: unknown) {
  const raw = clean(value, 300);
  try {
    const url = new URL(raw, "https://kinecheck.cl");
    return clean(url.pathname || "/", 300);
  } catch {
    return raw.split(/[?#]/, 1)[0] || "/";
  }
}

function isQaPath(path: string) {
  try {
    const url = new URL(path, "https://kinecheck.cl");
    return url.searchParams.has("qa");
  } catch {
    return /(?:\?|&)qa=/i.test(path);
  }
}

function bearerToken(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function chileDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json(origin, { message: "Método no permitido." }, 405);
  if (!origin || !allowedOrigins.has(origin)) return json(origin, { message: "Origen no autorizado." }, 403);

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 8_000) return json(origin, { message: "Solicitud demasiado extensa." }, 413);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json(origin, { message: "Solicitud inválida." }, 400);

  const eventId = clean((body as any).eventId, 36).toLowerCase();
  const eventName = clean((body as any).eventName, 40);
  const rawPath = clean((body as any).path, 300);
  const path = cleanPath(rawPath);
  const productSlug = clean((body as any).productSlug, 80) || null;
  const sessionId = clean((body as any).sessionId, 36).toLowerCase() || null;
  const referrerHost = clean((body as any).referrerHost, 160) || null;
  const deviceClass = clean((body as any).deviceClass, 20) || null;
  const clientIsQa = (body as any).isQa === true;
  const metadata = authenticatedFunnelEvents.has(eventName) ? {} : cleanMetadata((body as any).metadata);

  if (!isUuid(eventId) || !allowedEvents.has(eventName) || !path.startsWith("/")) {
    return json(origin, { message: "Evento inválido." }, 400);
  }
  if (productSlug && !allowedProducts.has(productSlug)) return json(origin, { message: "Producto inválido." }, 400);
  if (sessionId && !isUuid(sessionId)) return json(origin, { message: "Sesión inválida." }, 400);
  if (deviceClass && !["mobile", "tablet", "desktop"].includes(deviceClass)) {
    return json(origin, { message: "Dispositivo inválido." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json(origin, { message: "Métricas no disponibles." }, 503);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  const token = bearerToken(req);
  if (token) {
    const { data, error } = await admin.auth.getUser(token);
    if (!error && data?.user?.id) userId = data.user.id;
  }

  if (authenticatedFunnelEvents.has(eventName) && !userId) {
    return json(origin, { message: "Evento autenticado requerido." }, 401);
  }

  if (sessionId) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from("kinecheck_public_events")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .gte("occurred_at", since);
    if (countError) {
      console.error("metric-event count", countError.code);
      return json(origin, { message: "No fue posible registrar la métrica." }, 500);
    }
    if ((count || 0) >= 200) return json(origin, { ok: true, limited: true });
  }

  const isQa = clientIsQa || isQaPath(rawPath);
  const { error } = await admin.from("kinecheck_public_events").insert({
    event_id: eventId,
    event_name: eventName,
    path,
    product_slug: productSlug,
    session_id: sessionId,
    referrer_host: referrerHost,
    device_class: deviceClass,
    metadata,
    user_id: userId,
    is_qa: isQa,
  });

  if (error && error.code !== "23505") {
    console.error("metric-event insert", error.code);
    return json(origin, { message: "No fue posible registrar la métrica." }, 500);
  }

  let returnRecorded = false;
  if (!isQa && userId && authenticatedFunnelEvents.has(eventName)) {
    const { data: firstActivity } = await admin
      .from("kinecheck_public_events")
      .select("occurred_at")
      .eq("user_id", userId)
      .eq("event_name", "first_activity")
      .eq("is_qa", false)
      .order("occurred_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstActivity?.occurred_at && chileDateKey(firstActivity.occurred_at) < chileDateKey(new Date())) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const { count } = await admin
        .from("kinecheck_public_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_name", "return_session")
        .eq("is_qa", false)
        .gte("occurred_at", todayStart.toISOString());

      if ((count || 0) === 0) {
        const { error: returnError } = await admin.from("kinecheck_public_events").insert({
          event_id: crypto.randomUUID(),
          event_name: "return_session",
          path,
          product_slug: productSlug,
          session_id: sessionId,
          referrer_host: null,
          device_class: deviceClass,
          metadata: {},
          user_id: userId,
          is_qa: false,
        });
        returnRecorded = !returnError;
        if (returnError) console.error("metric-event return_session", returnError.code);
      }
    }
  }

  return json(origin, { ok: true, authenticated: Boolean(userId), returnRecorded });
});
