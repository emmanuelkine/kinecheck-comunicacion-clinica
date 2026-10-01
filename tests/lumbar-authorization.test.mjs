import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../supabase/functions/dolor-lumbar-course-key/index.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '')
  .replace(/payload: unknown/g, 'payload')
  .replace(/source: string/g, 'source')
  .replace(/const sources: string\[\]/g, 'const sources');

async function call({email='learner@example.test', access=null, validUser=true, authorization='Bearer audit-fixture', slug='dolor-lumbar-persistente', asset='window.fixture = true;'} = {}) {
  let handler, downloads = 0;
  const query = {select(){return this},eq(){return this},async maybeSingle(){return {data:access,error:null}}};
  const context = vm.createContext({
    Response, Date, Number, String, Boolean, console,
    serve(fn){handler=fn},
    Deno:{env:{get(name){return name==='KINECHECK_OWNER_EMAILS' ? 'owner@example.test' : 'test-configuration'}}},
    createClient(){return {
      auth:{async getUser(){return {data:{user:validUser?{email}:null},error:validUser?null:new Error('invalid')}}},
      from(){return query},
      storage:{from(){return {async download(){downloads++;return {data:{async text(){return asset}},error:null}}}}},
    }},
  });
  vm.runInContext(source, context);
  const response = await handler({method:'POST',headers:new Headers(authorization?{Authorization:authorization}:{}),async json(){return {courseSlug:slug}}});
  return {response,downloads};
}

test('authenticated ecosystem owner receives valid protected JavaScript without a per-course purchase row', async()=>{
  const {response,downloads}=await call({email:'owner@example.test'});
  assert.equal(response.status,200);assert.equal(downloads,2);
  new vm.Script(await response.text());
});
test('ordinary learner still requires an active, unexpired license', async()=>{
  for(const access of [null,{active:false},{active:true,access_expires_at:'2000-01-01T00:00:00Z'}]){
    const {response,downloads}=await call({access});assert.equal(response.status,403);assert.equal(downloads,0);
  }
  const {response}=await call({access:{active:true,access_expires_at:'2099-01-01T00:00:00Z'}});assert.equal(response.status,200);
});
test('invalid authentication and a different course never download protected assets', async()=>{
  for(const options of [{authorization:''},{validUser:false},{slug:'other-course'}]){
    const {response,downloads}=await call(options);assert.ok([400,401].includes(response.status));assert.equal(downloads,0);
  }
});
test('HTML returned as a protected script is rejected', async()=>{
  const {response}=await call({email:'owner@example.test',asset:'<!doctype html><title>Error</title>'});assert.equal(response.status,500);
});
