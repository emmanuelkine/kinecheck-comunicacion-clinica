const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
};

async function check(url, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "manual", signal: controller.signal, cache: "no-store" });
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const checks = {
    publicSite: await check(`${origin}/`),
    academy: await check(`${origin}/academy/`),
  };
  const ready = Object.values(checks).every(Boolean);
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
