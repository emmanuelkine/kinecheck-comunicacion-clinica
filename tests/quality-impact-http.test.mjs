import test from 'node:test';import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {createQualityHandler} from '../functions/api/quality/[[path]].js';
import {createQualityServer} from './helpers/quality-http.mjs';
import {csvCell,diffusionSummary,qualityPDF} from '../functions/_shared/quality-reports.mjs';
const origin='https://quality.example';
const req=(body,headers={})=>new Request(origin+'/api/quality/action',{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer quality-fixture-token-0',...headers},body:JSON.stringify(body)});
test('HTTP requires same origin, bounded UTF8 JSON and verified identity',async()=>{
 let calls=0;const handler=createQualityHandler({fetcher:async()=>{calls++;return Response.json({},{status:401});}});
 assert.equal((await handler({request:req({action:'context'},{origin:'https://evil.example'})})).status,403);
 assert.equal((await handler({request:req({action:'context'},{authorization:''})})).status,401);
 assert.equal((await handler({request:req({action:'context',payload:{x:'x'.repeat(160001)}})})).status,413);
 assert.equal((await handler({request:req({action:'not_allowed'})})).status,404);assert.equal(calls,0);
 assert.equal((await handler({request:req({action:'context'})})).status,401);assert.equal(calls,1);
});
test('CSV formulas are escaped, small-cohort diffusion suppressed',()=>{
 for(const cell of ['=HYPERLINK("https://example.invalid")','  +SUM(A1)','-2','@IMPORT','\tformula'])assert.ok(csvCell(cell).startsWith('"\''));
 const redacted=diffusionSummary({cohort:{name:'Private cohort'},program:{version:'v1',dossier:{name:'Program'}},metrics:[{key:'enrolled',value:4,numerator:4,denominator:4,missing:0}],followups:[],records:[{private:'text'}],limitations:[]});assert.equal(redacted.metrics[0].value,null);assert.deepEqual(redacted.records,[]);assert.equal(JSON.stringify(redacted).includes('Private cohort'),false);
});
test('HTTP -> PostgreSQL -> PDF/CSV exports, roles and approval work without real data',async()=>{
 const f=await createQualityServer();
 const call=(path,body,index=0)=>fetch(f.origin+'/api/quality/'+path,{method:'POST',headers:{origin:f.origin,'content-type':'application/json',authorization:'Bearer quality-fixture-token-'+index},body:JSON.stringify(body)});
 try{
  let r=await call('action',{action:'context',payload:{user_id:'forged',role:'admin'}},1);assert.equal((await r.json()).admin,false);
  r=await call('export',{action:'summary',payload:{cohort_id:f.cohort,from:'2026-01-01',to:'2027-01-01'},format:'pdf'});assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);const pdf=await PDFDocument.load(await r.arrayBuffer());assert.ok(pdf.getPageCount()>=3);
  r=await call('export',{action:'summary',payload:{cohort_id:f.cohort,from:'2026-01-01',to:'2027-01-01'},format:'csv'});assert.match(await r.text(),/Denominador/);
  r=await call('export',{action:'dossier',payload:{program_id:f.program},format:'pdf'},1);assert.equal(r.status,403);
  r=await call('export',{action:'dossier',payload:{program_id:f.program},format:'pdf'});assert.equal(r.status,200);assert.ok((await PDFDocument.load(await r.arrayBuffer())).getPageCount()>1);
  r=await call('action',{action:'workspace',payload:{cohort_id:f.cohort}},1);assert.equal(r.status,403);
  r=await call('action',{action:'workspace',payload:{cohort_id:f.cohort}},9);const data=await r.json();assert.deepEqual(data.pending,[]);assert.deepEqual(data.instruments,[]);
  // Unencodable characters in legitimate academic prose cannot break a PDF export.
  const summary=await (await call('action',{action:'summary',payload:{cohort_id:f.cohort,from:'2026-01-01',to:'2027-01-01'}})).json();summary.program.dossier.name='Prueba con símbolos 🧪 y español: evaluación, rúbrica';assert.ok((await qualityPDF({summary})).length>1000);
 }finally{await f.close();}
});
