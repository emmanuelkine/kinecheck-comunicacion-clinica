/* KineCheck Evalúa · conciliación privada de cuatro Excel. Sin dependencias, sin red, sin persistencia. */
const $ = id => document.getElementById(id);
const weightsSim = [8,16,16,12,20,12,8,8];
const weightsReport = [20,20,15,10,15,10,5,5];
const normalize = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const dec = new TextDecoder('utf-8');
const safeNum = x => (x === '' || x == null ? null : Number(x));
const validLevel = x => Number.isInteger(x) && x >= 0 && x <= 4;
const isTest = name => /prueba|pilotaje|no evaluar|paciente fictici/i.test(name);
function points(levels, weights) {
  if (levels.length !== 8 || !levels.every(validLevel)) return null;
  return levels.reduce((sum,x,i)=>sum+x*weights[i]/4,0);
}
function grade(value) {
  if (value === null) return null;
  return Math.round((value <= 60 ? 1 + value*3/60 : 4 + (value-60)*3/40)*10)/10;
}
function text(node,tag){return node.getElementsByTagNameNS('*',tag)[0]?.textContent || '';}
function joinPath(base,target) {
  const tokens = (target.startsWith('/')?target.slice(1):base+'/'+target).split('/');
  const path=[];
  for(const token of tokens){if(token==='..')path.pop();else if(token && token!=='.')path.push(token);}
  return path.join('/');
}
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
function parseSimulation(sheets,source){
  const data=sheets['Evaluación individual'];if(!data)throw Error(source+': falta hoja «Evaluación individual»');
  if(!String(data[4]?.[9]??'').toLowerCase().includes('estudiante'))throw Error(source+': encabezado de estudiante incompatible');
  return data.slice(5).flatMap((row,i)=>{
    if(!row||!String(row[9]??'').trim())return [];
    const levels=Array.from({length:8},(_,index)=>safeNum(row[11+index]));
    const name=String(row[9]).trim();
    if(isTest(name))return [];
    const section=String(row[1]??'').trim().toUpperCase();
    const pts=points(levels,weightsSim);
    return [{source,row:i+6,section,name,pair:String(row[0]??'').trim(),points:pts,note:grade(pts),complete:pts!==null}];
  });
}
function parseReport(sheets,section){
  const data=sheets['MATRIZ_DOCENTE'];if(!data)throw Error(section+': falta hoja «MATRIZ_DOCENTE»');
  if(normalize(data[3]?.[0])!=='estudiante')throw Error(section+': columnas incompatibles');
  return data.slice(4).flatMap((row,i)=>{
    if(!row||!String(row[0]??'').trim())return [];
    const name=String(row[0]).trim();if(isTest(name))return [];
    const levels=Array.from({length:8},(_,index)=>safeNum(row[5+index]));
    const pts=points(levels,weightsReport);
    const validation=normalize(row[17]);
    const approved=validation==='confirmado'||validation==='aprobado'||validation==='validado';
    return [{source:'Informe '+section,row:i+5,section,name,receipt:String(row[1]??'').trim(),points:pts,note:grade(pts),complete:pts!==null,approved}];
  });
}
const uniqueBy=(list,key)=>{const m=new Map();for(const item of list){const k=key(item);m.set(k,[...(m.get(k)||[]),item]);}return m;};
let output=[];
function f(value){return typeof value==='number'?value.toFixed(1).replace('.',','):'—';}
function render(sim,reports){
  const sims=uniqueBy(sim,x=>x.section+'|'+normalize(x.name));
  const reps=uniqueBy(reports,x=>x.section+'|'+normalize(x.name));
  const keys=[...new Set([...sims.keys(),...reps.keys()])].sort();
  output=keys.map(key=>{
    const a=sims.get(key)||[],b=reps.get(key)||[],sample=a[0]||b[0];
    const reason=[];
    if(a.length>1)reason.push('Simulación duplicada / identidad por verificar');
    if(b.length>1)reason.push('Informe duplicado / identidad por verificar');
    if(a.length===0)reason.push('Sin simulación');
    if(b.length===0)reason.push('Sin informe');
    if(a.length===1&&!a[0].complete)reason.push('Simulación incompleta');
    if(b.length===1&&!b[0].complete)reason.push('Informe sin ocho niveles');
    if(b.length===1&&!b[0].approved)reason.push('Informe pendiente de validación docente');
    const matched=a.length===1&&b.length===1&&a[0].complete&&b[0].complete;
    const official=matched&&b[0].approved&&reason.length===0;
    // Only render a certamen grade when every component is complete, unambiguous and the report is teacher-validated.
    const cert=official?Math.round((b[0].note*.3+a[0].note*.7)*10)/10:null;
    return {section:sample.section,name:sample.name,source:a.map(x=>x.source).join(', '),simPoints:a.length===1?a[0].points:null,simNote:a.length===1?a[0].note:null,repPoints:b.length===1&&b[0].approved?b[0].points:null,repNote:b.length===1&&b[0].approved?b[0].note:null,cert,contribution:official?Math.round(cert*.5*100)/100:null,state:reason.length?reason.join('; '):'Listo para revisión docente',official};
  });
  const stats=[['Registros',output.length],['Con ambos componentes',output.filter(x=>x.cert!==null).length],['Con incidencias',output.filter(x=>x.state!=='Listo para revisión docente').length],['Validaciones completas',output.filter(x=>x.official).length]];
  $('stats').replaceChildren(...stats.map(([name,val])=>{const div=document.createElement('div');div.className='stat';const label=document.createElement('span');label.textContent=name;const number=document.createElement('b');number.textContent=String(val);div.append(label,number);return div;}));
  const body=$('tablebody');body.replaceChildren();
  for(const row of output){const tr=document.createElement('tr');for(const [v,cls] of [[row.section,''],[row.name,''],[row.source,''],[row.simPoints,''],[row.simNote,''],[row.repPoints,''],[row.repNote,''],[row.cert,''],[row.contribution,''],[row.state,row.state==='Listo para revisión docente'?'ok':'alert']]){
    const td=document.createElement('td');td.textContent=typeof v==='number'?f(v):v??'—';if(cls)td.className=cls;tr.append(td);
  }body.append(tr);}
  $('result').classList.remove('hidden');
}
function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function exportCsv(){
  const data=[['Sección','Estudiante','Origen simulación','Puntos simulación','Nota simulación','Puntos informe','Nota informe','Certamen 2','Aporte al curso','Estado'],...output.map(r=>[r.section,r.name,r.source,r.simPoints??'',r.simNote??'',r.repPoints??'',r.repNote??'',r.cert??'',r.contribution??'',r.state])];
  const csv='\ufeff'+data.map(r=>r.map(csvCell).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='KineCheck_Evalua_KIN2002_Conciliacion_Revisar.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function process(){
  $('status').textContent='Procesando localmente...';$('result').classList.add('hidden');
  try{
    for(const id of ['sim1','sim2','rep1','rep2'])if(!$(id).files[0])throw Error('Falta adjuntar: '+id);
    const sim1=parseSimulation(await openXlsx($('sim1').files[0]),'Evaluador 1');
    const sim2=parseSimulation(await openXlsx($('sim2').files[0]),'Evaluador 2');
    const rep1=parseReport(await openXlsx($('rep1').files[0]),'S1');
    const rep2=parseReport(await openXlsx($('rep2').files[0]),'S2');
    render([...sim1,...sim2],[...rep1,...rep2]);
    $('status').textContent='Conciliación local: '+(sim1.length+sim2.length)+' registros simulación y '+(rep1.length+rep2.length)+' registros informe. Comprueba coincidencias y valida notas antes de su uso.';
  }catch(e){$('status').textContent='No se pudo conciliar: '+(e instanceof Error?e.message:String(e));}
}
$('process').addEventListener('click',process);
$('export').addEventListener('click',exportCsv);
$('reset').addEventListener('click',()=>{for(const id of ['sim1','sim2','rep1','rep2'])$(id).value='';output=[];$('result').classList.add('hidden');$('status').textContent='Archivos y resultados descartados.';});