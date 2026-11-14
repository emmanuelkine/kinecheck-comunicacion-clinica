/* KIN2002: Excel de informes. Importación local con coincidencia única, previsualización y confirmación. */
(()=>{'use strict';
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


const el=id=>document.getElementById(id);
const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const numeric=v=>{const s=String(v??'').trim().replace(',','.');return s===''?null:Number(s)};
const bridge=()=>window.KineCheckReportsExcelBridge;
let pending=[],issues=[],file=null;
function status(message){el('reportsExcelStatus').textContent=message;}
el('reportsExcel').addEventListener('change',e=>{file=e.target.files?.[0]||null;pending=[];issues=[];el('reportsExcelReview').disabled=!file;el('reportsExcelApply').disabled=true;status(file?'Seleccionado: '+file.name+'. Presiona «Revisar Excel».':'Selecciona el Excel de informes.');});
el('reportsExcelReview').addEventListener('click',async()=>{
 pending=[];issues=[];el('reportsExcelApply').disabled=true;
 try{
  if(!file)throw Error('Adjunta un Excel primero.');
  const api=bridge();if(!api)throw Error('Panel todavía no disponible.');
  const workbook=await openXlsx(file),rows=workbook['Consolidado'];
  if(!Array.isArray(rows)||rows.length<2||rows.length>500)throw Error('Falta la hoja «Consolidado» o tiene un tamaño inválido.');
  const headers=rows[0].map(normalize);
  const index=(...names)=>names.map(n=>headers.indexOf(normalize(n))).find(i=>i>=0)??-1;
  const secIx=index('Sección','Seccion'),nameIx=index('Estudiante'),pointIx=index('Puntaje /100'),gradeIx=index('Nota /7');
  if([secIx,nameIx,pointIx,gradeIx].some(i=>i<0))throw Error('Se requieren columnas Sección, Estudiante, Puntaje /100 y Nota /7.');
  const seen=new Set();
  for(let i=1;i<rows.length;i++){
   const row=rows[i]||[],sec=String(row[secIx]||'').trim().toUpperCase(),name=normalize(row[nameIx]);
   if(!sec&&!name)continue;
   const key=sec+'|'+name;
   if(seen.has(key)){issues.push('Fila '+(i+1)+': duplicado');continue;}seen.add(key);
   const match=api.students().filter(s=>s.group.section===sec&&normalize(s.name)===name&&name);
   if(match.length!==1){issues.push('Fila '+(i+1)+': sin coincidencia única ('+sec+' / '+String(row[nameIx]||'')+')');continue;}
   const points=numeric(row[pointIx]),grade=numeric(row[gradeIx]);
   if(points===null||grade===null||!Number.isFinite(points)||points<0||points>100||!Number.isFinite(grade)||grade<1||grade>7){issues.push('Fila '+(i+1)+': puntaje o nota inválidos');continue;}
   const expected=Math.round(api.grade(points)*10)/10;
   if(Math.abs(expected-grade)>0.11){issues.push('Fila '+(i+1)+': puntaje y nota no concuerdan con escala 60 %');continue;}
   const target=api.groups().flatMap(g=>g.students).find(s=>s.id===match[0].id);
   if((target.report!=null&&Math.abs(Number(target.report)-grade)>0.05)||(target.reportPoints!=null&&Math.abs(Number(target.reportPoints)-points)>0.05)){issues.push('Fila '+(i+1)+': calificación existente diferente; no se sobrescribe');continue;}
   pending.push({target,points,grade});
  }
  el('reportsExcelApply').disabled=!pending.length;
  status(pending.length+' coincidencias válidas para importar; '+issues.length+' filas omitidas. '+issues.slice(0,4).join('; ')+'. Revisa y confirma.');
 }catch(e){status('No se pudo revisar Excel: '+e.message);}
});
el('reportsExcelApply').addEventListener('click',()=>{
 if(!pending.length)return;
 if(!confirm('¿Importar '+pending.length+' puntajes y notas de informes? Se conservarán simulaciones y notas existentes diferentes. Exporta un respaldo antes de continuar.'))return;
 const api=bridge();let saved=0,skipped=0;
 for(const u of pending){
  if((u.target.report!=null&&Math.abs(Number(u.target.report)-u.grade)>0.05)||(u.target.reportPoints!=null&&Math.abs(Number(u.target.reportPoints)-u.points)>0.05)){skipped++;continue;}
  u.target.reportPoints=u.points;u.target.report=u.grade;saved++;
 }
 if(saved){api.save();api.renderAll();}
 pending=[];el('reportsExcelApply').disabled=true;
 status(saved+' informes incorporados al registro local; '+skipped+' omitidos por conflicto. Exporta respaldo JSON. Este botón no publica notas en servidor.');
});
})();
