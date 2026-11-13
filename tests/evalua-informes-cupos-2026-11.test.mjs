import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const panel=readFileSync(new URL('../evalua/kin2002/panel/index.html',import.meta.url),'utf8');
const privateLoader=readFileSync(new URL('../evalua/kin2002/panel/nomina-privada.js',import.meta.url),'utf8');
const match=panel.match(/const INITIAL=(\{[\s\S]*?\});const KEY=/);
assert.ok(match,'Datos de estructura del panel');
const initial=JSON.parse(match[1]);
test('37 parejas y 5 hitos sin nombres ni notas en HTML público',()=>{
 assert.equal(initial.groups.length,37);
 assert.equal(initial.criteria.length,5);
 for(const g of initial.groups)for(const s of g.students){assert.equal(s.name,'');assert.equal(s.report,null);}
});
test('Botones para estudiantes segundo, tercero y excepcional cuarto',()=>{
 assert.match(panel,/id="addSecond"/);
 assert.match(panel,/id="addThird"/);
 assert.match(panel,/id="addFourth"/);
 assert.match(panel,/insertSeat\(2\)/);
 assert.match(panel,/insertSeat\(3\)/);
 assert.match(panel,/insertSeat\(4\)/);
 assert.match(panel,/g\.students\.length>=count/);
 assert.match(panel,/levels:Array\(8\)\.fill\(null\)/);
});
test('Nombres se obtienen desde tabla RLS bajo sesión docente; cargador expande cupos',()=>{
 assert.match(privateLoader,/kc_kin2002_sim_roster/);
 assert.match(privateLoader,/\/auth\/v1\/user/);
 assert.match(privateLoader,/while\(g\.students\.length<=slot\)/);
 assert.match(privateLoader,/slot>=4/);
 assert.doesNotMatch(privateLoader,/innerHTML/);
});
test('Informe independiente, 60% de exigencia, CSV validado y retroalimentación',()=>{
 assert.match(panel,/data-report-points/);
 assert.match(panel,/data-report-feedback/);
 assert.match(panel,/grade\(s\.reportPoints\)/);
 assert.match(panel,/reportsCsv/);
 assert.match(panel,/seen\.has\(key\)/);
 assert.match(panel,/calificación existente diferente, no sobrescrita/);
 assert.match(panel,/La nota queda pendiente|la nota queda pendiente/);
 assert.match(panel,/30 % del Certamen 2/);
});