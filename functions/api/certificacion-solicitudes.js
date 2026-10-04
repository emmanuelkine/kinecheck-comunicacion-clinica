const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store, max-age=0" },
});
const SUPABASE_URL = "https://eqhcdclyeoapmqtlduwf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_";

export async function onRequestGet({ request, env }) {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return json({ message: "Sesión requerida." }, 401);
  if (!env.CERT_REQUESTS?.list || !env.CERT_REQUESTS?.get) return json({ message: "Historial de solicitudes no disponible." }, 503);
  try {
    const check = await fetch(`${SUPABASE_URL}/functions/v1/platform-context`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: authorization, "content-type": "application/json" },
      body: "{}", cache: "no-store",
    });
    const account = await check.json().catch(() => ({}));
    if (!check.ok || account.owner !== true) return json({ message: "Acceso administrativo no autorizado." }, 403);
    const keys = [];
    let cursor;
    for (let page = 0; page < 10; page += 1) {
      const result = await env.CERT_REQUESTS.list({ prefix: "cert:", limit: 1000, ...(cursor ? { cursor } : {}) });
      keys.push(...(result.keys || []));
      if (result.list_complete || !result.cursor) break;
      cursor = result.cursor;
    }
    const requests = [];
    for (const key of keys) {
      const raw = await env.CERT_REQUESTS.get(key.name);
      if (!raw) continue;
      try {
        const value = JSON.parse(raw);
        const nombre = String(value.nombre || "").slice(0, 100);
        const email = String(value.email || "").trim().toLowerCase().slice(0, 160);
        const curso = String(value.curso || "").slice(0, 120);
        const fecha = String(value.fecha || "");
        if (nombre && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && curso) requests.push({ nombre, email, curso, fecha });
      } catch { /* Never return stored email HTML or message text. */ }
    }
    requests.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    return json({ requests: requests.slice(0, 100), total: requests.length, retentionDays: 90 });
  } catch (error) {
    console.error("certification requests admin read failed", error?.name || "unknown");
    return json({ message: "No fue posible cargar las solicitudes." }, 500);
  }
}
export function onRequestPost() { return json({ message: "Método no permitido." }, 405); }
