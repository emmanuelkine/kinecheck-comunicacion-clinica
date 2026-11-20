import "jsr:@supabase/functions-js@2.117.2/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3?target=deno";
import { coursePrerequisites, createReviewStore } from "../../../academy-validation-panel/lib/review-store.mjs";
import { consolidatedXlsx, courseReport, decisionsJson, exportCsv, validationAct } from "../../../academy-validation-panel/lib/exporters.mjs";

const STATE_ID = "academy-otec-private-review";
const INSTRUMENT_ID = "academy-otec-private-instrument";
const INSTRUMENT_VERSION = "candidate-2026-11-19.2";
const MAX_BODY_BYTES = 256 * 1024;
const MAX_AUTHORIZATION_BYTES = 8192;
const CSV_EXPORTS = new Set(["pairs", "proposals", "variants", "rubrics", "gaps", "observations", "pilots"]);

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function allowedOrigin(origin: string | null) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol === "https:" && ["kinecheck.cl", "www.kinecheck.cl"].includes(hostname)) return true;
    if (url.protocol === "https:" && hostname.endsWith(".kinecheck-comunicacion-clinica.pages.dev") && hostname !== "kinecheck-comunicacion-clinica.pages.dev") return true;
    return url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(hostname);
  } catch {
    return false;
  }
}

function responseHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "https://kinecheck.cl",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kc-review",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "private, no-store, max-age=0",
    "Cross-Origin-Resource-Policy": "same-site",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(origin: string | null, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...responseHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

function attachment(origin: string | null, filename: string, contentType: string, body: BodyInit) {
  return new Response(body, {
    status: 200,
    headers: {
      ...responseHeaders(origin),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": contentType,
    },
  });
}

function readAuthorization(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  if (new TextEncoder().encode(authorization).byteLength > MAX_AUTHORIZATION_BYTES) return "";
  return /^Bearer\s+\S+$/i.test(authorization) ? authorization : "";
}

async function readInput(req: Request) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("Content-Type") || "")) {
    throw new ApiError(415, "Se requiere contenido JSON.");
  }
  const declared = Number(req.headers.get("Content-Length") || 0);
  if (declared > MAX_BODY_BYTES) throw new ApiError(413, "La solicitud excede el tamaño permitido.");
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new ApiError(413, "La solicitud excede el tamaño permitido.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new ApiError(400, "La solicitud JSON no es válida."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new ApiError(400, "La solicitud no es válida.");
  return parsed as Record<string, unknown>;
}

function objectPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "La carga de la operación no es válida.");
  return value as Record<string, unknown>;
}

function textId(value: unknown, pattern: RegExp, label: string) {
  const result = typeof value === "string" ? value : "";
  if (!pattern.test(result)) throw new ApiError(400, `${label} no válido.`);
  return result;
}

function validateAcademicBundle(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(503, "El paquete académico privado no es válido.");
  const bundle = value as Record<string, any>;
  if (bundle.instrumentVersion !== INSTRUMENT_VERSION
      || bundle.scorable !== false
      || bundle.counts?.courses !== 8
      || bundle.counts?.pairs !== 40
      || bundle.counts?.variants !== 80
      || bundle.counts?.gaps !== 8
      || !Array.isArray(bundle.courses)
      || bundle.courses.length !== 8
      || bundle.baseline?.otec !== "BLOQUEADA"
      || bundle.baseline?.certificates !== "BLOQUEADOS") {
    throw new ApiError(503, "El paquete académico privado no cumple el contrato fail-closed.");
  }
  return bundle;
}

async function authorizeOwner(req: Request) {
  const authorization = readAuthorization(req);
  if (!authorization) throw new ApiError(401, "Se requiere una sesión administrativa válida.");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new ApiError(503, "El servicio administrativo no está configurado.");

  const token = authorization.replace(/^Bearer\s+/i, "");
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  const email = String(user?.email || "").trim().toLowerCase();
  if (userError || !user || !email) throw new ApiError(401, "La sesión administrativa expiró o no es válida.");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: accessRows, error: accessError } = await admin
    .from("course_access")
    .select("active,access_source,last_event")
    .eq("email", email)
    .eq("active", true);
  if (accessError) throw new ApiError(503, "No fue posible verificar la autorización administrativa.");
  const owner = (accessRows || []).some((row) =>
    String(row.access_source || "").toLowerCase() === "owner"
    || String(row.last_event || "").toUpperCase() === "OWNER_ACCESS"
  );
  if (!owner) throw new ApiError(403, "La cuenta no tiene autorización para validar Academy.");
  return { admin, user };
}

async function loadAcademicBundle(admin: ReturnType<typeof createClient>) {
  const { data: row, error } = await admin
    .from("academy_academic_review_instruments")
    .select("instrument_version,panel_data")
    .eq("id", INSTRUMENT_ID)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new ApiError(503, "No fue posible cargar el paquete académico privado.");
  if (!row || row.instrument_version !== INSTRUMENT_VERSION) {
    throw new ApiError(503, "El paquete académico privado aún no ha sido instalado.");
  }
  return validateAcademicBundle(row.panel_data);
}

