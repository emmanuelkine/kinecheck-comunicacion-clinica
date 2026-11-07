import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const base=new URL('../evalua/kin2002/simulacion/',import.meta.url);
const js=readFileSync(new URL('simulacion.js',base),'utf8');
const html=readFileSync(new URL('index.html',base),'utf8');
const importer=readFileSync(new URL('importar-maestros.js',base),'utf8');
const rubric=readFileSync(new URL('rubrica.js',base),'utf8');

test('Teacher can add third or exceptional fourth student to existing pair',()=>{
  assert.match(html,/Agregar estudiante a esta pareja \(máximo 4 excepcional\)/);
  assert.match(js,/g\.members\.length>=4/);
  assert.match(js,/un cuarto integrante excepcional/);
  assert.match(js,/g\.members\.push\(student\(\)\)/);
  assert.match(js,/g\.ready=false/);
  assert.match(js,/each|forEach/);
});

test('Master import selects own station, checks eight rubric descriptors and does not overwrite scores',()=>{
 assert.match(html,/id="master1"/);
 assert.match(html,/id="master2"/);
 assert.match(js,/KC_SIM_importRoster/);
 assert.match(importer,/assigned!==String\(station\)/);
 assert.match(importer,/rubricOfficial\[i\]/);
 assert.match(importer,/Sin|sin|no se copian/);
 assert.doesNotMatch(importer,/levels\s*:\s*r\[/);
 assert.match(js,/skipped\+\+/);
});

test('Official simulation rubric has exactly 8 criteria and 100 weight',()=>{
 const match=rubric.match(/export const rubricOfficial=([\s\S]+);\s*$/);
 assert.ok(match);
 const array=JSON.parse(match[1]);
 assert.deepEqual(array.map(r=>r[1]),[8,16,16,12,20,12,8,8]);
 assert.equal(array.reduce((s,r)=>s+r[1],0),100);
 assert.ok(array.every(r=>r.length===7));
});

test('Master input is local and results export to backup CSV',()=>{
 assert.match(html,/importar-maestros\.js/);
 assert.match(js,/Respaldo\.csv/);
 assert.doesNotMatch(importer,/\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|WebSocket)\b/);
});