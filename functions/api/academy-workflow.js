const BASE='https://eqhcdclyeoapmqtlduwf.supabase.co';
const KEY='sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_';
const ACTIONS=new Set(['status','start','stage','dashboard','ortho_teacher_metrics','review_queue','review','item_analysis','monthly_report','request_certificate','issue_certificate','revoke_certificate','revoke_approval','reconcile','verify_completion','clear_administration','enroll','approve_version','activate_version']);
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
export function createHandler({fetcher=fetch}={}) {
 return async({request,env={}})=>{
  if(env.ACADEMY_COMPETENCY_PREVIEW!=='enabled')return json({message:'El piloto por competencias no está habilitado.'},404);
  if(request.method!=='POST')return json({message:'Método no permitido.'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({message:'Origen no permitido.'},403);
  const token=request.headers.get('authorization')||'';
  if(!/^Bearer [^\s]+$/.test(token))return json({message:'Ingresa a Academy para continuar.'},401);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json({message:'Formato requerido: JSON.'},415);
  try {
   const reader=request.body?.getReader();if(!reader)return json({message:'Solicitud vacía.'},400);
   let size=0;const chunks=[];
   for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>100000){await reader.cancel();return json({message:'Solicitud demasiado extensa.'},413);}chunks.push(value);}
   const buffer=new Uint8Array(size);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
   let input;try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer));}catch{return json({message:'Datos inválidos.'},400);}
   if(!ACTIONS.has(input?.action)||!input.payload||typeof input.payload!=='object'||Array.isArray(input.payload))return json({message:'Operación inválida.'},400);
   const metricsAction=input.action==='ortho_teacher_metrics';
   const upstreamBase=metricsAction?String(env.ORTHO_SUPABASE_URL||'').replace(/\/$/,''):BASE;
   const upstreamKey=metricsAction?env.ORTHO_SUPABASE_PUBLISHABLE_KEY:KEY;
   if(metricsAction&&(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(upstreamBase)||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(String(upstreamKey||''))))return json({message:'Panel Ortho no configurado para este entorno.'},503);
   const headers={apikey:upstreamKey,authorization:token,'content-type':'application/json'};
   const verified=await fetcher(upstreamBase+'/auth/v1/user',{headers,cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!verified.ok)return json({message:verified.status>=500?'Servicio de acceso no disponible.':'Tu sesión venció.'},verified.status>=500?503:401);
   const user=await verified.json();if(!user?.id||!user.email_confirmed_at)return json({message:'Cuenta confirmada requerida.'},401);
   const endpoint=metricsAction?'/rest/v1/rpc/academy_ortho_teacher_metrics':'/rest/v1/rpc/academy_workflow';
   const rpcBody=metricsAction?{}:{action:input.action,payload:input.payload};
   const response=await fetcher(upstreamBase+endpoint,{method:'POST',headers,body:JSON.stringify(rpcBody),cache:'no-store',signal:AbortSignal.timeout(20000)});
   const data=await response.json().catch(()=>null);
   if(!response.ok){
    if(data?.code==='42501')return json({message:'No tienes acceso a esta operación académica.'},403);
    if(['PGRST202','42883'].includes(data?.code))return json({message:'El piloto aún no ha sido instalado.'},503);
    if(response.status>=500)return json({message:'No se pudo registrar la operación. Consulta el estado antes de reintentar.'},503);
    return json({message:'La operación no cumple los requisitos académicos o ya fue registrada. Actualiza el estado; si persiste, solicita revisión académica.'},409);
   }
   return json(data);
  }catch{return json({message:'No se pudo confirmar la operación. Consulta el estado antes de reintentar.'},503);}
 };
}
export const onRequest=createHandler();
