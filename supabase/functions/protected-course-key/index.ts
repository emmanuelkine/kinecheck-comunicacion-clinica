import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "private, no-store, max-age=0",
};

const protectedAssets: Record<string, string[]> = {
  "kinecheck-clinico-curso": [
    "kinecheck-clinico-curso/course-data.js",
    "kinecheck-clinico-curso/renderer.js",
  ],
  "dolor-lumbar-persistente": [
    "dolor-lumbar-persistente/data-v6.js",
    "dolor-lumbar-persistente/app-v6.js",
  ],
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function moduleSource(source: string) {
  return new Response(source, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/javascript; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

type AccessRecord = {
  active?: boolean | null;
  access_expires_at?: string | null;
  access_source?: string | null;
  last_event?: string | null;
};

function isOwnerAccess(access: AccessRecord | null | undefined) {
  return String(access?.access_source || "").toLowerCase() === "owner"
    || String(access?.last_event || "").toUpperCase() === "OWNER_ACCESS";
}

function expiryTime(access: AccessRecord | null | undefined): number | null {
  if (!access?.access_expires_at) return null;
  const value = new Date(access.access_expires_at).getTime();
  return Number.isFinite(value) ? value : 0;
}

function isUsableAccess(access: AccessRecord | null | undefined) {
  if (!access?.active) return false;
  if (isOwnerAccess(access)) return true;
  const expiresAt = expiryTime(access);
  return expiresAt === null || expiresAt > Date.now();
}

function isJavaScript(source: string) {
  const trimmed = source.trimStart().toLowerCase();
  return Boolean(source.trim()) && !trimmed.startsWith("<!doctype") && !trimmed.startsWith("<html");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ message: "Método no permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return json({ message: "La sesión no es válida o ha expirado." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ message: "La autorización del curso no está configurada." }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const courseSlug = String(body.courseSlug || "").trim();
    const assetPaths = protectedAssets[courseSlug];
    if (!assetPaths) return json({ message: "Curso no reconocido." }, 400);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    const email = String(user?.email || "").trim().toLowerCase();
    if (userError || !user || !email) {
      return json({ message: "La sesión no es válida o ha expirado." }, 401);
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
      console.error("protected-course-key access", { courseSlug, accessError });
      return json({ message: "No fue posible verificar el acceso al curso." }, 500);
    }

    if (!isUsableAccess(access)) {
      const expiresAt = expiryTime(access);
      const expired = expiresAt !== null && expiresAt <= Date.now();
      return json({
        code: expired ? "ACCESS_TERM_EXPIRED" : "ACCESS_NOT_ACTIVE",
        message: expired
          ? "El período de acceso de este producto finalizó. Puedes renovarlo desde KineCheck."
          : "No encontramos una compra activa asociada a este correo.",
        accessExpiresAt: access?.access_expires_at || null,
      }, 403);
    }

    const sources: string[] = [];
    for (const protectedPath of assetPaths) {
      const { data: protectedFile, error: storageError } = await admin.storage
        .from("course-assets")
        .download(protectedPath);
      if (storageError || !protectedFile) {
        console.error("protected-course-key storage", { courseSlug, protectedPath, storageError });
        return json({ message: "No fue posible cargar el contenido protegido del curso." }, 500);
      }
      const source = await protectedFile.text();
      if (!isJavaScript(source)) {
        console.error("protected-course-key invalid asset", { courseSlug, protectedPath });
        return json({ message: "El contenido protegido no es válido." }, 500);
      }
      sources.push(source);
    }

    return moduleSource(sources.join("\n;\n"));
  } catch (error) {
    console.error("protected-course-key error", error);
    return json({ message: "Error inesperado durante la validación." }, 500);
  }
});
