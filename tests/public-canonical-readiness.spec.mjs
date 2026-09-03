import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const PRODUCTS = [
  { slug: "kinecheck-clinico", name: "KineCheck Clínico", price: "$39.990 CLP", checkout: "https://pay.hotmart.com/L106791841D" },
  { slug: "kinecheck-estudiante", name: "KineCheck Estudiante", price: "$14.990 CLP", checkout: "https://pay.hotmart.com/G106801166S" },
  { slug: "comunicacion-clinica", name: "Comunicación Clínica", price: "$19.900 CLP", checkout: "https://pay.hotmart.com/T106883983U" },
  { slug: "mas-alla-del-dolor", name: "Más allá del dolor", price: "$39.990 CLP", checkout: "https://pay.hotmart.com/W106888386Q" },
  { slug: "evidencia-aplicada", name: "Evidencia Aplicada", price: "$29.990 CLP", checkout: "https://pay.hotmart.com/F106921972I" },
  { slug: "traumatologia-ortopedia-clinica", name: "Traumatología y Ortopedia Clínica", price: "$35.900 CLP", checkout: "https://pay.hotmart.com/B106913952R" },
  { slug: "pack-estudiante", name: "Pack KineCheck Estudiante", price: "$49.900 CLP", checkout: "https://pay.hotmart.com/Q106891608M" },
];
const VIEWPORTS = [
  ["mobile", { width: 390, height: 844 }],
  ["tablet", { width: 820, height: 1180 }],
  ["desktop", { width: 1440, height: 1000 }],
];

const browser = await chromium.launch({ headless: true });

function normalized(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("es-CL");
}

async function bodyText(page) {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
}

async function assertNoHorizontalOverflow(page, label) {
  const size = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert.ok(size.scroll <= size.client + 3, `${label}: overflow horizontal ${size.scroll}/${size.client}`);
}

async function assertImagesLoaded(page, label) {
  const broken = await page.locator("img").evaluateAll((images) => images
    .filter((image) => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0)
    .map((image) => image.currentSrc || image.getAttribute("src") || "imagen sin src"));
  assert.deepEqual(broken, [], `${label}: imágenes sin cargar: ${broken.join(", ")}`);
}

async function assertOpenGraph(page, label) {
  for (const property of ["og:type", "og:locale", "og:site_name", "og:title", "og:description", "og:url"]) {
    const value = await page.locator(`meta[property="${property}"]`).getAttribute("content") || "";
    assert.ok(value.trim(), `${label}: falta ${property}`);
  }
}

