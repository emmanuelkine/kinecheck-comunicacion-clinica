import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://kinecheck.cl",
  "https://www.kinecheck.cl",
]);

const allowedRoles = new Set(["professional", "student", "teacher", "patient"]);
const allowedDevices = new Set(["mobile", "desktop", "both"]);
const allowedProducts = new Set([
  "kinecheck-clinico",
  "kinecheck-estudiante",
  "kinecheck-recupera",
  "comunicacion-clinica",
  "mas-alla-del-dolor",
  "evidencia-aplicada",
  "traumatologia-ortopedia-clinica",
  "pack-estudiante",
  "general",
]);

function cors(origin: string | null) {
  const selected = origin && allowedOrigins.has(origin) ? origin : "https://kinecheck.cl";
  return {
    "Access-Control-Allow-Origin": selected,
    "Access-Control-Allow-Headers": "content-type",
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

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors(origin) });
  }

  if (req.method !== "POST") {
    return json(origin, { message: "Método no permitido." }, 405);
  }

  if (!origin || !allowedOrigins.has(origin)) {
    return json(origin, { message: "Origen no autorizado." }, 403);
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 20_000) {
    return json(origin, { message: "Solicitud demasiado extensa." }, 413);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json(origin, { message: "Solicitud inválida." }, 400);
  }

  if (clean((body as any).company, 100)) {
    return json(origin, { ok: true, message: "Postulación recibida." });
  }

  const email = clean((body as any).email, 254).toLowerCase();
  const fullName = clean((body as any).fullName, 120);
  const role = clean((body as any).role, 30);
  const productInterest = clean((body as any).productInterest, 80);
  const experience = clean((body as any).experience, 1200);
  const device = clean((body as any).device, 20);
  const availability = clean((body as any).availability, 500);
  const consentPrivacy = (body as any).consentPrivacy === true;
  const consentContact = (body as any).consentContact === true;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValid || fullName.length < 2 || !allowedRoles.has(role) || !allowedProducts.has(productInterest) || !allowedDevices.has(device) || !consentPrivacy) {
    return json(origin, { message: "Revisa los campos obligatorios y vuelve a enviar." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json(origin, { message: "El registro beta no está disponible temporalmente." }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: readError } = await admin
    .from("beta_applications")
    .select("id,submission_count,status")
    .eq("email", email)
    .maybeSingle();

  if (readError) {
    console.error("beta-apply read", readError.code);
    return json(origin, { message: "No fue posible registrar la postulación." }, 500);
  }

  const payload = {
    email,
    full_name: fullName,
    role,
    product_interest: productInterest,
    experience,
    device,
    availability,
    consent_privacy: consentPrivacy,
    consent_contact: consentContact,
    source: "website_beta",
    last_submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    submission_count: Number(existing?.submission_count || 0) + 1,
    status: existing?.status || "new",
  };

  const query = existing?.id
    ? admin.from("beta_applications").update(payload).eq("id", existing.id)
    : admin.from("beta_applications").insert(payload);

  const { error } = await query;
  if (error) {
    console.error("beta-apply write", error.code);
    return json(origin, { message: "No fue posible registrar la postulación." }, 500);
  }

  return json(origin, {
    ok: true,
    message: "Postulación recibida. Revisaremos el perfil antes de enviar una invitación.",
  });
});
