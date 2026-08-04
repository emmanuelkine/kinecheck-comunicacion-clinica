import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

function normalizeCourseSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(
    value
      .map((slug) => String(slug || "").trim())
      .filter(Boolean),
  )].slice(0, 100);
}

type AccessRecord = {
  course_slug?: string | null;
  active?: boolean | null;
  access_expires_at?: string | null;
  access_grandfathered?: boolean | null;
  access_source?: string | null;
  last_event?: string | null;
};

function isOwnerAccess(access: AccessRecord | null | undefined): boolean {
  return String(access?.access_source || "").toLowerCase() === "owner"
    || String(access?.last_event || "").toUpperCase() === "OWNER_ACCESS";
}

function expiryTime(access: AccessRecord | null | undefined): number | null {
  const raw = access?.access_expires_at;
  if (!raw) return null;
  const value = new Date(raw).getTime();
  return Number.isFinite(value) ? value : 0;
}

function isUsableAccess(
  access: AccessRecord | null | undefined,
  now = Date.now(),
): boolean {
  if (!access?.active) return false;
  if (isOwnerAccess(access)) return true;

  const expiresAt = expiryTime(access);
  return expiresAt === null || expiresAt > now;
}

function daysRemaining(access: AccessRecord): number | null {
  const expiresAt = expiryTime(access);
  if (expiresAt === null) return null;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000));
}

function accessMetadata(access: AccessRecord) {
  return {
    courseSlug: String(access.course_slug || ""),
    accessExpiresAt: access.access_expires_at || null,
    daysRemaining: daysRemaining(access),
    grandfathered:
      Boolean(access.access_grandfathered)
      || (!access.access_expires_at && !isOwnerAccess(access)),
  };
}

function missingExpirySchema(error: any): boolean {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return code === "42703"
    || code === "PGRST204"
    || message.includes("access_expires_at")
    || message.includes("access_grandfathered");
}

async function deactivateExpiredAccess(admin: any) {
  const { error } = await admin.rpc("deactivate_expired_course_access");
  if (!error) return;

  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  const migrationPending = code === "42883"
    || code === "PGRST202"
    || message.includes("deactivate_expired_course_access");

  if (!migrationPending) {
    console.error("course-key deactivate expired", error);
  }
}

async function fetchBatchAccesses(
  admin: any,
  email: string,
  courseSlugs: string[],
): Promise<{ data: AccessRecord[] | null; error: any }> {
  const current = await admin
    .from("course_access")
    .select(
      "course_slug,active,access_expires_at,access_grandfathered,access_source,last_event",
    )
    .eq("email", email)
    .eq("active", true)
    .in("course_slug", courseSlugs);

  if (!current.error || !missingExpirySchema(current.error)) {
    return current;
  }

  // Compatibilidad temporal mientras la migración de vigencias se despliega.
  return await admin
    .from("course_access")
    .select("course_slug,active")
    .eq("email", email)
    .eq("active", true)
    .in("course_slug", courseSlugs);
}

