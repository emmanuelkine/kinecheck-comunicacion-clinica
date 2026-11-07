import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const root=new URL('../evalua/kin2002/',import.meta.url);
const landing=readFileSync(new URL('index.html',root),'utf8');
const html=readFileSync(new URL('simulacion/index.html',root),'utf8');
const logic=readFileSync(new URL('simulacion/simulacion.js',root),'utf8');
const dashboard=readFileSync(new URL('simulacion/dashboard.js',root),'utf8');
test('KIN2002 offers Simulación as a separate tab',()=>{
 assert.match(landing,/href="\.\/simulacion\/"/);
 for(const section of ['overview','simulation','records','student','alerts','backup'])assert.match(html,new RegExp('id="dash-'+section+'"'));
 assert.match(html,/src="\.\/dashboard\.js"/);
});
test('Simulation preserves 8-criterion 100-point rubric with 60 percent threshold',()=>{
 assert.match(logic,/weights=\[8,16,16,12,20,12,8,8\]/);
 assert.match(logic,/levels\.length===8/);
 assert.match(logic,/Number\.isInteger\(x\)/);
 assert.match(logic,/n<=60\?1\+3\*n\/60/);
 assert.match(logic,/m\.levels\[i\]===null/);
});
test('Academic data stays in memory, not published as student records',()=>{
 for(const source of [logic,dashboard]){
  assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|WebSocket)\b/);
 }
 assert.match(html,/Sin conexión al registro académico|sin conexión al registro académico/i);
 assert.doesNotMatch(html,/Javiera Díaz Carrasco|Joaquin Andres Farias Caceres/);
});
test('Teacher can export and reimport individual outcomes without Excel from simulation',()=>{
 assert.match(logic,/KineCheck_KIN2002_Simulacion_Respaldo\.csv/);
 assert.match(logic,/Sección','Pareja','Evaluador/);
 assert.match(logic,/if\(cols\.every\(c=>c>=0\)\)/);
 assert.match(dashboard,/Ficha|ficha|studentCard/);
});
