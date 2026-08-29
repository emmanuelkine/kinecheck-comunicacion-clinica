import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const betaJs = await readFile(new URL("../beta/beta.js", import.meta.url), "utf8");
const betaHtml = await readFile(new URL("../beta/index.html", import.meta.url), "utf8");

test("beta declara acceso temporal sin compra", () => {
  assert.match(betaJs, /No necesitas comprar un producto para participar en la beta/);
  assert.match(betaJs, /KineCheck te asignará el acceso temporal de prueba/);
  assert.match(betaHtml, /beta\.js/);
});

test("Recupera y perfil paciente quedan fuera de la convocatoria activa", () => {
  assert.match(betaJs, /PAUSED_PRODUCT = "kinecheck-recupera"/);
  assert.match(betaJs, /PAUSED_ROLE = "patient"/);
  assert.match(betaJs, /querySelector\(`option\[value=/);
  assert.match(betaJs, /Personas en recuperación/);
  assert.match(betaJs, /permanece Próximamente/);
});

test("el submit rechaza valores legacy pausados antes de enviar", () => {
  assert.match(betaJs, /payload\.productInterest === PAUSED_PRODUCT/);
  assert.match(betaJs, /payload\.role === PAUSED_ROLE/);
  const guardIndex = betaJs.indexOf("payload.productInterest === PAUSED_PRODUCT");
  const fetchIndex = betaJs.indexOf("await fetch(ENDPOINT");
  assert.ok(guardIndex > 0 && fetchIndex > guardIndex, "el guard debe ejecutarse antes del POST de postulación");
});
