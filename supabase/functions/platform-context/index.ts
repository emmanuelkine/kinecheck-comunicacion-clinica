import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "private, no-store, max-age=0",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

type AccessRow = {
  course_slug: string;
  active: boolean;
  access_expires_at: string | null;
  access_grandfathered: boolean | null;
  access_source: string | null;
  last_event: string | null;
};

function isOwner(row: AccessRow) {
  return String(row.access_source || "").toLowerCase() === "owner"
    || String(row.last_event || "").toUpperCase() === "OWNER_ACCESS";
}

function usable(row: AccessRow, now = Date.now()) {
  if (!row.active) return false;
  if (isOwner(row)) return true;
  if (!row.access_expires_at) return true;
  const expiry = new Date(row.access_expires_at).getTime();
  return Number.isFinite(expiry) && expiry > now;
}

function daysRemaining(value: string | null) {
  if (!value) return null;
  const expiry = new Date(value).getTime();
  if (!Number.isFinite(expiry)) return 0;
  return Math.max(0, Math.ceil((expiry - Date.now()) / 86_400_000));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ message: "Método no permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return json({ message: "La sesión no es válida o expiró." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ message: "La plataforma no está configurada." }, 503);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    const email = String(user?.email || "").trim().toLowerCase();
    if (userError || !user || !email) {
      return json({ message: "La sesión no es válida o expiró." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await admin.rpc("deactivate_expired_course_access");

    const { data, error } = await admin
      .from("course_access")
      .select("course_slug,active,access_expires_at,access_grandfathered,access_source,last_event")
      .eq("email", email)
      .eq("active", true);

    if (error) {
      console.error("platform-context course_access", error);
      return json({ message: "No fue posible verificar la cuenta." }, 500);
    }

    const rows = (data || []) as AccessRow[];
    const activeRows = rows.filter((row) => usable(row));
    const owner = activeRows.some(isOwner);
    const activeSlugs = [...new Set(activeRows.map((row) => row.course_slug).filter(Boolean))];
    const activeSet = new Set(activeSlugs);

    const capabilities = new Set<string>(["course_access"]);
    if (owner || activeSet.has("kinecheck-clinico")) capabilities.add("clinical_workspace");
    if (owner || activeSet.has("kinecheck-estudiante")) capabilities.add("student_tutor");
    if (owner) capabilities.add("teaching_studio");
    if (owner || activeSet.has("kinecheck-recupera")) capabilities.add("patient_program");
    if (
      owner
      || activeSet.has("evidencia-aplicada")
      || activeSlugs.some((slug) => [
        "comunicacion-clinica",
        "mas-alla-del-dolor",
        "traumatologia-ortopedia-clinica",
      ].includes(slug))
    ) capabilities.add("evidence_library");

    const workspaces = ["general"];
    if (capabilities.has("clinical_workspace")) workspaces.unshift("clinical");
    if (capabilities.has("student_tutor")) workspaces.push("student");
    if (capabilities.has("teaching_studio")) workspaces.push("teaching");
    if (capabilities.has("patient_program")) workspaces.push("patient");

    return json({
      email,
      owner,
      capabilities: [...capabilities],
      workspaces: [...new Set(workspaces)],
      activeCourseSlugs: activeSlugs,
      activeAccesses: activeRows.map((row) => ({
        courseSlug: row.course_slug,
        accessExpiresAt: row.access_expires_at,
        daysRemaining: daysRemaining(row.access_expires_at),
        grandfathered: Boolean(row.access_grandfathered),
        owner: isOwner(row),
      })),
    });
  } catch (error) {
    console.error("platform-context", error);
    return json({
      message: error instanceof Error ? error.message : "Error inesperado.",
    }, 500);
  }
});
