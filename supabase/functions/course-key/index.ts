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

    if (!courseSlug) {
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

    const {
      data: access,
      error: accessError,
    } = await admin
      .from("course_access")
      .select("active")
      .eq("email", email)
      .eq("course_slug", courseSlug)
      .maybeSingle();

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

    if (!access?.active) {
      return json(
        {
          message:
            "No encontramos una compra activa asociada a este correo.",
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
