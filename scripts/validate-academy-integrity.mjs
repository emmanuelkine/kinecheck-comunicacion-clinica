import fs from 'node:fs';

const bootstrap = fs.readFileSync('academy/academy-bootstrap-v28.js', 'utf8');
const opener = fs.readFileSync('academy/academy-open-v6.js', 'utf8');

function fail(message) {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
}
function ok(message) { console.log(`✔ ${message}`); }

const courseBlocks = [...bootstrap.matchAll(/\{\s*slug:\s*"([^"]+)"([\s\S]*?)\n\s*\}/g)]
  .map((m) => ({ slug: m[1], body: m[2] }));

if (!courseBlocks.length) fail('No se pudo leer el catálogo de Academy.');

const active = courseBlocks.filter(({ body }) => /status:\s*"active"/.test(body));
const preparing = courseBlocks.filter(({ body }) => /status:\s*"preparing"/.test(body));
const seen = new Set();

for (const course of courseBlocks) {
  if (seen.has(course.slug)) fail(`Slug duplicado en catálogo: ${course.slug}`);
  seen.add(course.slug);
}
ok(`${courseBlocks.length} productos con slugs únicos.`);

const recognized = new Set();
for (const m of opener.matchAll(/"([a-z0-9-]+)"\s*:/g)) recognized.add(m[1]);
for (const m of opener.matchAll(/APPLICATIONS\s*=\s*new Set\(\[([^\]]+)\]/g)) {
  for (const q of m[1].matchAll(/"([a-z0-9-]+)"/g)) recognized.add(q[1]);
}

for (const course of active) {
  if (!/url:\s*"[^\"]+"/.test(course.body)) fail(`Producto activo sin URL: ${course.slug}`);
  if (!/productId:\s*"[^\"]+"/.test(course.body)) fail(`Producto activo sin productId: ${course.slug}`);
  if (!recognized.has(course.slug)) fail(`Producto activo fuera del opener unificado: ${course.slug}`);
}
ok(`${active.length} productos activos están cubiertos por el opener unificado.`);

for (const slug of ['banderas-clinicas', 'ejercicio-terapeutico']) {
  const course = active.find((item) => item.slug === slug);
  if (!course) fail(`Curso disponible requerido no está activo: ${slug}`);
  if (!recognized.has(slug)) fail(`Curso disponible requerido fuera del opener: ${slug}`);
}
ok('Banderas Clínicas y Ejercicio Terapéutico permanecen disponibles en Academy.');

for (const course of preparing) {
  if (recognized.has(course.slug)) fail(`Producto en preparación expuesto por opener: ${course.slug}`);
}
ok(`${preparing.length} productos en preparación permanecen fuera del opener.`);

const external = [...opener.matchAll(/"([a-z0-9-]+)"\s*:\s*`https:\/\/[^`]+`/g)].map((m) => m[1]);
for (const slug of external) {
  if (!active.some((course) => course.slug === slug)) fail(`Ruta externa sin producto activo asociado: ${slug}`);
}
ok(`${external.length} rutas externas están asociadas a productos activos.`);

const duplicateProductIds = new Map();
for (const course of active) {
  const id = course.body.match(/productId:\s*"([^"]+)"/)?.[1];
  if (!id || id === 'PROPIETARIO') continue;
  const items = duplicateProductIds.get(id) || [];
  items.push(course.slug);
  duplicateProductIds.set(id, items);
}
for (const [id, slugs] of duplicateProductIds) {
  if (slugs.length > 1) {
    const allowed = id === '8150019' && slugs.includes('kinecheck-clinico') && slugs.includes('kinecheck-clinico-curso');
    if (!allowed) fail(`productId ${id} está asociado a múltiples slugs: ${slugs.join(', ')}`);
  }
}
ok('No hay colisiones comerciales inesperadas en productId.');

const requiredFiles = [
  'academy/app-sso-relay.html',
  'academy/app-sso-relay.js',
  'academy/academy-personalization-v1.js',
  'academy/dolor-musculoesqueletico-relay.html',
  'academy/dolor-lumbar-persistente/index.html',
  'academy/ejercicio-terapeutico/index.html',
  'banderas-clinicas/index.html',
  'comunicacion-clinica.html',
  'traumatologia/index.html',
  'kinecheck-clinico-curso/index.html',
  'kinecheck-clinico-guia/index.html',
];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`Falta archivo crítico: ${file}`);
}
ok('Archivos críticos de acceso presentes.');

if (process.exitCode) {
  console.error('\nAcademy integrity: FAILED');
  process.exit(process.exitCode);
}
console.log('\nAcademy integrity: OK');
