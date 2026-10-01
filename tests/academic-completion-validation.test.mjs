import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadHelpers() {
  const source = fs.readFileSync(new URL('../supabase/functions/course-completion-sync/index.ts', import.meta.url), 'utf8');
  const helpers = source.slice(source.indexOf('function completedJourneyCount'), source.indexOf('serve(async'))
    .replace(/: any|: string\[\]|: string|: number/g, '')
    .replace(/const configured: Record<string, any>/, 'const configured');
  const context = vm.createContext({});
  vm.runInContext(helpers, context);
  return context;
}
test('saved timestamps do not complete empty or absent written activities', () => {
  const h = loadHelpers(), fields = ['openedAt','labSavedAt','caseSavedAt','reflectionSavedAt','reviewedAt'];
  const activity = Object.fromEntries(fields.map(k=>[k,'2026-10-01T00:00:00Z']));
  const state = {activities:{lesson:activity},notes:{}};
  assert.equal(h.completedJourneyCount(state,['lesson'],fields),0);
  for(const type of ['lab','case','reflection'])state.notes[`lesson-${type}`]={text:' '};
  assert.equal(h.completedJourneyCount(state,['lesson'],fields),0);
  for(const type of ['lab','case','reflection'])state.notes[`lesson-${type}`]={text:'Respuesta razonada'};
  assert.equal(h.completedJourneyCount(state,['lesson'],fields),1);
  assert.equal(h.completedJourneyCount(state,['lesson'],[]),0);
});
test('mandatory academic work must satisfy its published length and every configured criterion', () => {
  const h = loadHelpers();
  const payload={moduleAssignments:[{moduleNumber:1,minimumCharacters:450,criteria:['Seguridad','Medición','Plan']}],finalAssessment:{minimumCharacters:600,criteria:['Integración']}};
  const state={academicAssignments:{'module-1':{completedAt:'now',text:'x'.repeat(450),criteria:[{label:'Seguridad',checked:true},{label:'Medición',checked:true},{label:'Plan',checked:true}]},final:{completedAt:'now',text:'x'.repeat(600),criteria:[{label:'Integración',checked:true}]}}};
  assert.equal(h.completedAcademicCount(state,['module-1','final'],payload),2);
  state.academicAssignments['module-1'].text='x'.repeat(449);
  assert.equal(h.completedAcademicCount(state,['module-1','final'],payload),1);
  state.academicAssignments['module-1'].text='x'.repeat(450);
  state.academicAssignments['module-1'].criteria[0].checked='true';
  assert.equal(h.completedAcademicCount(state,['module-1','final'],payload),1);
  state.academicAssignments['module-1'].criteria=[];
  assert.equal(h.completedAcademicCount(state,['module-1','final'],payload),1);
  assert.equal(h.completedAcademicCount(state,['unknown'],payload),0);
});
