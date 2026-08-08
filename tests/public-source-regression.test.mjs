import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const read = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const count = (source, token) => source.split(token).length - 1;

const PUBLIC_HTML_DIRECTORIES = [
  "profesionales",
  "estudiantes",
  "recupera",
  "productos",
  "legal",
  "beta",
  "ayuda",
  "soporte",
  "bienvenida",
  "kinecheck",
];

const CANONICAL_ACCESS_PAGES = [
  "index.html",
  "profesionales/index.html",
  "estudiantes/index.html",
  "recupera/index.html",
  "productos/index.html",
  "legal/terminos.html",
  "legal/privacidad.html",
  "legal/reembolsos.html",
  "beta/index.html",
  "ayuda/index.html",
  "soporte/index.html",
  "bienvenida/index.html",
  "404.html",
];

async function publicHtmlPaths() {
  const files = ["index.html", "404.html"];

  async function visit(directory) {
    const entries = await readdir(new URL(`../${directory}/`, import.meta.url), { withFileTypes: true });
    for (const entry of entries) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await visit(relative);
      else if (entry.isFile() && entry.name.endsWith(".html")) files.push(relative);
    }
  }

  for (const directory of PUBLIC_HTML_DIRECTORIES) await visit(directory);
  return [...new Set(files)].sort();
}

const PRODUCT_CHECKOUTS = [
  ["kinecheck-clinico", "https://pay.hotmart.com/L106791841D"],
  ["kinecheck-estudiante", "https://pay.hotmart.com/G106801166S"],
  ["kinecheck-recupera", "https://pay.hotmart.com/P106806251E"],
  ["comunicacion-clinica", "https://pay.hotmart.com/T106883983U"],
  ["mas-alla-del-dolor", "https://pay.hotmart.com/W106888386Q"],
  ["evidencia-aplicada", "https://pay.hotmart.com/F106921972I"],
  ["traumatologia-ortopedia-clinica", "https://pay.hotmart.com/B106913952R"],
  ["pack-estudiante", "https://pay.hotmart.com/Q106891608M"],
];

const PRODUCT_FAMILIES = [
  ["kinecheck-clinico", "KineCheck Apps"],
  ["kinecheck-estudiante", "KineCheck Apps"],
  ["kinecheck-recupera", "KineCheck Apps"],
  ["comunicacion-clinica", "KineCheck Formación"],
  ["mas-alla-del-dolor", "KineCheck Formación"],
  ["evidencia-aplicada", "KineCheck Formación"],
  ["traumatologia-ortopedia-clinica", "KineCheck Formación"],
  ["pack-estudiante", "KineCheck Packs"],
];

const OFFICIAL_COMMERCE = [
  { slug: "kinecheck-clinico", name: "KineCheck Clínico", productId: "8150019", price: 39990, display: "$39.990", term: "12 meses" },
  { slug: "kinecheck-estudiante", name: "KineCheck Estudiante", productId: "8154796", price: 14990, display: "$14.990", term: "12 meses" },
  { slug: "kinecheck-recupera", name: "KineCheck Recupera", productId: "8157431", price: 9990, display: "$9.990", term: "3 meses" },
  { slug: "comunicacion-clinica", name: "Comunicación Clínica", productId: "8192814", price: 19900, display: "$19.900", term: "12 meses" },
  { slug: "mas-alla-del-dolor", name: "Más allá del dolor", productId: "8194777", price: 39990, display: "$39.990", term: "12 meses" },
  { slug: "evidencia-aplicada", name: "Evidencia Aplicada", productId: "8208817", price: 29990, display: "$29.990", term: "12 meses" },
  { slug: "traumatologia-ortopedia-clinica", name: "Traumatología y Ortopedia Clínica", productId: "8205453", price: 35900, display: "$35.900", term: "12 meses" },
  { slug: "pack-estudiante", name: "Pack KineCheck Estudiante", productId: "8195982", price: 49900, display: "$49.900", term: "12 meses" },
];

function assertOpenGraph(source, url) {
  for (const property of ["og:type", "og:locale", "og:site_name", "og:title", "og:description", "og:url"]) {
    assert.ok(source.includes(`property="${property}"`), `falta ${property}`);
  }
  assert.ok(source.includes(`property="og:url" content="${url}"`), `og:url incorrecta para ${url}`);
}

function assertAccessiblePublicShell(source) {
  assert.ok(source.includes('class="skip-link" href="#contenido"'), "falta enlace para saltar al contenido");
  assert.ok(source.includes('aria-expanded="false"'), "el menú no expone su estado inicial");
  assert.ok(source.includes('aria-label="Abrir menú"'), "el menú no tiene nombre accesible");
  assert.ok(source.includes('aria-controls="public-navigation"'), "el menú no identifica la navegación controlada");
  assert.ok(source.includes('aria-label="Navegación principal"'), "la navegación principal no está etiquetada");
  assert.equal(count(source, "<h1"), 1, "la página debe tener un único h1");
}

