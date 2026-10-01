import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../academy/academy-v39.js',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(`function ${start}(`),source.indexOf(`function ${end}(`));

function fixture(record={}){
  const writes=[];
  const context=vm.createContext({readProgressState:()=>({example:record}),progressDetail:()=>'',localStorage:{setItem(){}},scopedStorageKey:key=>key,LAST_PRODUCT_KEY:'last',writeProgress:(slug,update)=>writes.push({slug,update}),writeAccessHistory(){}});
  vm.runInContext(extract('clampPercent','scopedStorageKey')+extract('courseProgress','writeProgress')+extract('progressMarkup','courseCardMarkup')+extract('saveLastProduct','renderAccessHistory'),context);
  const course={slug:'example',title:'Example',kind:'course',modules:5};
  return {context,course,writes,state:context.courseProgress(course)};
}

test('opening a course records access without manufacturing study percentage',()=>{
  const f=fixture({});f.context.saveLastProduct(f.course);
  assert.equal(f.writes[0].update.percent,0);
  assert.ok(f.writes[0].update.startedAt);
  const opened=fixture({percent:0,lastOpenedAt:'2026-10-01T00:00:00Z'});
  assert.equal(opened.state.started,true);assert.equal(opened.state.measured,false);
  const markup=opened.context.progressMarkup(opened.course,opened.state);
  assert.match(markup,/Inicio registrado/);assert.doesNotMatch(markup,/progress-track|Progreso 0%/);
});

test('legacy access-only one percent is not shown as measured learning',()=>{
  const f=fixture({percent:1,lastOpenedAt:'2026-10-01T00:00:00Z'});
  assert.equal(f.state.percent,1);assert.equal(f.state.measured,false);
  assert.doesNotMatch(f.context.progressMarkup(f.course,f.state),/progress-track/);
});

test('explicit one percent, module completion and existing measured progress are preserved',()=>{
  for(const record of [{percent:1,measurementRecorded:true},{percent:0,completedModules:1},{percent:54}]){
    const f=fixture(record);
    assert.equal(f.state.measured,true);
    assert.match(f.context.progressMarkup(f.course,f.state),/progress-track/);
    f.context.saveLastProduct(f.course);
    assert.equal(f.writes[0].update.percent,record.percent);
  }
});
