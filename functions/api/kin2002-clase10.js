const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const clean = (value, max = 500) => typeof value === "string" ? value.trim().slice(0,max) : "";
const sameOrigin = (request) => { const origin=request.headers.get("Origin"); return !origin || origin === new URL(request.url).origin; };
const namespace = (env) => env.KIN2002_ACTIVITY_KV;
function validate(payload) {
  if (!payload || !Array.isArray(payload.students) || ![2,3].includes(payload.students.length)) return "Se requieren dos o tres estudiantes.";
  const ids=new Set();
  for(const student of payload.students) {
    const id=clean(student.identifier,80).toLowerCase();
    if(!/^[a-z0-9._@-]{5,80}$/.test(id)) return "Cada estudiante debe indicar un correo institucional o identificador académico válido.";
    if(ids.has(id)) return "No se pueden repetir estudiantes.";
    ids.add(id);
    if(clean(student.name,100).length<5) return "Falta el nombre completo de un integrante.";
    if(clean(student.synthesis,1500).length<35) return "Cada estudiante debe redactar su síntesis clínica (mínimo 35 caracteres).";
  }
  if(clean(payload.hypotheses,1500).length<35 || clean(payload.plan,1800).length<35) return "Completen el razonamiento clínico y el plan de intervención.";
  if(!Array.isArray(payload.unlocked) || payload.unlocked.length<3) return "Revisen al menos tres datos clínicos mediante las preguntas interactivas.";
  if(payload.consent !== true) return "Se requiere confirmar la entrega académica de las respuestas.";
  return null;
}
export async function onRequestPost({request,env}) {
  if(!sameOrigin(request)) return json({error:"Origen no permitido."},403);
  if(!namespace(env)) return json({error:"Almacenamiento no configurado. No se guardó la entrega."},503);
  if(Number(request.headers.get("content-length") || "0") > 25000) return json({error:"Entrega demasiado grande."},413);
  let payload; try {payload=await request.json();} catch {return json({error:"Formato inválido."},400);}
  const error=validate(payload); if(error)return json({error},400);
  const groupId=crypto.randomUUID(), timestamp=new Date().toISOString();
  const common={activity:"KIN2002 Clase 10",groupId,timestamp, partners:payload.students.map(s=>clean(s.name,100)),hypotheses:clean(payload.hypotheses,1500),plan:clean(payload.plan,1800),unlocked:payload.unlocked.slice(0,20).map(s=>clean(s,60)),roleNotes:clean(payload.roleNotes,1000)};
  const records=payload.students.map((s,i)=>({...common,name:clean(s.name,100),identifier:clean(s.identifier,80).toLowerCase(),individualSynthesis:clean(s.synthesis,1500),member:i+1}));
  try {
    await Promise.all(records.map(async record=>{
      const key="kin2002:10:"+groupId+":"+record.member;
      await namespace(env).put(key,JSON.stringify(record));
    }));
  }catch{return json({error:"No fue posible confirmar todas las entregas. Contacta al docente antes de reenviar."},503);}
  return json({ok:true,receipt:groupId,timestamp,students:records.map(r=>({name:r.name,identifier:r.identifier})),message:"Respuestas recibidas. Actividad sin calificación."},201);
}
export async function onRequestGet({request,env}) {
  const token=env.KIN2002_ADMIN_TOKEN;
  if(!token || request.headers.get("authorization")!=="Bearer "+token)return json({error:"Acceso restringido"},403);
  if(!namespace(env))return json({error:"Almacenamiento no configurado"},503);
  let cursor, records=[];
  do {
    const page=await namespace(env).list({prefix:"kin2002:10:",limit:1000,cursor});
    const entries=await Promise.all(page.keys.map(k=>namespace(env).get(k.name,{type:"json"})));
    records.push(...entries.filter(Boolean));
    cursor=page.list_complete?null:page.cursor;
  }while(cursor);
  records.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  return json({count:records.length,groups:new Set(records.map(r=>r.groupId)).size,records});
}