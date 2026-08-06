import fs from "node:fs/promises";

const baseUrl = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const products = [
  ["kinecheck-clinico", "KineCheck Clínico", "https://pay.hotmart.com/L106791841D", 39990],
  ["kinecheck-estudiante", "KineCheck Estudiante", "https://pay.hotmart.com/G106801166S", 14990],
  ["kinecheck-recupera", "KineCheck Recupera", "https://pay.hotmart.com/P106806251E", 9990],
  ["comunicacion-clinica", "Comunicación Clínica", "https://pay.hotmart.com/T106883983U", 19900],
  ["mas-alla-del-dolor", "Más allá del dolor", "https://pay.hotmart.com/W106888386Q", 39990],
  ["evidencia-aplicada", "Evidencia Aplicada", "https://pay.hotmart.com/F106921972I", 29990],
  ["traumatologia-ortopedia-clinica", "Traumatología y Ortopedia Clínica", "https://pay.hotmart.com/B106913952R", 35900],
  ["pack-estudiante", "Pack KineCheck Estudiante", "https://pay.hotmart.com/Q106891608M", 59900],
];

const results = [];
let failures = 0;

function record(name, status, detail, blocking = true) {
  results.push({ name, status, detail, blocking });
  if (status === "FAIL" && blocking) failures += 1;
  const prefix = status === "PASS" ? "✓" : status === "WARN" ? "!" : "✗";
  console.log(`${prefix} ${name}: ${detail}`);
}

async function read(path) {
  return await fs.readFile(path, "utf8");
}

async function checkSource() {
  const homeLoader = await read("home.js");
  const home = await read("home-core-20260806.js");
  const homeCommercial = await read("home-commercial-proof-v1.js");
  const priceData = JSON.parse(await read("commercial-prices-cl.json"));
  const publicIndex = await read("index.html");
  const product = await read("productos/product.js");
  const productPrice = await read("productos/product-price-v1.js");
  const productPage = await read("productos/index.html");
  const platformPage = await read("platform/index.html");
  const platformSecurity = await read("platform/security-bootstrap.js");
  const betaPage = await read("beta/index.html");
  const supportPage = await read("soporte/index.html");
  const supportScript = await read("soporte/support.js");
  const adminPage = await read("admin/index.html");
  const adminScript = await read("admin/admin.js");

  record(
    "Modular public catalog",
    homeLoader.includes("home-core-20260806.js") && homeLoader.includes("home-commercial-proof-v1.js") ? "PASS" : "FAIL",
    "home.js must load the protected core and commercial proof layer",
  );

  const prices = priceData.products || {};
  for (const [slug, name, checkout, expectedPrice] of products) {
    const inHome = home.includes(`"${slug}"`) && home.includes(checkout);
    const inProduct = product.includes(`"${slug}"`) && product.includes(checkout) && product.includes(name);
    const priceMatches = prices[slug]?.price === expectedPrice
      && homeCommercial.includes(`"${slug}"`)
      && productPrice.includes(`"${slug}"`);
    record(
      `Source mapping ${name}`,
      inHome && inProduct && priceMatches ? "PASS" : "FAIL",
      inHome && inProduct && priceMatches ? "slug, checkout and Chile price match" : "missing or inconsistent mapping",
    );
  }

  const staticPriceBlocks = (publicIndex.match(/class="product-price"/g) || []).length;
  record("Static public prices", staticPriceBlocks === 8 ? "PASS" : "FAIL", `${staticPriceBlocks}/8 prices visible without JavaScript`);
  record("Verified trust layer", publicIndex.includes('id="respaldo-verificable"') ? "PASS" : "FAIL", "public site must contain the verified proof section");
  record(
    "No fabricated social proof",
    !/Creado y dirigido por|Magíster en Docencia|97,1\/100|usado por \d+|más de \d+ usuarios|testimonio ficticio/i.test(publicIndex + homeCommercial) ? "PASS" : "FAIL",
    "personal profile and unsupported testimonials or user counts must remain absent",
  );
  record(
    "Transparent pack",
    publicIndex.includes("no se presenta como descuento frente a compras individuales") ? "PASS" : "FAIL",
    "the current pack must not claim an undocumented saving",
  );

  const legalLinksPresent = ["../legal/terminos.html", "../legal/privacidad.html", "../legal/reembolsos.html"]
    .every((href) => productPage.includes(href));
  record("Product page legal links", legalLinksPresent ? "PASS" : "FAIL", legalLinksPresent ? "terms, privacy and refunds are visible" : "one or more legal links are missing");
  record("Temporary platform session", platformPage.includes("security-bootstrap.js") ? "PASS" : "FAIL", "security bootstrap must load before platform.js");
  record("Versioned legal acceptance", platformSecurity.includes("kinecheck_missing_legal_acceptances") && platformSecurity.includes("kinecheck_accept_current_legal") ? "PASS" : "FAIL", "platform must require and record current legal versions");
  record("Automated support source", supportPage.includes('id="support-form"') && supportScript.includes("support-request") ? "PASS" : "FAIL", "support portal must submit to diagnostic endpoint");
  record("Private automation source", adminPage.includes('id="admin-login"') && adminScript.includes("automation-status") && adminScript.includes("automation-control") ? "PASS" : "FAIL", "admin portal must use protected status and control endpoints");
  record("Beta privacy consent", betaPage.includes("consentPrivacy") && betaPage.includes("../legal/privacidad.html") ? "PASS" : "FAIL", "beta form must require privacy consent");
}

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal, headers: { "User-Agent": "KineCheck-QA/1.2", ...(options.headers || {}) } });
  } finally {
    clearTimeout(timer);
  }
}

