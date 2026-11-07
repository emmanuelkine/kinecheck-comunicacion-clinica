import {openXlsx} from './leer-maestro.js';
import {rubricOfficial} from './rubrica.js';

const status=document.getElementById('masterstatus');
const button=document.getElementById('loadmasters');
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');

function parseMaster(sheets, station) {
  const data=sheets['Evaluación individual'];
  const rubric=sheets['Rúbrica y guía'];
  if(!Array.isArray(data)||!Array.isArray(rubric))throw Error('El Excel no tiene «Evaluación individual» o «Rúbrica y guía».');
  const header=data[4]||[];
  if(normalize(header[0])!=='pareja'||normalize(header[1])!=='sección'||normalize(header[9])!=='estudiante'||!normalize(header[11]).startsWith('nivel 1')) {
    throw Error('La estructura del Excel maestro no coincide con la planilla KIN2002.');
  }
  for(let i=0;i<8;i++){
    const row=rubric[i+1]||[];
    if(normalize(row[0])!==normalize(rubricOfficial[i][0])||Number(row[1])!==rubricOfficial[i][1]){
      throw Error('La rúbrica no coincide con los 8 criterios oficiales (criterio '+(i+1)+').');
    }
  }
  const rows=[];
  for(const r of data.slice(5)) {
    if(!r||!/^P\d+$/i.test(String(r[0]??'').trim()))continue;
    const section=String(r[1]??'').trim().toUpperCase();
    const assigned=String(r[4]??'').trim();
    if(!['S1','S2'].includes(section)||assigned!==String(station))continue;
    rows.push({
      section,
      pair:String(r[0]).trim(),
      day:String(r[2]??'').trim(),
      time:String(r[3]??'').trim(),
      station:assigned,
      name:String(r[9]??'').trim()
    });
  }
  if(!rows.length)throw Error('No se encontraron parejas asignadas a la estación '+station+'.');
  return rows;
}

button.addEventListener('click',async()=>{
 const a=document.getElementById('master1').files[0],b=document.getElementById('master2').files[0];
 if(!a&&!b){status.textContent='Adjunta al menos uno de los Excel maestros.';return;}
 button.disabled=true;status.textContent='Revisando estructura y rúbrica antes de importar…';
 try {
   // Preparar y validar todo antes de modificar el panel.
   const collected=[];
   if(a)collected.push({station:'1',rows:parseMaster(await openXlsx(a),'1')});
   if(b)collected.push({station:'2',rows:parseMaster(await openXlsx(b),'2')});
   let created=0,skipped=0,records=0;
   for(const batch of collected){
     const result=window.KC_SIM_importRoster(batch.rows,batch.station);
     created+=result.created;skipped+=result.skipped;records+=result.records;
   }
   status.textContent='Listo: '+created+' parejas incorporadas, '+records+' cupos leídos y '+skipped+' parejas ya existentes conservadas. Cada profesor evalúa individualmente; exporta su respaldo CSV antes de cerrar la página.';
 }catch(e){status.textContent='Importación no completada: '+(e?.message||String(e));}
 finally{button.disabled=false;}
});
