import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const index = read('academy/index.html');
const homeCss = read('academy/academy-home-contract-v1.css');
const sharedCss = read('academy/academy-shared-view-contract-v1.css');
const viewFix = read('academy/academy-view-contract-fix-v1.js');
const academyUi = read('academy/academy-kinecheck-v4.js');
const ownedBridge = read('academy/academy-owned-native-bridge-v1.js');
const opener = read('academy/academy-open-v6.js');
const headers = read('_headers');

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`✖ ${message}`);
}

function ok(message) {
  console.log(`✔ ${message}`);
}

function requireIncludes(text, needle, label) {
  if (!text.includes(needle)) fail(`${label}: falta ${needle}`);
}

function openingTag(id) {
  return index.match(new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>`, 'i'))?.[0] || '';
}

const views = ['inicio', 'biblioteca', 'herramientas', 'perfil', 'explorar'];
for (const view of views) {
  const tag = openingTag(view);
  if (!tag) fail(`Falta sección principal #${view}.`);
  else if (!tag.includes(`data-kc-section="${view}"`)) {
    fail(`#${view} no declara data-kc-section="${view}".`);
  }
  if (!index.includes(`data-kc-view-link="${view}"`)) {
    fail(`No existe navegación a ${view}.`);
  }
}
ok('Contrato DOM de las cinco vistas principales verificado.');

[
  'document.querySelectorAll("[data-kc-section]")',
  'section.hidden = sectionView !== next',
  'document.querySelectorAll(".kc-primary-view")',
  'document.querySelectorAll("[data-kc-view-link]")',
  'window.addEventListener("click"',
  'applyView(',
].forEach((needle) => requireIncludes(viewFix, needle, 'Controlador de vistas'));
ok('Controlador de visibilidad y navegación presente.');

requireIncludes(index, 'id="apps-grid" class="apps-grid"', 'Recursos HTML');
requireIncludes(index, 'class="tool-grid"', 'Recursos HTML');
[
  '#dashboard-view #herramientas .apps-grid',
  '#dashboard-view #herramientas .tool-grid',
  '#dashboard-view #herramientas .kc-resource-app-card',
].forEach((needle) => requireIncludes(sharedCss, needle, 'Recursos CSS'));
[
  'renderResourceApplications',
  'document.querySelector("#apps-grid")',
  'data-kc-open-product',
].forEach((needle) => requireIncludes(viewFix, needle, 'Recursos JS'));
ok('Contrato HTML/CSS/JS de Recursos verificado.');

const homeClasses = [
  'kc-home-strip-grid',
  'kc-home-native-grid',
  'kc-home-shelf-grid',
  'kc-home-update-grid',
];
for (const className of homeClasses) {
  requireIncludes(index, `class="${className}`, 'Inicio HTML');
  requireIncludes(homeCss, `.${className}`, 'Inicio CSS');
}
ok('Contrato visual de Inicio verificado.');

const libraryClasses = ['library-tools', 'library-tabs', 'library-filter-row', 'resource-grid'];
for (const className of libraryClasses) {
  requireIncludes(index, `class="${className}`, 'Biblioteca HTML');
  requireIncludes(sharedCss, `.${className}`, 'Biblioteca CSS');
}
ok('Contrato visual de Biblioteca verificado.');

[
  '#dashboard-view #inicio.hero-panel',
  '#dashboard-view #biblioteca',
  '#dashboard-view #herramientas',
  'width:min(1450px,calc(100% - 56px))',
].forEach((needle) => requireIncludes(sharedCss, needle, 'Consistencia entre vistas'));
ok('Inicio, Biblioteca y Recursos comparten ancho y ritmo visual.');

const interactionSources = `${academyUi}\n${ownedBridge}\n${opener}`;
[
  '[data-kc-open-product]',
  'KINECHECK_OPEN_PRODUCT',
  '[data-kc-view-link]',
].forEach((needle) => requireIncludes(interactionSources, needle, 'Interacciones'));
requireIncludes(viewFix, '.topbar-brand > div > span', 'Identidad de marca');
requireIncludes(viewFix, 'textContent = "ECOSISTEMA"', 'Identidad de marca');
ok('Handlers críticos y descriptor de marca protegidos.');

const head = index.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || '';
const assetRefs = [...head.matchAll(/(?:href|src)="([^"?#]+\.(?:css|js))\?v=([^"&]+)"/g)]
  .map((match) => ({ url: match[1], version: match[2] }));

if (!assetRefs.length) {
  fail('No se detectaron assets versionados en <head>.');
} else {
  const versions = new Set(assetRefs.map((item) => item.version));
  if (versions.size !== 1) {
    fail(`Academy mezcla versiones directas de assets: ${[...versions].join(', ')}`);
  }
  for (const asset of assetRefs) {
    const file = path.normalize(path.join('academy', asset.url));
    if (!fs.existsSync(file)) fail(`Asset referenciado pero inexistente: ${asset.url}`);
  }
}
ok('Assets directos de Academy usan una sola versión y existen.');

requireIncludes(
  viewFix,
  'academy-shared-view-contract-v1.css?v=',
  'Carga del contrato visual compartido',
);
if (!fs.existsSync('academy/academy-shared-view-contract-v1.css')) {
  fail('Falta academy-shared-view-contract-v1.css');
}
ok('Contrato visual compartido está referenciado.');

[
  '/academy/index.html\n  Cache-Control: no-store, max-age=0, must-revalidate',
  '/academy/*.css\n  Cache-Control: no-store, max-age=0, must-revalidate',
  '/academy/*.js\n  Cache-Control: no-store, max-age=0, must-revalidate',
].forEach((needle) => requireIncludes(headers, needle, 'Política de caché Academy'));
ok('Academy mantiene no-store para HTML, CSS y JS.');

[
  'academy/index.html',
  'academy/academy-home-contract-v1.css',
  'academy/academy-shared-view-contract-v1.css',
  'academy/academy-view-contract-fix-v1.js',
  'academy/academy-kinecheck-v4.js',
  'academy/academy-owned-native-bridge-v1.js',
  'academy/academy-open-v6.js',
].forEach((file) => {
  if (!fs.existsSync(file)) fail(`Falta archivo UI crítico: ${file}`);
});
ok('Archivos UI críticos presentes.');

if (failures) {
  console.error(`\nAcademy UI contracts: FAILED (${failures} problema${failures === 1 ? '' : 's'})`);
  process.exit(1);
}

console.log('\nAcademy UI contracts: OK');
