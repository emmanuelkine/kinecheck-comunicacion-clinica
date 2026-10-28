import test from 'node:test';
import assert from 'node:assert/strict';
import {createQualityDB,ids,orgs,learning,dossier} from './helpers/quality-db.mjs';
test('Quality & Impact: migrations, authorization, educational records and denominators',async t=>{
 const {db,actor,rpc,program,learn,comp,cohort}=await createQualityDB();
 const scoped=p=>({cohort_id:cohort,...p});
 try{
  await t.test('RLS, no public tables or helper access, no user-metadata authorization',async()=>{
   const tables=(await db.query("select tablename,rowsecurity from pg_tables where schemaname='private' and tablename like 'qi_%'")).rows;assert.equal(tables.length,14);assert.ok(tables.every(x=>x.rowsecurity));
   await actor(1,{user_metadata:{role:'admin'},app_metadata:{role:'admin'}});
   await assert.rejects(rpc('program_create',{course_slug:'quality-test',dossier}),/restringido/);
   await assert.rejects(db.exec('select * from private.qi_attempts'),/permission denied/);
   await assert.rejects(db.exec('select qi_internal.summary(null,current_date,current_date+1)'),/permission denied/);
   assert.equal((await rpc('context')).admin,false);
   await db.exec('reset role;set role anon');await assert.rejects(rpc('context'),/permission denied/);
  });
  await t.test('empty cohort does not invent results',async()=>{
   await actor(0);const s=await rpc('summary',scoped({from:'2026-01-01',to:'2027-01-01'}));assert.equal(s.metrics.find(m=>m.key==='enrolled').value,0);assert.equal(s.metrics.find(m=>m.key==='pre').value,null);assert.equal(s.metrics.find(m=>m.key==='completion').value,null);
  });
  await t.test('enrolment requires existing verified access and preserves sources',async()=>{
   for(let i=1;i<8;i++)await rpc('participant_add',scoped({email:`quality-${i}@example.invalid`}));
   await assert.rejects(rpc('participant_add',scoped({email:'missing@example.invalid'})),/matrícula/);
   await rpc('staff_set',scoped({email:'quality-8@example.invalid',role:'academic'}));await rpc('staff_set',scoped({email:'quality-9@example.invalid',role:'analyst'}));
  });
  await t.test('server-scored pre/post, missing values, no client score, no initial after final',async()=>{
   for(let i=1;i<5;i++){await actor(i);await rpc('submit',scoped({instrument_id:learn,phase:'pre',answers:{choices:[i===1?1:0],case_response:''},score:99}));if(i<4)await rpc('submit',scoped({instrument_id:learn,phase:'post',answers:{choices:[0],case_response:''},score:0}));}
   await actor(5);await rpc('submit',scoped({instrument_id:learn,phase:'post',answers:{choices:[1],case_response:''}}));await assert.rejects(rpc('submit',scoped({instrument_id:learn,phase:'pre',answers:{choices:[0],case_response:''}})),/preceder/);
   await actor(6);await assert.rejects(rpc('submit',scoped({instrument_id:learn,phase:'pre',answers:{choices:['0']}})),/inválida/);await assert.rejects(rpc('submit',scoped({instrument_id:comp,phase:'pre',answers:{choices:[]}})),/asignado/);
   await actor(0);const s=await rpc('summary',scoped({from:'2026-01-01',to:'2027-01-01'}));const m=k=>s.metrics.find(m=>m.key===k);
   assert.equal(m('pre').value,75);assert.equal(m('post').value,75);assert.equal(m('change').value,33.33);assert.equal(m('change').denominator,3);assert.equal(m('change').missing,4);assert.equal(m('relative').value,0);assert.equal(m('relative').numerator,2);assert.equal(m('relative').missing,1);
   assert.equal(s.followups[0].eligible,0);assert.equal(JSON.stringify(s).includes('quality-1@example.invalid'),false);
  });
  let attempt;
  await t.test('manual competencies use explicit rubric, alternatives and append-only review revisions',async()=>{
   await actor(1);attempt=(await rpc('submit',scoped({instrument_id:comp,phase:'competency',answers:{choices:[],case_response:'Respuesta clínica simulada diferente pero fundamentada en el caso.'}}))).id;
   const own=await rpc('learner',scoped({}));assert.equal(own.instruments.find(i=>i.kind==='learning').specification.questions[0].answer,undefined);
   await assert.rejects(rpc('review',scoped({attempt_id:attempt,scores:{communication:4},feedback:'Intento de autoevaluación no autorizado.'})),/restringido/);
   await actor(8);await assert.rejects(rpc('review',scoped({attempt_id:attempt,scores:{communication:3},feedback:'Puntuación inválida para el descriptor.'})),/fuera/);
   const first=await rpc('review',scoped({attempt_id:attempt,scores:{communication:2},feedback:'Justifica una decisión clínicamente distinta; falta comprobar comprensión.'}));assert.equal(first.score,50);
   const second=await rpc('review',scoped({attempt_id:attempt,scores:{communication:4},feedback:'Revisión documentada: la respuesta también incluye una comprobación explícita.'}));assert.equal(second.revision,2);
   await actor(9);assert.equal((await rpc('workspace',scoped({}))).pending.length,0);await assert.rejects(rpc('review',scoped({attempt_id:attempt,scores:{communication:4}})),/restringido/);
  });
  await t.test('experience is voluntary and separate from learning; follow-up uses completion dates and consent',async()=>{
   await actor(1);const answers=Object.fromEntries(['access','objectives','contents','platform','assessments','relevance','feedback','support','global','recommend'].map(k=>[k,5]));
   await rpc('survey',scoped({kind:'experience',day:0,answers}));await assert.rejects(rpc('survey',scoped({kind:'followup',day:30,answers:{applied:true}})),/disponible/);
   await rpc('consent',scoped({consent:true,privacy_version:'qi-2026-10-28'}));
   await db.exec('reset role');await db.query("insert into public.course_completions values($1,'quality-test','test-content-v1',now()-interval '121 days')",[ids[1]]);await actor(1);
   await rpc('survey',scoped({kind:'followup',day:30,answers:{applied:true,context:'Contexto profesional simulado',changes:'Cambio percibido simulado',barriers:'Sin barreras en el escenario',useful:'Comunicación',needs:'Más práctica'}}));
   await actor(0);await rpc('notify_due',scoped({}));await rpc('notify_due',scoped({}));await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from public.kinecheck_notifications')).rows[0].n,2);await actor(1);await rpc('consent',scoped({consent:false,privacy_version:'qi-2026-10-28'}));
   await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from public.kinecheck_notifications')).rows[0].n,0);await actor(1);
   await assert.rejects(rpc('survey',scoped({kind:'followup',day:90,answers:{applied:false}})),/disponible/);
  });
  await t.test('institutional data isolation and immediate role revocation',async()=>{
   await actor(0);const other=(await rpc('cohort_create',{program_id:program,name:'Otra cohorte SINTÉTICA',institution_id:orgs[0],starts_on:'2026-01-01',ends_on:'2027-01-01'})).id;
   await rpc('staff_set',{cohort_id:other,email:'quality-8@example.invalid',role:'academic'});
   await actor(8);await assert.rejects(rpc('summary',{cohort_id:other,from:'2026-01-01',to:'2027-01-01'}),/restringido/);
   await db.exec('reset role');await db.query("insert into private.campus_memberships values($1,$2,'docente',true,true)",[orgs[0],ids[8]]);await actor(8);assert.ok(await rpc('summary',{cohort_id:other,from:'2026-01-01',to:'2027-01-01'}));
   await db.exec('reset role');await db.query('update private.campus_memberships set active=false where user_id=$1',[ids[8]]);await actor(8);await assert.rejects(rpc('workspace',{cohort_id:other}),/restringido/);
  });
  await t.test('evidence provenance, CEL validation and optimistic revision history',async()=>{
   await actor(0);const e=(await rpc('evidence_upload',{classification:'official_requirement',filename:'requisito_prueba.txt',contents:'Documento SINTÉTICO, no corresponde a condiciones oficiales CEL.',provenance:'Fixture de prueba, sin validez externa',evidence_date:'2026-01-01',version:'test-v1',responsible:'Responsable de prueba',anonymized:true})).id;
   const record={title:'Trayectoria educativa',status:'sin_evidencia',basis:'preliminary_unverified'};
   const first=await rpc('record_save',{kind:'cel',record_key:'trajectory',record});
   await assert.rejects(rpc('record_save',{kind:'cel',record_key:'trajectory',record}),/cambió/);
   await assert.rejects(rpc('record_save',{kind:'cel',record_key:'trajectory',previous_id:first.id,evidence_id:e,record:{...record,status:'validado_documentalmente'}}),/oficial/);
   await rpc('record_save',{kind:'cel',record_key:'trajectory',previous_id:first.id,evidence_id:e,record:{...record,status:'pendiente_validacion'}});
   assert.equal((await rpc('cel_records')).length,1);
   await assert.rejects(rpc('record_save',scoped({kind:'incident',record_key:'synthetic-future-close',record:{title:'Incidencia sintética con cierre futuro',opened_at:new Date(Date.now()-3600000).toISOString(),resolved_at:new Date(Date.now()+86400000).toISOString()}})),/Fechas de incidencia/);
   await actor(1);await assert.rejects(rpc('evidence_file',{cohort_id:cohort,id:e}),/restringido/);
  });
  await t.test('four-month reports have real snapshots, approval separation and unchanged historical data',async()=>{
   await actor(0);await assert.rejects(rpc('report_create',scoped({from:'2026-10-01'})),/finaliza/);
   const r=await rpc('report_create',scoped({from:'2026-01-01'}));const draft=await rpc('report_read',scoped({id:r.id}));assert.equal(draft.period_end,'2026-05-01');assert.equal(draft.approval,null);assert.match(draft.sha256,/^[a-f0-9]{64}$/);
   await actor(8);await assert.rejects(rpc('report_approve',scoped({id:r.id,note:'Aprobación no administrativa'})),/administrativa/);
   await actor(0);const approved=await rpc('report_approve',scoped({id:r.id,note:'Revisión interna de la copia sintética completada.'}));assert.ok(approved.approval);assert.deepEqual(approved.snapshot,draft.snapshot);
   const newer=await rpc('report_create',scoped({from:'2026-01-01'}));assert.equal(newer.revision,2);
  });
  await t.test('immutable academic versions and scheduled four-month drafts',async()=>{
   await db.exec('reset role');await assert.rejects(db.query("update private.qi_program_versions set version='overwrite' where id=$1",[program]),/inmutable/);
   const planned=(await db.query("insert into private.qi_cohorts(program_id,name,starts_on,ends_on,data_mode,created_by,created_at) values($1,'SYNTHETIC scheduler fixture',(current_date-interval '8 months')::date,current_date,'real',$2,now()-interval '8 months') returning id",[program,ids[0]])).rows[0].id;
   await db.exec('select qi_internal.maintenance()');assert.equal((await db.query('select count(*)::int n from private.qi_reports where cohort_id=$1',[planned])).rows[0].n,2);
   await db.exec('select qi_internal.maintenance()');assert.equal((await db.query('select count(*)::int n from private.qi_reports where cohort_id=$1',[planned])).rows[0].n,2);
   await actor(1);await assert.rejects(db.exec('select qi_internal.maintenance()'),/permission denied/);
  });
  await t.test('personal deletion removes responses and files without changing Academy',async()=>{
   await actor(1);await rpc('erase_personal',scoped({confirm:'ELIMINAR'}));assert.equal((await rpc('learner',scoped({}))).attempts.length,0);
   await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from public.course_completions')).rows[0].n,1);
  });
  await t.test('revoked sessions reject still-unexpired tokens',async()=>{
   await db.exec('reset role');await db.query('delete from auth.sessions where user_id=$1',[ids[1]]);await actor(1);await assert.rejects(rpc('context'),/Sesión/);
  });
 }finally{await db.close();}
});
