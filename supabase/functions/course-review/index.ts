import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

type AccessRecord = {
  active?: boolean | null;
  access_expires_at?: string | null;
  access_source?: string | null;
  last_event?: string | null;
};

function isOwnerAccess(access: AccessRecord | null | undefined) {
  return String(access?.access_source || "").toLowerCase() === "owner" ||
    String(access?.last_event || "").toUpperCase() === "OWNER_ACCESS";
}

function hasUsableAccess(access: AccessRecord | null | undefined) {
  if (!access?.active) return false;
  if (isOwnerAccess(access)) return true;
  if (!access.access_expires_at) return true;
  const expires = new Date(access.access_expires_at).getTime();
  return Number.isFinite(expires) && expires > Date.now();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ message: "Método no permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ message: "Sesión no válida" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ message: "Servicio no configurado" }, 503);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    const email = String(user?.email || "").trim().toLowerCase();
    if (userError || !user || !email) return json({ message: "Sesión no válida" }, 401);

    const body = await req.json().catch(() => ({}));
    const rating = Number(body.rating);
    const courseSlug = String(body.courseSlug || "").trim();
    const bestPart = String(body.bestPart || "").trim();
    const improvement = String(body.improvement || "").trim();

    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(courseSlug) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return json({ message: "Evaluación inválida" }, 400);
    }
    if (bestPart.length > 800 || improvement.length > 800) {
      return json({ message: "Los comentarios superan el máximo permitido" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: access, error: accessError } = await admin
      .from("course_access")
      .select("active,access_expires_at,access_source,last_event")
      .eq("email", email)
      .eq("course_slug", courseSlug)
      .maybeSingle();

    if (accessError) {
      console.error("course-review access check failed", { courseSlug, code: accessError.code });
      return json({ message: "No fue posible verificar el acceso al curso" }, 500);
    }
    if (!hasUsableAccess(access)) {
      return json({ message: "No existe un acceso activo para evaluar este curso" }, 403);
    }

    const { error } = await admin.from("course_reviews").upsert({
      user_id: user.id,
      course_slug: courseSlug,
      rating,
      recommends: body.recommends === true,
      best_part: bestPart || null,
      improvement: improvement || null,
      public_comment: body.publicComment === true,
      approved: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,course_slug" });

    if (error) {
      console.error("course-review upsert failed", { courseSlug, code: error.code });
      return json({ message: "No fue posible registrar la evaluación" }, 500);
    }

    return json({ ok: true });
  } catch (error) {
    console.error("course-review unexpected error", error instanceof Error ? error.name : "unknown");
    return json({ message: "No fue posible registrar la evaluación" }, 500);
  }
});
