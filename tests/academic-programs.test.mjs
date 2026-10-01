import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const data=JSON.parse(fs.readFileSync(new URL('../docs/academic/programas-validados-2026-10-01.json',import.meta.url),'utf8'));
const expected=[['kinecheck-clinico-curso',10,30,1080],['comunicacion-clinica',12,null,493],['mas-alla-del-dolor',8,32,745],['evidencia-aplicada',10,35,621],['traumatologia-ortopedia-clinica',6,24,640],['dolor-lumbar-persistente',9,54,490],['dolor-musculoesqueletico',6,12,488],['ejercicio-terapeutico',5,null,360]];

test('all eight programs retain the verified structure and existing planned minutes',()=>{
  assert.equal(data.courses.length,8);
  for(const [slug,modules,lessons,minutes] of expected){
    const c=data.courses.find(x=>x.slug===slug);assert.ok(c);
    assert.equal(c.modules.length,modules);assert.equal(c.load.minutes,minutes);
    if(lessons!==null)assert.equal(c.modules.reduce((n,m)=>n+m.lessons.length,0),lessons);
    let total=c.modules.reduce((n,m)=>n+m.minutes,0)+(c.finalActivity?.minutes||0);
    if(slug==='dolor-musculoesqueletico')total+=c.requiredActivities.at(-1).minutes;
    assert.equal(total,minutes);
    for(const key of ['name','target','prerequisites','purpose','approval','completion','version','reviewDate'])assert.ok(c[key]);
    assert.ok(c.results.length);assert.ok(c.methodology.length);assert.ok(c.bibliography.length);
  }
});

test('every essential reference resolves to an identified source and tools are not certified courses',()=>{
  const ids=new Set(data.references.map(r=>r.id));
  for(const c of data.courses)for(const id of c.bibliography)assert.ok(ids.has(id));
  for(const r of data.references){assert.equal(new URL(r.url).protocol,'https:');assert.ok(r.title);assert.ok(r.authors);assert.ok(r.year);}
  assert.ok(!data.courses.some(c=>c.slug==='banderas-clinicas'));
  assert.equal(data.tools[0].hours,null);
  assert.match(data.certification,/no está activa/);
  const trauma=data.courses.find(c=>c.slug==='traumatologia-ortopedia-clinica');
  assert.match(trauma.approval,/80%/);assert.match(trauma.approval,/10\/12/);
  for(const c of data.courses.filter(c=>c!==trauma))assert.match(c.approval,/no ofrece|no equivale|no acredita|no.*requisito|no.*activa/i);
});
