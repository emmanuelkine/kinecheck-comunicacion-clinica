import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "private, no-store, max-age=0",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function usableAccess(access: any): boolean {
  if (!access?.active) return false;
  const owner = normalize(access.access_source) === "owner"
    || String(access.last_event || "").toUpperCase() === "OWNER_ACCESS";
  if (owner) return true;
  if (!access.access_expires_at) return true;
  const time = new Date(access.access_expires_at).getTime();
  return Number.isFinite(time) && time > Date.now();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ message: "Método no permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ message: "Sesión requerida." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ message: "Servicio no configurado." }, 503);

    const body = await req.json().catch(() => ({}));
    const courseSlug = String(body.courseSlug || "").trim();
    if (!courseSlug) return json({ message: "Curso requerido." }, 400);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    const email = normalize(user?.email);
    if (userError || !user || !email) return json({ message: "Sesión inválida." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const ownerEmails = (Deno.env.get("KINECHECK_OWNER_EMAILS")
      || "emmanuelkine@gmail.com,emmanuelkine+owner@gmail.com,emmanuel_fox@hotmail.com")
      .split(",").map(normalize);
    const owner = ownerEmails.includes(email);

    const [
      { data: access, error: accessError },
      { data: config, error: configError },
      { data: certificationFlag, error: certificationError },
      { data: pilotFlag, error: pilotError },
    ] = await Promise.all([
      admin.from("course_access")
        .select("active,access_expires_at,access_source,last_event")
        .eq("email", email).eq("course_slug", courseSlug).maybeSingle(),
      admin.from("course_assessment_configs")
        .select("course_slug,title,content_version,status,proposed_pass_score,proposed_max_attempts,objective_item_count,case_points,safety_gate,case_prompt,rubric,activation_requirements,updated_at")
        .eq("course_slug", courseSlug).maybeSingle(),
      admin.from("platform_feature_flags").select("enabled,config")
        .eq("key", "otec_certification_active").maybeSingle(),
      admin.from("platform_feature_flags").select("enabled,config")
        .eq("key", "academic_assessment_pilot").maybeSingle(),
    ]);

    if (accessError || configError || certificationError || pilotError) {
      return json({ message: "No fue posible consultar el estado académico." }, 500);
    }
    if (!owner && !usableAccess(access)) return json({ message: "Licencia activa requerida." }, 403);
    if (!config) return json({ message: "Este curso todavía no tiene instrumento configurado." }, 404);

    const ownerPreview = owner && pilotFlag?.config?.ownerPreview === true;
    const active = certificationFlag?.enabled === true
      && pilotFlag?.enabled === true
      && config.status === "active";

    return json({
      course: { slug: config.course_slug, title: config.title, contentVersion: config.content_version },
      assessment: {
        status: config.status,
        active,
        ownerPreview,
        proposedPassScore: Number(config.proposed_pass_score),
        proposedMaxAttempts: Number(config.proposed_max_attempts),
        objectiveItemCount: Number(config.objective_item_count),
        casePoints: Number(config.case_points),
        safetyGate: config.safety_gate,
        casePrompt: ownerPreview ? config.case_prompt : null,
        rubric: ownerPreview ? config.rubric : [],
        activationRequirements: config.activation_requirements,
        updatedAt: config.updated_at,
      },
      certification: {
        active: certificationFlag?.enabled === true,
        status: certificationFlag?.config?.status || "preparation",
        senceCourse: false,
      },
      message: active
        ? "La evaluación académica está habilitada."
        : "La evaluación está preparada para revisión, pero aún no es un requisito activo ni habilita certificado.",
    });
  } catch (error) {
    console.error("academic-assessment-status", error);
    return json({ message: "Error inesperado al consultar la evaluación." }, 500);
  }
});
