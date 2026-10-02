import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/schema/academic_assessment_preparation.sql", import.meta.url), "utf8");
const fn = await readFile(new URL("../supabase/functions/academic-assessment-status/index.ts", import.meta.url), "utf8");
const sync = await readFile(new URL("../supabase/functions/course-completion-sync/index.ts", import.meta.url), "utf8");
const ui = await readFile(new URL("../academy/academic-assessment-status-v1.js", import.meta.url), "utf8");

test("all eight course assessment configurations are prepared but inactive", () => {
  for (const slug of ["kinecheck-clinico-curso","comunicacion-clinica","mas-alla-del-dolor","evidencia-aplicada","traumatologia-ortopedia-clinica","dolor-lumbar-persistente","dolor-musculoesqueletico","ejercicio-terapeutico"]) {
    assert.match(sql, new RegExp(slug));
  }
  assert.match(sql, /academic_assessment_pilot', false/);
  assert.match(sql, /set certificate_ready = false/);
  assert.match(sql, /set auto_certificate=false/);
});

test("assessment status requires authentication and never returns answer keys", () => {
  assert.match(fn, /userClient\.auth\.getUser\(\)/);
  assert.match(fn, /Licencia activa requerida/);
  assert.doesNotMatch(fn, /correct_answer|answer_key|correctIndex/);
  assert.match(fn, /ownerPreview/);
});

test("completion sync is blocked while OTEC certification is inactive", () => {
  assert.match(sync, /OTEC_CERTIFICATION_NOT_ACTIVE/);
  assert.match(sync, /!certificationFlag\?\.enabled/);
  assert.match(sync, /existingCompletion\?\.verification_level === "automatic_full" && requirement\.auto_certificate/);
});

test("Academy exposes truthful assessment status without an attempt action", () => {
  assert.match(ui, /Preparada · no activa/);
  assert.match(ui, /no emite certificados/);
  assert.doesNotMatch(ui, /Iniciar evaluación|Rendir evaluación|Enviar respuestas/);
});
