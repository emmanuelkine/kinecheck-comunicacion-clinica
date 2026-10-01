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
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
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
    const activityKey = String(body.activityKey || "final").trim();
    const responseText = String(body.responseText || "").trim();
    const criteriaConfirmed = Array.isArray(body.criteriaConfirmed) ? body.criteriaConfirmed : [];
    if (!courseSlug || !activityKey) return json({ message: "Curso y actividad requeridos." }, 400);

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

    const [
      { data: access, error: accessError },
      { data: requirement, error: requirementError },
    ] = await Promise.all([
      admin.from("course_access")
        .select("active,access_expires_at,access_source,last_event")
        .eq("email", email).eq("course_slug", courseSlug).maybeSingle(),
      admin.from("course_completion_requirements")
        .select("content_version,verification_mode,auto_certificate,requirements")
        .eq("course_slug", courseSlug).maybeSingle(),
    ]);

    if (accessError) return json({ message: "No fue posible verificar la compra." }, 500);
    const ownerEmails = Deno.env.get("KINECHECK_OWNER_EMAILS") || "emmanuelkine@gmail.com,emmanuelkine+owner@gmail.com,emmanuel_fox@hotmail.com";
    const accountOwner = ownerEmails.split(',').map(normalize).includes(email);
    if (!accountOwner && !usableAccess(access)) return json({ message: "No encontramos una licencia activa para este curso." }, 403);
    if (requirementError || !requirement) return json({ message: "La actividad no está configurada para certificación." }, 409);

    const requirements = requirement.requirements || {};
    if (!String(requirement.verification_mode || "").startsWith("server_final_activity")) {
      return json({ message: "Este curso usa otro mecanismo de finalización." }, 409);
    }

    const expectedKey = String(requirements.activityKey || "final");
    const minimumCharacters = Math.max(1, Number(requirements.minimumCharacters || 1));
    const criteriaCount = Math.max(0, Number(requirements.criteriaCount || 0));

    if (activityKey !== expectedKey) return json({ message: "Actividad no reconocida." }, 400);
    if (responseText.length < minimumCharacters) {
      return json({ message: "La respuesta todavía es demasiado breve." }, 400);
    }
    if (criteriaConfirmed.length !== criteriaCount || !criteriaConfirmed.every(value => value === true)) {
      return json({ message: "Debes confirmar todos los criterios de finalización." }, 400);
    }

    const completedAt = new Date().toISOString();
    const record = {
      user_id: user.id,
      email,
      course_slug: courseSlug,
      content_version: String(requirement.content_version),
      activity_key: activityKey,
      response_text: responseText.slice(0, 20000),
      criteria_confirmed: criteriaConfirmed.slice(0, 50),
      completed_at: completedAt,
      updated_at: completedAt,
    };

    const { error: upsertError } = await admin.from("course_completion_activity_submissions")
      .upsert(record, { onConflict: "user_id,course_slug,content_version,activity_key" });
    if (upsertError) {
      console.error("course-completion-submit upsert", upsertError);
      return json({ message: "No fue posible registrar la actividad." }, 500);
    }

    return json({
      activityComplete: true,
      completedAt,
      autoCertificate: Boolean(requirement.auto_certificate),
      verificationMode: requirement.verification_mode,
      message: "Actividad registrada en KineCheck.",
    });
  } catch (error) {
    console.error("course-completion-submit", error);
    return json({ message: "Error inesperado al registrar la actividad." }, 500);
  }
});