test("la portada conserva soporte, precios y accesos canónicos", async () => {
  const home = await read("index.html");
  assert.ok(home.includes('href="mailto:soporte.kinecheck@gmail.com"'));
  assert.ok(!home.includes('data-support-email href="#"'));
  for (const price of ["$39.990 CLP", "$14.990 CLP", "$9.990 CLP"]) assert.ok(home.includes(price));
  assert.ok(!home.includes("20260806-final5"));
  assertAccessiblePublicShell(home);
  assert.equal(count(home, 'class="icon" aria-hidden="true"'), 3, "los emojis de perfil deben ser decorativos");
});

test("ninguna superficie pública visible usa /platform/ ni CTAs vacíos", async () => {
  for (const path of await publicHtmlPaths()) {
    const source = await read(path);
    const legacyHrefs = [...source.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])([^"']*\/platform\/?[^"']*)\1/gi)].map((match) => match[2]);
    assert.deepEqual(legacyHrefs, [], `${path}: contiene acceso visible directo a /platform/`);
    assert.doesNotMatch(source, /<a\b[^>]*\bhref\s*=\s*(["'])#\1/gi, `${path}: contiene href="#"`);
    assert.doesNotMatch(source, /ECOSISTEMA CLÍNICO/i, `${path}: conserva el descriptor global retirado`);
  }

  for (const path of CANONICAL_ACCESS_PAGES) {
    const source = await read(path);
    assert.match(source, /<a\b[^>]*\bhref\s*=\s*(["'])[^"']*academy\/[^"']*\1/i, `${path}: falta un acceso público directo a /academy/`);
  }

  const manifest = await read("site.webmanifest");
  assert.ok(manifest.includes('"start_url": "/academy/"'), "el manifiesto debe iniciar en la ruta canónica");
  assert.ok(!manifest.includes('"start_url": "/platform/"'), "el manifiesto no debe depender de la compatibilidad histórica");
});

test("la arquitectura oficial de marca está explícita y es consistente", async () => {
  const home = await read("index.html");
  assert.equal(count(home, 'class="brand-family-card"'), 3, "la portada debe mostrar tres familias");
  for (const family of ["KINECHECK APPS", "KINECHECK FORMACIÓN", "KINECHECK PACKS"]) assert.ok(home.includes(family));
  for (const name of ["KineCheck Clínico", "KineCheck Estudiante", "KineCheck Recupera", "Comunicación Clínica", "Más allá del Dolor", "Evidencia Aplicada", "Traumatología y Ortopedia Clínica", "Pack KineCheck Estudiante"]) assert.ok(home.includes(name));

  const professionals = await read("profesionales/index.html");
  assert.equal(count(professionals, "KINECHECK APPS"), 1);
  assert.equal(count(professionals, "KINECHECK FORMACIÓN · POR KINECHECK"), 6);
  assert.equal(count(professionals, "PRÓXIMAMENTE"), 2);
  assert.ok(professionals.includes("Banderas Clínicas"));
  assert.ok(professionals.includes("Dolor Lumbar"));

  const students = await read("estudiantes/index.html");
  assert.equal(count(students, "KINECHECK APPS"), 1);
  assert.equal(count(students, "KINECHECK PACKS"), 1);
  assert.equal(count(students, "KINECHECK FORMACIÓN · POR KINECHECK"), 2);

  const recovery = await read("recupera/index.html");
  assert.ok(recovery.includes("KINECHECK APPS"));

  const productPage = await read("productos/index.html");
  assert.ok(productPage.includes('id="product-family">KINECHECK APPS'));
  const productScript = await read("productos/product.js");
  for (const [slug, family] of PRODUCT_FAMILIES) {
    const block = new RegExp(`"${slug}"\\s*:\\s*\\{[\\s\\S]*?family:\\s*"${family}"`);
    assert.match(productScript, block, `${slug}: familia incorrecta`);
  }

  for (const path of ["index.html", "profesionales/index.html", "estudiantes/index.html", "recupera/index.html", "productos/index.html", "404.html", "legal/terminos.html", "legal/privacidad.html", "legal/reembolsos.html"]) {
    const source = await read(path);
    assert.ok(!source.includes("ECOSISTEMA CLÍNICO"), `${path}: conserva descriptor global antiguo`);
    assert.ok(source.includes("SALUD MUSCULOESQUELÉTICA"), `${path}: falta descriptor global vigente`);
  }
  const manifest = await read("site.webmanifest");
  assert.ok(manifest.includes('"name": "KineCheck Salud Musculoesquelética"'));

  const brandArchitecture = await read("docs/brand-architecture.md");
  for (const family of ["KineCheck Apps", "KineCheck Formación", "KineCheck Packs"]) assert.ok(brandArchitecture.includes(family));
  for (const name of ["KineCheck Clínico", "KineCheck Estudiante", "KineCheck Recupera", "Comunicación Clínica", "Más allá del Dolor", "Evidencia Aplicada", "Traumatología y Ortopedia Clínica", "Pack KineCheck Estudiante"]) assert.ok(brandArchitecture.includes(name));
  assert.ok(brandArchitecture.includes("SALUD MUSCULOESQUELÉTICA"));
  assert.ok(brandArchitecture.includes("No usar **ECOSISTEMA CLÍNICO**"));
});

test("precios, vigencias y ocho IDs Hotmart conservan el contrato oficial", async () => {
  const priceData = JSON.parse(await read("commercial-prices-cl.json"));
  assert.equal(priceData.country, "Chile");
  assert.equal(priceData.currency, "CLP");
  assert.equal(Object.keys(priceData.products || {}).length, 8);

  for (const expected of OFFICIAL_COMMERCE) {
    const actual = priceData.products[expected.slug];
    assert.deepEqual(
      { name: actual?.name, price: actual?.price, display: actual?.display, term: actual?.term },
      { name: expected.name, price: expected.price, display: expected.display, term: expected.term },
      `${expected.slug}: cambió precio o vigencia oficial`,
    );
  }

  const grants = await read("supabase/seeds/20260729_hotmart_product_grants.sql");
  const actualProductIds = [...new Set([...grants.matchAll(/\((\d{7}),/g)].map((match) => match[1]))].sort();
  const expectedProductIds = OFFICIAL_COMMERCE.map(({ productId }) => productId).sort();
  assert.deepEqual(actualProductIds, expectedProductIds, "cambiaron los ocho IDs Hotmart oficiales");

  const certification = await read("docs/qa/hotmart-8-product-certification.md");
  for (const { productId } of OFFICIAL_COMMERCE) assert.ok(certification.includes(productId), `falta ID Hotmart ${productId} en la matriz de certificación`);
  for (const [, checkout] of PRODUCT_CHECKOUTS) assert.ok(certification.includes(checkout), `falta checkout ${checkout} en la matriz de certificación`);
});

test("los perfiles publican precios, Open Graph y acceso directo a Academy", async () => {
  const cases = [
    ["profesionales/index.html", "https://kinecheck.cl/profesionales/", 5],
    ["estudiantes/index.html", "https://kinecheck.cl/estudiantes/", 4],
    ["recupera/index.html", "https://kinecheck.cl/recupera/", 1],
  ];

  for (const [path, url, priceCount] of cases) {
    const source = await read(path);
    assert.equal(count(source, 'class="price"'), priceCount, `${path}: cantidad de precios incorrecta`);
    assertOpenGraph(source, url);
    assertAccessiblePublicShell(source);
    assert.ok(source.includes('href="../academy/"'), `${path}: falta acceso a Academy`);
    assert.ok(!source.includes("../platform/"), `${path}: conserva acceso público intermedio`);
  }

  const professionals = await read("profesionales/index.html");
  assert.ok(!professionals.includes("Ver curso"));
  assert.ok(professionals.includes("estructurar la evaluación musculoesquelética"));
  assert.ok(professionals.includes("hacer explícito el razonamiento clínico"));

  const students = await read("estudiantes/index.html");
  assert.ok(students.includes("RECOMENDADO"));
  assert.ok(!students.includes("PRODUCTO PRINCIPAL"));

  const recovery = await read("recupera/index.html");
  assert.ok(recovery.includes("$9.990 CLP"));
  assert.ok(recovery.includes("Acceso por 3 meses"));
  assert.ok(recovery.includes("No diagnostica ni reemplaza una evaluación profesional"));
});

test("Productos entrega un fallback clínico útil sin JavaScript", async () => {
  const page = await read("productos/index.html");
  const headers = await read("_headers");
  assertOpenGraph(page, "https://kinecheck.cl/productos/");
  assert.ok(page.includes('<link rel="canonical" href="https://kinecheck.cl/productos/">'));
  assert.ok(page.includes("KineCheck</em> Clínico"));
  assert.ok(page.includes("12 meses desde la aprobación"));
  assert.ok(page.includes("Kinesiólogos titulados"));
  assert.ok(page.includes('data-checkout href="https://pay.hotmart.com/L106791841D"'));
  assert.ok(page.includes('data-access href="../academy/"'));
  assert.ok(!page.includes('data-checkout href="#"'));
  assert.ok(!page.includes("../platform/"));
  assert.ok(!page.includes("frame-ancestors"), "frame-ancestors no es efectivo en una meta CSP");
  assert.match(headers, /\/productos\/\*[\s\S]*?Content-Security-Policy:\s*frame-ancestors 'none'/, "falta frame-ancestors efectivo para /productos/*");
});

test("la hidratación conserva ocho checkouts y acceso canónico", async () => {
  const product = await read("productos/product.js");
  for (const [slug, checkout] of PRODUCT_CHECKOUTS) {
    assert.ok(product.includes(`"${slug}"`), `falta slug ${slug}`);
    assert.ok(product.includes(checkout), `checkout incorrecto para ${slug}`);
  }
  assert.ok(product.includes('const ACCESS_URL = "../academy/"'));
  assert.ok(!product.includes("../platform/"));
  assert.ok(product.includes('meta[property="og:title"]'));
  assert.ok(product.includes('meta[property="og:description"]'));
});

test("las rutas de compatibilidad siguen siendo redirecciones", async () => {
  const platform = await read("platform/index.html");
  const platformScript = await read("platform/redirect-to-mi-kinecheck-v1.js");
  assert.ok(platform.includes('http-equiv="refresh" content="2;url=../academy/"'));
  assert.ok(platform.includes('name="robots" content="noindex,nofollow"'));
  assert.ok(!platform.includes('id="login-view"'), "/platform/ no debe alojar una aplicación independiente");
  assert.ok(platformScript.includes('new URL("../academy/"'));

  const legacyRoutes = [
    ["kinecheck/index.html", "../#productos"],
    ["kinecheck/profesionales/index.html", "../../profesionales/"],
    ["kinecheck/estudiantes/index.html", "../../estudiantes/"],
    ["kinecheck/recupera/index.html", "../../recupera/"],
  ];
  for (const [path, destination] of legacyRoutes) {
    const source = await read(path);
    assert.ok(source.includes(`url=${destination}`), `${path}: meta redirect incorrecta`);
    assert.ok(source.includes(`href="${destination}"`), `${path}: fallback incorrecto`);
  }
});

test("la política conserva la advertencia sin certificación de ocho garantías", async () => {
  const refunds = await read("legal/reembolsos.html");
  const certification = await read("docs/qa/hotmart-8-product-certification.md");
  assert.ok(refunds.includes("Pendiente de certificación comercial"));
  assert.ok(certification.includes("captura de la garantía mostrada en checkout"));
  assert.ok(certification.includes("Confirmar plazo de garantía mostrado al comprador"));
});

test("el dashboard RC separa evidencia automatizada de validación comercial real", async () => {
  const dashboard = await read("admin/index.html");
  for (const token of [
    "origin/main",
    "PR #33",
    "4a1e3e3",
    "Beta controlada · APTA",
    "Lanzamiento público limitado · PENDIENTE DE VALIDACIÓN COMERCIAL REAL",
    "Lanzamiento masivo · NO CERTIFICADO",
    "Automatizado y verificado",
    "Validación comercial y humana",
    "Compra Hotmart real",
    "Prueba de penetración autorizada",
  ]) assert.ok(dashboard.includes(token), `dashboard: falta ${token}`);

  const protocol = await read("docs/release-commercial-validation.md");
  for (const caseName of [
    "Caso A — KineCheck Clínico",
    "Caso B — Curso",
    "Caso C — Pack KineCheck Estudiante",
    "Caso D — Correo incorrecto",
    "Caso E — Reembolso",
    "Caso F — Chargeback o cancelación",
  ]) assert.ok(protocol.includes(caseName), `protocolo comercial: falta ${caseName}`);
  for (const field of ["Fecha", "Correo anonimizado", "Producto", "`transaction_id` anonimizado", "Resultado esperado", "Resultado observado", "PASS/FAIL", "Evidencia", "Observaciones"]) {
    assert.ok(protocol.includes(field), `protocolo comercial: falta campo ${field}`);
  }
  assert.ok(protocol.includes("**Estado inicial:** NO EJECUTADO"));
  assert.ok(!protocol.includes("| PASS |"), "el protocolo no debe afirmar casos reales aprobados sin evidencia");
});

test("los estilos y el menú conservan foco visible y teclado", async () => {
  const siteCss = await read("kinecheck/site-v5.css");
  const productCss = await read("productos/product.css");
  const siteJs = await read("kinecheck/site-v5.js");
  assert.ok(siteCss.includes("a:focus-visible,button:focus-visible,summary:focus-visible"));
  assert.ok(productCss.includes("a:focus-visible,button:focus-visible,summary:focus-visible"));
  assert.ok(siteCss.includes("min-width:44px;min-height:44px"));
  assert.ok(siteJs.includes("event.key==='Escape'"));
  assert.ok(siteJs.includes("button.setAttribute('aria-label','Abrir menú')"));
});
