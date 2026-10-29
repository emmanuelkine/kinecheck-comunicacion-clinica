import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const ids=Array.from({length:9},(_,i)=>`20000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const sessions=ids.map((_,i)=>`30000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
async function actor(i,claims={}){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:ids[i],session_id:sessions[i],role:'authenticated',...claims})]);await db.exec('set role authenticated');}
async function root(){await db.exec('reset role');}
const rpc=async(action,payload={})=>(await db.query('select public.kc_hours_api($1,$2) result',[action,JSON.stringify(payload)])).rows[0].result;
const search=async(filters={})=>(await db.query('select public.kc_hours_search($1) result',[JSON.stringify(filters)])).rows[0].result;
const next=()=>new Date(Date.now()+86400000).toISOString();
const fields=()=>({specialty:'Kinesiología',region:'Región de Maule',comuna:'Talca',starts_at:next(),location_text:'Dirección sintética 123',facility_type:'Clínica',modality:'Presencial',booking_url:'https://agenda.example.org/reservar',public_contact:''});
let orgA,orgB,slotA,ownSlot;
test('Hours pilot database authorization and complete lifecycle',async t=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);
 for(const p of (await readdir(dir)).filter(p=>p.startsWith('20261029120')||p.endsWith('_hours_institutional_pilot_secure.sql')).sort())await db.exec(await readFile(new URL(p,dir),'utf8'));
 for(let i=0;i<ids.length;i++){await db.query('insert into auth.users values($1,$2,now(),null)',[ids[i],`hours-qa-${i}@example.invalid`]);await db.query('insert into auth.sessions values($1,$2,null)',[sessions[i],ids[i]]);}
 await db.query('insert into kc_hours_private.operators values($1)',[ids[0]]);
 await t.test('confirmed sessions required; metadata never grants moderator access',async()=>{
  await actor(1,{session_id:sessions[2],user_metadata:{role:'admin'}});await assert.rejects(rpc('context'),/Sesión/);
  await actor(1,{is_anonymous:true});await assert.rejects(rpc('context'),/Sesión/);
  await actor(1,{user_metadata:{role:'admin'}});await assert.rejects(rpc('suspend_professional',{professional_id:ids[2]}),/restringido/);
 });
 await t.test('profile and unchecked declaration are atomic; version, identity, timestamp server-owned',async()=>{
  await actor(1);await assert.rejects(rpc('profile',{full_name:'QA Profesional',profession:'Kinesiología',accepted:false}),/aceptar/);assert.equal((await rpc('context')).profile,null);
  for(const a of [1,4]){await actor(a);await rpc('profile',{full_name:`QA Profesional ${a}`,profession:'Kinesiología',accepted:true,user_id:ids[8],accepted_at:'1900-01-01',verification_status:'verified'});const c=await rpc('context');assert.equal(c.profile.user_id,ids[a]);assert.equal(c.profile.verification_status,'pending');assert.equal(c.accepted,true);}
  await assert.rejects(db.query('update public.kc_health_responsibility_acceptances set accepted=false'),/permission denied/);
 });
 await t.test('release closed by default and self-verification rejected',async()=>{
  await actor(1);await assert.rejects(rpc('start_pilot'),/Verificación/);
  await assert.rejects(db.query("update public.kc_health_professionals set verification_status='verified' where user_id=$1",[ids[1]]),/permission denied/);
  await actor(0);for(const a of [1,4]){await rpc('verify_professional',{professional_id:ids[a],evidence_url:'https://rnpi.superdesalud.gob.cl/'});await rpc('approve_booking_host',{professional_id:ids[a],booking_url:fields().booking_url,evidence_url:'https://www.minsal.cl/'});}
  await actor(1);await assert.rejects(rpc('start_pilot'),/no está habilitado/);
 });
 await t.test('two institutions register without inheriting authorization or verification',async()=>{
  for(const [actorIndex,label] of [[2,'A'],[5,'B']]){await actor(actorIndex);const r=await rpc('create_institution',{legal_name:`QA Clínica ${label}`,public_name:`QA Clínica ${label}`,institution_type:'Clínica',region:'Maule',comuna:'Talca',contact_email:`qa-${label}@example.invalid`});if(label==='A')orgA=r.institution_id;else orgB=r.institution_id;assert.equal((await rpc('context')).institutions[0].verification_status,'pending');}
  await actor(2);await assert.rejects(rpc('members',{institution_id:orgB}),/no autorizada/);await assert.rejects(rpc('metrics',{institution_id:orgB}),/Permisos/);
 });
 async function invite(owner,joiner,org,role){await actor(owner);const {token}=await rpc('invite',{institution_id:org,role,email:`hours-qa-${joiner}@example.invalid`});await actor(joiner);await rpc('accept_invite',{token,consent:true});return token;}
 await t.test('email-bound invitations cannot be stolen or reused',async()=>{
  await actor(2);const {token}=await rpc('invite',{institution_id:orgA,role:'professional',email:'hours-qa-1@example.invalid'});
  await actor(4);await assert.rejects(rpc('accept_invite',{token,consent:true}),/Invitación/);
  await actor(1);await rpc('accept_invite',{token,consent:true});await assert.rejects(rpc('accept_invite',{token,consent:true}),/Invitación/);
  await actor(2);const m=await rpc('members',{institution_id:orgA});assert.equal(m.rows[0].membership_status,'pending');await rpc('member_status',{institution_id:orgA,professional_id:ids[1],status:'active'});
  await invite(5,1,orgB,'professional');await actor(5);await rpc('member_status',{institution_id:orgB,professional_id:ids[1],status:'active'});
  await actor(1);assert.equal((await rpc('context')).memberships.length,2);
 });
 await t.test('institution pilot begins on effective activation and cannot be reset',async()=>{
  await actor(0);for(const org of [orgA,orgB]){await rpc('verify_institution',{institution_id:org,evidence_url:'https://www.minsal.cl/'});await rpc('approve_booking_host',{institution_id:org,booking_url:fields().booking_url,evidence_url:'https://www.minsal.cl/'});}
  await root();await db.exec("update kc_hours_private.release set enabled=true,legal_approved=true,review_reference='SYNTHETIC LOCAL QA ONLY'");
  await actor(2);const p=await rpc('start_pilot',{institution_id:orgA});assert.equal(Date.parse(p.expires_at)-Date.parse(p.started_at),60*86400000);const p2=await rpc('start_pilot',{institution_id:orgA});assert.equal(p2.started_at,p.started_at);
  await actor(5);await rpc('start_pilot',{institution_id:orgB});await actor(4);await rpc('start_pilot');
 });
 await t.test('secretary needs institution permission plus each professional delegation',async()=>{
  await invite(2,3,orgA,'secretary');await actor(3);await assert.rejects(rpc('save_slot',{...fields(),institution_id:orgA,professional_id:ids[1]}),/Sin autorización/);assert.equal((await rpc('members',{institution_id:orgA})).rows.length,0);
  await actor(1);await rpc('delegate',{institution_id:orgA,user_id:ids[3],active:true});await actor(3);assert.equal((await rpc('members',{institution_id:orgA})).rows.length,1);
  slotA=(await rpc('save_slot',{...fields(),institution_id:orgA,professional_id:ids[1]})).slot_id;
  await actor(6);await assert.rejects(rpc('save_slot',{...fields(),institution_id:orgA,professional_id:ids[1]}),/Sin autorización/);await assert.rejects(rpc('slots',{institution_id:orgA}),/no autorizada/);
 });
 await t.test('anonymous search filters date, profession, commune, region, modality and facility without private data',async()=>{
  await actor(4);ownSlot=(await rpc('save_slot',fields())).slot_id;
  await db.exec('set role anon');const rows=await search({region:'Maule',comuna:'tal',specialty:'kine',modality:'Presencial',facility_type:'Clínica'});assert.equal(rows.length,2);assert.ok(rows[0].full_name);for(const key of ['professional_id','created_by','user_id','contact_email'])assert.equal(rows[0][key],undefined);
  assert.equal((await search({modality:'Teleconsulta'})).length,0);assert.equal((await search({date:'2001-01-01'})).length,0);assert.equal((await search({facility_type:'Hospital'})).length,0);await assert.rejects(rpc('context'),/permission denied/);
  assert.equal((await db.query('select id from public.kc_health_slots')).rows.length,2);await assert.rejects(db.query('select * from kc_hours_private.pilots'),/permission denied/);
 });
 await t.test('all slot edits revalidate safe links; identity and tenant cannot change',async()=>{
  await actor(3);await assert.rejects(rpc('save_slot',{...fields(),slot_id:slotA,booking_url:'https://user:password@evil.org/'}),/HTTPS/);await assert.rejects(rpc('save_slot',{...fields(),slot_id:slotA,booking_url:'https://unapproved.example.org/reservar'}),/dominio/);
  for(const url of ['javascript:alert(1)','https://127.0.0.1/x','https://localhost/x','https://a..example.org/x','https://internal.local/x'])await assert.rejects(rpc('save_slot',{...fields(),slot_id:slotA,booking_url:url}),/HTTPS/);
  await rpc('save_slot',{...fields(),slot_id:slotA,institution_id:orgB,professional_id:ids[4],comuna:'Rancagua'});const rows=await rpc('slots',{institution_id:orgA});assert.equal(rows[0].institution_id,orgA);assert.equal(rows[0].professional_id,ids[1]);
  await actor(5);await assert.rejects(rpc('deactivate_slot',{slot_id:slotA}),/Sin autorización/);
 });
 await t.test('revoking an approved booking domain hides existing slots and blocks edits',async()=>{
  await actor(0);await rpc('revoke_booking_host',{institution_id:orgA,booking_url:fields().booking_url});await db.exec('set role anon');assert.equal((await search()).some(x=>x.id===slotA),false);await actor(3);await assert.rejects(rpc('save_slot',{...fields(),slot_id:slotA}),/dominio/);await actor(0);await rpc('approve_booking_host',{institution_id:orgA,booking_url:fields().booking_url,evidence_url:'https://www.minsal.cl/'});
 });
 await t.test('revocation is immediate using the same existing session; other clinic unaffected',async()=>{
  await actor(1);await rpc('delegate',{institution_id:orgA,user_id:ids[3],active:false});await actor(3);await assert.rejects(rpc('save_slot',{...fields(),slot_id:slotA}),/Sin autorización/);
  await actor(1);await rpc('delegate',{institution_id:orgA,user_id:ids[3],active:true});await actor(2);await rpc('revoke_staff',{institution_id:orgA,user_id:ids[3]});await actor(3);await assert.rejects(rpc('save_slot',{...fields(),slot_id:slotA}),/Sin autorización/);
  await actor(2);await rpc('member_status',{institution_id:orgA,professional_id:ids[1],status:'revoked'});await db.exec('set role anon');assert.equal((await search()).some(x=>x.id===slotA),false);
  await actor(5);assert.equal((await rpc('members',{institution_id:orgB})).rows[0].membership_status,'active');
 });
 await t.test('expiry blocks publication and hides old active slots without deleting data; cancellation works',async()=>{
  await root();await db.query("update kc_hours_private.pilots set started_at=now()-interval '61 days',expires_at=now()-interval '1 day' where subject_id=$1",[ids[4]]);
  await actor(4);assert.equal((await rpc('context')).pilots[0].state,'expired');await assert.rejects(rpc('save_slot',fields()),/piloto activo/);await assert.rejects(rpc('save_slot',{...fields(),slot_id:ownSlot}),/piloto activo/);
  await db.exec('set role anon');assert.equal((await search()).some(x=>x.id===ownSlot),false);
  await actor(4);assert.equal((await rpc('slots')).length,1);await rpc('deactivate_slot',{slot_id:ownSlot});assert.equal((await rpc('slots'))[0].status,'inactive');
 });
 await t.test('anonymous reports collect no patient details and only an operator can suspend',async()=>{
  await actor(5);slotA=(await rpc('save_slot',{...fields(),institution_id:orgB,professional_id:ids[1]})).slot_id;
  await db.exec('set role anon');await db.query('select public.kc_hours_public_event($1,$2)',[slotA,'suspected_fraud']);assert.equal((await search()).length,1);
  await actor(5);await assert.rejects(rpc('suspend_slot',{slot_id:slotA}),/moderación/);await actor(0);assert.equal((await rpc('reports')).length,1);await rpc('suspend_slot',{slot_id:slotA});
  await db.exec('set role anon');assert.equal((await search()).length,0);await actor(5);await assert.rejects(rpc('save_slot',{...fields(),slot_id:slotA}),/./); // inactive remains unpublishable; no reactivation endpoint
 });
 await t.test('booked outcome deactivates immediately and institutional metrics are isolated',async()=>{
  await actor(5);const s=(await rpc('save_slot',{...fields(),institution_id:orgB,professional_id:ids[1]})).slot_id;
  await db.exec('set role anon');await db.query('select public.kc_hours_public_event($1,$2)',[s,'contact']);await actor(5);await rpc('deactivate_slot',{slot_id:s,booked:true});const m=await rpc('metrics',{institution_id:orgB});assert.equal(m.booked,1);assert.equal(m.contacts,1);assert.equal(m.automatic_charges,false);assert.equal(m.pricing_basis,'enabled_professionals');
  await actor(3);await assert.rejects(rpc('metrics',{institution_id:orgB}),/Permisos/);
 });
 await t.test('pending invitations can be revoked before use without leaking another clinic',async()=>{
  await actor(2);const {token}=await rpc('invite',{institution_id:orgA,email:'hours-qa-8@example.invalid',role:'secretary'});const pending=await rpc('invitations',{institution_id:orgA});await actor(5);await assert.rejects(rpc('revoke_invitation',{institution_id:orgA,token_hash:pending[0].token_hash}),/Permisos/);await actor(2);await rpc('revoke_invitation',{institution_id:orgA,token_hash:pending[0].token_hash});await actor(8);await assert.rejects(rpc('accept_invite',{token}),/Invitación/);
 });
 await t.test('revoked Auth sessions cannot call the API with an unexpired claim',async()=>{await root();await db.query('delete from auth.sessions where id=$1',[sessions[8]]);await actor(8);await assert.rejects(rpc('context'),/Sesión/);});
 await t.test('profile edits reset independent verification, deactivation removes availability',async()=>{
  await actor(1);await rpc('profile',{full_name:'QA Nombre actualizado',profession:'Kinesiología',accepted:true});assert.equal((await rpc('context')).profile.verification_status,'pending');await rpc('profile_active',{active:false});assert.equal((await rpc('context')).profile.is_active,false);
 });
 await t.test('205 professionals use bounded, stable pages; private shared schema permissions unchanged',async()=>{
  await root();await db.exec(`insert into auth.users(id,email,email_confirmed_at) select ('40000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,'bulk-'||g||'@example.invalid',now() from generate_series(1,205) g;
  insert into public.kc_health_professionals(user_id,full_name,profession) select id,'QA Profesional '||right(id::text,12),'Kinesiología' from auth.users where id::text like '40000000%';`);
  await db.query("insert into public.kc_health_institution_members(institution_id,professional_id,membership_status,professional_consent) select $1,id,'active',true from auth.users where id::text like '40000000%'",[orgB]);await actor(5);
  const start=performance.now();const pages=[];for(let offset=0;offset<250;offset+=50)pages.push(await rpc('members',{institution_id:orgB,offset}));const elapsed=performance.now()-start;const all=pages.flatMap(p=>p.rows);assert.equal(all.length,206);assert.equal(new Set(all.map(x=>x.professional_id)).size,206);assert.equal(pages[0].rows.length,50);console.log(JSON.stringify({hoursPilotLocal205ProfessionalsMs:Math.round(elapsed)}));
  await root();assert.equal((await db.query("select has_schema_privilege('authenticated','private','usage') allowed")).rows[0].allowed,false);
 });
 await db.close();
});
