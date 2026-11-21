// Reproducible example. An isolated database only; never writes any remote project.
import {mkdir,writeFile} from 'node:fs/promises';
import {createQualityDB,ids} from '../tests/helpers/quality-db.mjs';
import {qualityPDF,summaryCSV} from '../functions/_shared/quality-reports.mjs';
const output=new URL('../docs/quality-impact/example/',import.meta.url);await mkdir(output,{recursive:true});
const f=await createQualityDB();const {db,actor,rpc,cohort,learn,comp}=f;const scope=p=>({cohort_id:cohort,...p});
try{
 await actor(0);for(let i=1;i<8;i++)await rpc('participant_add',scope({email:`quality-${i}@example.invalid`}));
 for(let i=1;i<7;i++){
  await actor(i);await rpc('submit',scope({instrument_id:learn,phase:'pre',answers:{choices:[i<4?1:0],case_response:''}}));
  if(i<6)await rpc('submit',scope({instrument_id:learn,phase:'post',answers:{choices:[0],case_response:''}}));
  const att=await rpc('submit',scope({instrument_id:comp,phase:'competency',answers:{choices:[],case_response:'Respuesta SINTÉTICA de un caso simulado. No representa a una persona ni un resultado educativo real.'}}));
  await actor(0);await rpc('review',scope({attempt_id:att.id,scores:{communication:i%2?2:4},feedback:'Retroalimentación SINTÉTICA de prueba para comprobar el informe y la distribución de dimensiones.'}));
 }
 await db.exec('reset role');
 await db.query("update private.qi_participants set registered_at=now()-interval '140 days',started_at=now()-interval '130 days' where cohort_id=$1",[cohort]);
 await db.query("update private.qi_attempts set created_at=now()-interval '5 days' where cohort_id=$1",[cohort]);
 for(let i=1;i<4;i++)await db.query("insert into public.course_completions values($1,'quality-test','test-content-v1',now()-interval '121 days')",[ids[i]]);
 await actor(0);const begin=new Date();begin.setUTCMonth(begin.getUTCMonth()-4);const from=begin.toISOString().slice(0,10);
 const r=await rpc('report_create',scope({from}));const report=await rpc('report_read',scope({id:r.id}));
 await writeFile(new URL('informe-cuatrimestral-prueba.pdf',output),await qualityPDF({summary:report.snapshot,report}));
 await writeFile(new URL('resumen-prueba.csv',output),summaryCSV(report.snapshot).replaceAll('\r\n','\n'));
 await writeFile(new URL('respaldo-prueba.json',output),JSON.stringify({...report,example_only:true,notice:'DATOS SINTÉTICOS DE PRUEBA. No acreditan actividad educativa, calidad ni certificación CEL.'},null,2));
 console.log('Ejemplo sintético PDF, CSV y respaldo JSON generado.');
}finally{await db.close();}
