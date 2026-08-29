import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const academy = await readFile(new URL("../academy/academy-v39.js", import.meta.url), "utf8");
const watermark = await readFile(new URL("../watermark.js", import.meta.url), "utf8");

function blockBetween(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `no se encontró bloque ${start}`);
  return source.slice(a, b);
}

test("tester beta nunca activa ownerMode por la lógica de presentación", () => {
  const block = blockBetween(academy, "function updateAccountPresentation(session)", "function renderProfile");
  assert.match(block, /ownerMode = isOwnerEmail\(userEmail\)/);
  assert.match(block, /betaState = getBetaState\(session\)/);
  assert.match(block, /betaMode = !ownerMode && betaState\.active/);
});

test("badges distinguen propietario, prueba y licencia normal", () => {
  const block = blockBetween(academy, "function accessBadge(access)", "function courseTypeLabel");
  assert.match(block, /access === "owned" && ownerMode/);
  assert.match(block, /return "Acceso propietario"/);
  assert.match(block, /access === "owned" && betaMode/);
  assert.match(block, /Prueba/);
  assert.match(block, /return "Disponible"/);
});

test("marca de agua sólo acepta etiquetas PROPIETARIO o PRUEBA", () => {
  assert.match(watermark, /\["PROPIETARIO", "PRUEBA"\]\.includes/);
  assert.match(academy, /accessLabel: ownerMode \? "PROPIETARIO" : \(betaMode \? "PRUEBA" : ""\)/);
});

test("betaMode queda subordinado a !ownerMode también en apertura de producto", () => {
  const matches = academy.match(/betaMode = !ownerMode && betaState\.active/g) || [];
  assert.ok(matches.length >= 2, "la separación owner/beta debe aplicarse en presentación y apertura");
});
