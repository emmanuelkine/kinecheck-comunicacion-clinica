// Browser -> Pages handler -> actual isolated PostgreSQL. Only Auth is a synthetic fixture.
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createQualityServer} from './helpers/quality-http.mjs';
const output=resolve('qa-quality-browser');await mkdir(output,{recursive:true});const results=[];
const names=(process.env.QUALITY_BROWSER_ENGINES||'chromium,webkit').split(',');
for(const name of names){
 const engine={chromium,webkit}[name];if(!engine)throw new Error('Unknown test browser');
 const browser=await engine.launch({headless:true,...(name==='chromium'&&process.env.QUALITY_CHROMIUM_PATH?{executablePath:process.env.QUALITY_CHROMIUM_PATH}:{} )});
 try{for(const width of (process.env.QUALITY_BROWSER_WIDTHS||'360,390,768,1280').split(',').map(Number)){
  const fixture=await createQualityServer();const context=await browser.newContext({viewport:{width,height:900},locale:'es-CL',isMobile:width<600});
  try{
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(fixture.origin+'/academy/admin/calidad/');await page.locator('#status.error').waitFor();assert.equal(await page.locator('nav').count(),0);
   await page.evaluate(()=>localStorage.setItem('kinecheck_secure_session_v1',JSON.stringify({access_token:'quality-fixture-token-0'})));await page.reload();
   await page.getByRole('button',{name:'Preparación CEL',exact:true}).waitFor();await page.locator('#status').filter({hasText:'Registros actualizados'}).waitFor();
   assert.ok((await page.getByText('Sin datos suficientes',{exact:true}).count())>0);
   for(const label of ['Expedientes','Instrumentos','Cohortes y permisos','Revisión académica','Trayectoria y evidencias','Mejora continua','Informes','Preparación CEL','Indicadores']){
    await page.getByRole('button',{name:label,exact:true}).click();await page.locator('#status').filter({hasText:'Registros actualizados'}).waitFor();
    assert.equal(await page.locator('#status.error').count(),0,`${label}: ${await page.locator('#status').textContent()}`);
    const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
    assert.deepEqual(violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],`${name} ${width} ${label}: accessibility`);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    if(overflow){console.log(JSON.stringify(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,text:e.textContent.slice(0,100),width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,display:getComputedStyle(e).display,minWidth:getComputedStyle(e).minWidth}))})),null,2));await page.screenshot({path:resolve(output,`${name}-${width}-overflow.png`),fullPage:true});}
    assert.equal(overflow,false,`${name} ${width} ${label}: overflow`);
   }
   await page.screenshot({path:resolve(output,`${name}-${width}-indicadores.png`),fullPage:true});
   const csvEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Resumen CSV',exact:true}).click();const csv=await csvEvent;assert.equal(csv.suggestedFilename(),'resumen-calidad.csv');
   const pdfEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Resumen PDF',exact:true}).click();await (await pdfEvent).saveAs(resolve(output,`${name}-${width}-resumen.pdf`));
   await page.evaluate(()=>localStorage.setItem('kinecheck_secure_session_v1',JSON.stringify({access_token:'quality-fixture-token-1'})));await page.goto(fixture.origin+'/academy/calidad/');
   await page.getByRole('heading',{name:/Evaluación inicial/}).waitFor();await page.locator('section').filter({has:page.getByRole('heading',{name:/Evaluación inicial/})}).locator('input[type=radio]').first().check();
   await page.locator('section').filter({has:page.getByRole('heading',{name:/Evaluación inicial/})}).getByRole('button',{name:'Registrar evaluación'}).click();await page.getByText(/Respuesta registrada el/).waitFor();
   const competency=page.locator('section').filter({has:page.getByRole('heading',{name:/Caso aplicado de competencias/})});await competency.getByLabel('Tu razonamiento y justificación').fill('Respuesta clínica simulada con justificación explícita, incertidumbre y comprobación de comprensión.');await competency.getByRole('button',{name:'Registrar evaluación'}).click();await page.getByText('Pendiente de revisión académica con rúbrica.').waitFor();
   await page.getByRole('button',{name:'Aceptar seguimiento voluntario'}).click();await page.getByRole('button',{name:'Retirar consentimiento'}).waitFor();await page.getByRole('button',{name:'Retirar consentimiento'}).click();await page.getByRole('button',{name:'Aceptar seguimiento voluntario'}).waitFor();
   assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);await page.screenshot({path:resolve(output,`${name}-${width}-estudiante.png`),fullPage:true});
   await page.evaluate(()=>localStorage.setItem('kinecheck_secure_session_v1',JSON.stringify({access_token:'quality-fixture-token-8'})));await page.goto(fixture.origin+'/academy/admin/calidad/');await page.getByRole('button',{name:'Revisión académica',exact:true}).click();
   await page.getByRole('heading',{name:'Retroalimentación formativa'}).waitFor();await page.getByLabel('Comunicación clínica',{exact:true}).selectOption('4');await page.getByLabel('Justificación y orientaciones para mejorar').fill('La alternativa se encuentra justificada y responde a todos los criterios de la rúbrica.');await page.getByRole('button',{name:'Registrar revisión',exact:true}).click();await page.getByText(/Revisión 1: 100/).waitFor();
   await page.evaluate(()=>localStorage.setItem('kinecheck_secure_session_v1',JSON.stringify({access_token:'quality-fixture-token-9'})));await page.reload();assert.equal(await page.getByRole('button',{name:'Revisión académica',exact:true}).count(),0);
   assert.deepEqual(errors,[]);results.push({engine:name,width,authFixtureOnly:true,realDatabase:true,passed:true,axeViolations:0});
  }finally{await context.close();await fixture.close();}
 }}finally{await browser.close();}
}
await writeFile(resolve(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
