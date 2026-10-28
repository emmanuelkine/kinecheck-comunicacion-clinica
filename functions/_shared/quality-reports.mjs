import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {regular,bold as boldBytes,logo} from './quality-embedded-assets.mjs';
export const reportSections=[
 ['Actividad educativa desarrollada','history'],['Cursos y versiones impartidas','program'],['Participación y finalización','participation'],
 ['Resultados de aprendizaje','learning'],['Competencias evaluadas','competencies'],['Experiencia del estudiante','experience'],
 ['Seguimiento de egresados','followups'],['Evidencias de transferencia profesional','transfer'],['Incidencias detectadas','incident'],
 ['Acciones correctivas','improvement'],['Mejoras académicas implementadas','implemented'],['Limitaciones de los datos','limitations'],['Compromisos del siguiente periodo','commitment']
];
export function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s)||/^[\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function summaryCSV(summary){
 const rows=[['Indicador','Valor','Unidad','Numerador','Denominador','Datos faltantes','Definición','Fuente','Desde','Hasta (exclusivo)','Actualizado','Modo de datos']];
 for(const m of summary.metrics)rows.push([m.label,m.value??'Sin datos suficientes',m.unit,m.numerator,m.denominator,m.missing,m.definition,m.source,summary.period.from,summary.period.to_exclusive,summary.updated_at,summary.cohort.data_mode]);
 for(const f of summary.followups)rows.push([`Respuesta al seguimiento ${f.day} días`,f.eligible?+(100*f.responses/f.eligible).toFixed(2):'Sin datos suficientes','%',f.responses,f.eligible,null,'Respuestas del grupo cuyo seguimiento vence en el periodo / elegibles, con o sin consentimiento','qi_surveys / course_completions',summary.period.from,summary.period.to_exclusive,summary.updated_at,summary.cohort.data_mode]);
 return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
}
// Diffusion export never contains free text, record identifiers or student rows.
// Whole-cohort suppression avoids publishing complements of small cells.
export function diffusionSummary(source){
 const n=source.metrics.find(m=>m.key==='enrolled')?.value||0;
 const unsafe=n<5||source.metrics.some(m=>['pre','post','change','satisfaction'].includes(m.key)&&m.numerator>0&&m.numerator<5)||source.followups.some(f=>(f.responses>0&&f.responses<5)||(f.applied>0&&f.applied<5));
 const summary=structuredClone(source);
 summary.cohort={data_mode:source.cohort.data_mode,name:'Resultados agregados para difusión'};
 summary.program={version:source.program.version,dossier:{name:source.program.dossier.name}};
 summary.records=[];summary.competencies=[];summary.paired={suppressed:true};delete summary.source_digest;
 if(unsafe){summary.metrics=summary.metrics.map(m=>({...m,value:null,numerator:null,denominator:null,missing:null}));summary.followups=summary.followups.map(f=>({day:f.day,eligible:null,responses:null,applied:null}));summary.limitations.push('Celdas suprimidas: se requieren al menos 5 personas por grupo publicado.');}
 return summary;
}
const value=m=>m.value==null?'Sin datos suficientes':`${m.value} ${m.unit}`;
const clean=s=>String(s??'').replace(/[\u0000-\u001f]/g,' ').replace(/[\u2010-\u2015]/g,'-').replace(/[^\u0020-\u007e\u00a0-\u00ff\u20ac]/g,'?');
export async function qualityPDF({summary,report=null,dossier=null}){
 const pdf=await PDFDocument.create();pdf.setTitle(dossier?'Expediente académico KineCheck':'Informe cuatrimestral de calidad e impacto');pdf.setAuthor('KineCheck');pdf.setLanguage('es-CL');
 pdf.registerFontkit(fontkit);const font=await pdf.embedFont(regular,{subset:true});const bold=await pdf.embedFont(boldBytes,{subset:true});const logoImage=await pdf.embedPng(logo);let page,y;
 const width=595.28,height=841.89,margin=44;
 function newPage(){page=pdf.addPage([width,height]);page.drawRectangle({x:0,y:height-82,width,height:82,color:rgb(.035,.09,.13)});page.drawText('KineCheck',{x:margin,y:height-40,font:bold,size:23,color:rgb(.24,.85,.82)});page.drawText('QUALITY & IMPACT | CALIDAD EDUCATIVA',{x:margin,y:height-61,font,size:9,color:rgb(.9,.96,.97)});page.drawImage(logoImage,{x:width-margin-46,y:height-65,width:46,height:46});y=height-110;}
 function text(input,{size=10,strong=false,gap=5}={}){
  const f=strong?bold:font;const paragraphs=clean(input).split(/\n/);
  for(const paragraph of paragraphs){let line='';for(let word of paragraph.split(/\s+/)){
    while(f.widthOfTextAtSize(word,size)>width-2*margin){let k=word.length-1;while(f.widthOfTextAtSize(word.slice(0,k),size)>width-2*margin)k--;if(line){draw(line);line='';}draw(word.slice(0,k));word=word.slice(k);}
    if(line&&f.widthOfTextAtSize(line+' '+word,size)>width-2*margin){draw(line);line=word;}else line+=(line?' ':'')+word;
   }if(line)draw(line);y-=gap;}
  function draw(line){if(y<65)newPage();page.drawText(line,{x:margin,y,font:f,size,color:rgb(.08,.15,.2)});y-=size*1.5;}
 }
 function heading(s){if(y<125)newPage();y-=8;text(s,{size:13,strong:true,gap:7});}
 newPage();text(dossier?'Expediente académico de curso':report?'Informe cuatrimestral':'Resumen administrativo',{size:22,strong:true,gap:12});
 const program=dossier||summary.program;
 text(program.dossier.name,{size:14,strong:true});text(`Versión del programa: ${program.version}`);
 if(dossier){for(const [key,label] of [['responsibles','Responsables'],['valid_from','Vigencia desde'],['valid_to','Vigencia hasta'],['objectives','Objetivos'],['outcomes','Resultados de aprendizaje'],['competencies','Competencias'],['audience','Público objetivo'],['entry_requirements','Requisitos de ingreso'],['contents','Contenidos'],['workload','Carga horaria'],['methodologies','Metodologías'],['evaluation','Instrumentos y criterios de evaluación'],['bibliography','Bibliografía y referencias'],['change_reason','Motivo de esta versión'],['content_version','Versión del contenido Academy']]){heading(label);text(program.dossier[key]);}heading('Procedencia');text(program.source);text(`Registro: ${program.created_at} | Responsable de registro: ${program.created_by}`);}
 else{
  text(`Cohorte: ${summary.cohort.name}`);text(`Periodo: ${summary.period.from} a ${summary.period.to_exclusive} (fin exclusivo)`);
  text(summary.cohort.data_mode==='test'?'DATOS SINTÉTICOS DE PRUEBA - SIN VALIDEZ INSTITUCIONAL':'Datos registrados en KineCheck');
  text(report?.approval?'DEFINITIVO - aprobación interna registrada':'BORRADOR - pendiente de aprobación interna',{strong:true});
  if(report){text(`Informe ${report.id} | Revisión ${report.revision}`);text(`Creado: ${report.created_at} | Responsable: ${report.created_by}`);text(`SHA-256 del respaldo: ${report.sha256}`,{size:8});if(report.approval)text(`Aprobado: ${report.approval.approved_at} | Responsable: ${report.approval.approved_by}`);}
  for(const [label,key] of reportSections){heading(label);
   if(key==='program')text(`${program.dossier.name} | ${program.version} | ${program.dossier.content_version||'Versión de contenido no informada'}`);
   else if(['participation','learning','experience'].includes(key)){
    const keys=key==='participation'?['enrolled','started','completion','approval']:key==='learning'?['pre','post','change','relative']:['satisfaction'];
    for(const m of summary.metrics.filter(m=>keys.includes(m.key))){text(`${m.label}: ${value(m)} | n=${m.numerator??'sin dato'}, denominador=${m.denominator??'sin dato'}, faltantes=${m.missing??'sin dato'}`,{strong:true});text(`${m.definition} Fuente: ${m.source}`,{size:9});}
   }else if(key==='competencies'){
    if(!summary.competencies.length)text('Sin datos suficientes. La evaluación de casos utiliza revisión humana con rúbrica.');
    for(const d of summary.competencies)text(`${d.dimension}: ${d.average}/${d.maximum}; n=${d.observations}. Distribución: ${d.distribution.join(', ')}.`);
   }else if(key==='followups'||key==='transfer'){
    for(const f of summary.followups)text(`${f.day} días: ${f.responses??'sin datos'} respuestas / ${f.eligible??'sin datos'} elegibles; aplicación autoinformada: ${f.applied??'sin datos'} / ${f.responses??'sin datos'} respuestas.`);
    if(key==='transfer'){text('La percepción de aplicación no demuestra impacto clínico. Evidencia externa y resultados en pacientes requieren documentación y mediciones independientes.');for(const d of summary.evidence_summary||[])text(`${d.classification}: ${d.available} documentos; ${d.reviewed} revisados y aceptados. La clasificación declarada no sustituye la verificación del resultado.`);}
   }else if(key==='limitations')for(const l of summary.limitations)text(l);
   else{
    const kind=key==='implemented'?'improvement':key;const rows=summary.records.filter(r=>r.kind===kind&&(key!=='implemented'||['implemented','reevaluated'].includes(r.payload.status)));
    if(!rows.length)text('Sin evidencia registrada para este apartado.');
    for(const r of rows){text(`${r.payload.title} | revisión ${r.revision}`,{strong:true});for(const [field,val] of Object.entries(r.payload).filter(([k])=>k!=='title'))text(`${field}: ${typeof val==='object'?JSON.stringify(val):val}`,{size:9});text(`Evidencia: ${r.evidence_id||'no asociada'} | Registrado: ${r.created_at}`,{size:8});}
   }
  }
  heading('Respaldo y reproducibilidad');text(`Definiciones: ${summary.schema_version}. Actualización: ${summary.updated_at}.`);text(`Huella de las evaluaciones fuente: ${summary.source_digest||'Suprimida para difusión'}`,{size:8});
 }
 for(const [i,p] of pdf.getPages().entries()){p.drawLine({start:{x:margin,y:43},end:{x:width-margin,y:43},color:rgb(.6,.75,.77),thickness:.5});p.drawText(`KineCheck | Uso administrativo privado | ${i+1} / ${pdf.getPageCount()}`,{x:margin,y:28,font,size:8,color:rgb(.3,.4,.45)});}
 return pdf.save();
}
