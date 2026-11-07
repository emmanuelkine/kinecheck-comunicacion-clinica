import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const roster=new URL('../evalua/kin2002/panel/nomina-privada.js',import.meta.url);
const panel=new URL('../evalua/kin2002/panel/index.html',import.meta.url);
test('KIN2002 private roster automatically retries when browser becomes active',()=>{
 const js=readFileSync(roster,'utf8');
 assert.match(js,/window\.addEventListener\('focus',retryMissingRoster\)/);
 assert.match(js,/window\.addEventListener\('online',retryMissingRoster\)/);
 assert.match(js,/event\.persisted\)retryMissingRoster\(\)/);
 assert.match(js,/if\(rosterLoading\)return;/);
 assert.match(js,/lastRosterSuccess/);
 assert.match(js,/conflictos de identidad\/cupo/);
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',roster.pathname]));
});
test('Student names are never persisted in unprotected browser storage',()=>{
 const js=readFileSync(roster,'utf8'),html=readFileSync(panel,'utf8');
 assert.match(html,/students:g\.students\.map\(s=>\(\{\.\.\.s,name:''\}\)\)/);
 assert.doesNotMatch(js,/localStorage\.setItem\((?!identityKey)/);
 assert.doesNotMatch(js,/sessionStorage\.setItem\((?!identityKey)/);
 assert.match(js,/kc_kin2002_sim_roster/);
 assert.match(js,/auth\/v1\/user/);
});

test('Name field uses authorized server write and does not silently persist locally',()=>{
 const js=readFileSync(roster,'utf8'),html=readFileSync(panel,'utf8');
 assert.match(html,/window\.KineCheckRosterSaveName\(g,s,s\.name,previous\)/);
 assert.match(js,/window\.KineCheckRosterSaveName=savePrivateStudentName/);
 assert.match(js,/sessionCandidate\(\)/);
 assert.match(js,/method,session,body,prefer/);
 assert.match(js,/student_name=eq\./);
 assert.match(js,/PATCH/);
 assert.match(js,/POST/);
 assert.match(js,/return=representation/);
 assert.match(js,/verifiedSlots\.set\(key,name\)/);
 assert.match(js,/Se restauró el nombre anterior/);
});
