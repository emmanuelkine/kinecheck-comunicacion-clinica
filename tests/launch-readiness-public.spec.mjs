import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const PRODUCTS = [
  ["kinecheck-clinico", "$39.990"],
  ["kinecheck-estudiante", "$14.990"],
  ["kinecheck-recupera", "$9.990"],
  ["comunicacion-clinica", "$19.900"],
  ["mas-alla-del-dolor", "$39.990"],
  ["evidencia-aplicada", "$29.990"],
  ["traumatologia-ortopedia-clinica", "$35.900"],
  ["pack-estudiante", "$49.900"],
];
const VIEWPORTS = [
  ["mobile", { width: 390, height: 844 }],
  ["tablet", { width: 820, height: 1180 }],
  ["desktop", { width: 1440, height: 1000 }],
];

const browser = await chromium.launch({ headless: true });
const report = [];

async function checkOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(overflow.scrollWidth <= overflow.clientWidth + 3, `${label}: desbordamiento horizontal ${overflow.scrollWidth}/${overflow.clientWidth}`);
}

try {
  for (const [device, viewport] of VIEWPORTS) {
    const context = await browser.newContext({ viewport, locale: "es-CL", timezoneId: "America/Santiago" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" && !/favicon|metric-event/i.test(message.text())) errors.push(`console: ${message.text()}`);
    });

    await page.goto(`${BASE}/?qa=launch-${device}-${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("[data-product-card]", { timeout: 20000 });
    assert.equal(await page.locator("[data-product-card]").count(), 8, `${device}: deben existir 8 productos`);
    assert.equal(await page.locator(".product-price").count(), 8, `${device}: deben existir 8 precios visibles`);
    assert.equal(await page.locator("#respaldo-verificable").count(), 1, `${device}: falta respaldo verificable`);
    const homeText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    assert.ok(homeText.includes("$49.900"), `${device}: falta precio actual del pack`);
    assert.ok(!homeText.includes("$59.900"), `${device}: aparece precio antiguo del pack`);
    await checkOverflow(page, `${device} portada`);

    for (const [slug, price] of PRODUCTS) {
      await page.goto(`${BASE}/productos/?producto=${encodeURIComponent(slug)}&qa=${device}-${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForSelector("#product-title", { timeout: 15000 });
      await page.waitForSelector(".product-detail-price", { timeout: 15000 });
      const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      assert.ok(text.includes(price), `${device}/${slug}: falta ${price}`);
      const checkout = page.locator("[data-checkout]").first();
      assert.ok((await checkout.getAttribute("href") || "").startsWith("https://pay.hotmart.com/"), `${device}/${slug}: checkout inválido`);
      assert.ok((await page.locator("[data-access]").first().getAttribute("href") || "").includes("platform"), `${device}/${slug}: acceso inválido`);
      await checkOverflow(page, `${device}/${slug}`);
    }

    await page.goto(`${BASE}/academy/?qa=${device}-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert.ok((await page.title()).toLowerCase().includes("kinecheck"), `${device}: Academy no carga`);
    await checkOverflow(page, `${device}/academy`);

    await page.goto(`${BASE}/platform/?qa=${device}-${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
    assert.equal(await page.locator("#login-form").count(), 1, `${device}: login principal ausente`);
    assert.equal(await page.locator("#legal-consent-login").count(), 1, `${device}: consentimiento legal ausente`);
    await checkOverflow(page, `${device}/platform`);

    assert.deepEqual(errors, [], `${device}: errores de navegador: ${errors.join(" | ")}`);
    report.push({ device, status: "passed", products: PRODUCTS.length });
    await context.close();
  }

  console.log(JSON.stringify({ status: "passed", controls: 3 * (4 + PRODUCTS.length * 4 + 5), report }, null, 2));
} finally {
  await browser.close();
}
