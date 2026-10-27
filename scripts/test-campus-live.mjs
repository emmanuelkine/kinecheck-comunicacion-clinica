// Real GoTrue sessions and database RPCs, exclusively against KineCheck Staging.
// Supply disposable accounts via a mode-0600 JSON fixture outside the checkout.
import { readFile,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHandler } from '../functions/api/campus/[[path]].js';
import { isCampusPreviewHost } from '../campus/environment.mjs';
const fixtures=JSON.parse(await readFile(process.argv[2],'utf8'));
if(fixtures.some(u=>!/^campus-qa-[a-f0-9]+@example\.invalid$/.test(u.email)))throw new Error('Only disposable Campus QA fixtures are permitted.');
const handler=createHandler({base:'https://mhnqtyvwxytppekktvxb.supabase.co',key:'sb_publishable_JLWKq6m0g4yB30iIQLE4bg_AkspSDYD'});
const remote=process.argv[3];
if(remote && (!isCampusPreviewHost(new URL(remote).hostname)||new URL(remote).protocol!=='https:'))throw new Error('Remote tests are limited to the Campus Pages preview.');
const origin=remote?new URL(remote).origin:'https://campus-staging.example';const jars=fixtures.map(()=>({}));const results=[];
async function call(index,path,body,expected=200,override){
 const request=new Request(`${origin}/api/campus/${path}`,{method:'POST',headers:{origin,'content-type':'application/json',cookie:override||Object.entries(jars[index]).map(([k,v])=>`${k}=${v}`).join('; ')},body:JSON.stringify(body)});
 const response=remote?await fetch(request):await handler({request});
 const data=await response.json();assert.equal(response.status,expected,`${path}: ${JSON.stringify(data)}`);
 for(const item of response.headers.getSetCookie()){const [pair]=item.split(';');const split=pair.indexOf('=');jars[index][pair.slice(0,split)]=pair.slice(split+1);}
 return data;
}
const act=(index,action,payload={},status=200)=>call(index,'action',{action,payload},status);
for(let i=0;i<fixtures.length;i++){
 await call(i,'auth/login',{email:fixtures[i].email,password:fixtures[i].password});
 await act(i,'profile',{display_name:`Control técnico ${i+1}`,academic_level:i+1,privacy_version:'2026-10-27'});
}
results.push('3 real verified sessions and profiles');
const {institution_id:org}=await act(0,'create_institution',{name:'Control técnico Campus (sin universidad)',authorized:true});
const score=await act(1,'submit',{case_id:'escuchar',answers:[0,1,2],score:0,user_id:fixtures[0].id});assert.equal(score.score,100);results.push('Server grading ignores caller score and identity');
for(const [i,role] of [[1,'estudiante'],[2,'docente']]){const invitation=await act(0,'invite',{institution_id:org,email:fixtures[i].email,role});await act(i,'join',{token:invitation.token,share_metrics:true});await act(i,'join',{token:invitation.token},403);}
assert.equal((await act(1,'context')).progress[0].best_score,100);results.push('Email-bound invitations, replay denied and progress preserved');
await act(1,'metrics',{institution_id:org},403);await act(2,'members',{institution_id:org},403);await act(1,'assignments',{institution_id:'ffffffff-ffff-4fff-8fff-ffffffffffff'},403);results.push('Role and cross-tenant denials');
await act(2,'assign',{institution_id:org,case_id:'hipotesis',title:'Actividad técnica de validación'});assert.equal((await act(1,'assignments',{institution_id:org})).length,1);assert.equal((await act(2,'metrics',{institution_id:org})).suppressed,true);results.push('Teacher activity, student access and privacy threshold');
await call(1,'auth/refresh',{});assert.equal((await act(1,'export')).attempts.length,1);results.push('Real refresh and personal export');
await act(0,'revoke',{institution_id:org,user_id:fixtures[1].id});assert.equal((await act(1,'context')).memberships.length,0);assert.equal((await act(1,'context')).progress.length,1);results.push('Revoked membership immediately denied; personal progress preserved');
const previous=Object.entries(jars[1]).map(([k,v])=>`${k}=${v}`).join('; ');await call(1,'auth/logout',{});await call(1,'action',{action:'context',payload:{}},401,previous);results.push('Logout invalidates database authorization for the previous access token');
await writeFile('/tmp/kc-campus-live-result.json',JSON.stringify({institution_id:org,results},null,2));console.log(JSON.stringify({passed:results.length,checks:results},null,2));
