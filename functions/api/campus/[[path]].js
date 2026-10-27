import { publicCatalog, gradeCase, gradeQuestion } from '../../_shared/campus-content.mjs';

const SUPABASE = 'https://eqhcdclyeoapmqtlduwf.supabase.co';
const KEY = 'sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_';
const ACCESS = '__Secure-kc_campus_access';
const REFRESH = '__Secure-kc_campus_refresh';
const HEADERS = { 'content-type':'application/json; charset=utf-8', 'cache-control':'private, no-store', 'x-content-type-options':'nosniff', 'referrer-policy':'no-referrer' };
class CampusError extends Error { constructor(message,status=400) { super(message); this.status=status; } }
const json = (data,status=200) => new Response(JSON.stringify(data), {status,headers:HEADERS});
const cookies = request => Object.fromEntries((request.headers.get('cookie') || '').split(';').map(s=>s.trim().split(/=(.*)/s).slice(0,2)).filter(x=>x.length===2));
function sessionCookies(response,session) {
  const age = session ? 7*86400 : 0;
  const fields = [[ACCESS,session?.access_token || '',session ? Math.min(Number(session.expires_in)||3600,3600):0],[REFRESH,session?.refresh_token || '',age]];
  for (const [name,value,maxAge] of fields) response.headers.append('set-cookie',`${name}=${encodeURIComponent(value)}; Path=/api/campus; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`);
  return response;
}
async function readInput(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new CampusError('Formato no permitido.',415);
  const reader = request.body?.getReader(); if (!reader) throw new CampusError('Solicitud vacía.');
  let bytes=0; const parts=[];
  while(true) { const {done,value}=await reader.read(); if(done)break; bytes+=value.byteLength; if(bytes>8192){await reader.cancel();throw new CampusError('Solicitud demasiado extensa.',413);} parts.push(value); }
  const data=new Uint8Array(bytes); let offset=0; for(const part of parts){data.set(part,offset);offset+=part.length;}
  let parsed; try {parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));}catch{throw new CampusError('Datos inválidos.');}
  if(!parsed || typeof parsed!=='object' || Array.isArray(parsed))throw new CampusError('Datos inválidos.');
  return parsed;
}
async function upstream(path,{token,body,method='POST',fetcher=fetch,base=SUPABASE,key=KEY}={}) {
  let response; try {response=await fetcher(`${base}${path}`,{method,headers:{apikey:key,'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(12000)});}catch{throw new CampusError('No pudimos conectar. Inténtalo de nuevo.',503);}
  const data=await response.json().catch(()=>null);
  if(!response.ok){
    if(path==='/auth/v1/user' && [401,403].includes(response.status))throw new CampusError('La sesión venció. Vuelve a ingresar.',401);
    if(response.status===429)throw new CampusError('Demasiados intentos. Espera antes de reintentar.',429);
    if(data?.code==='28000' || response.status===401)throw new CampusError('La sesión venció. Vuelve a ingresar.',401);
    if(data?.code==='42501' || response.status===403)throw new CampusError('No tienes permiso para esta operación o la invitación no es válida.',403);
    // Database messages are fixed application strings, never SQL details.
    const safe = ['Completa primero tu perfil','Responde todas las preguntas','Espera unos segundos antes de volver a enviar','Debe permanecer un administrador','No se puede revocar un administrador desde este panel','Acepta el aviso de privacidad vigente','Se requiere autorización de la institución'];
    if(safe.includes(data?.message))throw new CampusError(data.message);
    throw new CampusError(path.startsWith('/auth/')?'No se pudo validar la solicitud. Revisa tus datos y la confirmación de correo.':'No se pudo completar la operación. Revisa los campos.',response.status>=500?503:400);
  }
  return data;
}
function email(value){const e=String(value||'').trim().toLowerCase();if(e.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))throw new CampusError('Ingresa un correo válido.');return e;}
function password(value){if(typeof value!=='string'||value.length<12||value.length>128)throw new CampusError('Usa una contraseña de entre 12 y 128 caracteres.');return value;}
const ACTIONS = new Set(['context','profile','create_institution','join','submit','export','delete_progress','consent','leave','assignments','metrics','assign','close_assignment','invite','members','revoke']);

// Dependency injection exists only for automated tests; no request or runtime
// environment variable can change the production upstream.
export function createHandler({fetcher=fetch,base=SUPABASE,key=KEY}={}) {
 return async function({request}) {
  const call = (path,options={})=>upstream(path,{...options,fetcher,base,key});
  try {
   const url=new URL(request.url); const path=url.pathname.replace(/^\/api\/campus\/?/,'').replace(/\/$/,'');
   if(request.method==='GET' && path==='catalog')return json(publicCatalog());
   if(request.method!=='POST')return json({error:'Método no permitido.'},405);
   if(request.headers.get('origin')!==url.origin || ['cross-site','same-site'].includes(request.headers.get('sec-fetch-site')))return json({error:'Origen no permitido.'},403);
   const body=await readInput(request); const jar=cookies(request);
   const token=decodeURIComponent(jar[ACCESS]||'');
   if(path==='auth/signup') {
    if(body.accept_privacy!==true)throw new CampusError('Debes aceptar el aviso de privacidad de Campus.');
    const data=await call(`/auth/v1/signup?redirect_to=${encodeURIComponent(url.origin+'/campus/')}`,{body:{email:email(body.email),password:password(body.password)}});
    const response=json({confirmation_required:!data?.access_token,message:data?.access_token?'Cuenta disponible. Completa tu perfil.':'Revisa tu correo y confirma el registro. Luego vuelve a Campus para ingresar.'});
    return data?.access_token?sessionCookies(response,data):response;
   }
   if(path==='auth/login') {
    if(typeof body.password!=='string'||!body.password||body.password.length>128)throw new CampusError('Ingresa tu contraseña.');
    const data=await call('/auth/v1/token?grant_type=password',{body:{email:email(body.email),password:body.password}});
    return sessionCookies(json({signed_in:true}),data);
   }
   if(path==='auth/refresh') {
    const refreshToken=decodeURIComponent(jar[REFRESH]||'');
    if(!refreshToken)return sessionCookies(json({error:'Ingresa para continuar.'},401),null);
    try {const data=await call('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:refreshToken}});return sessionCookies(json({signed_in:true}),data);}
    catch(error){return sessionCookies(json({error:error.message},401),null);}
   }
   if(path==='auth/logout') {
    if(token)await call('/auth/v1/logout?scope=local',{token,body:{}}).catch(()=>null);
    return sessionCookies(json({signed_out:true}),null);
   }
   if(path==='auth/confirm') {
    if(!/^[0-9]{6,10}$/.test(body.code||'') || !['signup','recovery'].includes(body.type))throw new CampusError('Código inválido.');
    const data=await call('/auth/v1/verify',{body:{email:email(body.email),token:body.code,type:body.type}});
    return sessionCookies(json({signed_in:true}),data);
   }
   if(path==='auth/recover') {
    await call(`/auth/v1/recover?redirect_to=${encodeURIComponent(url.origin+'/campus/')}`,{body:{email:email(body.email)}});
    return json({message:'Si el correo está registrado, recibirás instrucciones para recuperar el acceso.'});
   }
   // Supabase confirmation callbacks may return an implicit session. Validate
   // both tokens by exchanging the refresh token; never trust browser identity.
   if(path==='auth/callback') {
    if(typeof body.refresh_token!=='string'||body.refresh_token.length>2048)throw new CampusError('Enlace inválido.');
    const data=await call('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:body.refresh_token}});
    return sessionCookies(json({signed_in:true}),data);
   }
   if(path==='practice') {
    try {return json({...gradeCase(body.case_id,body.answers),saved:false});}catch(e){throw new CampusError(e.message);}
   }
   if(path==='question') {
    try{return json(gradeQuestion(body.case_id,body.index,body.answer));}catch(e){throw new CampusError(e.message);}
   }
   if(!token)throw new CampusError('Ingresa para guardar tu avance.',401);
   const user=await call('/auth/v1/user',{token,method:'GET'});
   if(!user?.id || !user.email_confirmed_at)throw new CampusError('Confirma tu correo para continuar.',401);
   if(path==='auth/password') {
    await call('/rest/v1/rpc/campus_api',{token,body:{action:'context',payload:{}}});
    await call('/auth/v1/user',{method:'PUT',token,body:{password:password(body.password)}});
    return json({saved:true});
   }
   if(path!=='action'||!ACTIONS.has(body.action))return json({error:'Ruta no encontrada.'},404);
   const result=await call('/rest/v1/rpc/campus_api',{token,body:{action:body.action,payload:body.payload||{}}});
   return json(body.action==='context'?{...result,email:user.email}:result);
  }catch(error){return json({error:error instanceof CampusError?error.message:'No se pudo completar la solicitud.'},error instanceof CampusError?error.status:500);}
 };
}
export const onRequest = createHandler();
