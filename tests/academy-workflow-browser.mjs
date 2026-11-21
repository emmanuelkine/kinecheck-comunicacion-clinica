import {webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
const out=new URL('../docs/academic/audit-2026-10-28/test-evidence/',import.meta.url);await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://local').pathname;
 const name=path==='/academy/competencias/'?'index.html':path.split('/').at(-1);
 if(!path.startsWith('/academy/competencias/')||!['index.html','workflow.mjs','workflow.css'].includes(name)){res.writeHead(404);res.end();return;}
 res.setHeader('content-type',name.endsWith('.mjs')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');
 res.end(await readFile(new URL('../academy/competencias/'+name,import.meta.url)));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await webkit.launch({headless:true});const results=[];
try {
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('kinecheck_secure_session_v1',JSON.stringify({access_token:'SYNTHETIC-BROWSER-TOKEN'})));
  let submitted=false;
  const state=()=>({course:'Curso sintético de prueba',version:'test-v1',courseCompleted:true,coursePassed:false,certificateIssued:false,
   assessmentActive:true,passingScore:70,maxAttempts:3,durationMinutes:60,instructions:'Justifica tus decisiones. Una falla crítica impide aprobar.',otecActive:false,attempts:submitted?[{attemptNumber:1,status:'pending_review',score:null,passed:null}]:[],competencies:[],reviews:[]});
  await page.route('**/api/academy-workflow',async route=>{
   const {action}=route.request().postDataJSON();
   const q={id:'00000000-0000-4000-8000-000000000001',kind:'justification',prompt:'Justifica una decisión y una alternativa.',context:'Caso original simulado para probar la interfaz.',rubric:[{id:'reasoning',maximum:15,description:'Aplica los datos y reconoce límites.'}]};
   const body=action==='status'?state():action==='start'?{id:'synthetic-attempt',attemptNumber:1,status:'in_progress',step:1,steps:7,deadline:new Date(Date.now()+3600000).toISOString(),stage:{stage:1,questions:[q]}}:action==='stage'?(submitted=true,{status:'pending_review'}):{rows:[]};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/academy/competencias/`);
  await page.locator('#enrollment').fill('00000000-0000-4000-8000-000000000001');await page.locator('#lookup button').click();
  await page.getByRole('heading',{name:'Requisitos antes del examen'}).waitFor();
  assert.equal(await page.locator('.state[data-met="true"]').count(),1);
  assert.match(await page.locator('#student').innerText(),/Todavía debes aprobar/);
  assert.equal(await page.getByRole('link',{name:'Consultar certificado'}).count(),0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
  const a11y=await new AxeBuilder({page}).analyze();assert.deepEqual(a11y.violations.map(v=>({id:v.id,impact:v.impact})),[]);
  await page.screenshot({path:new URL(`student-${width}.png`,out).pathname,fullPage:true});
  await page.locator('#start').click();await page.locator('textarea').fill('Justificación sintética con datos, alternativa y límites.');
  const examA11y=await new AxeBuilder({page}).analyze();assert.deepEqual(examA11y.violations.map(v=>v.id),[]);
  await page.locator('#answers button').click();await page.getByText('Respuestas enviadas. La aprobación requiere revisión humana.').waitFor();
  assert.equal(await page.locator('.state[data-met="true"]').count(),1);assert.deepEqual(errors,[]);
  results.push({engine:'WebKit',width,overflow:false,statusAxeViolations:a11y.violations.length,examAxeViolations:examA11y.violations.length,submitted:'pending_review',pageErrors:errors.length});
  await context.close();
 }
 await writeFile(new URL('browser-results.json',out),JSON.stringify({synthetic:true,production:false,results},null,2));
 console.log(JSON.stringify(results));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
