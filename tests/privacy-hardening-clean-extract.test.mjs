import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Recupera queda Próximamente y sin rutas activas en Academy", async () => {
  const [config, bootstrap, core, opener, relay, commerce] = await Promise.all([
    read("academy/config.js"),
    read("academy/academy-bootstrap-v28.js"),
    read("academy/academy-v39.js"),
    read("academy/academy-open-v6.js"),
    read("academy/app-sso-relay.js"),
    read("academy/academy-commerce-v4.js"),
  ]);

  for (const source of [config, bootstrap]) {
    assert.match(source, /slug:\s*"kinecheck-recupera"[\s\S]*?status:\s*"preparing"[\s\S]*?url:\s*""[\s\S]*?ssoProduct:\s*""/);
    assert.doesNotMatch(source, /sso\.html\?product=kinecheck-recupera/);
  }
  assert.match(core, /const SSO_PRODUCTS = new Set\(\["kinecheck-estudiante"\]\)/);
  assert.match(core, /if \(slug === PAUSED_PRODUCT\)[\s\S]*?return/);
  assert.match(opener, /const APPLICATIONS = new Set\(\["kinecheck-estudiante"\]\)/);
  assert.match(relay, /const PRODUCTS = new Set\(\["kinecheck-estudiante"\]\)/);
  assert.match(relay, /if \(product === PAUSED_PRODUCT\)[\s\S]*?fail\(PAUSED_MESSAGE\)[\s\S]*?return/);
  assert.match(commerce, /"kinecheck-recupera"\s*:\s*"https:\/\/pay\.hotmart\.com\/P106806251E"/);
  assert.match(commerce, /if \(slug === PAUSED_PRODUCT\)[\s\S]*?return/);
});

test("el POST SSO productivo de Estudiante permanece intacto", async () => {
  const [core, relay] = await Promise.all([
    read("academy/academy-v39.js"),
    read("academy/app-sso-relay.js"),
  ]);
  const submit = core.slice(core.indexOf("function submitSsoAccess"), core.indexOf("async function openCourse"));
  assert.match(core, /const SSO_ENDPOINT = "https:\/\/kinecheck-clinico\.emmanuelkine\.chatgpt\.site\/api\/license\/sso"/);
  assert.match(submit, /ssoForm\.method = "post"/);
  assert.match(submit, /ssoForm\.action = SSO_ENDPOINT/);
  assert.match(submit, /ssoForm\.submit\(\)/);
  assert.doesNotMatch(submit, /window\.name|app-sso-relay\.html/);
  assert.match(relay, /const POST_URL = "https:\/\/apps\.kinecheck\.cl\/api\/license\/sso"/);
  assert.match(relay, /form\.method = "POST"[\s\S]*?form\.action = POST_URL[\s\S]*?form\.submit\(\)/);
});

test("las superficies públicas y el consentimiento legacy no activan Recupera", async () => {
  const [home, audience, product, consent, consentJs] = await Promise.all([
    read("index.html"),
    read("recupera/index.html"),
    read("productos/kinecheck-recupera/index.html"),
    read("recupera/consentimiento.html"),
    read("recupera/consentimiento-recupera.js"),
  ]);
  for (const source of [home, audience, product, consent]) assert.match(source, /Próximamente|PRÓXIMAMENTE|permanece bloqueado/);
  for (const source of [audience, product, consent]) assert.doesNotMatch(source, /pay\.hotmart\.com|Comprar|Activar|Aceptar y abrir/i);
  assert.doesNotMatch(consent, /<form|<input|<textarea|<select|<button/i);
  assert.match(consentJs, /window\.name = ""/);
  assert.match(consentJs, /sessionStorage\.removeItem\(HANDOFF_KEY\)/);
  assert.doesNotMatch(consentJs, /location\.assign|localStorage\.setItem|addEventListener\("submit"/);
});

test("Clínico y Estudiante declaran uso educativo y bloquean identificadores reales", async () => {
  const [guard, guide, portal, products, terms, privacy] = await Promise.all([
    read("kinecheck-clinico-guia/privacy-guard-v1.js"),
    read("kinecheck-clinico-guia/index.html"),
    read("portal-estudiantes/index.html"),
    read("productos/product.js"),
    read("legal/terminos.html"),
    read("legal/privacidad.html"),
  ]);
  assert.match(guide, /privacy-guard-v1\.js/);
  assert.match(guard, /información ficticia, simulada o debidamente anonimizada/);
  for (const token of ["nombre", "RUT", "teléfono", "correo", "número de ficha"]) assert.match(guard, new RegExp(token, "i"));
  assert.match(guard, /Documento educativo — no corresponde a una ficha clínica/);
  assert.match(guard, /beforeprint/);
  assert.match(portal, /Uso educativo y privacidad/);
  assert.match(portal, /No ingreses nombres, RUT, teléfonos, correos, números de ficha ni información de pacientes reales/);
  assert.doesNotMatch(portal, /placeholder="[^"]*experiencias clínicas/i);
  assert.match(products, /Producto educativo/);
  assert.match(products, /no sustituye la ficha clínica institucional/i);
  for (const source of [terms, privacy]) assert.match(source, /ficticios, simulados o debidamente anonimizados/i);
});
