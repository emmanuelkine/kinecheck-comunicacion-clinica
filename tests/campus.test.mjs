import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { cases, publicCatalog, gradeCase, gradeQuestion } from '../functions/_shared/campus-content.mjs';
import { createHandler } from '../functions/api/campus/[[path]].js';
import { isCampusPreviewHost } from '../campus/environment.mjs';
test('preview selection is restricted to this Cloudflare Pages project',()=>{
 assert.equal(isCampusPreviewHost('abc.kinecheck-comunicacion-clinica.pages.dev'),true);
 assert.equal(isCampusPreviewHost('kinecheck-comunicacion-clinica.pages.dev'),true);
 for(const host of ['kinecheck.cl','www.kinecheck.cl','kinecheck.cl.evil.test','kinecheck-comunicacion-clinica.pages.dev.evil.test','other-project.pages.dev'])assert.equal(isCampusPreviewHost(host),false);
});

test('six academic levels, original resource URLs and server-only keys',()=>{
 const catalog=publicCatalog();assert.deepEqual(catalog.levels.map(l=>l.level),[1,2,3,4,5,6]);
 for(const item of catalog.cases){assert.equal(item.questions.length,3);for(const q of item.questions){assert.equal(q.answer,undefined);assert.equal(q.explanation,undefined);}assert.ok(item.resources.length);}
 assert.ok(catalog.resources.find(r=>r.id==='academy').access.includes('licencia'));
 for(const item of cases){assert.equal(gradeCase(item.id,item.questions.map(q=>q.answer)).score,100);assert.throws(()=>gradeCase(item.id,[0]),/Responde/);assert.throws(()=>gradeCase(item.id,[0,0,99]),/Responde/);}
 assert.throws(()=>gradeQuestion('escuchar',-1,0));assert.throws(()=>gradeQuestion('escuchar',0,'0'));
});
const origin='https://campus.example';
function request(path,body,extra={}){return new Request(origin+'/api/campus/'+path,{method:'POST',headers:{origin,'content-type':'application/json',...extra},body:JSON.stringify(body)});}
test('API enforces origin, payload bounds, session and server grading',async()=>{
 const handler=createHandler({fetcher:async()=>{throw new Error('unexpected upstream');}});
 assert.equal((await handler({request:request('practice',{case_id:'escuchar',answers:[0,1,2]},{origin:'https://evil.example'})})).status,403);
 assert.equal((await handler({request:request('practice',{x:'x'.repeat(9000)})})).status,413);
 assert.equal((await handler({request:request('action',{action:'context'})})).status,401);
 const result=await(await handler({request:request('practice',{case_id:'escuchar',answers:[0,1,2],score:0})})).json();assert.equal(result.score,100);assert.equal(result.saved,false);
 assert.equal((await handler({request:request('auth/signup',{email:'test@example.com',password:'long-enough-password'})})).status,400);
});
test('tokens stay in scoped HttpOnly cookies and never appear in JSON',async()=>{
 const calls=[];const handler=createHandler({fetcher:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600}),{status:200});}});
 const response=await handler({request:request('auth/login',{email:'test@example.com',password:'Existing8'})});
 assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);assert.match(response.headers.get('set-cookie'),/Path=\/api\/campus/);assert.doesNotMatch(await response.text(),/test-access|test-refresh/);assert.equal(calls.length,1);
});
test('email callbacks require a flow initiated in the same browser',async()=>{
 let upstreamCalls=0;
 const handler=createHandler({fetcher:async()=>{upstreamCalls++;return new Response(JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600}),{status:200});}});
 assert.equal((await handler({request:request('auth/callback',{refresh_token:'attacker-token'})})).status,403);
 assert.equal((await handler({request:request('auth/callback',{refresh_token:'attacker-token',flow:'a'.repeat(32)},{cookie:'__Secure-kc_campus_flow='+ 'b'.repeat(32)})})).status,403);
 assert.equal(upstreamCalls,0);
 const response=await handler({request:request('auth/callback',{refresh_token:'flow-token',flow:'a'.repeat(32)},{cookie:'__Secure-kc_campus_flow='+ 'a'.repeat(32)})});
 assert.equal(response.status,200);assert.equal(upstreamCalls,1);assert.match(response.headers.get('set-cookie'),/__Secure-kc_campus_flow=; Path=\/api\/campus; Max-Age=0/);
});
test('authenticated API uses the verified user and forwards no caller identity or role',async()=>{
 const calls=[];const handler=createHandler({fetcher:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/user')?{id:'real-id',email:'test@example.com',email_confirmed_at:'2026-01-01'}:{profile:null,memberships:[],progress:[]}),{status:200});}});
 const response=await handler({request:request('action',{action:'context',user_id:'forged',role:'administrador'},{cookie:'__Secure-kc_campus_access=verified-token'})});assert.equal(response.status,200);assert.equal(calls.length,2);assert.deepEqual(JSON.parse(calls[1].options.body),{action:'context',payload:{}});assert.match(calls[1].options.headers.authorization,/verified-token/);
});

const db=new PGlite();
const ids=Array.from({length:9},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const sessions=ids.map((_,i)=>`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
let orgA,orgB;
async function actor(index,extra={}){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:ids[index],session_id:sessions[index],role:'authenticated',...extra})]);await db.exec('set role authenticated');}
const rpc=async(action,payload={})=>(await db.query('select public.campus_api($1,$2::jsonb) result',[action,JSON.stringify(payload)])).rows[0].result;
test('database migration and multi-tenant authorization',async t=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
 grant usage on schema auth to authenticated;grant execute on function auth.jwt(),auth.uid() to authenticated;`);
 const path=(await readdir(new URL('../supabase/migrations/',import.meta.url))).find(p=>p.endsWith('_campus_institutional_platform.sql'));
 await db.exec(await readFile(new URL('../supabase/migrations/'+path,import.meta.url),'utf8'));
 const upgrade=(await readdir(new URL('../supabase/migrations/',import.meta.url))).find(p=>p.endsWith('_campus_isolated_function_namespace.sql'));
 await db.exec(await readFile(new URL('../supabase/migrations/'+upgrade,import.meta.url),'utf8'));
 assert.equal((await db.query("select has_schema_privilege('authenticated','private','usage') allowed")).rows[0].allowed,false,'Campus must not grant access to the shared private namespace');
 for(let i=0;i<ids.length;i++){await db.query('insert into auth.users values($1,$2,now(),null)',[ids[i],`qa-${i}@example.invalid`]);await db.query('insert into auth.sessions values($1,$2,null)',[sessions[i],ids[i]]);}
 await db.query('insert into private.campus_operators values($1)',[ids[0]]);
 await t.test('only the verified platform operator can provision an institution',async()=>{
  await actor(1,{user_metadata:{role:'administrador'}});await assert.rejects(rpc('create_institution',{name:'QA A',authorized:true}),/Acceso restringido/);
  await actor(0);orgA=(await rpc('create_institution',{name:'QA A',authorized:true})).institution_id;orgB=(await rpc('create_institution',{name:'QA B',authorized:true})).institution_id;
 });
 await t.test('personal progress precedes institutional linkage and client scores are ignored',async()=>{
  await actor(1);await assert.rejects(rpc('profile',{display_name:'Persona',academic_level:2}),/privacidad/);
  await rpc('profile',{display_name:'Persona',academic_level:2,privacy_version:'2026-10-27'});
  const result=await rpc('submit',{case_id:'escuchar',answers:[0,1,2],score:0,user_id:ids[0]});assert.equal(result.score,100);assert.equal(result.saved,true);assert.equal((await rpc('context')).progress[0].attempts,1);
 });
 await t.test('email-bound one-use invitation cannot be stolen or replayed',async()=>{
  await actor(0);const token=(await rpc('invite',{institution_id:orgA,email:'qa-1@example.invalid',role:'estudiante'})).token;
  await actor(2);await rpc('profile',{display_name:'Otra persona',academic_level:3,privacy_version:'2026-10-27'});await assert.rejects(rpc('join',{token}),/Invitación/);
  await actor(1);await rpc('join',{token,share_metrics:true});await assert.rejects(rpc('join',{token}),/Invitación/);assert.equal((await rpc('context')).progress[0].best_score,100);
 });
 await t.test('students cannot read staff metrics, other tenants, raw tables or answer keys',async()=>{
  await actor(1);await assert.rejects(rpc('metrics',{institution_id:orgA}),/Permisos/);await assert.rejects(rpc('assignments',{institution_id:orgB}),/Institución/);await assert.rejects(rpc('invite',{institution_id:orgA,email:'qa-2@example.invalid',role:'administrador'}),/Permisos/);
  await assert.rejects(db.query('select * from private.campus_attempts'),/permission denied/);await assert.rejects(db.query('select * from private.campus_case_keys'),/permission denied/);
  await assert.rejects(rpc('submit',{case_id:'escuchar',answers:[0,1,2],institution_id:orgB}),/segundos|autorizaste/);
 });
 await t.test('small cohorts are suppressed; docente has aggregate access but no roster or invites',async()=>{
  await actor(0);const token=(await rpc('invite',{institution_id:orgA,email:'qa-2@example.invalid',role:'docente'})).token;
  await actor(2);await rpc('join',{token});assert.equal((await rpc('metrics',{institution_id:orgA})).suppressed,true);await assert.rejects(rpc('members',{institution_id:orgA}),/Permisos/);await assert.rejects(rpc('invite',{institution_id:orgA,email:'qa-3@example.invalid',role:'estudiante'}),/Permisos/);
  const assignment=await rpc('assign',{institution_id:orgA,case_id:'hipotesis',title:'Revisar hipótesis'});assert.ok(assignment.id);
  await actor(1);assert.equal((await rpc('assignments',{institution_id:orgA})).length,1);assert.equal((await rpc('assignments',{institution_id:orgA}))[0].title,'Revisar hipótesis');
 });
 await t.test('metrics exclude other tenants, personal attempts and participants without consent',async()=>{
  await db.exec('reset role');
  // Synthetic cohort fixtures are server-created only inside this test DB.
  for(let i=3;i<8;i++){await db.query('insert into private.campus_memberships(institution_id,user_id,role,share_metrics) values($1,$2,$3,true)',[orgA,ids[i],'estudiante']);await db.query("insert into private.campus_attempts(user_id,institution_id,case_id,score,answers,version) values($1,$2,'escuchar',50,'[1,1,2]','test')",[ids[i],orgA]);}
  await db.query("insert into private.campus_attempts(user_id,institution_id,case_id,score,answers,version) values($1,$2,'escuchar',100,'[0,1,2]','test')",[ids[8],orgB]);
  await actor(2);const m=await rpc('metrics',{institution_id:orgA});assert.equal(m.average,50);assert.equal(m.activity,5);assert.equal(m.attempts,5);assert.equal(m.cohort,6);
  await actor(3);await rpc('consent',{institution_id:orgA,share_metrics:false});
  await actor(2);const hidden=await rpc('metrics',{institution_id:orgA});assert.equal(hidden.average,null);assert.equal(hidden.activity,null);
 });
 await t.test('revocation takes effect immediately without deleting personal progress',async()=>{
  await actor(0);await rpc('revoke',{institution_id:orgA,user_id:ids[1]});
  await actor(1);assert.equal((await rpc('context')).memberships.length,0);assert.equal((await rpc('context')).progress.length,1);await assert.rejects(rpc('assignments',{institution_id:orgA}),/Institución/);
  assert.equal((await rpc('export')).attempts.length,1);await rpc('delete_progress');assert.equal((await rpc('context')).progress.length,0);
 });
 await t.test('revoked sessions cannot use a still-unexpired JWT',async()=>{
  await db.exec('reset role');await db.query('delete from auth.sessions where id=$1',[sessions[1]]);await actor(1);await assert.rejects(rpc('context'),/Sesión/);
 });
 await db.close();
});
