import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "private, no-store, max-age=0",
};
const COURSE_SLUG = "dolor-lumbar-persistente";
const ASSETS = [
  "dolor-lumbar-persistente/data-v6.js",
  "dolor-lumbar-persistente/app-v6.js",
];

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
}
function js(source: string) {
  return new Response(source, { status: 200, headers: { ...cors, "Content-Type": "text/javascript; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
}
function validSource(source: string) {
  const value = source.trimStart().toLowerCase();
  return Boolean(source.trim()) && !value.startsWith("<!doctype") && !value.startsWith("<html");
}

function repairLumbarRenderer(source: string) {
  return source
    .replace("function valid(v,min,max){return !isNaN(v)&&v>=min&&v<=max;}", "function valid(v,min,max){return Number.isFinite(v)&&Number.isInteger(v)&&v>=min&&v<=max;}")
    .replace("var v=Number(inp.value);if(!valid(v,0,24))", "if(inp.value.trim()===''){result.innerHTML='Ingresa el número de ítems marcados.';return;}var v=Number(inp.value);if(!valid(v,0,24))")
    .replace("var a=Number(cur.value),b=Number(best.value),c=Number(worst.value);", "if([cur,best,worst].some(function(x){return x.value.trim()==='';})){result.innerHTML='Completa los tres valores entre 0 y 10.';return;}var a=Number(cur.value),b=Number(best.value),c=Number(worst.value);")
    .replace("result.innerHTML='<strong>Actual '+a+'/10</strong>", "if(b>c){result.innerHTML='El mejor dolor no puede superar al peor dolor del mismo período.';return;}result.innerHTML='<strong>Actual '+a+'/10</strong>")
    .replace("x.placeholder=placeholder;return x;", "x.placeholder=placeholder;x.setAttribute('aria-label',placeholder);return x;")
    .replace(/Casos ramificados/g, "Casos de decisión clínica")
    .replace("Modelos interactivos originales.", "Esquemas visuales originales.")
    .replace(/casos ramificados/g, "casos de decisión clínica")
    .replace(/Casos clínicos ramificados/g, "Casos de decisión clínica")
    .replace(/atlas interactivos/g, "esquemas visuales")
    .replace(/Atlas visual interactivo/g, "Atlas visual")
    .replace("Cada decisión modifica el recorrido y entrega feedback basado en seguridad, función y evidencia.", "Cada decisión entrega retroalimentación basada en seguridad, función y evidencia.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ message: "Método no permitido." }, 405);
  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ message: "La sesión no es válida o ha expirado." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ message: "La autorización del curso no está configurada." }, 503);

    const body = await req.json().catch(() => ({}));
    if (String(body.courseSlug || "").trim() !== COURSE_SLUG) return json({ message: "Curso no reconocido." }, 400);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    const email = String(user?.email || "").trim().toLowerCase();
    if (userError || !user || !email) return json({ message: "La sesión no es válida o ha expirado." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: access, error } = await admin.from("course_access")
      .select("active,access_expires_at,access_source,last_event")
      .eq("email", email).eq("course_slug", COURSE_SLUG).maybeSingle();
    if (error) {
      console.error("dolor-lumbar access", error);
      return json({ message: "No fue posible verificar el acceso al curso." }, 500);
    }

    // Match the existing ecosystem owner policy after validating the session server-side.
    const configuredOwnerEmails = Deno.env.get("KINECHECK_OWNER_EMAILS") || "emmanuelkine@gmail.com,emmanuelkine+owner@gmail.com,emmanuel_fox@hotmail.com";
    const accountOwner = configuredOwnerEmails.split(",").map(value => value.trim().toLowerCase()).includes(email);
    const owner = String(access?.access_source || "").toLowerCase() === "owner" || String(access?.last_event || "").toUpperCase() === "OWNER_ACCESS";
    const expiresAt = access?.access_expires_at ? new Date(access.access_expires_at).getTime() : null;
    const usable = accountOwner || (Boolean(access?.active) && (owner || expiresAt === null || (Number.isFinite(expiresAt) && expiresAt > Date.now())));
    if (!usable) {
      const expired = expiresAt !== null && Number.isFinite(expiresAt) && expiresAt <= Date.now();
      return json({ code: expired ? "ACCESS_TERM_EXPIRED" : "ACCESS_NOT_ACTIVE", message: expired ? "El período de acceso de este producto finalizó." : "No encontramos una licencia activa para este curso." }, 403);
    }

    const sources: string[] = [];
    for (const path of ASSETS) {
      const { data: file, error: storageError } = await admin.storage.from("course-assets").download(path);
      if (storageError || !file) {
        console.error("dolor-lumbar protected asset", { path, storageError });
        return json({ message: "No fue posible cargar el contenido protegido del curso." }, 500);
      }
      const source = await file.text();
      if (!validSource(source)) return json({ message: "El contenido protegido del curso no es válido." }, 500);
      sources.push(path.endsWith("/app-v6.js") ? repairLumbarRenderer(source) : source);
    }
    return js(sources.join("\n;\n"));

  } catch (error) {
    console.error("dolor-lumbar-course-key", error);
    return json({ message: "Error inesperado." }, 500);
  }
});
