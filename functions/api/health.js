const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const environment = env?.KINECHECK_ENV || (url.hostname === "kinecheck.cl" || url.hostname === "www.kinecheck.cl" ? "production" : "preview");
  const version = env?.KINECHECK_VERSION || "2026.08.07.1";

  return new Response(JSON.stringify({
    status: "ok",
    service: "kinecheck-web",
    environment,
    version,
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

export async function onRequest({ request }) {
  return new Response(JSON.stringify({ status: "method_not_allowed" }), {
    status: 405,
    headers: { ...JSON_HEADERS, allow: "GET" },
  });
}
