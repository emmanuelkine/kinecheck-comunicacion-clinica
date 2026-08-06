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

    await page.goto(`${BASE}/?qa=unified-${device}-${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("#kc-clear-routes", { timeout: 20000 });
    assert.equal(await page.locator("[data-product-card]").count(), 8, `${device}: deben existir 8 productos`);
    assert.equal(await page.locator(".product-price").count(), 8, `${device}: deben existir 8 precios visibles`);
    assert.equal(await page.locator(".kc-route-card").count(), 3, `${device}: deben existir tres rutas claras`);
    assert.equal(await page.locator(".kc-role-badge.student").count(), 2, `${device}: faltan las dos señales de ruta estudiante`);
    assert.equal(await page.locator(".kc-role-badge.patient").count(), 1, `${device}: falta la señal simple para pacientes`);
    const homeText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    assert.ok(homeText.includes("Una cuenta. Un acceso."), `${device}: falta mensaje de entrada única`);
    assert.ok(homeText.includes("$49.900"), `${device}: falta precio actual del pack`);
    assert.ok(!homeText.includes("$59.900"), `${device}: aparece precio antiguo del pack`);
    assert.ok(!/Academy clásica|PLATAFORMA 5\.0/i.test(homeText), `${device}: aparecen experiencias retiradas`);
    const accessHrefs = await page.locator('a[href*="academy"],a[href*="platform"]').evaluateAll((links) => links.map((link) => link.href));
    assert.ok(accessHrefs.length > 0 && accessHrefs.every((href) => href.includes("/academy/")), `${device}: todos los accesos públicos deben ir a Mi KineCheck`);
    await checkOverflow(page, `${device} portada`);

    for (const [slug, price] of PRODUCTS) {
      await page.goto(`${BASE}/productos/?producto=${encodeURIComponent(slug)}&qa=${device}-${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForSelector("#product-title", { timeout: 15000 });
      await page.waitForSelector(".product-detail-price", { timeout: 15000 });
      const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      assert.ok(text.includes(price), `${device}/${slug}: falta ${price}`);
      if (slug === "kinecheck-estudiante") {
        await page.waitForSelector("#kc-student-learning-route", { timeout: 15000 });
        assert.ok(text.includes("No estudies todo al mismo tiempo"), `${device}: falta orientación estudiante`);
      }
      if (slug === "kinecheck-recupera") {
        await page.waitForSelector("#kc-patient-simple-guide", { timeout: 15000 });
        assert.ok(text.includes("Tres acciones. Nada más"), `${device}: falta simplificación paciente`);
        assert.ok(await page.locator("#related-title").isHidden(), `${device}: Recupera no debe mostrar recomendaciones superpuestas`);
      }
      const checkout = page.locator("[data-checkout]").first();
      assert.ok((await checkout.getAttribute("href") || "").startsWith("https://pay.hotmart.com/"), `${device}/${slug}: checkout inválido`);
      const access = page.locator("[data-access]").first();
      assert.ok((await access.getAttribute("href") || "").includes("/academy/"), `${device}/${slug}: el acceso debe abrir Mi KineCheck`);
      await checkOverflow(page, `${device}/${slug}`);
    }

    await page.goto(`${BASE}/platform/?qa=${device}-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForURL(/\/academy\//, { timeout: 15000 });
    assert.ok(page.url().includes("/academy/"), `${device}: /platform/ debe redirigir a Mi KineCheck`);

    await page.waitForSelector("#login-view", { timeout: 15000 });
    const privateText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    assert.ok(privateText.includes("Entra una vez"), `${device}: falta puerta única en Mi KineCheck`);
    assert.ok(!/Academy clásica|PLATAFORMA 5\.0/i.test(privateText), `${device}: quedan nombres privados superpuestos`);
    await checkOverflow(page, `${device}/mi-kinecheck`);

    assert.deepEqual(errors, [], `${device}: errores de navegador: ${errors.join(" | ")}`);
    report.push({ device, status: "passed", products: PRODUCTS.length });
    await context.close();
  }

  console.log(JSON.stringify({ status: "passed", report }, null, 2));
} finally {
  await browser.close();
}
