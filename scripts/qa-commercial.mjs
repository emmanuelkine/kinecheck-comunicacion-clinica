import fs from "node:fs/promises";

const baseUrl = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const products = [
  ["kinecheck-clinico", "KineCheck Clínico", "https://pay.hotmart.com/L106791841D", 39990, "$39.990"],
  ["kinecheck-estudiante", "KineCheck Estudiante", "https://pay.hotmart.com/G106801166S", 14990, "$14.990"],
  ["kinecheck-recupera", "KineCheck Recupera", "https://pay.hotmart.com/P106806251E", 9990, "$9.990"],
  ["comunicacion-clinica", "Comunicación Clínica", "https://pay.hotmart.com/T106883983U", 19900, "$19.900"],
  ["mas-alla-del-dolor", "Más allá del dolor", "https://pay.hotmart.com/W106888386Q", 39990, "$39.990"],
  ["evidencia-aplicada", "Evidencia Aplicada", "https://pay.hotmart.com/F106921972I", 29990, "$29.990"],
  ["traumatologia-ortopedia-clinica", "Traumatología y Ortopedia Clínica", "https://pay.hotmart.com/B106913952R", 35900, "$35.900"],
  ["pack-estudiante", "Pack KineCheck Estudiante", "https://pay.hotmart.com/Q106891608M", 49900, "$49.900"],
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

function count(source, needle) {
  return source.split(needle).length - 1;
}

async function checkSource() {
  const priceData = JSON.parse(await read("commercial-prices-cl.json"));
  const home = await read("index.html");
  const professionals = await read("profesionales/index.html");
  const students = await read("estudiantes/index.html");
  const recovery = await read("recupera/index.html");
  const product = await read("productos/product.js");
  const productPage = await read("productos/index.html");
  const productExperience = await read("productos/product-experience-unification-v1.js");
  const platformPage = await read("platform/index.html");
  const academyPage = await read("academy/index.html");
  const betaPage = await read("beta/index.html");
  const supportPage = await read("soporte/index.html");
  const supportScript = await read("soporte/support.js");
  const adminPage = await read("admin/index.html");
  const adminScript = await read("admin/admin.js");

  const prices = priceData.products || {};
  const publicCatalog = `${home}\n${professionals}\n${students}\n${recovery}`;

  for (const [slug, name, checkout, expectedPrice, displayPrice] of products) {
    const priceMatches = prices[slug]?.price === expectedPrice;
    const checkoutMapped = product.includes(`"${slug}"`) && product.includes(checkout) && publicCatalog.includes(checkout);
    const displayMapped = publicCatalog.includes(`${displayPrice} CLP`);
    record(
      `Source mapping ${name}`,
      priceMatches && checkoutMapped && displayMapped ? "PASS" : "FAIL",
      priceMatches && checkoutMapped && displayMapped ? "slug, checkout and Chile price match" : "missing or inconsistent public mapping",
    );
  }

  const homePrices = count(home, 'class="price"');
  const professionalPrices = count(professionals, 'class="price"');
  const studentPrices = count(students, 'class="price"');
  const recoveryPrices = count(recovery, 'class="price"');
  const currentArchitecture = homePrices === 3 && professionalPrices === 5 && studentPrices === 4 && recoveryPrices === 1;
  record(
    "Static public prices",
    currentArchitecture ? "PASS" : "FAIL",
    `home=${homePrices}, profesionales=${professionalPrices}, estudiantes=${studentPrices}, recupera=${recoveryPrices}`,
  );

  const trustSignals = /CREADO POR EMMANUEL ZÚÑIGA/i.test(home)
    && home.includes("Precios visibles")
    && home.includes("Compra segura");
  record("Public trust layer", trustSignals ? "PASS" : "FAIL", "author, visible-price and secure-purchase signals must be present");
  record(
    "No fabricated social proof",
    !/usado por \d+|más de \d+ usuarios|testimonio ficticio|\d+ pacientes satisfechos/i.test(publicCatalog) ? "PASS" : "FAIL",
    "unsupported testimonials and user counts must remain absent",
  );

  const packSavingValid = prices["pack-estudiante"]?.saving === 5080
    && prices["pack-estudiante"]?.discountPercent === 9.2
    && students.includes("$49.900 CLP")
    && !publicCatalog.includes("$59.900");
  record("Verified pack price", packSavingValid ? "PASS" : "FAIL", "Pack price and verified saving data remain consistent with commercial source");

  const legalLinksPresent = ["../legal/terminos.html", "../legal/privacidad.html", "../legal/reembolsos.html"]
    .every((href) => productPage.includes(href));
  record("Product page legal links", legalLinksPresent ? "PASS" : "FAIL", legalLinksPresent ? "terms, privacy and refunds are visible" : "one or more legal links are missing");

  const platformIsRedirect = platformPage.includes("../academy/")
    && /http-equiv="refresh"/i.test(platformPage)
    && /noindex,nofollow/i.test(platformPage);
  record("Legacy platform route", platformIsRedirect ? "PASS" : "FAIL", "legacy /platform/ must redirect to the canonical /academy/ entry point");

  const academyLoginPresent = academyPage.includes('id="login-view"')
    && academyPage.includes("academy-v39.js")
    && academyPage.includes("academy-brand-identity.js");
  record("Canonical Academy entry", academyLoginPresent ? "PASS" : "FAIL", "canonical /academy/ must contain the login shell and current identity layer");

  const cleanProductAccess = productExperience.includes('new URL("../academy/"')
    && !productExperience.includes("20260806-final5");
  record("Product access route", cleanProductAccess ? "PASS" : "FAIL", "product pages must rewrite private access directly to /academy/ without retired version parameters");

  record("Automated support source", supportPage.includes('id="support-form"') && supportScript.includes("support-request") ? "PASS" : "FAIL", "support portal must submit to diagnostic endpoint");
  record("Private automation source", adminPage.includes('id="admin-login"') && adminScript.includes("automation-status") && adminScript.includes("automation-control") ? "PASS" : "FAIL", "admin portal must use protected status and control endpoints");
  record("Beta privacy consent", betaPage.includes("consentPrivacy") && betaPage.includes("../legal/privacidad.html") ? "PASS" : "FAIL", "beta form must require privacy consent");
}

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal, headers: { "User-Agent": "KineCheck-QA/2.0", ...(options.headers || {}) } });
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
  await checkPage("Public home", "/?qa=commercial-current", ["PRODUCTOS PRINCIPALES", "$39.990 CLP", "$14.990 CLP", "$9.990 CLP", "CREADO POR EMMANUEL ZÚÑIGA"]);
  await checkPage("Professional profile", "/profesionales/?qa=commercial-current", ["KineCheck Clínico", "$35.900 CLP", "RECOMENDADO"]);
  await checkPage("Student profile", "/estudiantes/?qa=commercial-current", ["KineCheck Estudiante", "$49.900 CLP", "RECOMENDADO"]);
  await checkPage("Recovery profile", "/recupera/?qa=commercial-current", ["KineCheck Recupera", "$9.990 CLP", "Acceso por 3 meses"]);
  await checkPage("Canonical Academy", "/academy/?qa=commercial-current", ['id="login-view"', "academy-v39.js"]);
  await checkPage("Legacy platform redirect", "/platform/?qa=commercial-current", ['id="login-view"', "academy-v39.js"]);
  await checkPage("Terms", "/legal/terminos.html", ["Términos y condiciones", "KineCheck"]);
  await checkPage("Privacy", "/legal/privacidad.html", ["Política de privacidad", "Ley N.º 21.719"]);
  await checkPage("Refunds", "/legal/reembolsos.html", ["Retracto y reembolsos", "Hotmart"]);
  await checkPage("External beta", "/beta/", ["PROGRAMA BETA", 'id="beta-form"']);
  await checkPage("Automated support", "/soporte/", ["DIAGNÓSTICO AUTOMÁTICO", 'id="support-form"']);
  await checkPage("Private automation portal", "/admin/", ["Centro de automatización", 'id="admin-login"']);

  for (const [slug, name, checkout] of products) {
    await checkPage(`Product detail ${name}`, `/productos/?producto=${encodeURIComponent(slug)}`, ['id="product-title"', "Comprar en Hotmart", "Ya compré: ingresar"]);
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
  note: "Automated certification does not replace end-to-end purchase, webhook, refund, chargeback and authenticated-license tests with controlled Hotmart transactions.",
};
await fs.writeFile("qa-commercial-report.json", JSON.stringify(report, null, 2));

if (failures > 0) {
  console.error(`Commercial QA failed with ${failures} blocking issue(s).`);
  process.exit(1);
}

console.log("Commercial QA passed without blocking automated issues.");
