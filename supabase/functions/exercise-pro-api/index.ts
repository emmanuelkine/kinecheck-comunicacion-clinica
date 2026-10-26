import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3?target=deno";
import { calculate } from "../_shared/exercise-calculations.mjs";

const COURSE_SLUG = "kinecheck-exercise-pro";
const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "private, no-store, max-age=0",
  "Vary": "Origin",
});
const json = (origin: string, payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" },
});

function trustedOrigin(request: Request): string | null {
  const raw = request.headers.get("Origin");
  if (!raw) return "https://kinecheck.cl";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.hostname === "kinecheck.cl" || url.hostname === "www.kinecheck.cl" || url.hostname.endsWith(".pages.dev")) return url.origin;
    return null;
  } catch { return null; }
}

serve(async (request) => {
  const origin = trustedOrigin(request);
  if (!origin) return new Response("Origen no autorizado.", { status: 403, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (request.method !== "POST") return json(origin, { message: "Método no permitido." }, 405);

  try {
    const authorization = request.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json(origin, { code: "NO_SESSION", message: "Inicia sesión en KineCheck para verificar acceso Pro." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !publishableKey || !serviceRoleKey) return json(origin, { message: "La verificación de acceso no está configurada." }, 503);

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    const email = String(user?.email || "").trim().toLowerCase();
    if (userError || !user || !email) return json(origin, { code: "INVALID_SESSION", message: "La sesión no es válida o ha expirado." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: allowed, error: accessError } = await admin.rpc("has_course_access", {
      p_course_slug: COURSE_SLUG,
      p_email: email,
    });
    if (accessError) {
      console.error("exercise-pro-api entitlement lookup failed", accessError);
      return json(origin, { message: "No fue posible verificar la licencia." }, 500);
    }
    if (allowed !== true) return json(origin, { code: "ACCESS_NOT_ACTIVE", message: "No hay una suscripción Exercise Pro activa para esta cuenta." }, 403);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || JSON.stringify(body).length > 4000) return json(origin, { message: "Solicitud no válida." }, 400);
    const action = String((body as Record<string, unknown>).action || "");
    if (action === "access") return json(origin, { authorized: true });
    const inputs = (body as Record<string, unknown>).inputs;
    if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) return json(origin, { message: "Faltan los datos del cálculo." }, 400);
    try {
      return json(origin, calculate(action, inputs as Record<string, number>));
    } catch (error) {
      return json(origin, { message: error instanceof Error ? error.message : "Datos no válidos." }, 400);
    }
  } catch (error) {
    console.error("exercise-pro-api error", error);
    return json(origin, { message: "Error inesperado durante la validación." }, 500);
  }
});
