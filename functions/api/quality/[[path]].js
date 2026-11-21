import {isCampusPreviewHost} from '../../../campus/environment.mjs';
import {qualityPDF,summaryCSV,diffusionSummary,csvCell} from '../../_shared/quality-reports.mjs';
const PRODUCTION={base:'https://eqhcdclyeoapmqtlduwf.supabase.co',key:'sb_publishable_FTwhDZYCF3zf7W9rB7bFwQ_rF9Y7OX_'};
const PREVIEW={base:'https://mhnqtyvwxytppekktvxb.supabase.co',key:'sb_publishable_JLWKq6m0g4yB30iIQLE4bg_AkspSDYD'};
const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, no-transform','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-robots-tag':'noindex, nofollow'};
const actions=new Set(['context','program_create','instrument_create','cohort_create','staff_set','participant_add','cel_records','workspace','summary','learner','start','consent','submit','survey','review','evidence_upload','evidence_file','record_save','report_create','report_read','report_approve','notify_due','erase_personal','retention_purge']);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
class QualityError extends Error{constructor(message,status=400){super(message);this.status=status;}}
async function input(request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))throw new QualityError('Formato no permitido.',415);
 const reader=request.body?.getReader();if(!reader)throw new QualityError('Solicitud vacía.');let size=0,parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>160000){await reader.cancel();throw new QualityError('El archivo o formulario excede el máximo permitido.',413);}parts.push(value);}
 const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.byteLength;}
 let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new QualityError('Datos inválidos.');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new QualityError('Datos inválidos.');return data;
}
export function createQualityHandler({fetcher=fetch,base=PRODUCTION.base,key=PRODUCTION.key}={}){
 return async({request})=>{try{
  const url=new URL(request.url);if(request.method!=='POST')return json({error:'Método no permitido.'},405);
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Origen no permitido.'},403);
  const token=request.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9._~-]{8,8192}$/.test(token))return json({error:'Ingresa a Academy para continuar.'},401);
  const data=await input(request);const action=data.action;const path=url.pathname.replace(/^\/api\/quality\/?/,'').replace(/\/$/,'');
  if(!['action','export'].includes(path)||(!actions.has(action)&&!(path==='export'&&['summary','report_read','dossier'].includes(action))))return json({error:'Ruta no encontrada.'},404);
  const upstream=async(path,body)=>{
   let res;try{res=await fetcher(base+path,{method:body===undefined?'GET':'POST',headers:{apikey:key,authorization:token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});}catch{throw new QualityError('No se pudo conectar con el servicio.',503);}
   const result=await res.json().catch(()=>null);if(!res.ok){
    if([401,403].includes(res.status)||result?.code==='28000')throw new QualityError('Sesión o permiso no válido. Vuelve a Academy.',res.status===403?403:401);
    if(result?.code==='42501')throw new QualityError('No tienes autorización para esta operación.',403);
    if(result?.code==='23505')throw new QualityError('Este registro ya existe. Recarga para ver su estado.',409);
    if(path==='/rest/v1/rpc/quality_impact_api'&&res.status===404)throw new QualityError('El servicio de calidad aún no está habilitado en este entorno.',503);
    if(res.status===429)throw new QualityError('Demasiadas solicitudes. Reintenta más tarde.',429);
    const safe=['Sesión verificada requerida','Completa el expediente y la procedencia','Instrumento inválido','Pregunta inválida','Rúbrica inválida','Falta caso o criterios explícitos','Instrumento de otra versión o tipo','Cuenta confirmada requerida','No hay matrícula habilitada verificable','Vínculo institucional no autorizado','Acepta el aviso de privacidad vigente','Responde todas las preguntas y el caso','La evaluación inicial debe preceder a la final','Seguimiento no disponible o sin consentimiento','Completa las seis preguntas','Puntúa cada dimensión de la rúbrica','Puntuación fuera de la rúbrica','Adjunta texto anonimizado y confirma su revisión','Asocia una evidencia','Falta validación documental oficial','Historia sin procedencia verificable','Acción de mejora incompleta','Falta evidencia de reevaluación','Fechas de incidencia inválidas','Falta fecha real de implementación','El registro cambió. Recarga antes de guardar','El periodo cuatrimestral aún no finaliza','Periodo inválido','Confirmación requerida'];
    throw new QualityError(safe.includes(result?.message)?result.message:'Revisa los campos y los permisos del registro.',res.status>=500?503:400);
   }return result;
  };
  const user=await upstream('/auth/v1/user');if(!user?.id||!user.email_confirmed_at)throw new QualityError('Cuenta confirmada requerida.',401);
  const rpc=(a,p={})=>upstream('/rest/v1/rpc/quality_impact_api',{action:a,payload:p});
  if(path==='action')return json(await rpc(action,data.payload||{}));
  const format=data.format||'csv';if(!['csv','pdf','json'].includes(format))throw new QualityError('Formato no permitido.');
  let result,summary,dossier,report;
  if(action==='dossier'){
   const ctx=await rpc('context');dossier=ctx.programs.find(p=>p.id===data.payload?.program_id);
   // Only authorized staff can export dossiers, not a participant using a known id.
   if(!dossier||(!ctx.admin&&!ctx.cohorts.some(c=>c.program_id===dossier.id&&c.role)))throw new QualityError('No tienes autorización para este expediente.',403);
   result=dossier;
  }else if(action==='report_read'){report=await rpc(action,data.payload||{});summary=report.snapshot;result={...report,snapshot:summary};}
  else{summary=await rpc('summary',data.payload||{});if(data.diffusion===true)summary=diffusionSummary(summary);result=summary;}
  let contents,type,filename;
  if(format==='pdf'){contents=await qualityPDF({summary,report,dossier});type='application/pdf';filename=dossier?'expediente-academico.pdf':'informe-calidad-impacto.pdf';}
  else if(format==='json'){contents=JSON.stringify(result,null,2);type='application/json';filename='respaldo-calidad.json';}
  else{contents=dossier?'\uFEFF'+['Campo,Contenido',...Object.entries(dossier.dossier).map(([k,v])=>[k,v].map(csvCell).join(','))].join('\r\n'):summaryCSV(summary);type='text/csv; charset=utf-8';filename=dossier?'expediente-academico.csv':'resumen-calidad-impacto.csv';}
  return new Response(contents,{headers:{...headers,'content-type':type,'content-disposition':`attachment; filename="${filename}"`}});
 }catch(e){return json({error:e instanceof QualityError?e.message:'No se pudo completar la operación.'},e instanceof QualityError?e.status:500);}};
}
const production=createQualityHandler(),preview=createQualityHandler(PREVIEW);
export const onRequest=context=>(isCampusPreviewHost(new URL(context.request.url).hostname)?preview:production)(context);
