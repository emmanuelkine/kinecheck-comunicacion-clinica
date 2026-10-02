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

function journeyIds(payload: any): string[] {
  const modules = Array.isArray(payload?.modules) ? payload.modules : [];
  const ids: string[] = [];
  modules.forEach((module: any, mi: number) => {
    const journeys = Array.isArray(module?.journeys) ? module.journeys : [];
    journeys.forEach((journey: any, ji: number) => {
      ids.push(String(journey?.id || `${mi}-${ji}`));
    });
  });
  return ids;
}

function completedJourneyCount(state: any, ids: string[], fields: string[]) {
  const activities = state?.activities && typeof state.activities === "object" ? state.activities : {};
  return ids.filter((id) => {
    const activity = activities[id] || {};
    return fields.length > 0 && fields.every((field) => {
      if (!activity[field]) return false;
      const match = /^(lab|case|reflection)SavedAt$/.exec(field);
      return !match || String(state?.notes?.[`${id}-${match[1]}`]?.text || '').trim().length > 0;
    });
  }).length;
}

function completedAcademicCount(state: any, keys: string[], payload: any) {
  const assignments = state?.academicAssignments && typeof state.academicAssignments === "object"
    ? state.academicAssignments
    : {};
  const configured: Record<string, any> = {};
  (payload?.moduleAssignments || []).forEach((item: any, i: number) => {
    configured[`module-${item.moduleNumber || i + 1}`] = item;
  });
  if (payload?.finalAssessment) configured.final = payload.finalAssessment;
  return keys.filter(key => {
    const item = configured[key], saved = assignments[key];
    if (!item || !saved?.completedAt) return false;
    const minimum = Number(item.minimumCharacters || 350);
    if (String(saved.text || '').trim().length < minimum) return false;
    const expected = Array.isArray(item.criteria) ? item.criteria : [];
    const confirmed = Array.isArray(saved.criteria) ? saved.criteria : [];
    return confirmed.length === expected.length && expected.every((label: string, i: number) =>
      confirmed[i]?.checked === true && confirmed[i]?.label === label);
  }).length;
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

    const [
      { data: access, error: accessError },
      { data: load, error: loadError },
      { data: requirement, error: requirementError },
      { data: certificationFlag, error: certificationFlagError },
    ] = await Promise.all([
      admin.from("course_access")
        .select("active,access_expires_at,access_source,last_event")
        .eq("email", email).eq("course_slug", courseSlug).maybeSingle(),
      admin.from("course_academic_load")
        .select("title,content_version,audited_minutes,certifiable_hours,certificate_ready")
        .eq("course_slug", courseSlug).maybeSingle(),
      admin.from("course_completion_requirements")
        .select("content_version,verification_mode,auto_certificate,requirements")
        .eq("course_slug", courseSlug).maybeSingle(),
      admin.from("platform_feature_flags")
        .select("enabled,config")
        .eq("key", "otec_certification_active").maybeSingle(),
    ]);

    if (accessError) return json({ message: "No fue posible verificar la compra." }, 500);
    const ownerEmails = Deno.env.get("KINECHECK_OWNER_EMAILS") || "emmanuelkine@gmail.com,emmanuelkine+owner@gmail.com,emmanuel_fox@hotmail.com";
    const accountOwner = ownerEmails.split(',').map(normalize).includes(email);
    if (!accountOwner && !usableAccess(access)) return json({ message: "No encontramos una licencia activa para este curso." }, 403);
    if (certificationFlagError) return json({ message: "No fue posible verificar el estado de certificación." }, 500);
    if (!certificationFlag?.enabled) {
      return json({
        eligible: false,
        autoCertificate: false,
        code: "OTEC_CERTIFICATION_NOT_ACTIVE",
        status: certificationFlag?.config?.status || "preparation",
        message: "La evaluación y certificación OTEC todavía están en preparación; no se registra aprobación automática.",
      }, 409);
    }
    if (loadError || !load?.certificate_ready) return json({ message: "No fue posible verificar la carga académica." }, 409);
    if (requirementError || !requirement) {
      return json({
        eligible: false,
        verificationMode: "not_configured",
        autoCertificate: false,
        message: "La verificación de finalización aún no está configurada para este curso.",
      });
    }

    const contentVersion = String(requirement.content_version || load.content_version || "");
    const { data: existingCompletion } = await admin.from("course_completions")
      .select("completed_at,verification_method,verification_level,score")
      .eq("user_id", user.id)
      .eq("course_slug", courseSlug)
      .eq("content_version", contentVersion)
      .maybeSingle();

    if (existingCompletion?.verification_level === "automatic_full" && requirement.auto_certificate) {
      return json({
        eligible: true,
        autoCertificate: true,
        verificationMode: requirement.verification_mode,
        completion: existingCompletion,
        progress: { status: "completed" },
      });
    }

    if (!requirement.auto_certificate) {
      const { data: submission } = await admin.from("course_completion_activity_submissions")
        .select("activity_key,completed_at")
        .eq("user_id", user.id)
        .eq("course_slug", courseSlug)
        .eq("content_version", contentVersion)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return json({
        eligible: false,
        autoCertificate: false,
        verificationMode: requirement.verification_mode,
        activityComplete: Boolean(submission),
        activityCompletedAt: submission?.completed_at || null,
        message: submission
          ? "La actividad obligatoria está registrada, pero este curso aún requiere verificación final manual."
          : "La finalización automática todavía no está habilitada para este curso.",
      });
    }

    const [
      { data: progress, error: progressError },
      { data: courseRow, error: courseError },
    ] = await Promise.all([
      admin.from("learning_progress")
        .select("state,updated_at")
        .eq("user_id", user.id)
        .eq("course_slug", courseSlug)
        .maybeSingle(),
      admin.from("course_content")
        .select("version,payload")
        .eq("course_slug", courseSlug)
        .eq("published", true)
        .maybeSingle(),
    ]);

    if (progressError || courseError) return json({ message: "No fue posible verificar el progreso académico." }, 500);
    if (!courseRow?.payload || !progress?.state) {
      return json({
        eligible: false,
        autoCertificate: true,
        verificationMode: requirement.verification_mode,
        progress: { journeysCompleted: 0, journeysTotal: 0, academicCompleted: 0, academicTotal: 0 },
        message: "Aún no hay progreso suficiente registrado para verificar la finalización.",
      });
    }

    if (String(courseRow.version || "") !== contentVersion) {
      return json({ message: "La versión académica del curso cambió. Debe revisarse antes de certificar." }, 409);
    }

    const requirements = requirement.requirements || {};
    const fields = Array.isArray(requirements.requiredActivityFields)
      ? requirements.requiredActivityFields.map((x: unknown) => String(x))
      : [];
    const ids = journeyIds(courseRow.payload);
    const journeysCompleted = completedJourneyCount(progress.state, ids, fields);
    const requireAllJourneys = requirements.requireAllJourneys === true;
    const journeysOk = !requireAllJourneys || (ids.length > 0 && journeysCompleted === ids.length);

    const academicKeys = Array.isArray(requirements.requiredAcademicKeys)
      ? requirements.requiredAcademicKeys.map((x: unknown) => String(x))
      : [];
    const academicCompleted = completedAcademicCount(progress.state, academicKeys, courseRow.payload);
    const academicOk = academicKeys.length === 0 || academicCompleted === academicKeys.length;
    const eligible = journeysOk && academicOk;

    const progressSummary = {
      journeysCompleted,
      journeysTotal: ids.length,
      academicCompleted,
      academicTotal: academicKeys.length,
    };

    if (!eligible) {
      return json({
        eligible: false,
        autoCertificate: true,
        verificationMode: requirement.verification_mode,
        progress: progressSummary,
        message: "Completa todas las actividades requeridas antes de solicitar el certificado.",
      });
    }

    const completedAt = String(progress.updated_at || new Date().toISOString());
    const completion = {
      user_id: user.id,
      email,
      course_slug: courseSlug,
      content_version: contentVersion,
      course_title: String(load.title),
      audited_minutes: Number(load.audited_minutes),
      certifiable_hours: Number(load.certifiable_hours),
      completed_at: completedAt,
      verification_method: requirement.verification_mode,
      verification_level: "automatic_full",
      score: null,
      evidence: {
        progress: progressSummary,
        progressUpdatedAt: progress.updated_at || null,
      },
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await admin.from("course_completions")
      .upsert(completion, { onConflict: "user_id,course_slug,content_version" });
    if (upsertError) {
      console.error("course-completion-sync upsert", upsertError);
      return json({ message: "No fue posible registrar la finalización." }, 500);
    }

    return json({
      eligible: true,
      autoCertificate: true,
      verificationMode: requirement.verification_mode,
      progress: progressSummary,
      completion: {
        completedAt,
        verificationLevel: "automatic_full",
        contentVersion,
      },
    });
  } catch (error) {
    console.error("course-completion-sync", error);
    return json({ message: "Error inesperado al verificar la finalización." }, 500);
  }
});
