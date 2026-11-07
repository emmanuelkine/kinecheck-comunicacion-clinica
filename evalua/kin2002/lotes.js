/* KIN2002 · inventario local de secciones completas. Sin almacenamiento ni red. */
const $lot = id => document.getElementById(id);
const textDecoder = new TextDecoder('utf-8',{fatal:false});
let inventory = [];
const maxArchive = 120*1024*1024, maxPDF = 25*1024*1024, maxFiles = 200, maxInflated = 450*1024*1024;
const nice = bytes => (bytes/1024/1024).toFixed(2).replace('.',',')+' MB';
function csvSafe(value) {
 let v=String(value??'');
 if (/^\s*[=+@-]/.test(v)) v="'"+v;
 return '"'+v.replaceAll('"','""')+'"';
}
function error(message){throw new Error(message);}
function safePath(path) {
 return path && !path.startsWith('/') && !path.includes('\\') &&
   !path.split('/').some(x=>x==='..'||x==='') &&
   !/^[A-Za-z]:/.test(path) && !/[\x00-\x1f]/.test(path);
}
function pdfHeader(bytes){return bytes.length>=5&&bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;}
async function hash(bytes) {
 const output=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(output)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function unpack(file) {
 if(file.size>maxArchive)error('ZIP supera 120 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer()),data=new DataView(bytes.buffer);
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
   if(data.getUint32(i,true)===0x06054b50){end=i;break;}
 }
 if(end<0)error('ZIP sin directorio central válido.');
 const count=data.getUint16(end+10,true),offset=data.getUint32(end+16,true);
 if(count>1000)error('ZIP contiene demasiadas entradas.');
 if(data.getUint16(end+8,true)!==count)error('ZIP dividido en varios volúmenes no admitido.');
 let cursor=offset, inflated=0;
 const pdfs=[];const unsupported=[];
 for(let i=0;i<count;i++){
   if(cursor+46>bytes.length||data.getUint32(cursor,true)!==0x02014b50)error('Directorio ZIP incompleto.');
   const flags=data.getUint16(cursor+8,true),method=data.getUint16(cursor+10,true);
   const compressed=data.getUint32(cursor+20,true),uncompressed=data.getUint32(cursor+24,true);
   const filenameLength=data.getUint16(cursor+28,true),extraLength=data.getUint16(cursor+30,true),commentLength=data.getUint16(cursor+32,true);
   const local=data.getUint32(cursor+42,true);
   const endName=cursor+46+filenameLength;
   if(endName>bytes.length)error('Nombre de entrada ZIP truncado.');
   const filename=textDecoder.decode(bytes.subarray(cursor+46,endName));
   cursor=endName+extraLength+commentLength;
   if(!safePath(filename)) {if(!filename.endsWith('/'))unsupported.push('Ruta rechazada: '+filename.slice(0,70));continue;}
   if(!/\.pdf$/i.test(filename))continue;
   if(flags&1)error('ZIP cifrado no admitido: '+filename);
   if(uncompressed>maxPDF)error('Un PDF supera 25 MB: '+filename);
   inflated+=uncompressed;if(inflated>maxInflated)error('ZIP excede límite de descompresión.');
   if(pdfs.length>=maxFiles)error('Límite de 200 PDF por sección.');
   if(local+30>bytes.length||data.getUint32(local,true)!==0x04034b50)error('Entrada ZIP local inválida.');
   const start=local+30+data.getUint16(local+26,true)+data.getUint16(local+28,true);
   if(start+compressed>bytes.length)error('Contenido ZIP truncado.');
   const packed=bytes.slice(start,start+compressed);
   let plain;
   if(method===0)plain=packed;
   else if(method===8){
     if(typeof DecompressionStream==='undefined')error('Tu navegador no admite extracción ZIP local. Utiliza archivos PDF múltiples.');
     try{
       const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
       plain=new Uint8Array(await new Response(stream).arrayBuffer());
     }catch {error('No fue posible descomprimir '+filename+'. Intenta seleccionar los PDF sin ZIP.');}
   } else error('Compresión ZIP incompatible: '+filename);
   if(plain.byteLength!==uncompressed)error('Longitud incorrecta al descomprimir '+filename);
   pdfs.push({filename,bytes:plain});
 }
 return {pdfs,unsupported};
}
async function processPDF(filename,bytes,source,section){
 const title=filename.split('/').pop();
 const valid=pdfHeader(bytes);
 return {section,filename:title,source,size:bytes.length,hash:valid?await hash(bytes):'',
 status:valid?'Pendiente de revisión clínica':'PDF inválido',valid};
}
async function readFiles(section,selected){
 const rows=[];const problems=[];
 for(const file of selected) {
   if(/\.zip$/i.test(file.name)) {
     const zip=await unpack(file);
     for(const item of zip.pdfs)rows.push(await processPDF(item.filename,item.bytes,file.name,section));
     problems.push(...zip.unsupported);
   }else if(/\.pdf$/i.test(file.name)){
     if(file.size>maxPDF)error('PDF supera 25 MB: '+file.name);
     rows.push(await processPDF(file.name,new Uint8Array(await file.arrayBuffer()),file.name,section));
   }else problems.push('Archivo no admitido: '+file.name);
 }
 return {rows,problems};
}
function showLot(){
 const hashes=new Map(),names=new Map();
 for(const row of inventory){
  const h=row.section+'|'+row.hash,n=row.section+'|'+row.filename.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(row.hash)hashes.set(h,(hashes.get(h)||0)+1);
  names.set(n,(names.get(n)||0)+1);
 }
 for(const row of inventory) {
  const h=row.section+'|'+row.hash,n=row.section+'|'+row.filename.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if((row.hash&&hashes.get(h)>1)||names.get(n)>1)row.status='Duplicado: verificar';
 }
 const tbody=$lot('lot-table-body');tbody.replaceChildren();
 for(const item of inventory){
   const tr=document.createElement('tr');
   for(const val of [item.section,item.filename,item.source,nice(item.size),item.hash.slice(0,14),item.status]){
     const td=document.createElement('td');td.textContent=val;tr.append(td);
   }tbody.append(tr);
 }
 $lot('lot-summary').textContent=[
   'S1: '+inventory.filter(x=>x.section==='S1').length+' PDF',
   'S2: '+inventory.filter(x=>x.section==='S2').length+' PDF',
   'Incidencias: '+inventory.filter(x=>x.status!=='Pendiente de revisión clínica').length
 ].join(' · ');
 $lot('lot-results').classList.toggle('hidden',!inventory.length);
}
$lot('lot-process').addEventListener('click',async()=>{
 const s1=[...$lot('lot-s1').files],s2=[...$lot('lot-s2').files];
 if(!s1.length&&!s2.length){$lot('lot-status').textContent='Selecciona al menos una sección.';return;}
 const btn=$lot('lot-process');btn.disabled=true;$lot('lot-status').textContent='Leyendo PDF en el navegador…';
 try{
   const a=await readFiles('S1',s1),b=await readFiles('S2',s2);
   inventory=[...a.rows,...b.rows];showLot();
   $lot('lot-status').textContent='Inventario listo. '+inventory.length+' PDF identificados. '+[...a.problems,...b.problems].join(' | ');
 }catch(e){inventory=[];showLot();$lot('lot-status').textContent='No se importó ningún lote: '+(e?.message||String(e));}
 finally{btn.disabled=false;}
});
$lot('lot-export').addEventListener('click',()=>{
 const table=[['Sección','Documento PDF','Origen','Tamaño bytes','SHA-256','Estado'],...inventory.map(x=>[x.section,x.filename,x.source,x.size,x.hash,x.status])];
 const csv='\ufeff'+table.map(row=>row.map(csvSafe).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='KIN2002_Inventario_Secciones_Local.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
});
$lot('lot-reset').addEventListener('click',()=>{
 inventory=[];$lot('lot-s1').value='';$lot('lot-s2').value='';showLot();
 $lot('lot-status').textContent='Archivos descartados de esta pestaña.';
});
