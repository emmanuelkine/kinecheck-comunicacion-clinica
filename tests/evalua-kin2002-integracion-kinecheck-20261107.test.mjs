import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Institutional KIN2002 can be opened through official KineCheck Evalúa',()=>{
 const root=read('evalua/index.html'),app=read('evalua/kin2002/index.html');
 assert.match(root,/id="kin2002-institucional"/);
 assert.match(root,/href="\/evalua\/kin2002\/"/);
 assert.match(app,/\.\/panel\//);
 assert.match(app,/No se han migrado usuarios, informes PDF ni calificaciones oficiales/);
});
test('Private roster remains RLS-backed and not embedded in public HTML',()=>{
 const roster=read('evalua/kin2002/panel/nomina-privada.js');
 const panel=read('evalua/kin2002/panel/index.html');
 assert.match(roster,/kinecheck_secure_session_v1/);
 assert.match(roster,/kc_kin2002_sim_roster/);
 assert.doesNotMatch(panel,/@pregrado\.uoh\.cl/);
});
test('Certamen2 only appears when validated report and simulation are unambiguous',()=>{
 const script=read('evalua/kin2002/evalua.js');
 assert.match(script,/const official=matched&&b\[0\]\.approved&&reason\.length===0/);
 assert.match(script,/const cert=official\?/);
 assert.match(script,/repNote:b\.length===1&&b\[0\]\.approved\?/);
 assert.match(script,/validation==='confirmado'\|\|validation==='aprobado'\|\|validation==='validado'/);
 assert.match(script,/Informe duplicado/);
});
test('Client-only import is syntax-valid',()=>{
 const path=new URL('../evalua/kin2002/evalua.js',import.meta.url).pathname;
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',path]));
 const html=read('evalua/kin2002/index.html');
 assert.match(html,/No se han migrado usuarios/);
 assert.match(html,/sin envío de datos al servidor/);
});
test('No fictitious final grade when report is unapproved (execution)',()=>{
 const script=read('evalua/kin2002/evalua.js');
 const start=script.indexOf('const uniqueBy='),end=script.indexOf('function csvCell(');
 assert.ok(start>=0&&end>start);
 const block=script.slice(start,end).replace('let output=[];','let output=[];');
 const els={stats:{replaceChildren(){}},tablebody:{replaceChildren(){}},result:{classList:{remove(){}}}};
 const document={getElementById:id=>els[id],createElement:()=>({children:[],append(...items){this.children.push(...items)},set textContent(v){this.text=String(v)},set className(v){this.cls=v}})};
 const context={document,Math,Set,Map,String,Array,Number,normalize:s=>String(s).toLowerCase(),f:x=>String(x),$:(id)=>els[id]};vm.createContext(context);
 vm.runInContext(block+';globalThis.__render=render;globalThis.__data=()=>output;',context);
 const sim=[{name:'Caso ficticio',section:'S1',points:90,note:6.3,complete:true,source:'sim'}];
 const rep=[{name:'Caso ficticio',section:'S1',points:95,note:6.6,complete:true,approved:false,source:'informe'}];
 context.__render(sim,rep);let row=context.__data()[0];
 assert.equal(row.cert,null);assert.equal(row.repNote,null);assert.equal(row.official,false);
 rep[0].approved=true;context.__render(sim,rep);row=context.__data()[0];
 assert.equal(row.official,true);assert.equal(row.cert,6.4);
 context.__render(sim,[...rep,{...rep[0]}]);row=context.__data()[0];
 assert.equal(row.cert,null);
});
