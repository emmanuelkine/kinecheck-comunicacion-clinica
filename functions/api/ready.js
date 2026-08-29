const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
};

async function check(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: options.method || "HEAD",
      headers: options.headers || {},
      body: options.body,
      redirect: "manual",
      signal: controller.signal,
      cache: "no-store",
    });
    return {
      ok: response.status > 0 && response.status < 500,
      status: response.status,
    };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const supabaseUrl = env?.SUPABASE_URL || "https://eqhcdclyeoapmqtlduwf.supabase.co";
  const supabaseAnonKey = env?.SUPABASE_ANON_KEY || "";
  const ssoOrigin = env?.KINECHECK_SSO_ORIGIN || "https://apps.kinecheck.cl";

  const [publicSite, academy, auth, licenseService, sso] = await Promise.all([
    check(`${origin}/`),
    check(`${origin}/academy/`),
    check(`${supabaseUrl}/auth/v1/health`, { method: "GET" }),
    check(`${supabaseUrl}/functions/v1/course-key`, {
      method: "POST",
      headers: {
        ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
        "content-type": "application/json",
      },
      body: JSON.stringify({ courseSlug: "__readiness_probe__" }),
    }),
    check(`${ssoOrigin}/sso.html?product=kinecheck-estudiante`, { method: "GET" }),
  ]);

  const checks = {
    publicSite,
    academy,
    auth,
    licenseService,
    sso,
  };
  const ready = Object.values(checks).every((result) => result.ok);
  const environment = env?.KINECHECK_ENV || (url.hostname === "kinecheck.cl" || url.hostname === "www.kinecheck.cl" ? "production" : "preview");

  return new Response(JSON.stringify({
    status: ready ? "ready" : "degraded",
    service: "kinecheck-web",
    environment,
    checks,
    timestamp: new Date().toISOString(),
  }), {
    status: ready ? 200 : 503,
    headers: JSON_HEADERS,
  });
}

export async function onRequest({ request }) {
  return new Response(JSON.stringify({ status: "method_not_allowed" }), {
    status: 405,
    headers: { ...JSON_HEADERS, allow: "GET" },
  });
}
