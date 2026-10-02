import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packagePath = new URL("../docs/academic/programas-otec/instrumentos-evaluacion-y-pilotaje-otec-v1.md", import.meta.url);
const auditPath = new URL("../docs/academic/course-programs-audit-2026-10-01.md", import.meta.url);

const courses = [
  "KineCheck Clínico",
  "Comunicación Clínica",
  "Más allá del dolor",
  "KineCheck Evidencia Aplicada",
  "Traumatología y Ortopedia Clínica",
  "Dolor Lumbar Persistente",
  "Dolor Musculoesquelético",
  "Ejercicio Terapéutico",
];

test("the OTEC review package specifies all eight assessment designs", async () => {
  const source = await readFile(packagePath, "utf8");
  for (const course of courses) assert.match(source, new RegExp(course.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(source, /80\/100 o más/);
  assert.match(source, /condición crítica de seguridad/);
  assert.match(source, /Forma B independiente/);
  assert.match(source, /al menos 30 finalizaciones por curso/);
});

test("the proposal cannot be mistaken for active OTEC or SENCE certification", async () => {
  const source = await readFile(packagePath, "utf8");
  assert.match(source, /No activa certificación/);
  assert.match(source, /no corresponde a cursos SENCE/);
  assert.match(source, /requiere aprobación escrita/);
  assert.match(source, /certificate_ready = false/);
});

test("every formerly open finding now has an implemented design or protocol", async () => {
  const audit = await readFile(auditPath, "utf8");
  assert.doesNotMatch(audit, /^\| [A-Z]{2}-\d+ \| P[0-3] \| Abierto \|/m);
  assert.match(audit, /Diseñado; no activado/);
  assert.match(audit, /Protocolado/);
});
