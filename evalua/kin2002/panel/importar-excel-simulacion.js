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
const validLevels=arr=>arr.length===5&&arr.every(x=>Number.isInteger(x)&&x>=0&&x<=4);
const slots=()=>groups.flatMap(g=>g.students.map((s,i)=>({g,s,slot:i+1,key:g.section+'|'+g.id+'|'+(i+1)})));
let candidate=[],issues=[],summary=[];
function show(message,kind='info'){const e=el('excelImportStatus');if(e){e.textContent=message;e.dataset.state=kind;e.style.color=kind==='error'?'#ffd1a0':kind==='success'?'#9df1c8':'#b8d4df';}}
function preview(){
 const body=el('excelImportPreview');
 if(!body)return;
 const clean=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lines=candidate.map(x=>'<tr><td>'+clean(x.source)+'</td><td>'+clean(x.section)+'</td><td>'+clean(x.pair)+'</td><td>'+clean(x.name)+'</td><td>'+x.count+'/5</td><td>'+clean(x.status)+'</td></tr>');
 body.innerHTML=lines.length?lines.join(''):'<tr><td colspan="6">Ninguna evaluación completa importable</td></tr>';
 const details=el('excelImportIssues');
 if(details)details.textContent=issues.slice(0,30).join(' · ')+(issues.length>30?' · …':'');
 const button=el('excelImportApply');
 if(button)button.disabled=!candidate.some(x=>x.status==='Lista');
}
async function review(){
 candidate=[];issues=[];summary=[];
 el('excelImportApply').disabled=true;
 const files=[el('excelEvaluator1').files?.[0],el('excelEvaluator2').files?.[0]];
 if(files.some(x=>!x)){show('Selecciona los dos Excel antes de revisar.','error');return}
 if(!window.KineCheckScores?.ready){show('Primero ingresa a KineCheck y espera a que se sincronicen los puntajes.','error');return}
 const index=new Map(slots().map(x=>[x.key,x]));
 const seen=new Set();
 for(let i=0;i<2;i++){
  const station=i+1,file=files[i],source='Evaluador '+station;
  try{
   const workbook=await openXlsx(file);
   const rows=workbook['Evaluación'];
   if(!Array.isArray(rows))throw Error('No existe la hoja «Evaluación» del Excel oficial de cinco hitos');
   const header=rows[5]||[];
   if(normalize(header[0])!=='pareja'||normalize(header[1])!=='seccion'||normalize(header[8])!=='estudiante'||!String(header[10]||'').toLowerCase().includes('h1'))throw Error('Encabezados de la fila 6 incompatibles con rúbrica oficial H1–H5');
   let complete=0,partial=0,empty=0,wrongStation=0;
   for(let n=6;n<rows.length;n++){
    const row=rows[n]||[];
    const section=String(row[1]||'').trim().toUpperCase(),pair=String(row[0]||'').trim().toUpperCase(),actualStation=String(row[4]??'').trim();
    if(!/^S[12]$/.test(section)||!/^P[0-9]{2}$/.test(pair))continue;
    const raw=row.slice(10,15),filled=raw.filter(x=>x!==null&&x!==undefined&&String(x).trim()!=='');
    if(actualStation!==String(station)){if(filled.length)wrongStation++;continue}
    if(filled.length===0){empty++;continue}
    const id=String(row[6]||'').trim(),seatMatch=id.match(/^P[0-9]{2}-([1-4])$/i),slot=seatMatch?Number(seatMatch[1]):0;
    const key=section+'|'+pair+'|'+slot,name=String(row[8]||'').trim();
    if(!slot||id.toUpperCase()!==pair+'-'+slot){issues.push(source+' fila '+(n+1)+': ID/cupo incorrecto');continue}
    if(seen.has(key)){issues.push(source+' fila '+(n+1)+': estudiante repetido en ambos Excel');continue}
    seen.add(key);
    const target=index.get(key);
    if(!target||String(target.g.station)!==actualStation||!name||!target.s.name||normalize(target.s.name)!==normalize(name)){
     issues.push(source+' fila '+(n+1)+': identidad distinta o estudiante sin nombre confirmado ('+section+' '+pair+' cupo '+slot+')');continue
    }
    if(filled.length!==5){partial++;issues.push(source+' '+pair+' '+name+': '+filled.length+'/5 hitos; pendiente, no se asigna nota');continue}
    const levels=raw.map(x=>typeof x==='number'?x:Number(String(x).trim()));
    if(!validLevels(levels)){issues.push(source+' '+pair+' '+name+': niveles fuera de la escala 0–4');continue}
    complete++;
    const existing=target.s.levels||[],existingFilled=existing.some(x=>x!==null&&x!==undefined&&x!=='');
    let status='Lista';
    if(existingFilled)status=JSON.stringify(existing)===JSON.stringify([...levels,null,null,null])?'Ya coincide':'Conflicto: puntajes existentes (revisar rúbrica anterior)';
    if(status.startsWith('Conflicto'))issues.push(source+' '+pair+' '+name+': existen puntajes distintos; no se sobrescribirán');
    candidate.push({key,section,pair,name,levels:[...levels,null,null,null],source,count:5,status,target});
   }
   if(wrongStation)issues.push(source+': '+wrongStation+' registros calificados de otra estación no importados; revisa si se usó el archivo correcto');
   summary.push(source+': '+complete+' completas, '+partial+' parciales, '+empty+' sin evaluar');
  }catch(err){issues.push(source+': '+(err?.message||String(err)))}
 }
 preview();
 show(summary.join(' · ')+'. '+candidate.filter(x=>x.status==='Lista').length+' listas para importar; '+issues.length+' advertencias. Los archivos no se enviaron al servidor.','info');
}
async function apply(){
 const selected=candidate.filter(x=>x.status==='Lista');
 if(!selected.length)return;
 if(!window.KineCheckScores?.ready){show('Sincronización no disponible; no se importó nada.','error');return}
 if(!confirm('¿Guardar en Supabase '+selected.length+' evaluaciones completas? No se reemplazarán notas anteriores ni se importarán criterios incompletos.'))return;
 const button=el('excelImportApply');button.disabled=true;
 let saved=0,failed=0;
 for(const item of selected){
  const s=item.target.s,prior=[...(s.levels||[])];
  // No sobrescribir datos incorporados después de la revisión.
  if((s.levels||[]).some(x=>x!==null&&x!==undefined&&x!=='')){item.status='Conflicto posterior';failed++;continue}
  s.levels=[...item.levels];save();renderAll();
  try{
   const confirmed=await window.KineCheckScores.saveSeat(item.target.g,s);
   if(confirmed!==true)throw Error('Supabase no confirmó el guardado');
   item.status='Guardada en servidor';saved++;
  }catch(err){
   // Se conserva el respaldo local nuevo para investigar, pero nunca se afirma guardado exitoso.
   item.status='Pendiente de verificar';failed++;issues.push(item.source+' '+item.pair+' '+item.name+': servidor no confirmó el guardado. Revisa los puntajes antes de reintentar.');
  }
 }
 preview();
 show(saved+' evaluaciones confirmadas en Supabase; '+failed+' pendientes de revisión. No se modificaron notas de informe.',''+(failed?'error':'success'));
 if(saved&&!failed)await window.KineCheckScores.refresh();
}
el('excelImportReview')?.addEventListener('click',()=>void review().catch(e=>show('Error revisando Excel: '+String(e),'error')));
el('excelImportApply')?.addEventListener('click',()=>void apply().catch(e=>show('Error guardando Excel: '+String(e),'error')));
})();