import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';

const src=new URL('../evalua/kin2002/panel/puntajes-centralizados.js',import.meta.url);
const page=new URL('../evalua/kin2002/panel/index.html',import.meta.url);
const code=readFileSync(src,'utf8'),html=readFileSync(page,'utf8');
test('Validación de código y controles de sincronización',()=>{
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',src.pathname]));
 for(const id of ['centralScoresStatus','centralScoresRefresh','centralScoresMigrate','centralScoresResolve'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/puntajes-centralizados\.js/);
 assert.match(html,/KineCheckScores\.saveSeat\(g,s\)/);
 assert.match(code,/revision=eq\./);
 assert.match(code,/if\(!Array\.isArray\(returned\)\|\|returned\.length!==1\)/);
 assert.match(code,/[Nn]o se sobrescribió su evaluación/);
 assert.match(code,/No se modifica ningún puntaje del servidor/);
});
test('Dos sesiones simuladas: registros distintos y bloqueo de actualización conflictiva',async()=>{
 const db=new Map();
 const pk=(x)=>[x.section,x.pair_code,x.slot].join('|');
 const respond=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
 function engine(user){
  const messages={};
  const elements=Object.fromEntries(['centralScoresStatus','centralScoresRefresh','centralScoresMigrate','centralScoresResolve'].map(id=>[id,{disabled:false,style:{},dataset:{},addEventListener(_type,fn){this.click=fn},set textContent(v){messages[id]=v;},get textContent(){return messages[id]||'';}}]));
  const groups=[{id:'P01',section:'S1',day:'Miércoles',time:'11:35',students:[1,2].map(slot=>({id:'P01-'+slot,name:'Ficticio '+slot,levels:Array(8).fill(null),note:''}))}];
  const local={getItem(name){return name==='kinecheck_secure_session_v1'?JSON.stringify({access_token:'test',expires_at:9999999999}):null}};
  const fetch=async (url,opt={})=>{
   if(url.endsWith('/auth/v1/user'))return respond(200,{id:user.id,email:user.email});
   if(!url.includes('/rest/v1/kc_kin2002_sim_scores'))throw Error('RUTA INESPERADA');
   const method=opt.method||'GET',params=new URL(url).searchParams;
   const filtered=()=>[...db.values()].filter(r=>['section','pair_code','slot','revision'].every(field=>!params.has(field)||String(r[field])===params.get(field).slice(3)));
   if(method==='GET')return respond(200,filtered().map(r=>structuredClone(r)));
   const body=JSON.parse(opt.body);
   if(method==='POST'){
    const k=pk(body);if(db.has(k))return respond(409,{code:'23505'});
    db.set(k,{...body});return respond(201,[{...body}]);
   }
   if(method==='PATCH'){
    const rows=filtered();if(rows.length!==1)return respond(200,[]);
    const record={...rows[0],...body};db.set(pk(record),record);
    return respond(200,[record]);
   }
   return respond(400,{});
  };
  const env={
   window:{KINECHECK_CONFIG:{supabaseUrl:'https://fake.supabase.co',supabaseAnonKey:'anon'},addEventListener(){}},
   document:{getElementById:id=>elements[id]},
   sessionStorage:local,localStorage:local,fetch,groups,save(){},renderAll(){},
   confirm:()=>true,Date,JSON,Set,Map,String,Number,Array,Promise,Error,encodeURIComponent,console
  };
  vm.runInNewContext(code,env);
  return {groups,control:env.window.KineCheckScores,messages,elements};
 }
 const first=engine({id:'00000000-0000-4000-8000-000000000001',email:'emmanuelkine@gmail.com'});
 const second=engine({id:'00000000-0000-4000-8000-000000000002',email:'jorge.miranda@docencia.uoh.cl'});
 const wait=async (predicate)=>{
  for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,2));}
  throw Error('No se completó la operación simulada');
 };
 await wait(()=>first.control.ready&&second.control.ready);
 first.groups[0].students[0].levels[0]=3;
 first.control.saveSeat(first.groups[0],first.groups[0].students[0]);
 await wait(()=>db.get('S1|P01|1')?.levels[0]===3);
 second.groups[0].students[1].levels[0]=4;
 second.control.saveSeat(second.groups[0],second.groups[0].students[1]);
 await wait(()=>db.get('S1|P01|2')?.levels[0]===4);
 assert.equal(db.get('S1|P01|1').levels[0],3);
 assert.equal(db.get('S1|P01|2').levels[0],4);
 // Segunda sesión conserva vista obsoleta del cupo 1 y su POST es rechazado.
 second.groups[0].students[0].levels[0]=2;
 second.control.saveSeat(second.groups[0],second.groups[0].students[0]);
 await wait(()=>String(second.messages.centralScoresStatus||'').includes('GUARDADO CENTRAL NO CONFIRMADO'));
 assert.equal(db.get('S1|P01|1').levels[0],3);
});
