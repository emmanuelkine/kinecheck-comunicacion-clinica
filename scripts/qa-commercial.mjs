import fs from "node:fs/promises";

const baseUrl = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const products = [
  ["kinecheck-clinico", "KineCheck Clínico", "https://pay.hotmart.com/L106791841D", 39990, "$39.990"],
  ["kinecheck-estudiante", "KineCheck Estudiante", "https://pay.hotmart.com/G106801166S", 14990, "$14.990"],
  ["comunicacion-clinica", "Comunicación Clínica", "https://pay.hotmart.com/T106883983U", 19900, "$19.900"],
  ["mas-alla-del-dolor", "Más allá del dolor", "https://pay.hotmart.com/W106888386Q", 39990, "$39.990"],
  ["evidencia-aplicada", "Evidencia Aplicada", "https://pay.hotmart.com/F106921972I", 29990, "$29.990"],
  ["traumatologia-ortopedia-clinica", "Traumatología y Ortopedia Clínica", "https://pay.hotmart.com/B106913952R", 35900, "$35.900"],
  ["pack-estudiante", "Pack KineCheck Estudiante", "https://pay.hotmart.com/Q106891608M", 49900, "$49.900"],
];
const pausedRecovery = ["kinecheck-recupera", "KineCheck Recupera", "https://pay.hotmart.com/P106806251E", 9990, "$9.990"];

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

