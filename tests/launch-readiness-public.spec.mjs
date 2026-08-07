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

async function pageText(page) {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ");
}

async function assertCleanAcademyLinks(page, label) {
  const hrefs = await page.locator('a[href*="academy"]').evaluateAll((links) => links.map((link) => link.href));
  assert.ok(hrefs.length > 0, `${label}: falta acceso a Academy`);
  assert.ok(hrefs.every((href) => href.includes("/academy/") && !href.includes("20260806-final5")), `${label}: hay enlaces de Academy con versionado interno`);
}

async function openPublicPage(page, path, device) {
  const join = path.includes("?") ? "&" : "?";
  await page.goto(`${BASE}${path}${join}qa=${device}-${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
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

    // Portada vigente: tres experiencias y tres productos principales.
    await openPublicPage(page, "/", device);
    await page.waitForSelector("#contenido", { timeout: 20000 });
    assert.equal(await page.locator(".audience-card").count(), 3, `${device}: deben existir tres experiencias por perfil`);
    assert.equal(await page.locator("#productos .product").count(), 3, `${device}: la portada debe destacar tres productos principales`);
    assert.equal(await page.locator("#productos .price").count(), 3, `${device}: la portada debe mostrar tres precios`);
    const homeText = await pageText(page);
    for (const price of ["$39.990 CLP", "$14.990 CLP", "$9.990 CLP"]) {
      assert.ok(homeText.includes(price), `${device}: falta ${price} en portada`);
    }
    assert.ok(/Creado por Emmanuel Zúñiga/i.test(homeText), `${device}: falta señal de autoría`);
    assert.ok(homeText.includes("Precios visibles"), `${device}: falta compromiso de transparencia de precio`);
    assert.ok(!homeText.includes("$59.900"), `${device}: aparece precio antiguo del pack`);
    assert.ok(!/Academy clásica|PLATAFORMA 5\.0/i.test(homeText), `${device}: aparecen experiencias retiradas`);
    assert.ok((await page.locator('a[href^="mailto:soporte.kinecheck@gmail.com"]').count()) >= 1, `${device}: soporte de portada no es funcional`);
    await assertCleanAcademyLinks(page, `${device}/portada`);
    await checkOverflow(page, `${device}/portada`);

    // Profesionales: catálogo completo, precios y CTA honestos.
    await openPublicPage(page, "/profesionales/", device);
    assert.equal(await page.locator("#soluciones .product").count(), 5, `${device}: profesionales debe mostrar cinco productos`);
    assert.equal(await page.locator("#soluciones .price").count(), 5, `${device}: profesionales debe mostrar cinco precios`);
    const professionalText = await pageText(page);
    for (const price of ["$39.990 CLP", "$19.900 CLP", "$29.990 CLP", "$35.900 CLP"]) {
      assert.ok(professionalText.includes(price), `${device}/profesionales: falta ${price}`);
    }
    assert.ok(!professionalText.includes("Ver curso"), `${device}/profesionales: un checkout sigue rotulado como “Ver curso”`);
    assert.ok(professionalText.includes("RECOMENDADO"), `${device}/profesionales: falta producto recomendado`);
    await assertCleanAcademyLinks(page, `${device}/profesionales`);
    await checkOverflow(page, `${device}/profesionales`);

    // Estudiantes: cuatro opciones, precios completos y badge unificado.
    await openPublicPage(page, "/estudiantes/", device);
    assert.equal(await page.locator("#productos .product").count(), 4, `${device}: estudiantes debe mostrar cuatro productos`);
    assert.equal(await page.locator("#productos .price").count(), 4, `${device}: estudiantes debe mostrar cuatro precios`);
    const studentText = await pageText(page);
    for (const price of ["$14.990 CLP", "$49.900 CLP", "$19.900 CLP", "$29.990 CLP"]) {
      assert.ok(studentText.includes(price), `${device}/estudiantes: falta ${price}`);
    }
    assert.ok(studentText.includes("RECOMENDADO"), `${device}/estudiantes: falta badge RECOMENDADO`);
    assert.ok(!studentText.includes("PRODUCTO PRINCIPAL"), `${device}/estudiantes: conserva badge anterior`);
    assert.ok(!studentText.includes("Ver curso"), `${device}/estudiantes: un checkout sigue rotulado como “Ver curso”`);
    await assertCleanAcademyLinks(page, `${device}/estudiantes`);
    await checkOverflow(page, `${device}/estudiantes`);

    // Recupera: precio visible, vigencia y acceso limpio.
    await openPublicPage(page, "/recupera/", device);
    assert.equal(await page.locator("#incluye .price").count(), 1, `${device}: Recupera debe mostrar su precio en la sección principal`);
    const recoveryText = await pageText(page);
    assert.ok(recoveryText.includes("$9.990 CLP"), `${device}/recupera: falta precio`);
    assert.ok(recoveryText.includes("Acceso por 3 meses"), `${device}/recupera: falta vigencia`);
    await assertCleanAcademyLinks(page, `${device}/recupera`);
    await checkOverflow(page, `${device}/recupera`);

    // Acceso directo a /productos/: debe hidratar una ficha real, no dejar la plantilla vacía.
    await openPublicPage(page, "/productos/", device);
    await page.waitForFunction(() => {
      const title = document.querySelector("#product-title")?.textContent || "";
      const checkout = document.querySelector("[data-checkout]")?.getAttribute("href") || "";
      return title.includes("KineCheck Clínico") && checkout.startsWith("https://pay.hotmart.com/");
    }, { timeout: 15000 });
    const defaultProductText = await pageText(page);
    assert.ok(defaultProductText.includes("KineCheck Clínico"), `${device}/productos: la ficha por defecto no se hidrató`);
    assert.ok((await page.locator("[data-checkout]").first().getAttribute("href") || "").startsWith("https://pay.hotmart.com/"), `${device}/productos: CTA por defecto inválido`);
    await checkOverflow(page, `${device}/productos`);

    // Las ocho fichas de producto siguen disponibles y enlazan a Hotmart/Academy.
    for (const [slug, price] of PRODUCTS) {
      await openPublicPage(page, `/productos/?producto=${encodeURIComponent(slug)}`, device);
      await page.waitForSelector("#product-title", { timeout: 15000 });
      await page.waitForSelector(".product-detail-price", { timeout: 15000 });
      const text = await pageText(page);
      assert.ok(text.includes(price), `${device}/${slug}: falta ${price}`);
      const checkout = page.locator("[data-checkout]").first();
      assert.ok((await checkout.getAttribute("href") || "").startsWith("https://pay.hotmart.com/"), `${device}/${slug}: checkout inválido`);
      const access = page.locator("[data-access]").first();
      const accessHref = await access.getAttribute("href") || "";
      assert.ok(accessHref.includes("/academy/") && !accessHref.includes("20260806-final5"), `${device}/${slug}: acceso a Academy inválido`);
      await checkOverflow(page, `${device}/${slug}`);
    }

    // Ruta histórica y puerta única de acceso.
    await openPublicPage(page, "/platform/", device);
    await page.waitForURL(/\/academy\//, { timeout: 15000 });
    assert.ok(page.url().includes("/academy/"), `${device}: /platform/ debe redirigir a Mi KineCheck`);
    await page.waitForSelector("#login-view", { timeout: 15000 });
    const privateText = await pageText(page);
    assert.ok(privateText.includes("Entra una vez"), `${device}: falta puerta única en Mi KineCheck`);
    assert.ok(!/Academy clásica|PLATAFORMA 5\.0/i.test(privateText), `${device}: quedan nombres privados superpuestos`);
    await page.waitForFunction(() => document.querySelector(".kc-catalog-button")?.getAttribute("href") === "../#productos", { timeout: 15000 });
    assert.equal(await page.locator(".kc-catalog-button").getAttribute("href"), "../#productos", `${device}: enlace de catálogo interno inválido`);
    await checkOverflow(page, `${device}/mi-kinecheck`);

    assert.deepEqual(errors, [], `${device}: errores de navegador: ${errors.join(" | ")}`);
    report.push({ device, status: "passed", products: PRODUCTS.length, publicProfiles: 3 });
    await context.close();
  }

  console.log(JSON.stringify({ status: "passed", report }, null, 2));
} finally {
  await browser.close();
}