async function checkPage(name, path, expected) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetchWithTimeout(url, { redirect: "follow" });
    const text = await response.text();
    const ok = response.ok && expected.every((item) => text.includes(item));
    record(name, ok ? "PASS" : "FAIL", `${response.status} ${url}${ok ? "" : " — expected content missing"}`);
  } catch (error) {
    record(name, "FAIL", `${url} — ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function checkCheckout(name, url) {
  try {
    const response = await fetchWithTimeout(url, { redirect: "manual" }, 12000);
    if (response.status < 500) record(`Checkout ${name}`, "PASS", `${response.status} reachable`);
    else record(`Checkout ${name}`, "FAIL", `${response.status} server error`);
  } catch (error) {
    record(`Checkout ${name}`, "WARN", `automated request blocked or unavailable: ${error instanceof Error ? error.message : String(error)}`, false);
  }
}

async function checkLive() {
  await checkPage("Public catalog", "/?qa=commercial-pricing", ["KineCheck", "PRODUCTOS KINECHECK", "PRECIO EN CHILE", "RESPALDO VERIFICABLE"]);
  await checkPage("Platform login", "/platform/?qa=1", ["Ingresa a tu espacio", "security-bootstrap.js"]);
  await checkPage("Terms", "/legal/terminos.html", ["Términos y condiciones", "KineCheck"]);
  await checkPage("Privacy", "/legal/privacidad.html", ["Política de privacidad", "Ley N.º 21.719"]);
  await checkPage("Refunds", "/legal/reembolsos.html", ["Retracto y reembolsos", "Hotmart"]);
  await checkPage("External beta", "/beta/", ["PROGRAMA BETA", "id=\"beta-form\""]);
  await checkPage("Automated support", "/soporte/", ["DIAGNÓSTICO AUTOMÁTICO", "id=\"support-form\""]);
  await checkPage("Private automation portal", "/admin/", ["Centro de automatización", "id=\"admin-login\""]);

  for (const [slug, name, checkout] of products) {
    await checkPage(`Product detail ${name}`, `/productos/?producto=${encodeURIComponent(slug)}`, ["id=\"product-title\"", "Comprar en Hotmart", "Ya compré: ingresar"]);
    await checkCheckout(name, checkout);
  }
}

await checkSource();
await checkLive();

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  failures,
  results,
  note: "Automated certification does not replace end-to-end purchase, webhook, refund and authenticated-license tests with controlled Hotmart transactions.",
};
await fs.writeFile("qa-commercial-report.json", JSON.stringify(report, null, 2));

if (failures > 0) {
  console.error(`Commercial QA failed with ${failures} blocking issue(s).`);
  process.exit(1);
}

console.log("Commercial QA passed without blocking automated issues.");
