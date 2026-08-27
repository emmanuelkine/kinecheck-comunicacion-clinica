import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const seoSlugs = [
  "kinecheck-clinico",
  "kinecheck-estudiante",
  "kinecheck-recupera",
  "comunicacion-clinica",
  "mas-alla-del-dolor",
  "evidencia-aplicada",
  "traumatologia-ortopedia-clinica",
  "pack-estudiante",
];

test("SSO de aplicaciones usa el dominio KineCheck sin publicar un proxy parcial", () => {
  const relay = read("academy/app-sso-relay.js");
  const relayHtml = read("academy/app-sso-relay.html");
  const config = read("academy/config.js");
  assert.equal(fs.existsSync("functions/api/license/sso.js"), false);
  assert.equal(fs.existsSync("academy/academy-sso-same-origin-v1.js"), false);
  assert.match(relay, /https:\/\/apps\.kinecheck\.cl\/api\/license\/sso/);
  assert.match(relayHtml, /form-action https:\/\/apps\.kinecheck\.cl/);
  assert.match(config, /baseUrl:\s*"https:\/\/apps\.kinecheck\.cl"/);
  assert.doesNotMatch([relay, relayHtml, config].join("\n"), /kinecheck-clinico\.emmanuelkine\.chatgpt\.site/);
});

test("Recupera permanece bloqueado sin consentimiento, checkout ni handoff", () => {
  const bootstrap = read("academy/academy-bootstrap-v28.js");
  const opener = read("academy/academy-open-v6.js");
  const relay = read("academy/app-sso-relay.js");
  const page = read("recupera/consentimiento.html");
  const blocker = read("recupera/consentimiento-recupera.js");
  const commerce = read("academy/academy-commerce-v4.js");
  const policy = read("legal/privacidad.html");
  const headers = read("_headers");
  const bootstrapRecupera = bootstrap.slice(bootstrap.indexOf('slug: "kinecheck-recupera"'), bootstrap.indexOf('slug: "comunicacion-clinica"'));
  assert.match(bootstrapRecupera, /status:\s*"preparing"/);
  assert.match(bootstrapRecupera, /url:\s*""/);
  assert.match(bootstrap, /const APPLICATIONS = new Set\(\["kinecheck-estudiante"\]\)/);
  assert.match(opener, /const APPLICATIONS = new Set\(\["kinecheck-estudiante"\]\)/);
  assert.match(opener, /if \(product === PAUSED_PRODUCT\)/);
  assert.match(relay, /const PRODUCTS = new Set\(\["kinecheck-estudiante"\]\)/);
  assert.match(relay, /if \(product === PAUSED_PRODUCT\)/);
  assert.match(page, /PRÓXIMAMENTE/);
  assert.doesNotMatch(page, /<form|type="checkbox"|Aceptar y abrir KineCheck Recupera/i);
  assert.match(blocker, /window\.name = ""/);
  assert.match(blocker, /sessionStorage\.removeItem\(HANDOFF_KEY\)/);
  assert.doesNotMatch(blocker, /localStorage\.setItem|location\.assign|form\.submit|addEventListener\("submit"/);
  assert.doesNotMatch(commerce, /"kinecheck-recupera":\s*"https:\/\/pay\.hotmart\.com/);
  assert.match(policy, /datos personales sensibles relativos a la salud/i);
  assert.match(headers, /\/recupera\/consentimiento\.html[\s\S]*?Cache-Control:\s*private, no-store/);
});

test("KineCheck Clinico mantiene posicionamiento curso + guia en su ficha canonica", () => {
  const home = read("index.html");
  const product = read("productos/kinecheck-clinico/index.html");
  const professionals = read("profesionales/index.html");
  const productCatalog = read("productos/product.js");
  const terms = read("legal/terminos.html");
  const brand = read("docs/brand-architecture.md");
  const clinicoCatalog = productCatalog.slice(productCatalog.indexOf('"kinecheck-clinico"'), productCatalog.indexOf('"kinecheck-estudiante"'));

  assert.match(home, /href="\.\/productos\/kinecheck-clinico\/"[\s\S]*?KineCheck Clínico/);
  assert.match(product, /curso profesional de evaluación, seguridad y razonamiento musculoesquelético con guía digital complementaria/i);
  assert.match(product, /El curso es el centro del producto; la guía digital complementaria/i);
  assert.match(product, /<link rel="canonical" href="https:\/\/kinecheck\.cl\/productos\/kinecheck-clinico\/">/);
  assert.match(professionals, /curso profesional avanzado de evaluación musculoesquelética, seguridad y razonamiento clínico/i);
  assert.match(professionals, /guía digital complementaria/i);
  assert.doesNotMatch(professionals, /Registro kinésico profesional/i);
  assert.match(clinicoCatalog, /family:\s*"KineCheck Formación"/);
  assert.match(clinicoCatalog, /Producto educativo\. No ingreses datos reales identificables de pacientes/i);
  assert.doesNotMatch(clinicoCatalog, /Registro kinésico profesional|¿Puede usarse con pacientes reales\?|Sí, siempre que registres/i);
  assert.match(terms, /KineCheck Clínico:<\/strong> curso profesional avanzado/i);
  assert.match(brand, /### KineCheck Formación[\s\S]*?KineCheck Clínico/);
});

test("sitemap publica audiencias y fichas SEO canonicas", () => {
  const sitemap = read("sitemap.xml");
  for (const route of ["profesionales", "estudiantes", "recupera"]) {
    assert.match(sitemap, new RegExp(`https://kinecheck\\.cl/${route}/`));
  }
  for (const slug of seoSlugs) {
    const url = `https://kinecheck.cl/productos/${slug}/`;
    assert.ok(sitemap.includes(url), `Falta ${url} en sitemap`);
    const html = read(`productos/${slug}/index.html`);
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), `Canonical incorrecto: ${slug}`);
    assert.match(html, /application\/ld\+json/);
  }
});
