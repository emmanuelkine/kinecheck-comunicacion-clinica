import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
const dir=new URL('../evalua/kin2002/panel/',import.meta.url);
const html=readFileSync(new URL('index.html',dir),'utf8');
const loader=readFileSync(new URL('importar-informes-appdeploy.js',dir),'utf8');
test('The panel has a clear, user-visible AppDeploy import path',()=>{
 assert.match(html,/appdeployReportsStatus/);
 assert.match(html,/importar-informes-appdeploy\.js/);
 assert.match(html,/Importar CSV de informes confirmados/);
 assert.match(html,/No se recuperan automáticamente/);
});
test('Import only graded AND teacher-confirmed reports, excluding pilotage',()=>{
 assert.match(loader,/confirmed.*===.si./);
 assert.match(loader,/state!=='confirmada'/);
 assert.match(loader,/prueba tecnica docente/);
 assert.match(loader,/maximum<=0/);
 assert.match(loader,/points>maximum/);
 assert.match(loader,/nota inconsistente con 60% exigencia/);
 assert.match(loader,/target\.report!=null/);
 assert.match(loader,/target\.reportSource='AppDeploy confirmado'/);
 assert.doesNotMatch(loader,/\bfetch\s*\(/);
});
test('Preserve legacy CSV and compute only local display',()=>{
 assert.match(loader,/if\(legacy\)return await legacy/);
 assert.match(loader,/save\(\);renderAll\(\)/);
 assert.match(html,/id="reportBody"/);
 assert.match(html,/data-report-feedback/);
});
test('Import adapter JavaScript syntax checks',()=>{
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',new URL('importar-informes-appdeploy.js',dir).pathname]));
});