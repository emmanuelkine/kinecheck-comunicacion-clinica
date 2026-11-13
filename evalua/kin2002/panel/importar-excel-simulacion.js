/* Importador privado de Excel maestros KIN2002. Solo lectura local de archivos.
 * Estación 1: Excel evaluador 1; estación 2: Excel evaluador 2.
 * El guardado requiere sesión autorizada y revisión manual de resultados. */
(()=>{'use strict';
const el=id=>document.getElementById(id);
const dec=new TextDecoder('utf-8');
function text(node,tag){return node.getElementsByTagNameNS('*',tag)[0]?.textContent||''}
function joinPath(base,target){const parts=(target.startsWith('/')?target.slice(1):base+'/'+target).split('/'),out=[];for(const p of parts){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p)}return out.join('/')}
async function openXlsx(file) {
  if(!file || !/\.xlsx$/i.test(file.name) || file.size > 15*1024*1024) throw Error('Solo Excel .xlsx de hasta 15 MB');
  const bin = await file.arrayBuffer();
  const view = new DataView(bin), bytes = new Uint8Array(bin);
  let end = -1;
  for (let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--) {
    if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  }
  if(end<0) throw Error('Excel ZIP inválido');
  const count=view.getUint16(end+10,true), start=view.getUint32(end+16,true);
  if(count>25000) throw Error('Excel demasiado extenso');
  let at=start;const entries=new Map();
  for(let i=0;i<count;i++){
    if(view.getUint32(at,true)!==0x02014b50)throw Error('Estructura ZIP inválida');
    const method=view.getUint16(at+10,true),size=view.getUint32(at+20,true),nameLen=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),comment=view.getUint16(at+32,true),local=view.getUint32(at+42,true);
    const name=dec.decode(bytes.slice(at+46,at+46+nameLen));
    entries.set(name,{method,size,local});at+=46+nameLen+extra+comment;
  }
  async function read(path) {
    const entry=entries.get(path);
    if(!entry)throw Error('Hoja o componente no encontrado: '+path);
    if(view.getUint32(entry.local,true)!==0x04034b50)throw Error('Archivo Excel corrupto');
    const start=entry.local+30+view.getUint16(entry.local+26,true)+view.getUint16(entry.local+28,true);
    if(entry.size > 20*1024*1024)throw Error('Componente Excel excesivo');
    const part=bytes.slice(start,start+entry.size);
    if(entry.method===0)return dec.decode(part);
    if(entry.method!==8)throw Error('Método de compresión no admitido');
    const stream=new Blob([part]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const data=await new Response(stream).arrayBuffer();
    if(data.byteLength>35*1024*1024)throw Error('Componente Excel descomprimido excesivo');
    return dec.decode(data);
  }
  const parser=new DOMParser();
  const parse=xml=>{const doc=parser.parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('XML Excel mal formado');return doc;};
  const shared=entries.has('xl/sharedStrings.xml')?
    [...parse(await read('xl/sharedStrings.xml')).getElementsByTagNameNS('*','si')].map(node=>[...node.getElementsByTagNameNS('*','t')].map(x=>x.textContent).join('')):[];
  const workbook=parse(await read('xl/workbook.xml'));
  const rels=parse(await read('xl/_rels/workbook.xml.rels'));
  const map=new Map([...rels.getElementsByTagNameNS('*','Relationship')].map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
  const sheets={};
  for(const sheet of workbook.getElementsByTagNameNS('*','sheet')){
    const title=sheet.getAttribute('name'),rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    const target=map.get(rid);if(!target)continue;
    const doc=parse(await read(joinPath('xl',target)));
    const rows=[];
    for(const row of doc.getElementsByTagNameNS('*','row')){
      const n=Number(row.getAttribute('r'));if(!Number.isSafeInteger(n)||n<1||n>30000)continue;
      const values=[];
      for(const cell of row.getElementsByTagNameNS('*','c')){
        const ref=cell.getAttribute('r')||'',letters=ref.match(/^[A-Z]+/)?.[0];if(!letters)continue;
        let column=0;for(const char of letters)column=column*26+char.charCodeAt(0)-64;
        const type=cell.getAttribute('t');let value=text(cell,'v');
        if(type==='s')value=shared[Number(value)]??'';
        else if(type==='inlineStr')value=[...cell.getElementsByTagNameNS('*','t')].map(x=>x.textContent).join('');
        else if(type==='n'||(!type&&value!==''))value=Number.isFinite(Number(value))?Number(value):value;
        values[column-1]=value;
      }
      rows[n-1]=values;
    }
    sheets[title]=rows;
  }
  return sheets;
}

const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const empty=v=>v===undefined||v===null||String(v).trim()==='';
const readLevel=v=>{if(empty(v))return null;const n=Number(String(v).trim().replace(',','.'));return Number.isInteger(n)&&n>=0&&n<=4?n:NaN;};
const validLevels=a=>a.length===5&&a.every(x=>x===null||Number.isInteger(x)&&x>=0&&x<=4);
const slots=()=>groups.flatMap(g=>g.students.map((s,i)=>({g,s,slot:i+1,key:g.section+'|'+g.id+'|'+(i+1)})));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const weights=[10,25,25,30,10];
const grade=p=>p<=60?1+3*p/60:4+3*(p-60)/40;
const decimals=n=>n===null?'—':Number(n).toFixed(1).replace('.',',');
let candidate=[],issues=[],summary=[],busy=false;
function show(message,kind='info'){const e=el('excelImportStatus');if(e){e.textContent=message;e.dataset.state=kind;e.style.color=kind==='error'?'#ffd1a0':kind==='success'?'#9df1c8':'#b8d4df';}}
const selectedFiles=()=>[el('excelEvaluator1')?.files?.[0],el('excelEvaluator2')?.files?.[0]];
function selectedCaption(){
 const files=selectedFiles();
 el('excelFilesSelected').textContent=files.map((f,i)=>f?'Evaluador '+(i+1)+': '+f.name:'').filter(Boolean).join(' · ')||'Ningún archivo seleccionado';
 candidate=[];issues=[];summary=[];preview();
}
function preview(){
 const body=el('excelImportPreview');if(!body)return;
 const lines=candidate.map(x=>{
  const complete=x.count===5;
  const points=complete?x.levels.slice(0,5).reduce((s,n,i)=>s+n*weights[i]/4,0):null;
  return '<tr><td>'+esc(x.source)+'</td><td>'+esc(x.section)+'</td><td>'+esc(x.pair)+'</td><td>'+esc(x.name)+'</td><td>'+x.count+'/5</td><td>'+decimals(points)+'</td><td>'+decimals(complete?grade(points):null)+'</td><td>'+esc(x.status)+'</td></tr>';
 });
 body.innerHTML=lines.length?lines.join(''):'<tr><td colspan="8">No hay puntajes asociados a estudiantes verificables</td></tr>';
 el('excelImportIssues').textContent=issues.slice(0,80).join('\n')+(issues.length>80?'\n…':'');
 el('excelImportApply').disabled=busy||!candidate.some(x=>x.status==='Lista');
}
async function review(){
 if(busy)return;
 busy=true;candidate=[];issues=[];summary=[];preview();
 const files=selectedFiles();
 try{
  if(!files.some(Boolean)){show('Adjunta al menos un Excel maestro de simulación.','error');return;}
  if(!window.KineCheckScores?.ready){show('Inicia sesión docente y espera que aparezca «Sincronización activa».','error');return;}
  const index=new Map(slots().map(x=>[x.key,x])),seen=new Map();
  for(let i=0;i<2;i++){
   const file=files[i];if(!file)continue;
   const station=i+1,source='Evaluador '+station+' · '+file.name;
   try{
    const workbook=await openXlsx(file),rows=workbook['Evaluación'];
    if(!Array.isArray(rows))throw Error('Falta la hoja «Evaluación» del maestro oficial');
    const header=rows[5]||[];
    if(normalize(header[0])!=='pareja'||normalize(header[1])!=='seccion'||normalize(header[8])!=='estudiante'||!String(header[10]||'').toLowerCase().includes('h1')||!String(header[14]||'').toLowerCase().includes('h5'))
      throw Error('Encabezados incompatibles en fila 6. Se necesita el maestro con cinco hitos H1–H5, no la rúbrica antigua de ocho criterios');
    let complete=0,partial=0,blank=0,otherStation=0,mismatch=0;
    for(let n=6;n<rows.length;n++){
     const row=rows[n]||[],section=String(row[1]||'').trim().toUpperCase(),pair=String(row[0]||'').trim().toUpperCase();
     if(!/^S[12]$/.test(section)||!/^P[0-9]{2}$/.test(pair))continue;
     const raw=row.slice(10,15),filled=raw.filter(x=>!empty(x));
     if(!filled.length){blank++;continue;}
     const actualStation=String(row[4]??'').trim();
     if(actualStation!==String(station)){otherStation++;continue;}
     const id=String(row[6]||'').trim().toUpperCase(),seatMatch=id.match(/^P[0-9]{2}-([1-4])$/),slot=seatMatch?Number(seatMatch[1]):0;
     const name=String(row[8]||'').trim(),key=section+'|'+pair+'|'+slot;
     if(!slot||id!==pair+'-'+slot){mismatch++;issues.push(source+' fila '+(n+1)+': ID/cupo no coincide');continue;}
     const target=index.get(key);
     if(!target||String(target.g.station)!==actualStation||!name||!target.s.name||normalize(target.s.name)!==normalize(name)){
      mismatch++;issues.push(source+' fila '+(n+1)+': estudiante sin coincidencia verificada ('+section+' '+pair+' · '+name+'). No importado');continue;
     }
     const levels=raw.map(readLevel);
     if(!validLevels(levels)){issues.push(source+' fila '+(n+1)+' ('+name+'): niveles inválidos fuera de 0–4');continue;}
     const count=levels.filter(x=>x!==null).length;
     if(!count)continue;
     if(count===5)complete++;else partial++;
     const padded=[...levels,null,null,null],existing=target.s.levels||[],existingFilled=existing.some(x=>!empty(x)),existingNote=String(target.s.note||'').trim();
     let status='Lista';
     if(existingFilled||existingNote){
      status=JSON.stringify(existing)===JSON.stringify(padded)?'Ya coincide':'Conflicto: evaluación guardada';
      if(status.startsWith('Conflicto'))issues.push(source+' '+pair+' '+name+': hay datos guardados; no se sobrescriben');
     }
     if(seen.has(key)){status='Duplicado entre archivos';seen.get(key).status='Duplicado entre archivos';issues.push(source+' '+pair+' '+name+': fila duplicada; ninguna versión se importará');}
     const comment=String(row[20]||'').trim().slice(0,3000);
     const item={key,section,pair,name,levels:padded,source,count,status,target,comment};
     candidate.push(item);if(!seen.has(key))seen.set(key,item);
    }
    summary.push('Evaluador '+station+': '+complete+' completas, '+partial+' parciales, '+blank+' sin puntaje, '+otherStation+' de otra estación, '+mismatch+' sin coincidencia');
   }catch(error){issues.push(source+': '+String(error.message||error));}
  }
  show(summary.join(' · ')+'. '+candidate.filter(x=>x.status==='Lista').length+' registros listos para importar. '+issues.length+' advertencias.','info');
 }finally{busy=false;preview();}
}
async function apply(){
 if(busy)return;
 const selected=candidate.filter(x=>x.status==='Lista');
 if(!selected.length)return;
 if(!window.KineCheckScores?.ready){show('La sincronización no está disponible. No se importó ningún puntaje.','error');return;}
 if(!confirm('Se importarán '+selected.length+' evaluaciones con coincidencia de identidad verificada. Los resultados anteriores no se sobrescribirán. ¿Continuar?'))return;
 busy=true;preview();let saved=0,failed=0;
 try{
  for(const item of selected){
   const s=item.target.s;
   if((s.levels||[]).some(x=>!empty(x))||String(s.note||'').trim()){
    item.status='Conflicto posterior';failed++;continue;
   }
   s.levels=[...item.levels];
   if(item.comment&&!String(s.note||'').trim())s.note=item.comment;
   save();renderAll();
   const confirmed=await window.KineCheckScores.saveSeat(item.target.g,s);
   if(confirmed===true){item.status='Guardado en Supabase';saved++;}
   else{item.status='Guardado no confirmado';failed++;issues.push(item.section+' '+item.pair+' '+item.name+': conservar respaldo local y verificar en servidor');}
  }
  if(saved&&!failed)await window.KineCheckScores.refresh();
  show(saved+' evaluaciones guardadas en Supabase; '+failed+' pendientes. Los puntajes completos ya se calculan en Simulación y Registro y notas.',''+(failed?'error':'success'));
 }finally{busy=false;preview();}
}
for(const id of ['excelEvaluator1','excelEvaluator2'])el(id)?.addEventListener('change',selectedCaption);
el('excelImportReview')?.addEventListener('click',()=>void review().catch(e=>{busy=false;preview();show('Error al revisar Excel: '+String(e.message||e),'error');}));
el('excelImportApply')?.addEventListener('click',()=>void apply().catch(e=>{busy=false;preview();show('No se completó la importación: '+String(e.message||e),'error');}));
})();