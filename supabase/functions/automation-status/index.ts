import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://kinecheck.cl",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "private, no-store, max-age=0",
  "Vary": "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ message: "Método no permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ message: "No configurado." }, 503);

    const authorization = req.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ message: "Sesión requerida." }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    const email = String(userData.user?.email || "").trim().toLowerCase();
    if (userError || !userData.user || !email) return json({ message: "Sesión inválida." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: ownerRows } = await admin
      .from("course_access")
      .select("access_source,last_event")
      .eq("email", email);
    const isOwner = (ownerRows || []).some((row) =>
      String(row.access_source || "").toLowerCase() === "owner" ||
      String(row.last_event || "").toUpperCase() === "OWNER_ACCESS"
    );
    if (!isOwner) return json({ message: "Acceso administrativo no autorizado." }, 403);

    try { await admin.rpc("kinecheck_rollup_daily_metrics"); } catch { /* Keep dashboard reads available if the optional rollup fails. */ }

    const [
      metrics,
      runs,
      support,
      beta,
      issues,
      restore,
      unreadCount,
      legalCount,
    ] = await Promise.all([
      admin.from("kinecheck_daily_metrics").select("metric_date,payload,updated_at").order("metric_date", { ascending: false }).limit(1).maybeSingle(),
      admin.from("kinecheck_automation_runs").select("id,job_name,started_at,finished_at,status,metrics,error_message,source").order("started_at", { ascending: false }).limit(20),
      admin.from("kinecheck_support_requests").select("id,created_at,email,category,product_slug,status,priority,automated_diagnosis").in("status", ["open","in_progress","waiting_user"]).order("created_at", { ascending: false }).limit(20),
      admin.from("beta_applications").select("id,created_at,email,full_name,role,product_interest,device,status,triage_score,triage_band").in("status", ["new","shortlisted","invited","active"]).order("triage_score", { ascending: false }).limit(20),
      admin.from("kinecheck_reconciliation_issues").select("id,issue_type,severity,course_slug,transaction_id,status,first_seen_at,last_seen_at,details").eq("status", "open").order("last_seen_at", { ascending: false }).limit(20),
      admin.from("kinecheck_restore_drills").select("id,created_at,status,scope,manifest,validation").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("kinecheck_notifications").select("id", { count: "exact", head: true }).is("read_at", null),
      admin.from("kinecheck_legal_acceptances").select("id", { count: "exact", head: true }),
    ]);

    const engagementSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: engagementRows, error: engagementError } = await admin
      .from("kinecheck_public_events")
      .select("event_name,occurred_at,path,session_id,metadata")
      .eq("is_qa", false).gte("occurred_at", engagementSince)
      .in("event_name", ["page_view","product_view","checkout_start","buy_click","hotmart_outbound","academy_open","academy_opened","course_open","free_resource_open","ebook_download","certification_interest","certification_request_sent","certification_request_failed","ecosystem_click","email_click"])
      .order("occurred_at", { ascending: false }).limit(5000);
    if (engagementError) console.error("automation-status engagement", engagementError.code);
    const rows = engagementRows || [];
    const count = (name: string) => rows.filter((row) => row.event_name === name).length;
    const certificationViews = rows.filter((row) =>
      row.event_name === "page_view" && String(row.path || "").replace(/\/$/, "") === "/certificacion"
    ).length;
    const distinctSessions = new Set(rows.map((row) => row.session_id).filter(Boolean)).size;
    const aggregate = (eventName: string, key: string) => {
      const totals = new Map<string, number>();
      for (const row of rows) {
        if (row.event_name !== eventName) continue;
        const value = String((row.metadata || {})[key] || "").trim().slice(0, 180);
        if (value) totals.set(value, (totals.get(value) || 0) + 1);
      }
      return [...totals.entries()].map(([label, total]) => ({ label, total }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)).slice(0, 10);
    };
    const freeLibraryRows = rows.filter((row) => String(row.path || "").replace(/\/$/, "") === "/gratis");
    const freeLibraryPageViews = freeLibraryRows.filter((row) => row.event_name === "page_view").length;
    const freeLibrarySessions = new Set(freeLibraryRows.filter((row) => row.event_name === "page_view").map((row) => row.session_id).filter(Boolean)).size;
    const ebookDownloads = freeLibraryRows.filter((row) => row.event_name === "ebook_download").length;
    const freeResourceOpens = freeLibraryRows.filter((row) => row.event_name === "free_resource_open").length;
    const ecosystemFromLibrary = freeLibraryRows.filter((row) => row.event_name === "ecosystem_click").length;
    const academySessions = new Set(rows.filter((row) => ["academy_open","academy_opened"].includes(row.event_name)).map((row) => row.session_id).filter(Boolean)).size;
    const courseOpens = rows.filter((row) => row.event_name === "course_open").length;
    const checkoutStarts = rows.filter((row) => row.event_name === "checkout_start").length;
    const buyClicks = rows.filter((row) => row.event_name === "buy_click").length;
    const hotmartOutbounds = rows.filter((row) => row.event_name === "hotmart_outbound").length;
    const resourcesByName = aggregate("free_resource_open", "resource");

    const { data: progressRows } = await admin.from("learning_progress").select("course_slug,user_id,updated_at");
    const courseLearners = new Map<string, Set<string>>();
    for (const row of progressRows || []) {
      const slug = String(row.course_slug || "unknown");
      if (!courseLearners.has(slug)) courseLearners.set(slug, new Set());
      if (row.user_id) courseLearners.get(slug)!.add(String(row.user_id));
    }
    const learnersByCourse = [...courseLearners.entries()].map(([label, users]) => ({ label, total: users.size }))
      .sort((a,b) => b.total - a.total || a.label.localeCompare(b.label));

    const engagement = {
      since: engagementSince, certificationViews,
      freeLibraryPageViews, freeLibrarySessions, ebookDownloads, freeResourceOpens,
      ecosystemFromLibrary, academySessions, courseOpens, checkoutStarts, buyClicks, hotmartOutbounds,
      resourcesByName, learnersByCourse,
      certificationInterests: count("certification_interest"),
      certificationRequestsSent: count("certification_request_sent"),
      certificationRequestFailures: count("certification_request_failed"),
      emailClicks: count("email_click"), ecosystemClicks: count("ecosystem_click"),
      approximateUniqueSessions: distinctSessions,
      interestsByCourse: aggregate("certification_interest", "course"),
      requestsByCourse: aggregate("certification_request_sent", "course"),
      clicksByDestination: aggregate("ecosystem_click", "destination"),
    };

    const payload = (metrics.data?.payload || {}) as Record<string, unknown>;
    const numberMetric = (key: string) => Number(payload[key] || 0);

    return json({
      generatedAt: new Date().toISOString(),
      email,
      metrics: metrics.data || null,
      engagement,
      automationRuns: runs.data || [],
      supportRequests: support.data || [],
      betaApplications: beta.data || [],
      reconciliationIssues: issues.data || [],
      latestRestore: restore.data || null,
      queuedOutbox: numberMetric("queued_outbox"),
      queuedOutboxTotal: numberMetric("queued_outbox_total"),
      queuedOutboxNonproduction: numberMetric("queued_outbox_nonproduction"),
      expiring30Days: numberMetric("expiring_30_days"),
      expiring30DaysTotal: numberMetric("expiring_30_days_total"),
      expiring30DaysNonproduction: numberMetric("expiring_30_days_nonproduction"),
      unreadNotifications: unreadCount.count || 0,
      legalAcceptances: legalCount.count || 0,
    });
  } catch (error) {
    console.error("automation-status", error);
    return json({ message: "No fue posible cargar el estado de automatización." }, 500);
  }
});
