import {test} from "node:test";
import assert from "node:assert/strict";
import {extraerTextoPDF,buscarEvidencias} from "./pdf-extraction.mjs";
const bytes=new TextEncoder().encode("%PDF-1.7 content");
test("extrae texto por página sin servicios externos",async()=>{
 const pdfjs={getDocument:()=>({promise:Promise.resolve({
 numPages:2,getPage:async i=>({getTextContent:async()=>({items:[{str:i===1?"Introducción":"Evidencia del criterio"}]}),cleanup(){}}),destroy:async()=>{}
 }),destroy:async()=>{}})};
 const r=await extraerTextoPDF(bytes,{pdfjs});
 assert.equal(r.numeroPaginas,2);
 assert.deepEqual(buscarEvidencias(r,"Evidencia del criterio")[0].pagina,2);
});
test("rechaza firmas no PDF",async()=>{
 await assert.rejects(extraerTextoPDF(new TextEncoder().encode("malicioso"),{pdfjs:{getDocument(){}}}));
});
test("detecta páginas sin texto extraíble",async()=>{
 const pdfjs={getDocument:()=>({promise:Promise.resolve({
 numPages:1,getPage:async()=>({getTextContent:async()=>({items:[]}),cleanup(){}}),destroy:async()=>{}
 }),destroy:async()=>{}})};
 const r=await extraerTextoPDF(bytes,{pdfjs});
 assert.equal(r.requiereRevision,true);
});
