import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const page=readFileSync(new URL("../evalua/kin2002/panel/index.html",import.meta.url),"utf8");
const landing=readFileSync(new URL("../evalua/kin2002/index.html",import.meta.url),"utf8");
const match=page.match(/const INITIAL=(\{[\s\S]*?\});const KEY=/);
assert.ok(match,"Se recuperó INIT");
const initial=JSON.parse(match[1]);
test("Review panel preserves the approved structure and 37 scheduled pairs",()=>{
  assert.equal(initial.groups.length,37);
  assert.equal(initial.groups.reduce((n,g)=>n+g.students.length,0),74);
  assert.equal(initial.criteria.length,8);
  assert.equal(initial.criteria.reduce((s,c)=>s+c.maximum,0),100);
  assert.match(page,/data-tab="reports"/);
  assert.match(page,/data-tab="simulation"/);
  assert.match(page,/data-tab="register"/);
  assert.match(page,/data-tab="settings"/);
  assert.match(landing,/href="\.\/panel\/"/);
});
test("No names, rubric scores or report notes from private academic file are embedded",()=>{
  for(const g of initial.groups){
    for(const s of g.students){
      assert.equal(s.name,"");
      assert.equal(s.report,null);
      assert.equal(s.note,"");
      assert.deepEqual(s.levels,[null,null,null,null,null,null,null,null]);
    }
  }
  assert.doesNotMatch(page,/Joseph sanchez|ignacia cornejo|valentina valenzuela/i);
  assert.match(page,/VERSIÓN DE REVISIÓN/);
  assert.match(page,/no sincroniza en tiempo real/);
});
test("Roster import is local, checks section, pair, station and protects existing entries",()=>{
  assert.match(page,/id="rosterCsv"/);
  assert.match(page,/Sección;Pareja;Evaluador;Estudiante/);
  assert.match(page,/!\/\^P\\d\{2\}\$\//);
  assert.match(page,/La pareja.*ya tiene información/);
  assert.match(page,/save\(\);renderAll\(\)/);
  assert.doesNotMatch(page,/\bfetch\s*\(/);
  assert.doesNotMatch(page,/\b(?:XMLHttpRequest|sendBeacon|WebSocket)\b/);
});
