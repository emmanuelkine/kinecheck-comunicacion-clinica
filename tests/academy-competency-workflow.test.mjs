import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const uid=i=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
const sid=i=>`10000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
const db=new PGlite();
async function actor(i,extra={}) {
 await db.exec('reset role');
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:uid(i),session_id:sid(i),...extra})]);
 await db.exec('set role authenticated');
}
const rpc=async(action,payload={})=>(await db.query('select public.academy_workflow($1,$2::jsonb) result',[action,JSON.stringify(payload)])).rows[0].result;
async function admin(sql,args=[]) {await db.exec('reset role');return args.length?db.query(sql,args):db.exec(sql);}
let version,enrollment;
async function start() {await actor(1);return rpc('start',{enrollmentId:enrollment});}
async function finish(attempt) {
 let current=attempt;
 while(current.status==='in_progress') {
  const answers=Object.fromEntries(current.stage.questions.map(q=>[q.id,q.kind==='choice'?q.options.indexOf('A'):'Justificación simulada para probar el flujo; no es un ítem clínico.']));
  current=await rpc('stage',{attemptId:current.id,step:current.step,answers});
 }
 return current;
}
async function review(attempt,openPoints,safe=true) {
 await admin('select 1');
 const {rows}=await db.query('select snapshot from academy_core.attempts where id=$1',[attempt.id]);
 const open=rows[0].snapshot.flatMap(s=>s.questions).filter(q=>q.kind==='justification');
 let remaining=openPoints;
 const grades={};
 for(const q of open) {const n=Math.min(q.points,remaining);remaining-=n;grades[q.id]={dimensions:{reasoning:n},safe,feedback:'Revisión humana sintética de una prueba técnica.'};}
 await actor(2);
 return rpc('review',{attemptId:attempt.id,grades,rationale:'Evaluación humana de prueba según rúbrica publicada.'});
}

test('isolated Academy v2 workflow on real PostgreSQL semantics',async t=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
 create table public.course_access(email text,course_slug text,active boolean,access_expires_at timestamptz);`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261028130605_academy_competency_workflow.sql',import.meta.url),'utf8'));
 for(let i=1;i<=7;i++) {
  await db.query('insert into auth.users values($1,$2,now(),null)',[uid(i),`synthetic-${i}@example.invalid`]);
  await db.query('insert into auth.sessions values($1,$2,null)',[sid(i),uid(i)]);
 }
 await db.exec(`insert into academy_core.operators values('${uid(2)}','academic'),('${uid(3)}','registrar'),('${uid(4)}','certifier'),('${uid(5)}','billing');`);
 await db.query('insert into public.course_access values($1,$2,true,null)',['synthetic-1@example.invalid','synthetic-course']);
 version=(await db.query(`insert into academy_core.versions(course_slug,version,title,required_activities,instructions)
  values('synthetic-course','test-v1','Curso sintético técnico',array['module-1','case-activity'],'70/100, tres intentos, 60 minutos. Una falla crítica impide aprobar. Revisión humana obligatoria.') returning id`)).rows[0].id;
 const points=[10,15,15,20,15,15,10];
 for(let stage=1;stage<=7;stage++) {
  const choice=stage<=3;
  await db.query(`insert into academy_core.items(version_id,case_id,stage,item_order,module,learning_outcome,competency,cognitive_level,estimated_difficulty,
   kind,points,context,prompt,options,correct_index,rubric,rationale,source_uri,distractor_explanations,critical,validation_status,reviewer_id,review_reference,critical_criterion)
   values($1,'synthetic-longitudinal-case',$2,1,'M1','RA1','C1',$3,'medium',$4,$5,'Contexto ficticio para pruebas','Pregunta técnica no clínica',
   $6::jsonb,$7,$8::jsonb,'No es un banco clínico','https://example.invalid/synthetic-source',$9::jsonb,$10,'validated',$11,'technical-fixture-only','No ignorar una condición crítica de seguridad explícita del escenario sintético.')`,
   [version,stage,stage===1?'fundamentals':stage<4?'interpretation':stage===4?'reasoning':stage===5?'safety_communication':'uncertainty',
    choice?'choice':'justification',points[stage-1],choice?JSON.stringify(['A','B','C']):null,choice?0:null,
    JSON.stringify(choice?[]:[{id:'reasoning',maximum:points[stage-1],description:'Justificación contextualizada, alternativas aceptables y límites.'}]),
    JSON.stringify(choice?['synthetic A','synthetic B','synthetic C']:[]),stage===5,uid(2)]);
 }
 await t.test('anonymous, revoked session, spoofed role and direct bank access denied',async()=>{
  await actor(1,{user_metadata:{role:'academic'}});
  await assert.rejects(rpc('approve_version',{versionId:version,reference:'forged'}),/Academic role/);
  await assert.rejects(db.query('select * from academy_core.items'),/permission denied/);
  await actor(1,{session_id:sid(99)});await assert.rejects(rpc('status',{enrollmentId:uid(99)}),/Verified active session/);
  await admin('set role anon');await assert.rejects(rpc('dashboard'),/permission denied/);
 });
 await t.test('academic approval and activation are separate and disabled by default',async()=>{
  await actor(2);await rpc('approve_version',{versionId:version,reference:'SYNTHETIC TEST APPROVAL'});
  await assert.rejects(rpc('activate_version',{versionId:version}),/enabled pilot/);
  await admin('update academy_core.settings set exams_enabled=true');
  await actor(2);await rpc('activate_version',{versionId:version});
 });
 await t.test('opt-in enrollment requires entitlement and explicit purchase terms evidence',async()=>{
  await actor(3);await assert.rejects(rpc('enroll',{versionId:version,studentId:uid(5),termsReference:'test'}),/entitlement/);
  enrollment=(await rpc('enroll',{versionId:version,studentId:uid(1),termsReference:'Synthetic opt-in: does not change previous purchases'})).enrollmentId;
 });
 await t.test('course completion is independent from approval and OTEC',async()=>{
  await assert.rejects(start(),/Complete required activities/);
  await actor(3);await assert.rejects(rpc('verify_completion',{enrollmentId:enrollment,activities:['module-1'],evidenceReference:'test'}),/All required/);
  await rpc('verify_completion',{enrollmentId:enrollment,activities:['module-1','case-activity'],evidenceReference:'Verified fictional activities'});
  await actor(1);const state=await rpc('status',{enrollmentId:enrollment});
  assert.equal(state.courseCompleted,true);assert.equal(state.coursePassed,false);assert.equal(state.certificateIssued,false);
  await assert.rejects(rpc('request_certificate',{enrollmentId:enrollment}),/OTEC agreement not active/);
 });
 await t.test('published versions and banks are immutable and evidence cannot be omitted',async()=>{
  await admin('select 1');
  await assert.rejects(db.query('update academy_core.versions set pass_score=1 where id=$1',[version]),/immutable/);
  await assert.rejects(db.query('update academy_core.items set correct_index=2 where version_id=$1',[version]),/immutable/);
  await actor(3);await assert.rejects(rpc('verify_completion',{enrollmentId:enrollment,evidenceReference:'No activities supplied'}),/All required/);
 });
 let first,second,third;
 await t.test('start is idempotent and reveals one stage without keys or future information',async()=>{
  first=await start();const again=await start();assert.equal(first.id,again.id);assert.equal(first.step,1);assert.equal(first.steps,7);
  assert.equal(first.stage.questions.length,1);assert.equal(first.stage.stage,1);
  assert.doesNotMatch(JSON.stringify(first),/correct_index|rationale|synthetic B|review_reference/);
  await actor(5);await assert.rejects(rpc('stage',{attemptId:first.id,step:1,answers:{}}),/Own enrollment/);
 });
 await t.test('stages reject jumps, invalid options and duplicates cannot rewrite prior answers',async()=>{
  await actor(1);await assert.rejects(rpc('stage',{attemptId:first.id,step:2,answers:{}}),/Sequential/);
  const question=first.stage.questions[0];
  await assert.rejects(rpc('stage',{attemptId:first.id,step:1,answers:{[question.id]:true}}),/Invalid option/);
  const next=await rpc('stage',{attemptId:first.id,step:1,answers:{[question.id]:question.options.indexOf('A')}});
  const duplicate=await rpc('stage',{attemptId:first.id,step:1,answers:{[question.id]:2}});assert.equal(next.step,duplicate.step);
  first=await finish(next);assert.equal(first.status,'pending_review');assert.equal(first.passed,null);
  await assert.rejects(start(),/Human review pending/);
 });
 await t.test('review queue and dashboard are academic-only and expose no marking keys',async()=>{
  await actor(1);await assert.rejects(rpc('review_queue'),/Academic role/);
  await actor(2);const queue=(await rpc('review_queue')).rows;assert.equal(queue.length,1);assert.equal(queue[0].questions.length,4);
  assert.doesNotMatch(JSON.stringify(queue),/correct_index|distractor_explanations/);
  const panel=(await rpc('dashboard')).rows;assert.equal(panel.length,1);assert.equal(panel[0].course_completed,true);assert.equal(panel[0].course_passed,false);
 });
 await t.test('69 fails and a written answer has no automatic or AI-only approval',async()=>{
  const r=await review(first,29);assert.equal(r.score,69);assert.equal(r.passed,false);
  await actor(1);const state=await rpc('status',{enrollmentId:enrollment});assert.equal(state.courseCompleted,true);assert.equal(state.coursePassed,false);
  await assert.rejects(rpc('review',{attemptId:first.id,grades:{},rationale:'forged'}),/Academic role/);
 });
 await t.test('100 points cannot compensate a critical safety failure',async()=>{
  second=await finish(await start());const r=await review(second,60,false);assert.equal(r.score,100);assert.equal(r.passed,false);
 });
 await t.test('70 passes only after all human rubric and safety criteria are satisfied',async()=>{
  third=await finish(await start());const r=await review(third,30,true);assert.equal(r.score,70);assert.equal(r.passed,true);
  await assert.rejects(review(third,60,true),/awaiting review/);
  await actor(1);const state=await rpc('status',{enrollmentId:enrollment});assert.equal(state.coursePassed,true);assert.equal(state.certificateIssued,false);
 });
 let certificate,issuer;
 await t.test('OTEC issuance requires formal settings, approval, administration and real document metadata',async()=>{
  await actor(1);await assert.rejects(rpc('request_certificate',{enrollmentId:enrollment}),/OTEC agreement not active/);
  await admin('update academy_core.settings set otec_enabled=true');
  await actor(1);await assert.rejects(rpc('request_certificate',{enrollmentId:enrollment}),/administrative clearance/);
  await actor(3);await rpc('clear_administration',{enrollmentId:enrollment,reference:'Synthetic administrative evidence'});
  await actor(1);certificate=(await rpc('request_certificate',{enrollmentId:enrollment})).certificateId;
  assert.equal((await rpc('request_certificate',{enrollmentId:enrollment})).certificateId,certificate);
  await admin('select 1');issuer=(await db.query("insert into academy_core.issuers(name,agreement_reference,authorization_reference,enabled) values('SYNTHETIC ISSUER','TEST ONLY','TEST ONLY',true) returning id")).rows[0].id;
  await actor(4);await assert.rejects(rpc('issue_certificate',{certificateId:certificate,issuerId:issuer,externalId:'test'}),/check constraint/);
  await rpc('issue_certificate',{certificateId:certificate,issuerId:issuer,externalId:'SYNTHETIC-1',documentUrl:'https://example.invalid/certificate',sha256:'a'.repeat(64),unitCost:1000});
  await assert.rejects(rpc('issue_certificate',{certificateId:certificate,issuerId:issuer}),/already issued/);
  await actor(1);assert.equal((await rpc('status',{enrollmentId:enrollment})).certificateIssued,true);
 });
 await t.test('monthly export includes real issuance only, has no duplicate billing and is permissioned',async()=>{
  await actor(1);await assert.rejects(rpc('monthly_report',{month:'2026-10'}),/Academic role/);
  await actor(5);const month=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit'}).format(new Date());
  const report=await rpc('monthly_report',{month});assert.equal(report.rows.length,1);assert.equal(report.rows[0].certificate_id,certificate);assert.equal(Number(report.rows[0].unit_cost),1000);
  assert.equal((await rpc('monthly_report',{month:'2000-01'})).rows.length,0);
  await rpc('reconcile',{certificateId:certificate,reference:'SYNTHETIC-INVOICE'});
  assert.equal((await rpc('monthly_report',{month})).rows[0].reconciliation_status,'reconciled');
 });
 await t.test('certificate verification returns authenticity without exposing learner identity',async()=>{
  await admin('set role anon');const result=(await db.query('select public.academy_certificate_verify($1) result',[certificate])).rows[0].result;
  assert.equal(result.valid,true);assert.equal(result.id,certificate);assert.doesNotMatch(JSON.stringify(result),/student_id|user_id|email|documentUrl/);
  assert.equal((await db.query('select public.academy_certificate_verify($1) result',[uid(99)])).rows[0].result.found,false);
 });
 await t.test('annulment preserves audit, hides download and marks the reconciliation credit',async()=>{
  await actor(2);await rpc('revoke_approval',{enrollmentId:enrollment,reason:'Synthetic academic appeal upheld'});
  await actor(1);const state=await rpc('status',{enrollmentId:enrollment});assert.equal(state.courseCompleted,true);assert.equal(state.coursePassed,false);assert.equal(state.certificateIssued,false);assert.equal(state.certificate.url,null);
  await admin('select 1');assert.ok((await db.query('select count(*)::int n from academy_core.audit')).rows[0].n>10);
  assert.equal((await db.query('select reconciliation_status from academy_core.certificates where id=$1',[certificate])).rows[0].reconciliation_status,'credit_required');
  await assert.rejects(db.query('delete from academy_core.audit'),/Append-only/);
 });
 await t.test('expired starts consume all three attempts and 100 can pass a separate valid submission',async()=>{
  const original=enrollment;
  for(const i of [6,7]) {
   await admin('insert into public.course_access values($1,$2,true,null)',[`synthetic-${i}@example.invalid`,'synthetic-course']);
   await actor(3);enrollment=(await rpc('enroll',{versionId:version,studentId:uid(i),termsReference:'SYNTHETIC OPT-IN'})).enrollmentId;
   await rpc('verify_completion',{enrollmentId:enrollment,activities:['module-1','case-activity'],evidenceReference:'SYNTHETIC EVIDENCE'});
   if(i===6){
    for(let n=1;n<=3;n++){
     await actor(i);const attempt=await rpc('start',{enrollmentId:enrollment});assert.equal(attempt.attemptNumber,n);
     await admin("update academy_core.attempts set deadline=clock_timestamp()-interval '1 minute' where id=$1",[attempt.id]);
     await actor(i);const expired=await rpc('stage',{attemptId:attempt.id,step:1,answers:{}});assert.equal(expired.status,'expired');
    }
    await assert.rejects(rpc('start',{enrollmentId:enrollment}),/Attempt limit reached/);
   }else{
    await actor(i);const attempt=await finish(await rpc('start',{enrollmentId:enrollment}));
    const result=await review(attempt,60,true);assert.equal(result.score,100);assert.equal(result.passed,true);
   }
  }
  enrollment=original;
 });
 await t.test('operational rollback disables the new RPC and preserves all academic evidence',async()=>{
  await admin('select 1');const before=(await db.query('select count(*)::int n from academy_core.audit')).rows[0].n;
  await db.exec(await readFile(new URL('../supabase/rollback/academy_competency_workflow.sql',import.meta.url),'utf8'));
  assert.equal((await db.query('select exams_enabled or otec_enabled enabled from academy_core.settings')).rows[0].enabled,false);
  assert.equal((await db.query('select count(*)::int n from academy_core.audit')).rows[0].n,before);
  await actor(1);await assert.rejects(rpc('status',{enrollmentId:enrollment}),/permission denied/);
 });
 await db.close();
});
