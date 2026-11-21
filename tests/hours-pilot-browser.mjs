// Fixtures exist only in this QA process; they never provision users or change Supabase.
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('..',import.meta.url).pathname),output=resolve(root,'qa-hours-browser');await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{let path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+'/'))throw Error();if(!extname(path))path+='/index.html';const data=await readFile(path);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.webp':'image/webp'})[extname(path)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
const report=[];
try{for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});try{for(const width of [360,390,768,1280]){
 const context=await browser.newContext({viewport:{width,height:900},locale:'es-CL',isMobile:width<600,hasTouch:width<600}),page=await context.newPage(),errors=[],calls=[];
 page.on('pageerror',e=>errors.push(e.message));let role='new',saved=false,active=true;
 const profile=()=>role==='new'&&!saved?null:{user_id:'qa-user',full_name:'Profesional de prueba',profession:'Kinesiología',verification_status:role==='new'?'pending':'verified',is_active:active,is_suspended:false};
 const rows=Array.from({length:205},(_,n)=>({professional_id:'qa-pro-'+n,full_name:'Profesional '+String(n).padStart(4,'0'),profession:'Kinesiología',verification_status:'verified',membership_status:'active',professional_consent:true}));
 const future=new Date(Date.now()+3*86400000).toISOString();
 await page.route('https://*.supabase.co/**',async route=>{
  const path=new URL(route.request().url()).pathname,data=route.request().postDataJSON()||{};calls.push({path,data});let result={};
  if(path==='/auth/v1/user')result={id:'qa-user'};
  else if(path.endsWith('/kc_hours_search'))result=[{id:'qa-slot',full_name:'Profesional de prueba',profession:'Kinesiología',specialty:'Musculoesquelética',region:'Maule',comuna:'Talca',starts_at:future,location_text:'Dirección de prueba',facility_type:'Clínica',modality:'Presencial',booking_url:'https://agenda.example.org/reservar',institution_name:'Clínica de prueba'}];
  else if(path.endsWith('/kc_hours_public_event'))result={received:true};
  else if(path.endsWith('/kc_hours_api')){
   if(data.action==='context')result={user_id:'qa-user',operator:false,release_ready:false,profile:profile(),accepted:!!profile(),memberships:[],pilots:[],institutions:role==='owner'||role==='secretary'?[{id:'qa-org',public_name:'Clínica de prueba',verification_status:'verified',is_active:true,role:role==='owner'?'owner':'secretary'}]:[]};
   else if(data.action==='profile'){saved=true;result={ok:true};}
   else if(data.action==='profile_active'){active=data.payload.active;result={ok:true};}
   else if(data.action==='members')result={total:role==='owner'?205:1,rows:role==='owner'?rows.slice(data.payload.offset||0,(data.payload.offset||0)+50):[rows[0]]};
   else if(data.action==='metrics')result={enabled_professionals:205,published:0,currently_available:0,contacts:0,booked:0};
   else if(data.action==='staff'||data.action==='slots'||data.action==='invitations')result=[];
   else if(data.action==='save_slot')result={ok:true,slot_id:'qa-created'};
   else if(data.action==='invite')result={token:'fixture-token',expires_in_days:7};
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.goto(origin+'/horas-disponibles/');await page.getByRole('heading',{name:'Profesional de prueba',exact:true}).waitFor();
 assert.equal(await page.locator('#results article').count(),1);await page.fill('#dateFilter','2026-11-10');const filtered=page.waitForResponse(r=>r.url().endsWith('/kc_hours_search')&&r.request().postDataJSON()?.filters?.date==='2026-11-10');await page.click('#filterBtn');await filtered;
 assert.equal(calls.filter(c=>c.path.endsWith('kc_hours_search')).at(-1).data.filters.date,'2026-11-10');
 assert.equal(await page.locator('#responsibilityAccepted').isChecked(),false);await page.click('#publishBtn');await page.fill('#authEmail','qa-browser@example.invalid');await page.click('#authBtn');await page.locator('#authMessage').filter({hasText:'Revisa tu correo'}).waitFor();
 const otp=calls.find(c=>c.path==='/auth/v1/otp');assert.equal(otp.data.create_user,true);
 await page.evaluate(()=>sessionStorage.setItem('kc_health_token','synthetic-browser-fixture'));await page.reload();await page.locator('#profilePanel').waitFor({state:'visible'});
 await page.fill('#profileName','Profesional de prueba');await page.fill('#profileProfession','Kinesiología');await page.click('#profileBtn');assert.equal(calls.filter(c=>c.data.action==='profile').length,0);await page.check('#responsibilityAccepted');await page.click('#profileBtn');await page.locator('#profileMessage').filter({hasText:'guardados'}).waitFor();assert.equal(calls.filter(c=>c.data.action==='profile').length,1);
 role='owner';await page.reload();await page.locator('#institutionMembers article').nth(49).waitFor();assert.equal(await page.locator('#institutionMembers article').count(),50);assert.equal(await page.locator('#startInstitutionPilot').isDisabled(),true);assert.equal(await page.locator('#institutionSelect').evaluate(el=>getComputedStyle(el).appearance),'none');
 await page.click('#membersNext');await page.getByRole('heading',{name:'Profesional 0050',exact:true}).waitFor();assert.equal(await page.locator('#institutionMembers article').count(),50);await page.click('#membersPrevious');await page.getByRole('heading',{name:'Profesional 0000',exact:true}).waitFor();
 await page.locator('[data-select-professional]').first().click();await page.locator('#institutionPublishForm').waitFor({state:'visible'});
 const form=page.locator('#institutionPublishForm');await form.locator('[name=specialty]').fill('Kinesiología');await form.locator('[name=region]').selectOption({label:'Maule'});await form.locator('[name=city]').fill('Talca');await form.locator('[name=date]').fill(new Date(Date.now()+3*86400000).toISOString().slice(0,10));await form.locator('[name=time]').fill('15:00');await form.locator('[name=facility_type]').selectOption('Clínica');await form.locator('[name=address]').fill('Dirección de prueba');await form.locator('[name=contact]').fill('Contacto de prueba');await form.locator('[name=booking_url]').fill('https://agenda.example.org/reservar');await form.locator('button[type=submit]').click();await form.locator('[role=status]').filter({hasText:'Hora publicada'}).waitFor();
 const created=calls.filter(c=>c.data.action==='save_slot').at(-1).data.payload;assert.equal(created.institution_id,'qa-org');assert.equal(created.professional_id,'qa-pro-0');assert.equal(created.accepted_at,undefined);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${engineName} ${width} institutional overflow`);
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();await writeFile(resolve(output,`${engineName}-${width}-axe.json`),JSON.stringify(axe.violations,null,2));assert.deepEqual(axe.violations.map(v=>v.id),[],`${engineName} ${width} accessibility`);
 await page.screenshot({path:resolve(output,`${engineName}-${width}-institution.png`),fullPage:true});
 role='secretary';await page.reload();await page.locator('#institutionMembers article').waitFor();assert.equal(await page.locator('#institutionAdmin').isVisible(),false);assert.equal(await page.locator('#institutionMembers article').count(),1);
 assert.deepEqual(errors,[]);report.push({engine:engineName,width,passed:true,fixtureOnly:true,axeViolations:0});await context.close();
 }}finally{await browser.close();}
}await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}finally{server.close();}
