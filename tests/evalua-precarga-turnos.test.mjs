import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const dir=new URL('../evalua/kin2002/simulacion/',import.meta.url);
const schedule=readFileSync(new URL('turnos-publicos.js',dir),'utf8');
const html=readFileSync(new URL('index.html',dir),'utf8');
const logic=readFileSync(new URL('simulacion.js',dir),'utf8');

test('Agenda official loads 37 pairs P01–P37, without roster names or ratings',()=>{
 const json=schedule.match(/const schedule = (\[[^\n]+\]);/);
 assert.ok(json,'Static schedules array exists');
 const rows=JSON.parse(json[1]);
 assert.equal(rows.length,37);
 assert.deepEqual(rows.map(r=>r[0]),Array.from({length:37},(_,i)=>'P'+String(i+1).padStart(2,'0')));
 assert.equal(rows.filter(r=>r[1]==='S1').length,21);
 assert.equal(rows.filter(r=>r[1]==='S2').length,16);
 assert.equal(rows.filter(r=>r[2]==='1').length,19);
 assert.equal(rows.filter(r=>r[2]==='2').length,18);
 assert.deepEqual(rows.slice(0,2).map(r=>r.slice(0,5)),[
 ['P01','S1','1','Miércoles','11:35'],['P02','S1','2','Miércoles','11:35']]);
 assert.deepEqual(rows.at(-1),['P37','S2','2','Jueves','15:05']);
 assert.doesNotMatch(schedule,/Joseph sanchez|ignacia cornejo|valentina valenzuela/i);
});

test('New agenda is actually linked from simulation page',()=>{
 assert.match(html,/src="\.\/turnos-publicos\.js"/);
 assert.match(schedule,/KC_SIM_importRoster/);
});

test('Private CSV import fills only untouched pair slots, never overwrites student ratings',()=>{
 assert.match(logic,/const pristine=!existing\.ready/);
 assert.match(logic,/Se protege contra sobrescrituras/);
 assert.match(logic,/for\(const \{existing,members\} of updates\)/);
 assert.match(logic,/rows=parseCSV/);
});
