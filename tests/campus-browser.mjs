// Browser fixtures are restricted to this test process. The shipped Campus
// never has a mock/demo API or a client-selectable role.
import { chromium, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { publicCatalog, gradeCase, gradeQuestion } from '../functions/_shared/campus-content.mjs';
const root=resolve(new URL('..',import.meta.url).pathname);const output=resolve(root,'qa-campus-browser');await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root+'/'))throw new Error();if(!extname(path))path+='/index.html';const data=await readFile(path);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'})[extname(path)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
const report=[];
try{
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true});
  try{for(const width of [360,390,768,1280]){
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,locale:'es-CL'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let signed=false;let role='estudiante';let progress=[];
   await page.route('**/api/campus/**',async route=>{const path=new URL(route.request().url()).pathname.split('/api/campus/')[1];const data=route.request().postDataJSON()||{};let result={},status=200;
    if(path==='auth/login'){signed=true;}
    else if(path==='auth/logout'){signed=false;}
    else if(path==='auth/refresh'){status=401;result={error:'Ingresa para continuar.'};}
    else if(path==='question')result=gradeQuestion(data.case_id,data.index,data.answer);
    else if(path==='practice')result={...gradeCase(data.case_id,data.answers),saved:false};
    else if(path==='action'){
     if(!signed){status=401;result={error:'Ingresa para continuar.'};}
     else if(data.action==='context')result={email:'persona@example.invalid',operator:false,profile:{display_name:'Persona de prueba',academic_level:1},progress,memberships:[{institution_id:'qa-org',name:'Espacio técnico de prueba',role,share_metrics:true}]};
     else if(data.action==='submit'){result={...gradeCase(data.payload.case_id,data.payload.answers),saved:true};progress=[{case_id:data.payload.case_id,best_score:result.score,attempts:1}];}
     else if(data.action==='assignments')result=[{id:'qa-activity',title:'Actividad docente de prueba',case_id:'hipotesis'}];
     else if(data.action==='metrics')result={suppressed:true,minimum:5,message:'Las métricas se muestran desde 5 estudiantes con participación autorizada.'};
     else if(data.action==='members')result=[{user_id:'qa-student',display_name:'Estudiante de prueba',role:'estudiante'}];
    }
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
   });
   await page.goto(origin+'/campus/');await page.locator('#routesGrid article').last().waitFor();await page.waitForFunction(()=>!document.querySelector('#globalStatus').textContent);
   assert.equal(await page.locator('#routesGrid article').count(),6);assert.equal(await page.locator('#resourcesGrid article').count(),10);
   await page.selectOption('#resourceLevel','1');assert.equal(await page.locator('#resourcesGrid article').count(),3);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,`${engineName} ${width} overflow`);
   await page.locator('.skip').focus();await page.keyboard.press('Enter');assert.ok((await page.url()).includes('#contenido'));
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   await writeFile(resolve(output,`${engineName}-${width}-axe.json`),JSON.stringify(axe.violations,null,2));
   await page.screenshot({path:resolve(output,`${engineName}-${width}-inicio.png`)});
   if(axe.violations.length)console.log(JSON.stringify(axe.violations.map(v=>({id:v.id,nodes:v.nodes.slice(0,5).map(n=>({html:n.html,target:n.target,summary:n.failureSummary}))})),null,2));
   assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.length})),[],`${engineName} ${width} accessibility`);
   await page.locator('#routesGrid button').filter({hasText:'Resolver caso'}).first().click();
   for(const [index,answer] of [0,1,2].entries()){
    const field=page.locator('.case-step').nth(index);await field.locator(`input[value="${answer}"]`).check();await field.getByRole('button',{name:'Comprobar y continuar'}).click();await field.locator('.feedback').waitFor();
   }
   await page.locator('#finishCase').click();await page.locator('#caseResult').filter({hasText:'sin guardar'}).waitFor();assert.match(await page.locator('#caseResult').textContent(),/100%/);
   const dialogAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(dialogAxe.violations.map(v=>v.id),[]);
   await page.screenshot({path:resolve(output,`${engineName}-${width}-caso.png`)});await page.keyboard.press('Escape');assert.equal(await page.locator('#caseDialog').evaluate(d=>d.open),false);
   await page.locator('#authForm [name=email]').fill('persona@example.invalid');await page.locator('#authForm [name=password]').fill('Fixture-password-123');await page.locator('#authSubmit').click();await page.locator('#signedIn').waitFor({state:'visible'});await page.locator('#institutionRole').filter({hasText:'estudiante'}).waitFor();assert.equal(await page.locator('#teacherWorkspace').isVisible(),false);
   role='docente';await page.reload();await page.locator('#teacherWorkspace').waitFor({state:'visible'});await page.locator('#metricsPanel').filter({hasText:'5 estudiantes'}).waitFor();assert.equal(await page.locator('#adminWorkspace').isVisible(),false);
   role='administrador';await page.reload();await page.locator('#adminWorkspace').waitFor({state:'visible'});await page.locator('#membersList').filter({hasText:'Estudiante de prueba'}).waitFor();
   const staffBefore=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:innerWidth}));
   const staffAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(staffAxe.violations.map(v=>v.id),[]);
   const staffAfter=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:innerWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(el=>({tag:el.tagName,id:el.id,class:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,position:getComputedStyle(el).position,display:getComputedStyle(el).display}))}));
   await writeFile(resolve(output,`${engineName}-${width}-layout.json`),JSON.stringify({staffBefore,staffAfter},null,2));
   if(staffAfter.scroll>staffAfter.client){
    const textOverflow=await page.evaluate(()=>{const out=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(!n.textContent.trim()||!n.parentElement.getClientRects().length)continue;const range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect();if(r.right>innerWidth+1)out.push({parent:n.parentElement.id||n.parentElement.tagName,text:n.textContent.trim().slice(0,90),right:r.right,whiteSpace:getComputedStyle(n.parentElement).whiteSpace});}return out.slice(0,12);});
    console.log(JSON.stringify({engineName,width,staffBefore,staffAfter,textOverflow},null,2));
   }
   await page.screenshot({path:resolve(output,`${engineName}-${width}-panel.png`)});
   assert.equal(staffAfter.scroll>staffAfter.client,false,`${engineName} ${width} institutional panel overflow`);
   await page.screenshot({path:resolve(output,`${engineName}-${width}-cuenta.png`),fullPage:true});assert.deepEqual(errors,[]);report.push({engine:engineName,width,passed:true,axeViolations:0,fixtureOnly:true});await context.close();
  }}finally{await browser.close();}
 }
 await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{server.close();}
