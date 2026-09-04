import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const count = (source, token) => source.split(token).length - 1;

test("la portada canónica conserva navegación, accesibilidad y rutas públicas", async () => {
  const home = await read("index.html");

  assert.ok(home.includes('class="skip-link" href="#contenido"'), "falta skip-link");
  assert.ok(home.includes('aria-expanded="false"'), "el menú no expone su estado inicial");
  assert.ok(home.includes('aria-label="Abrir menú"'), "el menú no tiene nombre accesible");
  assert.ok(home.includes('aria-controls="public-navigation"'), "el menú no identifica la navegación");
  assert.ok(home.includes('aria-label="Navegación principal"'), "falta etiqueta de navegación");
  assert.equal(count(home, "<h1"), 1, "la portada debe tener un único h1");

  assert.ok(home.includes('property="og:url" content="https://kinecheck.cl/"'), "og:url incorrecta");
  assert.ok(home.includes('<link rel="canonical" href="https://kinecheck.cl/">'), "canonical incorrecta");

  assert.equal(count(home, 'class="audience-card'), 3, "deben existir tres rutas de perfil");
  assert.equal(count(home, 'class="profile-icon"'), 3, "cada perfil debe conservar su icono textual");
  for (const href of ["./profesionales/", "./estudiantes/", "./recupera/", "./demo/", "./academy/", "./metodologia/", "./soporte/"]) {
    assert.ok(home.includes(`href="${href}"`), `falta ruta pública ${href}`);
  }
  assert.ok(!home.includes('/platform/'), "la portada no debe enlazar a /platform/");
  assert.equal(count(home, 'class="price"'), 0, "la portada no debe duplicar precios ni checkouts");
});

test("la portada conserva exactamente seis testimonios anónimos con rating visual accesible", async () => {
  const home = await read("index.html");
  const css = await read("home-public-v1.css");
  const js = await read("kinecheck/site-v5.js");

  assert.equal(count(home, '<article class="kc-testimonial">'), 6, "deben existir exactamente 6 testimonios");
  assert.equal(count(home, 'class="kc-stars"'), 6, "cada testimonio debe mostrar su rating");
  assert.equal(count(home, "★★★★★"), 6, "cada testimonio debe mostrar cinco estrellas");
  assert.equal(count(home, 'aria-label="5 de 5 estrellas"'), 6, "cada rating debe tener nombre accesible");
  assert.equal(count(home, '<strong>Beta tester profesional</strong>') + count(home, '<strong>Beta tester estudiante</strong>'), 6, "solo deben usarse etiquetas beta genéricas");
  assert.ok(home.includes("no se publican nombres, apellidos, correos electrónicos, instituciones ni otros datos de identificación o contacto"), "falta aviso de privacidad de testimonios");

  assert.ok(css.includes('color:var(--kc-gold,#ffd17d)'), "las estrellas deben usar el tono dorado premium");
  assert.ok(!css.includes('.kc-stars{display:none!important}'), "las estrellas no deben quedar ocultas por CSS");
  assert.ok(!js.includes("document.querySelectorAll('.kc-stars').forEach(stars=>stars.remove())"), "el runtime no debe eliminar el rating");
});

test("la portada referencia assets críticos existentes y versionados", async () => {
  const home = await read("index.html");
  for (const asset of [
    "./assets/kinecheck-mark.svg",
    "./kinecheck/site-v5.css?v=7",
    "./kinecheck/site-premium-v1.css?v=1",
    "./home-public-v1.css?v=20260904-stars1",
    "./kinecheck/site-v5.js?v=8",
    "./metrics-v1.js?v=20260902-commercial1",
  ]) {
    assert.ok(home.includes(asset), `falta asset crítico ${asset}`);
  }
});
