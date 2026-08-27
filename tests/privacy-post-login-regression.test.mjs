import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Recupera is blocked by the authenticated SSO relay", async () => {
  const [relay, bootstrap, opener, bridge, commerce] = await Promise.all([
    read("academy/app-sso-relay.js"),
    read("academy/academy-bootstrap-v28.js"),
    read("academy/academy-open-v6.js"),
    read("academy/academy-owned-native-bridge-v1.js"),
    read("academy/academy-commerce-v4.js"),
  ]);
  assert.match(relay, /const PRODUCTS = new Set\(\["kinecheck-estudiante"\]\)/);
  assert.match(relay, /const PAUSED_PRODUCT = "kinecheck-recupera"/);
  assert.match(relay, /if \(product === PAUSED_PRODUCT\) \{\s*fail\(PAUSED_MESSAGE\);\s*return;/);
  assert.doesNotMatch(relay, /privacy_consent_version/);
  const fallback = bootstrap.slice(bootstrap.indexOf('slug: "kinecheck-recupera"'), bootstrap.indexOf('slug: "comunicacion-clinica"'));
  assert.match(fallback, /status:\s*"preparing"/);
  assert.match(fallback, /url:\s*""/);
  assert.match(bootstrap, /const APPLICATIONS = new Set\(\["kinecheck-estudiante"\]\)/);
  assert.match(opener, /const APPLICATIONS = new Set\(\["kinecheck-estudiante"\]\)/);
  assert.match(opener, /if \(product === PAUSED_PRODUCT\)/);
  assert.match(bridge, /pausedControl/);
  assert.match(bridge, /pausedControl\.disabled = true/);
  assert.doesNotMatch(commerce, /"kinecheck-recupera":\s*"https:\/\/pay\.hotmart\.com/);
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

test("Legacy Recupera consent route cannot collect data or resume a handoff", async () => {
  const [page, blocker] = await Promise.all([
    read("recupera/consentimiento.html"),
    read("recupera/consentimiento-recupera.js"),
  ]);
  assert.match(page, /PRÓXIMAMENTE/);
  assert.doesNotMatch(page, /<form|<input|<textarea|Aceptar y abrir KineCheck Recupera/i);
  assert.match(blocker, /window\.name = ""/);
  assert.match(blocker, /sessionStorage\.removeItem\(HANDOFF_KEY\)/);
  assert.doesNotMatch(blocker, /localStorage\.setItem|location\.assign|form\.submit|addEventListener\("submit"/);
});

test("Student free-text intake warns against patient identifiers at each field", async () => {
  const source = await read("portal-estudiantes/index.html");
  assert.match(source, /Uso educativo y privacidad/);
  assert.match(source, /No ingreses nombres, RUT, teléfonos, correos, números de ficha ni información de pacientes reales/);
  assert.match(source, /id="expectationsPrivacy"/);
  assert.match(source, /aria-describedby="expectationsPrivacy expectationsError"/);
  assert.match(source, /id="experiencePrivacy"/);
  assert.match(source, /aria-describedby="experiencePrivacy experienceError"/);
  assert.doesNotMatch(source, /placeholder="[^"]*experiencias clínicas/i);
});

test("Legacy platform case stores cannot receive authenticated writes", async () => {
  const migration = await read("supabase/migrations/20260825_disable_legacy_platform_case_writes.sql");
  assert.match(migration, /revoke insert, update, truncate, references, trigger[\s\S]*public\.platform_cases[\s\S]*anon, authenticated/i);
  assert.match(migration, /revoke insert, update, truncate, references, trigger[\s\S]*public\.platform_case_events[\s\S]*anon, authenticated/i);
});
