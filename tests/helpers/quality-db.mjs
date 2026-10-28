// Synthetic, isolated PostgreSQL fixtures. These are never deployed or exported as real activity.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
export const ids=Array.from({length:10},(_,i)=>`70000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
export const sessions=ids.map((_,i)=>`71000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
export const orgs=['72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002'];
export const dossier={name:'Curso sintético de prueba',responsibles:'Equipo académico de prueba',valid_from:'2026-01-01',valid_to:'2027-01-01',objectives:'Justificar decisiones',outcomes:'Explicar incertidumbre',competencies:'Comunicación',audience:'Profesionales',entry_requirements:'Formación clínica',contents:'Caso clínico simulado',workload:'60 minutos de prueba',methodologies:'Caso y reflexión',evaluation:'Prueba y revisión humana',bibliography:'Fuente de prueba, no validada para docencia',change_reason:'Versión sintética para pruebas',content_version:'test-content-v1'};
export const learning={questions:[{id:'q1',prompt:'Caso simulado: ¿cómo explorarías la preocupación expresada?',options:['Pedir a la persona que explique su preocupación','Asegurar un diagnóstico definitivo sin evaluación'],answer:0,points:2,feedback:'Explorar la preocupación permite ajustar la comunicación.'}],rubric:[],case_prompt:''};
export const competency={questions:[],case_prompt:'Caso simulado: una persona expresa preocupación por una etiqueta diagnóstica. Explica cómo comunicarías incertidumbre.',rubric:[{id:'communication',dimension:'Comunicación clínica',maximum:4,levels:[{score:0,descriptor:'No explora preocupaciones ni justifica decisiones.'},{score:2,descriptor:'Explora preocupaciones con justificación parcial.'},{score:4,descriptor:'Explora preocupaciones, comunica incertidumbre y comprueba comprensión.'}]}]};
export async function createQualityDB(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema private;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to authenticated; grant execute on function auth.jwt(),auth.uid() to authenticated;
 create table private.campus_operators(user_id uuid primary key references auth.users(id));
 create table private.campus_institutions(id uuid primary key,name text,active boolean default true);
 create table private.campus_memberships(institution_id uuid,user_id uuid,role text,active boolean default true,share_metrics boolean default true);
 create table public.course_academic_load(course_slug text primary key,title text,content_version text,audited_minutes int,methodology text);
 create table public.course_access(email text,course_slug text,active boolean,access_expires_at timestamptz,access_source text,last_event text,transaction_id text);
 create table public.course_completions(user_id uuid,course_slug text,content_version text,completed_at timestamptz);
 create table public.course_assessment_attempts(user_id uuid,course_slug text,content_version text,submitted_at timestamptz,passed boolean);
 create table public.kinecheck_notifications(email text,notification_type text,title text,body text,course_slug text,action_url text,action_label text,dedupe_key text unique,metadata jsonb);
 insert into public.course_academic_load values('quality-test','Curso sintético de prueba','test-content-v1',60,'Caso simulado');`);
 await db.exec(await readFile(new URL('../../supabase/schema/quality_impact.sql',import.meta.url),'utf8'));
 for(let i=0;i<ids.length;i++){
  await db.query('insert into auth.users values($1,$2,now(),null)',[ids[i],`quality-${i}@example.invalid`]);
  await db.query('insert into auth.sessions values($1,$2,null)',[sessions[i],ids[i]]);
  await db.query("insert into public.course_access values($1,'quality-test',true,null,'hotmart','PURCHASE_APPROVED',$2)",[`quality-${i}@example.invalid`,`TEST-TRANSACTION-${i}`]);
 }
 await db.query('insert into private.campus_operators values($1)',[ids[0]]);
 for(let i=0;i<orgs.length;i++)await db.query('insert into private.campus_institutions values($1,$2,true)',[orgs[i],`Institución SINTÉTICA ${i}`]);
 const actor=async(index,extra={})=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:ids[index],session_id:sessions[index],role:'authenticated',...extra})]);await db.exec('set role authenticated');};
 const rpc=async(action,payload={})=>(await db.query('select public.quality_impact_api($1,$2::jsonb) result',[action,JSON.stringify(payload)])).rows[0].result;
 await actor(0);
 const program=(await rpc('program_create',{course_slug:'quality-test',version:'test-v1',dossier,source:'Fixture sintético de pruebas automatizadas'})).id;
 const learn=(await rpc('instrument_create',{program_id:program,kind:'learning',version:'test-v1',title:'Instrumento sintético inicial y final',specification:learning,validation_source:'Validación técnica sintética, no aprobación clínica'})).id;
 const comp=(await rpc('instrument_create',{program_id:program,kind:'competency',version:'test-v1',title:'Rúbrica sintética de prueba',specification:competency,validation_source:'Validación técnica sintética, no aprobación clínica'})).id;
 const cohort=(await rpc('cohort_create',{program_id:program,name:'Cohorte SINTÉTICA',starts_on:'2026-01-01',ends_on:'2027-01-01',learning_id:learn,competency_id:comp,data_mode:'test'})).id;
 return {db,actor,rpc,program,learn,comp,cohort};
}
