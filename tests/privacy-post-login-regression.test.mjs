import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Recupera is blocked by the authenticated SSO relay", async () => {
  const source = await read("academy/app-sso-relay.js");
  assert.match(source, /const PRODUCTS = new Set\(\["kinecheck-estudiante"\]\)/);
  assert.match(source, /const PAUSED_PRODUCT = "kinecheck-recupera"/);
  assert.match(source, /if \(product === PAUSED_PRODUCT\) \{\s*fail\(PAUSED_MESSAGE\);\s*return;/);
  assert.doesNotMatch(source, /privacy_consent_version/);
});

test("Academy runtime marks Recupera as preparing and disables its controls", async () => {
  const source = await read("academy/academy-personalization-v1.js");
  assert.match(source, /const PAUSED_PRODUCT = "kinecheck-recupera"/);
  assert.match(source, /course\.status = "preparing"/);
  assert.match(source, /course\.url = ""/);
  assert.match(source, /aria-disabled/);
  assert.match(source, /Próximamente/);
});

test("Academy config has no active Recupera SSO route", async () => {
  const source = await read("academy/config.js");
  assert.match(source, /"kinecheck-estudiante": "\/sso\.html\?product=kinecheck-estudiante"/);
  assert.doesNotMatch(source, /"kinecheck-recupera": "\/sso\.html\?product=kinecheck-recupera"/);
  const recuperaBlock = source.slice(source.indexOf('slug: "kinecheck-recupera"'), source.indexOf('slug: "mas-alla-del-dolor"'));
  assert.match(recuperaBlock, /status: "preparing"/);
  assert.match(recuperaBlock, /url: ""/);
});

test("Clinico puts an educational warning at free-text fields and labels PDF output", async () => {
  const page = await read("kinecheck-clinico-guia/index.html");
  const guard = await read("kinecheck-clinico-guia/privacy-guard-v1.js");
  assert.match(page, /privacy-guard-v1\.js/);
  assert.match(guard, /Uso educativo: utiliza exclusivamente información ficticia, simulada o debidamente anonimizada/);
  assert.match(guard, /No ingreses nombre, RUT, teléfono, correo, número de ficha/);
  assert.match(guard, /Documento educativo — no corresponde a una ficha clínica/);
  assert.match(guard, /#guide-form input\[type='text'\].*#guide-form textarea/);
});

test("Static homepage exposes Recupera only as Próximamente", async () => {
  const source = await read("index.html");
  assert.match(source, /KineCheck Recupera · Próximamente/);
  assert.match(source, /no está disponible para registrar información/);
  assert.doesNotMatch(source, /Registra síntomas, respuesta a la carga y evolución en un espacio simple/);
});

test("Legacy platform case stores cannot receive authenticated writes", async () => {
  const migration = await read("supabase/migrations/20260825_disable_legacy_platform_case_writes.sql");
  assert.match(migration, /revoke insert, update, truncate, references, trigger[\s\S]*public\.platform_cases[\s\S]*anon, authenticated/i);
  assert.match(migration, /revoke insert, update, truncate, references, trigger[\s\S]*public\.platform_case_events[\s\S]*anon, authenticated/i);
});