function countClass(source, className) {
  const classAttrs = source.match(/class=(?:"[^"]*"|'[^']*')/g) || [];
  return classAttrs.filter((attr) => {
    const value = attr.slice(7, -1);
    return value.split(/\s+/).includes(className);
  }).length;
}

async function checkSource() {
  const priceData = JSON.parse(await read("commercial-prices-cl.json"));
  const home = await read("index.html");
  const professionals = await read("profesionales/index.html");
  const students = await read("estudiantes/index.html");
  const recovery = await read("recupera/index.html");
  const legacyProductPage = await read("productos/index.html");
  const platformPage = await read("platform/index.html");
  const platformRedirect = await read("platform/redirect-to-mi-kinecheck-v1.js");
  const academyPage = await read("academy/index.html");
  const betaPage = await read("beta/index.html");
  const supportPage = await read("soporte/index.html");
  const supportScript = await read("soporte/support.js");
  const adminPage = await read("admin/index.html");
  const adminScript = await read("admin/admin.js");

  const prices = priceData.products || {};
  const publicCatalog = `${professionals}\n${students}\n${recovery}`;
  const productPages = new Map();
  for (const [slug] of products) productPages.set(slug, await read(`productos/${slug}/index.html`));
  productPages.set(pausedRecovery[0], await read(`productos/${pausedRecovery[0]}/index.html`));

  for (const [slug, name, checkout, expectedPrice, displayPrice] of products) {
    const page = productPages.get(slug) || "";
    const canonical = `https://kinecheck.cl/productos/${slug}/`;
    const priceMatches = prices[slug]?.price === expectedPrice;
    const checkoutMapped = page.includes(checkout) && publicCatalog.includes(checkout);
    const displayMapped = page.includes(`${displayPrice} CLP`) && publicCatalog.includes(`${displayPrice} CLP`);
    const canonicalMapped = page.includes(`<link rel="canonical" href="${canonical}">`);
    const academyMapped = page.includes("../../academy/") && !page.includes("../platform/");
    record(
      `Source mapping ${name}`,
      priceMatches && checkoutMapped && displayMapped && canonicalMapped && academyMapped ? "PASS" : "FAIL",
      priceMatches && checkoutMapped && displayMapped && canonicalMapped && academyMapped
        ? "price, checkout, canonical and Academy access match"
        : "missing or inconsistent canonical commercial mapping",
    );
  }

  const [recoverySlug, recoveryName, recoveryCheckout, recoveryPrice, recoveryDisplay] = pausedRecovery;
  const recoveryProduct = productPages.get(recoverySlug) || "";
  const recoveryBlocked = prices[recoverySlug]?.price === recoveryPrice
    && recoveryProduct.includes(recoveryName)
    && /PRÓXIMAMENTE/i.test(recoveryProduct)
    && !recoveryProduct.includes(recoveryCheckout)
    && !recoveryProduct.includes(recoveryDisplay)
    && !recovery.includes(recoveryCheckout)
    && !recovery.includes(recoveryDisplay)
    && !/<form\b|<input\b|<textarea\b|<select\b/i.test(`${recoveryProduct}\n${recovery}`);
  record(
    "Source block KineCheck Recupera",
    recoveryBlocked ? "PASS" : "FAIL",
    recoveryBlocked
      ? "historical price remains configured, but public pages expose no price, checkout or data capture"
      : "Recupera is not fully blocked in public source",
  );

  const homePrices = countClass(home, "price");
  const professionalPrices = countClass(professionals, "price");
  const studentPrices = countClass(students, "price");
  const recoveryPrices = countClass(recovery, "price");
  const currentArchitecture = homePrices === 0 && professionalPrices === 6 && studentPrices === 5 && recoveryPrices === 0;
  record(
    "Current public pricing architecture",
    currentArchitecture ? "PASS" : "FAIL",
    `home=${homePrices}, profesionales=${professionalPrices}, estudiantes=${studentPrices}, recupera=${recoveryPrices}`,
  );

  const exploreLinks = [
    "./productos/kinecheck-clinico/",
    "./productos/comunicacion-clinica/",
    "./productos/kinecheck-estudiante/",
    "./productos/kinecheck-recupera/",
  ];
  const exploreCurrent = home.includes("Explora KineCheck")
    && home.includes("Toca un producto para conocerlo")
    && exploreLinks.every((href) => home.includes(`href="${href}"`));
  record(
    "Public home Explora KineCheck",
    exploreCurrent ? "PASS" : "FAIL",
    exploreCurrent ? "home exposes the current four-product exploration rail" : "home exploration rail is missing or incomplete",
  );

  const directCheckoutCoverage = products.every(([, , checkout]) => publicCatalog.includes(checkout))
    && !publicCatalog.includes(pausedRecovery[2]);
  record(
    "Public purchase coverage",
    directCheckoutCoverage ? "PASS" : "FAIL",
    directCheckoutCoverage ? "all seven active products expose checkout and paused Recupera exposes none" : "active checkout coverage or Recupera blocking is inconsistent",
  );

  record(
    "Retired creator section",
    !/id="confianza"|CREADO POR EMMANUEL ZÚÑIGA/i.test(home) ? "PASS" : "FAIL",
    "the creator profile intentionally removed from the current public home must not return as stale content",
  );
  record(
    "No fabricated social proof",
    !/usado por \d+|más de \d+ usuarios|testimonio ficticio|\d+ pacientes satisfechos/i.test(`${home}\n${publicCatalog}`) ? "PASS" : "FAIL",
    "unsupported testimonials and user counts must remain absent",
  );

  const packSavingValid = prices["pack-estudiante"]?.saving === 5080
    && prices["pack-estudiante"]?.discountPercent === 9.2
    && students.includes("$49.900 CLP")
    && !`${home}\n${publicCatalog}`.includes("$59.900");
  record("Verified pack price", packSavingValid ? "PASS" : "FAIL", "Pack price and verified saving data remain consistent with commercial source");

  const legalLinksPresent = [...productPages.values()].every((page) => [
    "../../legal/terminos.html",
    "../../legal/privacidad.html",
    "../../legal/reembolsos.html",
  ].every((href) => page.includes(href)));
  record("Product page legal links", legalLinksPresent ? "PASS" : "FAIL", legalLinksPresent ? "all canonical products link terms, privacy and refunds" : "one or more canonical product legal links are missing");

  const legacyCompatibility = /noindex,follow/i.test(legacyProductPage)
    && legacyProductPage.includes("product-legacy-router-v1.js");
  record("Legacy product compatibility", legacyCompatibility ? "PASS" : "FAIL", "legacy product endpoint must remain noindex and route to canonical pages");

  const platformIsRedirect = platformPage.includes("../academy/")
    && /http-equiv="refresh"/i.test(platformPage)
    && /noindex,nofollow/i.test(platformPage)
    && platformRedirect.includes('new URL("../academy/"');
  record("Legacy platform route", platformIsRedirect ? "PASS" : "FAIL", "legacy /platform/ must redirect cleanly to the canonical /academy/ entry point");

  const academyLoginPresent = academyPage.includes('id="login-view"')
    && academyPage.includes("academy-v39.js")
    && academyPage.includes("academy-open-v6.js")
    && academyPage.includes("academy-owned-native-bridge-v1.js")
    && academyPage.includes("../metrics-v1.js");
  record("Canonical Academy entry", academyLoginPresent ? "PASS" : "FAIL", "canonical /academy/ must contain login shell, secure product runtime and launch metrics");

  const cleanProductAccess = [...productPages.values()].every((page) => page.includes("../../academy/"));
  record("Product access route", cleanProductAccess ? "PASS" : "FAIL", "canonical product pages must route owned access directly to /academy/");

  record("Automated support source", supportPage.includes('id="support-form"') && supportScript.includes("support-request") ? "PASS" : "FAIL", "support portal must submit to diagnostic endpoint");
  record("Private automation source", adminPage.includes('id="admin-login"') && adminScript.includes("automation-status") && adminScript.includes("automation-control") ? "PASS" : "FAIL", "admin portal must use protected status and control endpoints");
  record("Beta privacy consent", betaPage.includes("consentPrivacy") && betaPage.includes("../legal/privacidad.html") ? "PASS" : "FAIL", "beta form must require privacy consent");
}

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal, headers: { "User-Agent": "KineCheck-QA/3.0", ...(options.headers || {}) } });
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

