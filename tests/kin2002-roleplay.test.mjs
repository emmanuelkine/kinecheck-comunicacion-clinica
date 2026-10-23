import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
globalThis.crypto ||= webcrypto;
const source = await readFile(new URL('../functions/api/kin2002-roleplay.js', import.meta.url), 'utf8');
const api = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const id = '22222222-2222-4222-8222-222222222222', token = 'a'.repeat(64);
const choices = ['contrast','purpose','provisional','adjust','specific'];
function payload() {
  return {id, token, section:'S1',caseId:'lumbar',group:'Grupo sintético QA',members:['Ana prueba','Beto prueba','Clara prueba'],rounds:Array.from({length:3},()=>({
    ...Object.fromEntries(['interview','safety','evaluation','initial','adaptation','strength','improvement','replay'].map(key=>[key,'Respuesta sintética con datos y fundamento.'])),
    checks:Object.fromEntries(choices.map((choice,i)=>[i+1,{choice,observed:'yes',evidence:'Preguntó por la prioridad y escuchó la respuesta.'}])),
    attempts:[{stage:1,choice:'assume',at:'2026-10-23T13:00:00Z'},{stage:1,choice:'contrast',at:'2026-10-23T13:01:00Z'}]
  }))};
}
function environment() {
  const map = new Map();
  return {map,C2_ADMIN_EMAIL:'docente-sintetico@example.test',CERT_REQUESTS:{
    get:async(key,type)=>map.has(key)?type==='json'?JSON.parse(map.get(key)):map.get(key):null,
    put:async(key,value)=>map.set(key,value),
    list:async({prefix})=>({keys:[...map.keys()].filter(key=>key.startsWith(prefix)).map(name=>({name})),list_complete:true})
  }};
}
const request=(body,method='POST',extra={})=>new Request('https://kinecheck.cl/api/kin2002-roleplay',{method,headers:{'content-type':'application/json',origin:'https://kinecheck.cl',...extra},...(method==='GET'?{}:{body:JSON.stringify(body)})});
test('save confirmed, identical retry is idempotent and modified retry cannot replace an earlier work', async()=>{
  const env=environment(),b=payload();
  assert.equal((await api.onRequestPost({request:request(b),env})).status,201);
  const repeated=await api.onRequestPost({request:request(b),env}); assert.equal(repeated.status,200);assert.equal((await repeated.json()).duplicate,true);
  b.group='Otro grupo';assert.equal((await api.onRequestPost({request:request(b),env})).status,409);
  assert.equal(env.map.size,1);assert.equal(JSON.parse([...env.map.values()][0]).group,'Grupo sintético QA');
});
test('missing steps, wrong choices and unobserved actions cannot be submitted',async()=>{
  for(const mutate of [b=>b.rounds.pop(),b=>b.rounds[0].checks[1].choice='assume',b=>b.rounds[0].checks[1].observed='repeat',b=>b.rounds[0].checks[1].evidence='',b=>b.rounds[0].safety='']){
    const env=environment(),b=payload();mutate(b);assert.equal((await api.onRequestPost({request:request(b),env})).status,400);assert.equal(env.map.size,0);
  }
});
test('unauthorized teacher read and write are denied; cross-origin writes fail',async()=>{
  const env=environment();
  assert.equal((await api.onRequestGet({request:request(null,'GET'),env})).status,401);
  assert.equal((await api.onRequestPut({request:request({id,feedback:'Sin autorización'},'PUT'),env})).status,401);
  assert.equal((await api.onRequestPost({request:request(payload(),'POST',{origin:'https://evil.example'}),env})).status,403);
});
test('private receipt hides names, answers and secrets and rejects another token',async()=>{
  const env=environment();await api.onRequestPost({request:request(payload()),env});
  let res=await api.onRequestPost({request:request({action:'receipt',id,token:'b'.repeat(64)}),env});assert.equal(res.status,403);
  res=await api.onRequestPost({request:request({action:'receipt',id,token}),env}); const result=await res.json();assert.equal(res.status,200);
  for(const key of ['members','rounds','readHash','token','digest'])assert.equal(key in result,false);
  assert.equal(result.status,'Pendiente de revisión docente');
});
test('verified owner can review; student reads published feedback; stored attempts survive',async()=>{
  const env=environment();await api.onRequestPost({request:request(payload()),env});
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({email:'docente-sintetico@example.test'});
  try{
    const headers={authorization:'Bearer eySyntheticValidOwner'};
    const response=await api.onRequestGet({request:request(null,'GET',headers),env}); const listing=await response.json();assert.equal(listing.records.length,1);assert.equal('readHash' in listing.records[0],false);assert.equal(listing.records[0].rounds[0].attempts[0].choice,'assume');
    const put=await api.onRequestPut({request:request({id,feedback:'Vinculen la dosis con la función laboral.'},'PUT',headers),env});assert.equal(put.status,200);
    const receipt=await api.onRequestPost({request:request({action:'receipt',id,token}),env});assert.equal((await receipt.json()).teacherFeedback,'Vinculen la dosis con la función laboral.');
    globalThis.fetch=async()=>Response.json({email:'otro-sintetico@example.test'});
    assert.equal((await api.onRequestGet({request:request(null,'GET',headers),env})).status,401);
  } finally {globalThis.fetch=originalFetch;}
});
test('storage unavailable or failed cannot produce a false successful receipt',async()=>{
  assert.equal((await api.onRequestPost({request:request(payload()),env:{}})).status,503);
  const env=environment();env.CERT_REQUESTS.put=async()=>{throw Error('synthetic unavailable')};
  assert.equal((await api.onRequestPost({request:request(payload()),env})).status,503);
});
