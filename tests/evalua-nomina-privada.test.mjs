import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
const dir=new URL('../evalua/kin2002/panel/',import.meta.url);
const html=readFileSync(new URL('index.html',dir),'utf8');
const loader=readFileSync(new URL('nomina-privada.js',dir),'utf8');
const temp=new URL('nomina-privada.js',dir);
test('Private roster loads from Supabase only after authenticating with KineCheck',()=>{
 assert.match(html,/src="\/config\.js"/);
 assert.match(html,/src="\.\/nomina-privada\.js"/);
 assert.match(html,/id="privateRosterStatus"/);
 assert.match(loader,/kinecheck_secure_session_v1/);
 assert.match(loader,/auth\/v1\/user/);
 assert.match(loader,/kc_kin2002_sim_roster\?select/);
 assert.match(loader,/authorization:'Bearer '/);
 assert.match(loader,/!Array\.isArray\(rows\)/);
});
test('Private academic names are not bundled in public source or written to localStorage by panel',()=>{
 assert.doesNotMatch(html,/Joseph sanchez|ignacia cornejo|valentina valenzuela/i);
 assert.match(html,/students:g\.students\.map\(s=>\(\{\.\.\.s,name:''\}\)\)/);
 assert.doesNotMatch(loader,/localStorage\.setItem\([^,]*,[^)]*student_name/);
 assert.match(loader,/if\(!existing\)pending\.push/);
 assert.match(loader,/conflicts\.push/);
 assert.doesNotMatch(loader,/innerHTML/);
});
test('No authorization fallback ever returns private roster without a session',()=>{
 assert.match(loader,/if\(!session\)/);
 assert.match(loader,/rosterSignIn\.hidden=false;return/);
 assert.match(loader,/if\(!rows\.length\)/);
 assert.match(loader,/no tiene autorización/);
});
test('Private loader JavaScript parses correctly',()=>{
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',new URL('nomina-privada.js',dir).pathname]));
});
