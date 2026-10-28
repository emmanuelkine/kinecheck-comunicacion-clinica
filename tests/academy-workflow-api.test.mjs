import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../functions/api/academy-workflow.js';
import {statesMarkup,summaryMarkup} from '../academy/competencias/workflow.mjs';
const origin='https://preview.example.invalid';
const env={ACADEMY_COMPETENCY_PREVIEW:'enabled'};
function request(body={},headers={}){return new Request(origin+'/api/academy-workflow',{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer synthetic-token',...headers},body:JSON.stringify(body)});}
test('competency pilot is unavailable by default and enforces origin, session and body bounds',async()=>{
 const h=createHandler({fetcher:async()=>{throw Error('unexpected upstream');}});
 assert.equal((await h({request:request(),env:{}})).status,404);
 assert.equal((await h({request:request({}, {origin:'https://evil.invalid'}),env})).status,403);
 assert.equal((await h({request:request({}, {authorization:''}),env})).status,401);
 assert.equal((await h({request:request({action:'status',payload:{x:'x'.repeat(100001)}}),env})).status,413);
 assert.equal((await h({request:request({action:'delete_all',payload:{}}),env})).status,400);
});
test('verified bearer is forwarded; supplied user and role cannot replace database identity',async()=>{
 const calls=[];const h=createHandler({fetcher:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/user')?{id:'verified-user',email_confirmed_at:'2026-10-28'}:{courseCompleted:true,coursePassed:false,certificateIssued:false}));}});
 const response=await h({request:request({action:'status',user_id:'forged',role:'academic',payload:{enrollmentId:'own-id'}}),env});
 assert.equal(response.status,200);assert.equal(calls.length,2);
 assert.deepEqual(JSON.parse(calls[1].options.body),{action:'status',payload:{enrollmentId:'own-id'}});
 assert.equal(calls[1].options.headers.authorization,'Bearer synthetic-token');
 assert.match(response.headers.get('cache-control'),/no-store/);
});
test('upstream permissions and outages fail closed without leaking database details',async()=>{
 for(const [code,status,expected] of [['42501',403,403],['PGRST202',404,503],['XX000',500,503]]){
  const h=createHandler({fetcher:async url=>url.endsWith('/user')?new Response(JSON.stringify({id:'verified',email_confirmed_at:'now'})):new Response(JSON.stringify({code,message:'PRIVATE DATABASE DETAIL'}),{status})});
  const result=await h({request:request({action:'start',payload:{}}),env});assert.equal(result.status,expected);assert.doesNotMatch(await result.text(),/PRIVATE/);
 }
});
test('Ortho metrics require an explicit Supabase environment and never fall back to production',async()=>{
 let calls=[];const h=createHandler({fetcher:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/user')?{id:'verified-user',email_confirmed_at:'2026-10-28'}:{status:'sin_matriculas'}));}});
 const body={action:'ortho_teacher_metrics',payload:{}};
 assert.equal((await h({request:request(body),env})).status,503);assert.equal(calls.length,0);
 const staged={...env,ORTHO_SUPABASE_URL:'https://mhnqtyvwxytppekktvxb.supabase.co',ORTHO_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_key'};
 const result=await h({request:request(body),env:staged});assert.equal(result.status,200);assert.equal(calls.length,2);
 assert.ok(calls.every(call=>call.url.startsWith(staged.ORTHO_SUPABASE_URL)));
 assert.equal(calls[1].url,staged.ORTHO_SUPABASE_URL+'/rest/v1/rpc/academy_ortho_teacher_metrics');
});
test('student states and dashboard never equate completed, passed and issued',()=>{
 const html=statesMarkup({courseCompleted:true,coursePassed:false,certificateIssued:false});
 assert.equal((html.match(/data-met="true"/g)||[]).length,1);assert.match(html,/Todavía debes aprobar/);
 const summary=summaryMarkup([{user_id:'<script>',course_slug:'demo',version:'v1',course_completed:true,course_passed:true,attempts_started:1,exams_submitted:1,certificate_id:null}]);
 assert.doesNotMatch(summary,/<script>/);assert.match(summary,/Certificados emitidos vigentes<\/dt><dd>0/);
});
