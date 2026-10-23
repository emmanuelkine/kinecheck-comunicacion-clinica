const TTL = 15552000;
const PREFIX = 'kin2002role:';
const LEGACY_HASH = '4c359877fed4a6cbcf9600adf9e6a79108e7dbd8c86741f68c0e249afe35ef4e';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const FIELDS = ['interview', 'safety', 'evaluation', 'initial', 'adaptation', 'strength', 'improvement', 'replay'];
const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff'}});
const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('');
const text = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';

async function isTeacher(request, env) {
  const bearer = request.headers.get('authorization') || '';
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
  if (!token || token.length > 6000) return false;
  if (await hash(token) === LEGACY_HASH) return true;
  if (!token.startsWith('ey') || !env.C2_ADMIN_EMAIL) return false;
  try {
    const res = await fetch('https://eqhcdclyeoapmqtlduwf.supabase.co/auth/v1/user', {headers: {authorization: bearer, apikey: 'sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_'}});
    if (!res.ok) return false;
    const user = await res.json();
    return String(user.email || '').toLowerCase() === String(env.C2_ADMIN_EMAIL).trim().toLowerCase();
  } catch { return false; }
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > 200000) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 200000) return null;
  try { const body = JSON.parse(raw); return body && typeof body === 'object' && !Array.isArray(body) ? body : null; } catch { return null; }
}

export async function onRequestPost({request, env}) {
  if (!sameOrigin(request)) return json({error: 'Origen no permitido.'}, 403);
  const b = await readBody(request);
  if (!b) return json({error: 'Solicitud inválida o demasiado extensa.'}, 400);
  if (!env.CERT_REQUESTS) return json({error: 'El registro no está disponible. Conserva tu borrador y vuelve a intentar.'}, 503);
  if (b.action === 'receipt') {
    if (!UUID.test(b.id || '') || !/^[a-f0-9]{64}$/.test(b.token || '')) return json({error: 'Comprobante no autorizado.'}, 403);
    const record = await env.CERT_REQUESTS.get(PREFIX + b.id, 'json');
    if (!record || record.readHash !== await hash(b.token)) return json({error: 'Comprobante no autorizado.'}, 403);
    return json({ok: true, id: record.id, createdAt: record.createdAt, teacherFeedback: record.teacherFeedback || '', reviewedAt: record.reviewedAt || null, status: record.teacherFeedback ? 'Retroalimentado' : 'Pendiente de revisión docente'});
  }
  if (b.website) return json({error: 'No fue posible validar el envío.'}, 400);
  if (!UUID.test(b.id || '') || !/^[a-f0-9]{64}$/.test(b.token || '') || !['S1', 'S2'].includes(b.section) || !['lumbar', 'hombro'].includes(b.caseId)) return json({error: 'Revisa la sección y el caso.'}, 400);
  const members = Array.isArray(b.members) ? b.members.map(v => text(v, 100)) : [];
  const group = text(b.group, 50);
  if (![3, 4].includes(members.length) || members.some(v => v.length < 3) || !group) return json({error: 'Indica el grupo y los nombres de tres o cuatro integrantes.'}, 400);
  if (!Array.isArray(b.rounds) || b.rounds.length !== members.length) return json({error: 'Completa todas las rondas para rotar los tres roles.'}, 400);
  const expected = ['contrast', 'purpose', 'provisional', 'adjust', 'specific'];
  const rounds = b.rounds.map((round, index) => ({
    number: index + 1,
    ...Object.fromEntries(FIELDS.map(key => [key, text(round?.[key], 1100)])),
    checks: Object.fromEntries(expected.map((choice, i) => {
      const check = round?.checks?.[i + 1] || {};
      return [i + 1, {choice: text(check.choice, 30), observed: text(check.observed, 12), evidence: text(check.evidence, 400)}];
    })),
    attempts: Array.isArray(round?.attempts) ? round.attempts.slice(0, 100).map(attempt => ({stage: Number(attempt.stage), choice: text(attempt.choice, 30), at: text(attempt.at, 40)})) : []
  }));
  if (rounds.some(round => FIELDS.some(key => round[key].length < 12))) return json({error: 'Completa las decisiones y la observación de cada ronda con al menos 12 caracteres.'}, 400);
  if (rounds.some(round => expected.some((choice, i) => round.checks[i + 1].choice !== choice || round.checks[i + 1].observed !== 'yes' || round.checks[i + 1].evidence.length < 12))) return json({error: 'Revisa los puntos de control y la evidencia del observador en todas las rondas.'}, 400);
  const payload = {section: b.section, caseId: b.caseId, group, members, rounds};
  const digest = await hash(JSON.stringify(payload));
  const readHash = await hash(b.token);
  const key = PREFIX + b.id;
  const old = await env.CERT_REQUESTS.get(key, 'json');
  if (old) {
    if (old.digest !== digest || old.readHash !== readHash) return json({error: 'Este código corresponde a otra entrega. No se sobrescribió el trabajo anterior.'}, 409);
    return json({ok: true, id: old.id, createdAt: old.createdAt, duplicate: true});
  }
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) {
    const rateKey = 'kin2002role-rate:' + (await hash(ip)).slice(0, 24) + ':' + Math.floor(Date.now() / 60000);
    const count = Number(await env.CERT_REQUESTS.get(rateKey)) || 0;
    if (count >= 60) return json({error: 'Hay muchos envíos simultáneos. Espera un minuto; tu borrador se conserva.'}, 429);
    await env.CERT_REQUESTS.put(rateKey, String(count + 1), {expirationTtl: 120});
  }
  const record = {...payload, id: b.id, digest, readHash, createdAt: new Date().toISOString(), teacherFeedback: '', status: 'Pendiente de revisión docente'};
  try { await env.CERT_REQUESTS.put(key, JSON.stringify(record), {expirationTtl: TTL}); }
  catch { return json({error: 'No se confirmó el guardado. Conserva el borrador y vuelve a intentar con el mismo código.'}, 503); }
  return json({ok: true, id: record.id, createdAt: record.createdAt}, 201);
}