function persistence(admin: ReturnType<typeof createClient>, actorUserId: string, instrumentVersion: string) {
  return {
    async load() {
      const { data: row, error } = await admin
        .from("academy_academic_review_state")
        .select("instrument_version,revision,state")
        .eq("id", STATE_ID)
        .maybeSingle();
      if (error) throw new ApiError(503, "No fue posible cargar las decisiones académicas.");
      if (!row) throw new ApiError(503, "La persistencia académica todavía no ha sido inicializada.");
      if (row.instrument_version !== instrumentVersion) throw new ApiError(409, "La versión persistida del instrumento no coincide con el panel.");
      return { state: row.state, revision: row.revision };
    },
    async save({ state, event, expectedRevision }: { state: unknown; event: unknown; expectedRevision: number }) {
      const { data: nextRevision, error } = await admin.rpc("kc_academy_review_commit", {
        p_instrument_version: instrumentVersion,
        p_expected_revision: expectedRevision,
        p_state: state,
        p_event: event,
        p_actor_user_id: actorUserId,
      });
      if (error?.code === "40001") throw new ApiError(409, "Otra sesión guardó cambios. Recarga antes de volver a guardar.");
      if (error) throw new ApiError(503, "No fue posible guardar la decisión académica.");
      return Number(nextRevision);
    },
  };
}

async function handleOperation(input: Record<string, unknown>, admin: ReturnType<typeof createClient>, actorUserId: string, origin: string | null) {
  const data = await loadAcademicBundle(admin);
  const store = createReviewStore({
    instrumentVersion: data.instrumentVersion,
    persistence: persistence(admin, actorUserId, data.instrumentVersion),
  });
  await store.load();
  const operation = typeof input.operation === "string" ? input.operation : "";

  if (operation === "bootstrap") {
    const state = store.snapshot();
    return json(origin, { data, state, reviewer: state.reviewer, revision: store.revision(), otec: { status: "BLOQUEADA", certificatesEnabled: false } });
  }

  if (operation === "pair_review") {
    const pairId = textId(input.pairId, /^[A-Z]{2}-C\d{2}$/, "Par");
    if (!data.courses.some((course) => course.pairs.some((pair) => pair.pairId === pairId))) throw new ApiError(404, "Par no encontrado.");
    return json(origin, await store.reviewPair(pairId, objectPayload(input.payload)));
  }
  if (operation === "gap_review") {
    const pairId = textId(input.pairId, /^[A-Z]{2}-C\d{2}$/, "Brecha");
    if (!data.courses.some((course) => course.pairs.some((pair) => pair.pairId === pairId && pair.sourceGap))) throw new ApiError(404, "Brecha no encontrada.");
    return json(origin, await store.reviewGap(pairId, objectPayload(input.payload)));
  }
  if (operation === "course_review") {
    const slug = textId(input.courseSlug, /^[a-z0-9-]+$/, "Curso");
    if (!data.courses.some((course) => course.slug === slug)) throw new ApiError(404, "Curso no encontrado.");
    return json(origin, await store.reviewCourse(slug, objectPayload(input.payload), coursePrerequisites(data, store.snapshot(), slug)));
  }
  if (operation === "pilot_add") {
    const payload = objectPayload(input.payload);
    if (!data.courses.some((course) => course.slug === payload.courseSlug)) throw new ApiError(400, "Curso de pilotaje no válido.");
    return json(origin, await store.addPilot(payload));
  }

  if (operation === "course_report") {
    const slug = textId(input.courseSlug, /^[a-z0-9-]+$/, "Curso");
    const course = data.courses.find((item) => item.slug === slug);
    if (!course) throw new ApiError(404, "Curso no encontrado.");
    return attachment(origin, `${slug}-informe.md`, "text/markdown; charset=utf-8", courseReport(course, data, store.snapshot()));
  }
  if (operation === "export") {
    const kind = typeof input.kind === "string" ? input.kind : "";
    const state = store.snapshot();
    if (kind === "consolidated.xlsx") return attachment(origin, "kinecheck-academy-validacion.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", consolidatedXlsx(data, state));
    if (kind === "decisions.json") return attachment(origin, "kinecheck-academy-decisiones.json", "application/json; charset=utf-8", decisionsJson(data, state));
    if (kind === "acta.md") return attachment(origin, "kinecheck-academy-acta-validacion.md", "text/markdown; charset=utf-8", validationAct(data, state));
    if (kind.endsWith(".csv") && CSV_EXPORTS.has(kind.slice(0, -4))) return attachment(origin, `kinecheck-academy-${kind}`, "text/csv; charset=utf-8", exportCsv(kind.slice(0, -4), data, state));
    throw new ApiError(404, "Exportación no encontrada.");
  }
  throw new ApiError(400, "Operación administrativa no permitida.");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (!allowedOrigin(origin)) return json(null, { message: "Origen no permitido." }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(origin) });
  if (req.method !== "POST") return json(origin, { message: "Método no permitido." }, 405);

  try {
    const input = await readInput(req);
    const { admin, user } = await authorizeOwner(req);
    return await handleOperation(input, admin, user.id, origin);
  } catch (error) {
    const status = error instanceof ApiError ? error.status
      : /Invalid|requires|Expected|missing|must|cannot|exceeds|pseudonymous/i.test(error instanceof Error ? error.message : "") ? 422
      : 500;
    if (status >= 500) console.error("academy-admin-review", error instanceof Error ? error.name : "UnknownError", status);
    const message = error instanceof ApiError || status < 500
      ? (error instanceof Error ? error.message : "Solicitud no válida.")
      : "No fue posible completar la operación administrativa.";
    return json(origin, { message }, status);
  }
});
