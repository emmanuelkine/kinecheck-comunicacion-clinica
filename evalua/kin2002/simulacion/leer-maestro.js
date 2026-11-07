// Reutiliza el lector local de Excel de KIN2002. No transmite archivos.
const dec=new TextDecoder('utf-8');
function text(node,tag){return node.getElementsByTagNameNS('*',tag)[0]?.textContent || '';}
function joinPath(base,target) {
  const tokens = (target.startsWith('/')?target.slice(1):base+'/'+target).split('/');
  const path=[];
  for(const token of tokens){if(token==='..')path.pop();else if(token && token!=='.')path.push(token);}
  return path.join('/');
}
export async function openXlsx(file) {
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
