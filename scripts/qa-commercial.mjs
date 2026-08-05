import fs from "node:fs/promises";

const baseUrl = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const products = [
  ["kinecheck-clinico", "KineCheck Clínico", "https://pay.hotmart.com/L106791841D"],
  ["kinecheck-estudiante", "KineCheck Estudiante", "https://pay.hotmart.com/G106801166S"],
  ["kinecheck-recupera", "KineCheck Recupera", "https://pay.hotmart.com/P106806251E"],
  ["comunicacion-clinica", "Comunicación Clínica", "https://pay.hotmart.com/T106883983U"],
  ["mas-alla-del-dolor", "Más allá del dolor", "https://pay.hotmart.com/W106888386Q"],
  ["evidencia-aplicada", "Evidencia Aplicada", "https://pay.hotmart.com/F106921972I"],
  ["traumatologia-ortopedia-clinica", "Traumatología y Ortopedia Clínica", "https://pay.hotmart.com/B106913952R"],
  ["pack-estudiante", "Pack KineCheck Estudiante", "https://pay.hotmart.com/Q106891608M"],
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
  const home = await read("home.js");
  const product = await read("productos/product.js");
  const productPage = await read("productos/index.html");
  const platformPage = await read("platform/index.html");
  const betaPage = await read("beta/index.html");

  for (const [slug, name, checkout] of products) {
    const inHome = home.includes(`"${slug}"`) && home.includes(checkout);
    const inProduct = product.includes(`"${slug}"`) && product.includes(checkout) && product.includes(name);
    record(`Source mapping ${name}`, inHome && inProduct ? "PASS" : "FAIL", inHome && inProduct ? "slug and checkout match" : "missing or inconsistent mapping");
  }

  const legalLinksPresent = ["../legal/terminos.html", "../legal/privacidad.html", "../legal/reembolsos.html"]
    .every((href) => productPage.includes(href));
  record("Product page legal links", legalLinksPresent ? "PASS" : "FAIL", legalLinksPresent ? "terms, privacy and refunds are visible" : "one or more legal links are missing");
  record("Temporary platform session", platformPage.includes("security-bootstrap.js") ? "PASS" : "FAIL", "security bootstrap must load before platform.js");
  record("Beta privacy consent", betaPage.includes("consentPrivacy") && betaPage.includes("../legal/privacidad.html") ? "PASS" : "FAIL", "beta form must require privacy consent");
}

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal, headers: { "User-Agent": "KineCheck-QA/1.0", ...(options.headers || {}) } });
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
  await checkPage("Public catalog", "/?qa=1", ["KineCheck", "PRODUCTOS KINECHECK"]);
  await checkPage("Platform login", "/platform/?qa=1", ["Ingresa a tu espacio", "security-bootstrap.js"]);
  await checkPage("Terms", "/legal/terminos.html", ["Términos y condiciones", "KineCheck"]);
  await checkPage("Privacy", "/legal/privacidad.html", ["Política de privacidad", "Ley N.º 21.719"]);
  await checkPage("Refunds", "/legal/reembolsos.html", ["Retracto y reembolsos", "Hotmart"]);
  await checkPage("External beta", "/beta/", ["PROGRAMA BETA", "id=\"beta-form\""]);

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
