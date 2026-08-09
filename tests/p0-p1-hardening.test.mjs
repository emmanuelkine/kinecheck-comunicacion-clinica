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

test("SSO del navegador usa exclusivamente kinecheck.cl", () => {
  const relay = read("academy/app-sso-relay.js");
  const clientGuard = read("academy/academy-sso-same-origin-v1.js");
  const gateway = read("functions/api/license/sso.js");
  const headers = read("_headers");
  assert.match(relay, /const POST_URL = "\/api\/license\/sso"/);
  assert.match(clientGuard, /SAME_ORIGIN_SSO = "\/api\/license\/sso"/);
  assert.match(gateway, /KINECHECK_SSO_ORIGIN/);
  assert.match(headers, /\/academy\/\*[\s\S]*?Content-Security-Policy:\s*form-action 'self'/);
});

test("Recupera exige consentimiento expreso para datos de salud", () => {
  const relay = read("academy/app-sso-relay.js");
  const page = read("recupera/consentimiento.html");
  const policy = read("legal/privacidad.html");
  const headers = read("_headers");
  assert.match(relay, /kinecheck_recupera_health_consent_v1/);
  assert.match(page, /Consiento expresamente el tratamiento de los datos de salud/);
  assert.match(page, /type="checkbox" required/);
  assert.match(policy, /datos personales sensibles relativos a la salud/i);
  assert.match(policy, /9 de agosto de 2026/);
  assert.match(headers, /\/recupera\/consentimiento\.html[\s\S]*?Cache-Control:\s*private, no-store/);
});

test("KineCheck Clinico mantiene posicionamiento curso + guia", () => {
  const home = read("index.html");
  const professionals = read("profesionales/index.html");
  const terms = read("legal/terminos.html");
  const brand = read("docs/brand-architecture.md");
  const reposition = read("productos/product-clinico-reposition-v1.js");
  assert.match(home, /KINECHECK FORMACIÓN[\s\S]*?KineCheck Clínico/);
  assert.match(professionals, /Curso profesional avanzado de evaluación, seguridad y razonamiento musculoesquelético/);
  assert.match(professionals, /guía digital complementaria/);
  assert.doesNotMatch(professionals, /Registro kinésico profesional/);
  assert.match(terms, /KineCheck Clínico:<\/strong> curso profesional avanzado/);
  assert.match(brand, /### KineCheck Formación[\s\S]*?KineCheck Clínico/);
  assert.match(reposition, /product-family"\)\.textContent = "KINECHECK FORMACIÓN"/);
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
