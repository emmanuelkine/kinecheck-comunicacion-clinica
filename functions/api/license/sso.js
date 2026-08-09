const UPSTREAM_DEFAULT = "https://kinecheck-clinico.emmanuelkine.chatgpt.site";
const ALLOWED_PRODUCTS = new Set([
  "kinecheck-clinico",
  "kinecheck-estudiante",
  "kinecheck-recupera",
]);

const RESPONSE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

function errorResponse(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...RESPONSE_HEADERS, "content-type": "application/json; charset=utf-8" },
  });
}

function copyResponseHeaders(source) {
  const headers = new Headers(RESPONSE_HEADERS);
  for (const [name, value] of source.headers) {
    const key = name.toLowerCase();
    if (["content-length", "content-encoding", "transfer-encoding", "connection"].includes(key)) continue;
    headers.append(name, value);
  }
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("x-kinecheck-sso", "same-origin");
  return headers;
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.formData();
  } catch {
    return errorResponse(400, "invalid_form");
  }

  const product = String(body.get("product") || "").trim();
  const accessToken = String(body.get("access_token") || "").trim();
  const handoffType = String(body.get("handoff_type") || "").trim();
  if (!ALLOWED_PRODUCTS.has(product)) return errorResponse(400, "invalid_product");
  if (!accessToken) return errorResponse(400, "missing_access_token");
  if (handoffType && handoffType !== "kinecheck-sso-v3-access-only") {
    return errorResponse(400, "invalid_handoff_type");
  }

  const upstreamOrigin = String(env?.KINECHECK_SSO_ORIGIN || UPSTREAM_DEFAULT).replace(/\/$/, "");
  const upstreamBody = new URLSearchParams();
  for (const [name, value] of body.entries()) {
    if (typeof value === "string") upstreamBody.append(name, value);
  }

  let upstream;
  try {
    upstream = await fetch(`${upstreamOrigin}/api/license/sso`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "accept": request.headers.get("accept") || "text/html,application/xhtml+xml",
        "user-agent": request.headers.get("user-agent") || "KineCheck-SSO-Proxy/1.0",
      },
      body: upstreamBody.toString(),
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return errorResponse(502, "sso_upstream_unavailable");
  }

  const headers = copyResponseHeaders(upstream.headers);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export async function onRequest() {
  return errorResponse(405, "method_not_allowed");
}
