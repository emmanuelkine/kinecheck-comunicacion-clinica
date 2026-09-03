import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const indexedSeoSlugs = [
  "kinecheck-clinico",
  "kinecheck-estudiante",
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

test("Recupera permanece bloqueado y el consentimiento legacy no activa el flujo", () => {
  const relay = read("academy/app-sso-relay.js");
  const page = read("recupera/consentimiento.html");
  const legacy = read("recupera/consentimiento-recupera.js");
  const policy = read("legal/privacidad.html");
  const product = read("productos/kinecheck-recupera/index.html");
  const headers = read("_headers");
  assert.match(relay, /const PRODUCTS = new Set\(\["kinecheck-estudiante"\]\)/);
  assert.match(relay, /product === PAUSED_PRODUCT[\s\S]*?fail\(PAUSED_MESSAGE\)[\s\S]*?return/);
  assert.match(page, /KineCheck Recupera permanece bloqueado/);
  assert.doesNotMatch(page, /<form|<input|<textarea|<select|<button/i);
  assert.match(legacy, /window\.name = ""/);
  assert.match(legacy, /sessionStorage\.removeItem\(HANDOFF_KEY\)/);
  assert.doesNotMatch(legacy, /location\.assign|form\?\.addEventListener/);
  assert.match(policy, /no declara un tratamiento operativo actual de datos de salud/i);
  assert.match(policy, /Última actualización:/i);
  assert.match(product, /robots" content="noindex,follow"/i);
  assert.match(product, /no está disponible/i);
  assert.match(headers, /\/recupera\/consentimiento\.html[\s\S]*?Cache-Control:\s*private, no-store/);
});

test("KineCheck Clinico mantiene posicionamiento curso + guia en su ficha canonica", () => {
  const home = read("index.html");
  const product = read("productos/kinecheck-clinico/index.html");
  const professionals = read("profesionales/index.html");
  const terms = read("legal/terminos.html");
  const brand = read("docs/brand-architecture.md");

  assert.match(home, /href="\.\/profesionales\/"/);
  assert.match(product, /curso profesional de evaluación, seguridad y razonamiento musculoesquelético con guía digital complementaria/i);
  assert.match(product, /El curso es el centro del producto; la guía digital complementaria/i);
  assert.match(product, /<link rel="canonical" href="https:\/\/kinecheck\.cl\/productos\/kinecheck-clinico\/">/);
  assert.match(professionals, /href="\.\.\/productos\/kinecheck-clinico\/"/);
  assert.match(professionals, /curso profesional avanzado de evaluación musculoesquelética, seguridad y razonamiento clínico/i);
  assert.match(professionals, /guía digital complementaria/i);
  assert.doesNotMatch(professionals, /Registro kinésico profesional/i);
  assert.match(terms, /KineCheck Clínico:<\/strong> formación profesional y guía digital complementaria/i);
  assert.match(terms, /no son fichas clínicas, sistemas de registro asistencial ni repositorios de pacientes/i);
  assert.match(brand, /### KineCheck Formación[\s\S]*?KineCheck Clínico/);
});

test("sitemap publica audiencias y fichas SEO indexables", () => {
  const sitemap = read("sitemap.xml");
  for (const route of ["profesionales", "estudiantes", "recupera"]) {
    assert.match(sitemap, new RegExp(`https://kinecheck\\.cl/${route}/`));
  }
  for (const slug of indexedSeoSlugs) {
    const url = `https://kinecheck.cl/productos/${slug}/`;
    assert.ok(sitemap.includes(url), `Falta ${url} en sitemap`);
    const html = read(`productos/${slug}/index.html`);
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), `Canonical incorrecto: ${slug}`);
    assert.match(html, /application\/ld\+json/);
  }

  const recuperaUrl = "https://kinecheck.cl/productos/kinecheck-recupera/";
  const recupera = read("productos/kinecheck-recupera/index.html");
  assert.equal(sitemap.includes(recuperaUrl), false, "La ficha noindex de Recupera no debe publicarse en sitemap");
  assert.match(recupera, /<meta name="robots" content="noindex,follow">/i);
  assert.ok(recupera.includes(`<link rel="canonical" href="${recuperaUrl}">`));
});
