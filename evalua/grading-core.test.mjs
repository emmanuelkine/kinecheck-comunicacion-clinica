import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularNota, validarPropuesta } from "./grading-core.mjs";

test("escala chilena con exigencia 60%", () => {
  assert.equal(calcularNota(0,100,60),1);
  assert.equal(calcularNota(60,100,60),4);
  assert.equal(calcularNota(100,100,60),7);
});
test("rechaza puntajes imposibles", () => {
  assert.throws(()=>calcularNota(110,100,60));
  assert.throws(()=>calcularNota(20,100,100));
});
const rubrica={exigencia:60,criterios:[{id:"c1",niveles:[{id:"alto",puntos:10},{id:"bajo",puntos:0}]}]};
test("nota determinista con evidencia",()=>{
  const r=validarPropuesta(rubrica,{criterios:[{criterio_id:"c1",nivel_id:"alto",evidencia:"Página 2",justificacion:"Cumple descriptor"}]});
  assert.equal(r.nota_propuesta,7);
  assert.equal(r.aprobacion_docente_pendiente,true);
});
test("sin evidencia no hay nota",()=>{
  const r=validarPropuesta(rubrica,{criterios:[{criterio_id:"c1",nivel_id:"alto"}]});
  assert.equal(r.nota_propuesta,null);
  assert.equal(r.revision_requerida,true);
});
test("no admite criterios inventados",()=>{
  assert.throws(()=>validarPropuesta(rubrica,{criterios:[{criterio_id:"inventado"}]}));
});