async function fetchSingleAccess(
  admin: any,
  email: string,
  courseSlug: string,
): Promise<{ data: AccessRecord | null; error: any }> {
  const current = await admin
    .from("course_access")
    .select(
      "course_slug,active,access_expires_at,access_grandfathered,access_source,last_event",
    )
    .eq("email", email)
    .eq("course_slug", courseSlug)
    .maybeSingle();

  if (!current.error || !missingExpirySchema(current.error)) {
    return current;
  }

  // Compatibilidad temporal mientras la migración de vigencias se despliega.
  return await admin
    .from("course_access")
    .select("course_slug,active")
    .eq("email", email)
    .eq("course_slug", courseSlug)
    .maybeSingle();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        message: "Método no permitido.",
      },
      405,
    );
  }

  try {
    const authorization =
      req.headers.get("Authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return json(
        {
          message:
            "La sesión no es válida o ha expirado.",
        },
        401,
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      return json(
        {
          message:
            "La autorización del curso no está configurada.",
        },
        503,
      );
    }

    const body =
      await req.json().catch(() => ({}));

    const courseSlug =
      String(body.courseSlug || "").trim();

    const courseSlugs =
      normalizeCourseSlugs(body.courseSlugs);

    const batchMode =
      courseSlugs.length > 0;

    if (!courseSlug && !batchMode) {
      return json(
        {
          message:
            "No se indicó el curso solicitado.",
        },
        400,
      );
    }

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    const email =
      String(user?.email || "")
        .trim()
        .toLowerCase();

    if (
      userError ||
      !user ||
      !email
    ) {
      return json(
        {
          message:
            "La sesión no es válida o ha expirado.",
        },
        401,
      );
    }

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // Actualiza active=false antes de responder. La llamada es tolerante
    // durante el breve período en que la migración todavía no exista.
    await deactivateExpiredAccess(admin);

    if (batchMode) {
      const {
        data: accesses,
        error: accessesError,
      } = await fetchBatchAccesses(
        admin,
        email,
        courseSlugs,
      );

      if (accessesError) {
        console.error(
          "course-key batch course_access",
          accessesError,
        );

        return json(
          {
            message:
              "No fue posible verificar los accesos a los cursos.",
          },
          500,
        );
      }

      const now = Date.now();
      const activeAccesses = (accesses || [])
        .filter((access: AccessRecord) =>
          isUsableAccess(access, now)
          && courseSlugs.includes(String(access.course_slug || ""))
        );

      const activeCourseSlugs = [
        ...new Set(
          activeAccesses
            .map((access: AccessRecord) =>
              String(access.course_slug || "").trim()
            )
            .filter(Boolean),
        ),
      ];

      return json({
        activeCourseSlugs,
        activeAccesses: activeAccesses.map(accessMetadata),
        email,
      });
    }

    const {
      data: access,
      error: accessError,
    } = await fetchSingleAccess(
      admin,
      email,
      courseSlug,
    );

    if (accessError) {
      console.error(
        "course-key course_access",
        accessError,
      );

      return json(
        {
          message:
            "No fue posible verificar el acceso al curso.",
        },
        500,
      );
    }

    if (!isUsableAccess(access)) {
      const expired = Boolean(
        access?.access_expires_at
        && expiryTime(access) !== null
        && Number(expiryTime(access)) <= Date.now(),
      );

      return json(
        {
          code: expired
            ? "ACCESS_TERM_EXPIRED"
            : "ACCESS_NOT_ACTIVE",
          message: expired
            ? "El período de acceso de este producto finalizó. Puedes renovarlo desde KineCheck."
            : "No encontramos una compra activa asociada a este correo.",
          accessExpiresAt:
            access?.access_expires_at || null,
        },
        403,
      );
    }

    const protectedModules: Record<string, string> = {
      "comunicacion-clinica":
        "comunicacion-clinica/index.js",

      "mas-alla-del-dolor":
        "index-nmhIRPii.js",

      "traumatologia-ortopedia-clinica":
        "traumatologia-ortopedia-clinica/course-source.js",
    };

    const protectedPath =
      protectedModules[courseSlug];

    if (protectedPath) {
      const {
        data: protectedFile,
        error: storageError,
      } = await admin.storage
        .from("course-assets")
        .download(protectedPath);

      if (
        storageError ||
        !protectedFile
      ) {
        console.error(
          "course-key protected content",
          {
            courseSlug,
            protectedPath,
            storageError,
          },
        );

        return json(
          {
            message:
              "No fue posible cargar el contenido protegido del curso.",
          },
          500,
        );
      }

      const source =
        await protectedFile.text();

      const trimmed =
        source.trimStart().toLowerCase();

      if (
        !source.trim() ||
        trimmed.startsWith("<!doctype") ||
        trimmed.startsWith("<html")
      ) {
        console.error(
          "course-key invalid protected module",
          {
            courseSlug,
            protectedPath,
          },
        );

        return json(
          {
            message:
              "El archivo protegido no contiene un módulo JavaScript válido.",
          },
          500,
        );
      }

      return new Response(source, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "text/javascript; charset=utf-8",
          "X-Content-Type-Options":
            "nosniff",
        },
      });
    }

    return json({
      active: true,
      courseSlug,
      email,
      ...accessMetadata(access as AccessRecord),
    });
  } catch (error) {
    console.error(
      "course-key error",
      error,
    );

    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Error inesperado durante la validación.",
      },
      500,
    );
  }
});
