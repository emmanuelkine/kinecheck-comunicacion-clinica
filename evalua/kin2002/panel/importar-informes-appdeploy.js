/* Importación de CSV de KineCheck Evalúa AppDeploy. Solo notas confirmadas. */
(()=>{
 const field=document.getElementById('reportsCsv'),status=document.getElementById('appdeployReportsStatus');
 if(!field||!status)return;
 const legacy=field.onchange;
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const n=s=>Number(String(s??'').replace(',','.'));
 const section=(activity,filename)=>{
  const text=norm(activity+' '+filename);
  const a=/\b(?:seccion|s)\s*0?1\b/.test(text),b=/\b(?:seccion|s)\s*0?2\b/.test(text);
  return a&&!b?'S1':b&&!a?'S2':null;
 };
 const targetStudent=(sec,name)=>{
  const matches=groups.flatMap(g=>g.section===sec?g.students:[]).filter(s=>s.name&&norm(s.name)===norm(name));
  return matches.length===1?matches[0]:null;
 };
 const ix=(headers,key)=>headers.indexOf(key);
 field.onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
   if(file.size>2*1024*1024)throw Error('El archivo supera 2 MB.');
   const rows=parseCsv((await file.text()).replace(/^\uFEFF/,''));
   const headers=(rows[0]||[]).map(norm);
   if(!headers.includes('confirmada')||!headers.includes('maximo')||!headers.includes('actividad')){
    if(legacy)return await legacy.call(field,event);
    throw Error('Formato CSV no reconocido');
   }
   const columns={activity:ix(headers,'actividad'),student:ix(headers,'estudiante'),state:ix(headers,'estado'),points:ix(headers,'puntos'),maximum:ix(headers,'maximo'),grade:ix(headers,'nota'),confirmed:ix(headers,'confirmada')};
   if(Object.values(columns).some(x=>x<0))throw Error('Columnas de KineCheck Evalúa incompletas.');
   const candidates=[],issues=[],seen=new Set();
   for(let i=1;i<rows.length;i++){
    const r=rows[i],studentName=String(r[columns.student]||'').trim();if(!studentName)continue;
    if(/prueba tecnica docente|no evaluar|paciente pilotaje/.test(norm(studentName))){issues.push('Fila '+(i+1)+': pilotaje excluido');continue;}
    const confirmed=norm(r[columns.confirmed])==='si',state=norm(r[columns.state]);
    if(!confirmed||state!=='confirmada'){issues.push('Fila '+(i+1)+': corrección no confirmada');continue;}
    const sec=section(r[columns.activity],file.name);
    if(!sec){issues.push('Fila '+(i+1)+': sección ambigua');continue;}
    const key=sec+'|'+norm(studentName);
    if(seen.has(key)){issues.push('Fila '+(i+1)+': duplicado');continue;}
    seen.add(key);
    const target=targetStudent(sec,studentName);
    if(!target){issues.push('Fila '+(i+1)+': nombre no coincide de forma única');continue;}
    const pointText=String(r[columns.points]??'').trim(),maxText=String(r[columns.maximum]??'').trim(),gradeText=String(r[columns.grade]??'').trim();
    const points=n(pointText),maximum=n(maxText),note=n(gradeText);
    if(!pointText||!maxText||!gradeText||!Number.isFinite(points)||!Number.isFinite(maximum)||!Number.isFinite(note)||maximum<=0||points<0||points>maximum||note<1||note>7){
      issues.push('Fila '+(i+1)+': calificación inválida');continue;
    }
    const scaled=100*points/maximum,expected=Math.round(grade(scaled)*10)/10;
    if(Math.abs(expected-note)>0.11){issues.push('Fila '+(i+1)+': nota inconsistente con 60% exigencia');continue;}
    if((target.report!=null&&Math.abs(Number(target.report)-note)>0.05)||(target.reportPoints!=null&&Math.abs(Number(target.reportPoints)-scaled)>0.15)){
      issues.push('Fila '+(i+1)+': existe una calificación diferente, no sobrescrita');continue;
    }
    candidates.push({target,points:scaled,note,section:sec});
   }
   if(!candidates.length){status.textContent='No hay notas confirmadas importables. '+issues.slice(0,3).join(' · ');return;}
   if(!confirm('Importar '+candidates.length+' notas docentes confirmadas y omitir '+issues.length+' filas no verificables? El navegador guardará los resultados localmente.')){status.textContent='Importación cancelada.';return;}
   for(const x of candidates){x.target.reportPoints=x.points;x.target.report=x.note;x.target.reportSource='AppDeploy confirmado';}
   save();renderAll();
   status.textContent='Importadas '+candidates.length+' notas confirmadas ('+candidates.filter(x=>x.section==='S1').length+' S1 / '+candidates.filter(x=>x.section==='S2').length+' S2). '+issues.length+' filas omitidas. Exporta respaldo JSON. '+issues.slice(0,3).join(' · ');
  }catch(err){status.textContent='Error de importación: '+(err?.message||'Archivo inválido');}
  finally{field.value='';}
 };
})();