async function checkBlockedPage(name, path, expected, forbidden) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetchWithTimeout(url, { redirect: "follow" });
    const text = await response.text();
    const hasExpected = expected.every((item) => text.includes(item));
    const hasForbidden = forbidden.some((item) => text.includes(item));
    const ok = response.ok && hasExpected && !hasForbidden;
    record(name, ok ? "PASS" : "FAIL", `${response.status} ${url}${ok ? "" : " — paused product contract violated"}`);
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
  await checkPage("Public home", "/?qa=commercial-current", ["Explora KineCheck", "KineCheck Clínico", "Comunicación Clínica", "KineCheck Estudiante", "KineCheck Recupera", "Elegir mi perfil", "Abrir Biblioteca"]);
  await checkPage("Professional profile", "/profesionales/?qa=commercial-current", ["KineCheck Clínico", "$35.900 CLP", "Formación diseñada para la práctica clínica."]);
  await checkPage("Student profile", "/estudiantes/?qa=commercial-current", ["KineCheck Estudiante", "$49.900 CLP", "RECOMENDADO"]);
  await checkBlockedPage(
    "Recovery profile",
    "/recupera/?qa=commercial-current",
    ["KineCheck Recupera", "PRÓXIMAMENTE", "No se encuentra disponible para compra ni para registro de datos"],
    ["$9.990", "P106806251E", "Acceso por 3 meses", "<form", "<input", "<textarea", "<select"],
  );
  await checkPage("Canonical Academy", "/academy/?qa=commercial-current", ['id="login-view"', "academy-v39.js", "academy-open-v6.js", "academy-owned-native-bridge-v1.js", "../metrics-v1.js"]);
  await checkPage("Legacy platform redirect shell", "/platform/?qa=commercial-current", ["Abriendo Mi KineCheck", "../academy/"]);
  await checkPage("Terms", "/legal/terminos.html", ["Términos y condiciones", "KineCheck"]);
  await checkPage("Privacy", "/legal/privacidad.html", ["Política de privacidad", "Ley N.º 21.719"]);
  await checkPage("Refunds", "/legal/reembolsos.html", ["Retracto y reembolsos", "Hotmart"]);
  await checkPage("External beta", "/beta/", ["PROGRAMA BETA", 'id="beta-form"']);
  await checkPage("Automated support", "/soporte/", ["DIAGNÓSTICO AUTOMÁTICO", 'id="support-form"']);
  await checkPage("Private automation portal", "/admin/", ["Centro de automatización", 'id="admin-login"']);

  for (const [slug, name, checkout, , displayPrice] of products) {
    const canonical = `https://kinecheck.cl/productos/${slug}/`;
    await checkPage(
      `Product detail ${name}`,
      `/productos/${encodeURIComponent(slug)}/?qa=commercial-current`,
      [name, `${displayPrice} CLP`, checkout, canonical, "../../academy/"],
    );
    await checkCheckout(name, checkout);
  }

  await checkBlockedPage(
    "Product detail KineCheck Recupera",
    "/productos/kinecheck-recupera/?qa=commercial-current",
    ["KineCheck Recupera", "PRÓXIMAMENTE", "No disponible para compra ni registro de información"],
    ["$9.990", "P106806251E", "Comprar en Hotmart", "<form", "<input", "<textarea", "<select"],
  );
}

await checkSource();
await checkLive();

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  failures,
  results,
  note: "Automated certification validates canonical public routes, Chile prices, checkout reachability, legal links and Academy entry. It does not replace a controlled paid Hotmart transaction followed by webhook, authenticated license, refund and chargeback tests.",
};
await fs.writeFile("qa-commercial-report.json", JSON.stringify(report, null, 2));

if (failures > 0) {
  console.error(`Commercial QA failed with ${failures} blocking issue(s).`);
  process.exit(1);
}

console.log("Commercial QA passed without blocking automated issues.");
