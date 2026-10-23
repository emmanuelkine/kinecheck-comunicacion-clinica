#!/usr/bin/env node
const base='https://kinecheck.cl';
const routes=['/','/gratis/','/gratis/profesionales/','/gratis/pacientes/','/gratis/neurociencia-del-dolor/','/horas-disponibles/','/academy/'];
const terms=['chat'+'gpt','open'+'ai'];
let failures=[];let results=[];
for(const route of routes){
 try{
  const response=await fetch(base+route,{signal:AbortSignal.timeout(20000),headers:{'user-agent':'KineCheck-public-audit/1.0'}});
  const source=await response.text();const matches=terms.filter(x=>source.toLowerCase().includes(x));
  const info={route,status:response.status,externalBrandMatches:matches};
  results.push(info);
  if(!response.ok||matches.length)failures.push(info);
 }catch(e){failures.push({route,error:String(e)})}
}
console.log(JSON.stringify({results,failures},null,2));if(failures.length)process.exitCode=1;