export async function onRequestGet({request, env}) {
  if (!await isTeacher(request, env)) return json({error: 'Acceso docente no autorizado. Inicia sesión en el panel o utiliza tu clave KIN2002.'}, 401);
  if (!env.CERT_REQUESTS) return json({error: 'Registro no disponible.'}, 503);
  const cursor = new URL(request.url).searchParams.get('cursor') || undefined;
  const page = await env.CERT_REQUESTS.list({prefix: PREFIX, limit: 30, cursor});
  const records = (await Promise.all(page.keys.map(key => env.CERT_REQUESTS.get(key.name, 'json')))).filter(Boolean).map(({readHash, digest, ...record}) => record);
  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json({records, cursor: page.list_complete ? null : page.cursor});
}

export async function onRequestPut({request, env}) {
  if (!sameOrigin(request)) return json({error: 'Origen no permitido.'}, 403);
  if (!await isTeacher(request, env)) return json({error: 'No autorizado.'}, 401);
  const b = await readBody(request);
  if (!b || !UUID.test(b.id || '') || text(b.feedback, 4000).length < 5) return json({error: 'Escribe una retroalimentación de al menos cinco caracteres.'}, 400);
  if (!env.CERT_REQUESTS) return json({error: 'Registro no disponible.'}, 503);
  const key = PREFIX + b.id;
  const old = await env.CERT_REQUESTS.get(key, 'json');
  if (!old) return json({error: 'Entrega no encontrada.'}, 404);
  const reviewedAt = new Date().toISOString();
  await env.CERT_REQUESTS.put(key, JSON.stringify({...old, teacherFeedback: text(b.feedback, 4000), reviewedAt, status: 'Retroalimentado'}), {expirationTtl: TTL});
  return json({ok: true, reviewedAt});
}