async function open(page, path, label) {
  const sep = path.includes("?") ? "&" : "?";
  const response = await page.goto(`${BASE}${path}${sep}qa=canonical-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  assert.ok(response && response.status() < 500, `${label}: HTTP ${response?.status() ?? "sin respuesta"}`);
}

try {
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, locale: "es-CL" });
  try {
    const page = await noJs.newPage();
    await open(page, "/productos/kinecheck-clinico/", "sin JS/Clínico");
    const text = normalized(await bodyText(page));
    assert.ok(text.includes("kinecheck clínico"), "sin JS/Clínico: falta identidad del producto");
    assert.ok(text.includes("$39.990 clp"), "sin JS/Clínico: falta precio");
    assert.ok((await page.locator('a[href="https://pay.hotmart.com/L106791841D"]').count()) >= 1, "sin JS/Clínico: falta checkout exacto");
    assert.ok((await page.locator('a[href*="academy/"]').count()) >= 1, "sin JS/Clínico: falta acceso a Academy");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://kinecheck.cl/productos/kinecheck-clinico/");
    await assertOpenGraph(page, "sin JS/Clínico");
    await assertNoHorizontalOverflow(page, "sin JS/Clínico");
    await assertImagesLoaded(page, "sin JS/Clínico");
  } finally {
    await noJs.close();
  }

  for (const [device, viewport] of VIEWPORTS) {
    const context = await browser.newContext({ viewport, locale: "es-CL", timezoneId: "America/Santiago" });
    const page = await context.newPage();

    await open(page, "/", `${device}/inicio`);
    const home = await bodyText(page);
    assert.ok(normalized(home).includes("evaluación musculoesquelética y razonamiento clínico"), `${device}/inicio: falta propuesta principal actual`);
    assert.ok((await page.locator('a[href*="profesionales/"]').count()) >= 1, `${device}/inicio: falta perfil profesional`);
    assert.ok((await page.locator('a[href*="estudiantes/"]').count()) >= 1, `${device}/inicio: falta perfil estudiante`);
    assert.ok((await page.locator('a[href*="recupera/"]').count()) >= 1, `${device}/inicio: falta perfil recuperación`);
    assert.ok((await page.locator('a[href*="demo/"]').count()) >= 1, `${device}/inicio: falta acceso a demo`);
    assert.ok((await page.locator('a[href*="metodologia/"]').count()) >= 1, `${device}/inicio: falta acceso a metodología`);
    assert.ok((await page.locator('a[href*="academy/"]').count()) >= 1, `${device}/inicio: falta acceso a Academy`);
    assert.equal(await page.locator('.kc-testimonial').count(), 6, `${device}/inicio: deben existir exactamente 6 testimonios`);
    assert.equal(await page.locator('.kc-stars').count(), 0, `${device}/inicio: no deben existir ratings numéricos en los testimonios`);
    assert.ok(!home.includes("★★★★★"), `${device}/inicio: reaparecieron estrellas en los testimonios`);
    await assertOpenGraph(page, `${device}/inicio`);
    await assertNoHorizontalOverflow(page, `${device}/inicio`);
    await assertImagesLoaded(page, `${device}/inicio`);

    for (const [path, expectedPrice] of [
      ["/profesionales/", "$39.990 CLP"],
      ["/estudiantes/", "$14.990 CLP"],
    ]) {
      await open(page, path, `${device}${path}`);
      const text = await bodyText(page);
      assert.ok(text.includes(expectedPrice), `${device}${path}: falta precio principal ${expectedPrice}`);
      assert.ok((await page.locator('a[href*="academy/"]').count()) >= 1, `${device}${path}: falta acceso a Academy`);
      await assertOpenGraph(page, `${device}${path}`);
      await assertNoHorizontalOverflow(page, `${device}${path}`);
      await assertImagesLoaded(page, `${device}${path}`);
    }

    await open(page, "/recupera/", `${device}/recupera/`);
    const recuperaText = await bodyText(page);
    assert.ok(normalized(recuperaText).includes("próximamente"), `${device}/recupera/: falta estado Próximamente`);
    assert.ok(!recuperaText.includes("$9.990 CLP"), `${device}/recupera/: reapareció precio operativo`);
    assert.equal(await page.locator('a[href*="pay.hotmart.com"]').count(), 0, `${device}/recupera/: reapareció checkout público`);
    assert.ok(!/comprar/i.test(recuperaText), `${device}/recupera/: reapareció CTA de compra`);
    await assertOpenGraph(page, `${device}/recupera/`);
    await assertNoHorizontalOverflow(page, `${device}/recupera/`);
    await assertImagesLoaded(page, `${device}/recupera/`);

    await open(page, "/productos/kinecheck-recupera/", `${device}/kinecheck-recupera`);
    const recuperaProductText = await bodyText(page);
    assert.ok(normalized(recuperaProductText).includes("próximamente"), `${device}/kinecheck-recupera: falta estado Próximamente`);
    assert.ok(!recuperaProductText.includes("$9.990 CLP"), `${device}/kinecheck-recupera: reapareció precio operativo`);
    assert.equal(await page.locator('a[href*="pay.hotmart.com"]').count(), 0, `${device}/kinecheck-recupera: reapareció checkout público`);
    assert.ok(!/comprar/i.test(recuperaProductText), `${device}/kinecheck-recupera: reapareció CTA de compra`);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://kinecheck.cl/productos/kinecheck-recupera/", `${device}/kinecheck-recupera: canonical incorrecta`);
    await assertOpenGraph(page, `${device}/kinecheck-recupera`);
    await assertNoHorizontalOverflow(page, `${device}/kinecheck-recupera`);
    await assertImagesLoaded(page, `${device}/kinecheck-recupera`);

    for (const product of PRODUCTS) {
      const path = `/productos/${product.slug}/`;
      await open(page, path, `${device}/${product.slug}`);
      const text = await bodyText(page);
      const lower = normalized(text);
      assert.ok(lower.includes(normalized(product.name)), `${device}/${product.slug}: falta nombre`);
      assert.ok(text.includes(product.price), `${device}/${product.slug}: falta precio ${product.price}`);
      assert.ok(!lower.includes("ver ficha completa"), `${device}/${product.slug}: reapareció CTA de ficha genérica`);
      assert.ok((await page.locator(`a[href="${product.checkout}"]`).count()) >= 1, `${device}/${product.slug}: checkout incorrecto`);
      assert.ok((await page.locator('a[href*="academy/"]').count()) >= 1, `${device}/${product.slug}: falta Academy`);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://kinecheck.cl/productos/${product.slug}/`, `${device}/${product.slug}: canonical incorrecta`);
      await assertOpenGraph(page, `${device}/${product.slug}`);
      await assertNoHorizontalOverflow(page, `${device}/${product.slug}`);
      await assertImagesLoaded(page, `${device}/${product.slug}`);
    }

    await open(page, "/productos/?producto=comunicacion-clinica", `${device}/legacy-product-query`);
    await page.waitForURL((url) => url.pathname === "/productos/comunicacion-clinica/", { timeout: 15000 });
    assert.equal(page.url().split("?")[0], `${BASE}/productos/comunicacion-clinica/`, `${device}: query antigua no redirige a canonical`);

    await open(page, "/productos/", `${device}/legacy-product-root`);
    await page.waitForURL((url) => url.pathname === "/" && url.hash === "#productos", { timeout: 15000 });

    await open(page, "/legal/reembolsos.html", `${device}/reembolsos`);
    const refund = await bodyText(page);
    assert.ok(refund.includes("Última actualización: 12 de agosto de 2026"), `${device}/reembolsos: versión antigua en producción`);
    assert.ok(!refund.includes("Pendiente de certificación comercial"), `${device}/reembolsos: nota interna visible`);
    assert.ok(refund.includes("10 días"), `${device}/reembolsos: falta referencia operativa al retracto`);
    await assertNoHorizontalOverflow(page, `${device}/reembolsos`);

    await context.close();
  }

  console.log(JSON.stringify({ status: "passed", products: PRODUCTS.length, viewports: VIEWPORTS.map(([name]) => name) }, null, 2));
} finally {
  await browser.close();
}
