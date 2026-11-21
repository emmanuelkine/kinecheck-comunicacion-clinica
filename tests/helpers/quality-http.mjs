import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createQualityDB,ids} from './quality-db.mjs';
import {createQualityHandler} from '../../functions/api/quality/[[path]].js';
export async function createQualityServer(){
 const fixture=await createQualityDB();const {db,actor,rpc,cohort}=fixture;
 await actor(0);for(let i=1;i<8;i++)await rpc('participant_add',{cohort_id:cohort,email:`quality-${i}@example.invalid`});
 await rpc('staff_set',{cohort_id:cohort,email:'quality-8@example.invalid',role:'academic'});
 await rpc('staff_set',{cohort_id:cohort,email:'quality-9@example.invalid',role:'analyst'});
 let sequence=Promise.resolve();
 const handler=createQualityHandler({fetcher:async(url,options)=>{
  const i=Number((options.headers.authorization||'').match(/^Bearer quality-fixture-token-(\d)$/)?.[1]);
  if(!Number.isInteger(i)||i<0||i>=ids.length)return new Response('{}',{status:401});
  if(url.endsWith('/auth/v1/user'))return Response.json({id:ids[i],email:`quality-${i}@example.invalid`,email_confirmed_at:'2026-01-01'});
  const result=sequence.then(async()=>{await actor(i);const {action,payload}=JSON.parse(options.body);try{return Response.json(await rpc(action,payload));}catch(e){return Response.json({code:e.code,message:e.message},{status:e.code==='42501'?403:400});}});sequence=result.then(()=>{},()=>{});return result;
 }});
 const root=resolve(new URL('../..',import.meta.url).pathname);
 let origin;
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,origin);
  if(url.pathname.startsWith('/api/quality/')){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const response=await handler({request:new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})})});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  let file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+sep))throw new Error('path');if(!extname(file))file=resolve(file,'index.html');
  const bytes=await readFile(file);res.writeHead(200,{'content-type':({'.js':'application/javascript','.mjs':'application/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.webp':'image/webp'})[extname(file)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end();}});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));origin='http://127.0.0.1:'+server.address().port;
 return {...fixture,origin,close:async()=>{await new Promise(done=>server.close(done));await db.close();}};
}
