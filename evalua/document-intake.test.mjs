import { test } from "node:test";
import assert from "node:assert/strict";
import { prepararManifiesto, validarArchivo } from "./document-intake.mjs";
const file=(name,type="application/pdf",size=100)=>({name,type,size});
test("acepta una rúbrica y un trabajo PDF",()=>{
 const m=prepararManifiesto({rubrica:file("rubrica.pdf"),trabajos:[file("alumna.pdf")]});
 assert.equal(m.modo,"fuentes_cerradas");
 assert.equal(m.extraccionPendiente,true);
});
test("rechaza más de cinco trabajos gratis",()=>{
 assert.throws(()=>prepararManifiesto({rubrica:file("r.pdf"),trabajos:Array.from({length:6},(_,i)=>file(i+".pdf"))}));
});
test("rechaza formatos o MIME discordantes",()=>{
 assert.throws(()=>validarArchivo(file("alumna.exe"),"trabajo"));
 assert.throws(()=>validarArchivo(file("alumna.pdf","image/png"),"trabajo"));
});
test("rechaza archivos vacíos o excesivos",()=>{
 assert.throws(()=>validarArchivo(file("a.pdf","application/pdf",0),"trabajo"));
 assert.throws(()=>validarArchivo(file("a.pdf","application/pdf",16*1024*1024),"trabajo"));
});
