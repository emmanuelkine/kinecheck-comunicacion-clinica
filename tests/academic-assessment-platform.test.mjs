import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const sql = await readFile(new URL("../supabase/schema/academic_assessment_preparation.sql", import.meta.url), "utf8");
const fn = await readFile(new URL("../supabase/functions/academic-assessment-status/index.ts", import.meta.url), "utf8");
const sync = await readFile(new URL("../supabase/functions/course-completion-sync/index.ts", import.meta.url), "utf8");
const ui = await readFile(new URL("../academy/academic-assessment-status-v1.js", import.meta.url), "utf8");

test("preparation includes all eight courses and keeps OTEC certification disabled", () => {
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

async function renderAssessmentStatus(assessment, session = { access_token: "synthetic-test-token" }) {
  const calls = [];
  const listeners = {};
  const content = { innerHTML: "", querySelector: () => null };
  const dialog = { open: false, showModal() { this.open = true; }, querySelector: () => content };
  runInNewContext(ui, {
    window: {
      KINECHECK_ACADEMY_CONFIG: { supabaseUrl: "https://assessment.invalid", supabaseAnonKey: "synthetic-anon-key" },
      KINECHECK_ACADEMY_SESSION: { get: () => session },
    },
    document: { readyState: "complete", documentElement: {}, querySelector: () => dialog,
      querySelectorAll: () => [], addEventListener: (name, handler) => { listeners[name] = handler; } },
    MutationObserver: class { observe() {} },
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      return { ok: true, json: async () => ({ course: { title: '<img src=x onerror="alert(1)">' },
        message: "Estado del servidor", certification: { active: false }, assessment }) };
    },
  });
  listeners.click({ target: { closest: () => ({ dataset: { assessmentCourse: "kinecheck-clinico-curso" } }) },
    preventDefault() {}, stopPropagation() {} });
  await new Promise(setImmediate);
  return { html: content.innerHTML, calls, dialog };
}

test("assessment UI follows server activation, route eligibility and certification status", async () => {
  const inactive = await renderAssessmentStatus({ internalActive: false });
  assert.equal(inactive.dialog.open, true);
  assert.match(inactive.html, /No disponible/);
  assert.doesNotMatch(inactive.html, /data-academic-start=/);
  assert.match(inactive.html, /OTEC en preparación · no SENCE/);
  assert.doesNotMatch(inactive.html, /<img/);
  assert.match(inactive.html, /&lt;img/);
  assert.equal(inactive.calls[0].url, "https://assessment.invalid/functions/v1/academic-assessment-status");
  assert.equal(inactive.calls[0].headers.Authorization, "Bearer synthetic-test-token");
  assert.deepEqual(JSON.parse(inactive.calls[0].body), { courseSlug: "kinecheck-clinico-curso" });
  const pending = await renderAssessmentStatus({ internalActive: true, canStart: false });
  assert.match(pending.html, /Completa primero el recorrido/);
  assert.doesNotMatch(pending.html, /data-academic-start=/);
  const eligible = await renderAssessmentStatus({ internalActive: true, canStart: true });
  assert.match(eligible.html, /data-academic-start="kinecheck-clinico-curso"/);
  assert.match(eligible.html, /OTEC en preparación · no SENCE/);
  const exhausted = await renderAssessmentStatus({ internalActive: true, attempts: [{ submitted_at: "2026-10-01" }, { submitted_at: "2026-10-02" }] });
  assert.match(exhausted.html, /Intentos utilizados/);
  assert.doesNotMatch(exhausted.html, /data-academic-start=/);
  const anonymous = await renderAssessmentStatus({ internalActive: true }, null);
  assert.equal(anonymous.calls.length, 0);
  assert.match(anonymous.html, /Estado no disponible/);
  assert.doesNotMatch(anonymous.html, /data-academic-start=/);
});
