import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const PRODUCTS = [
  { slug: "kinecheck-clinico", name: "KineCheck Clínico", price: "$39.990", checkout: "https://pay.hotmart.com/L106791841D" },
  { slug: "kinecheck-estudiante", name: "KineCheck Estudiante", price: "$14.990", checkout: "https://pay.hotmart.com/G106801166S" },
  { slug: "kinecheck-recupera", name: "KineCheck Recupera", price: "$9.990", checkout: "https://pay.hotmart.com/P106806251E" },
  { slug: "comunicacion-clinica", name: "Comunicación Clínica", price: "$19.900", checkout: "https://pay.hotmart.com/T106883983U" },
  { slug: "mas-alla-del-dolor", name: "Más allá del dolor", price: "$39.990", checkout: "https://pay.hotmart.com/W106888386Q" },
  { slug: "evidencia-aplicada", name: "Evidencia Aplicada", price: "$29.990", checkout: "https://pay.hotmart.com/F106921972I" },
  { slug: "traumatologia-ortopedia-clinica", name: "Traumatología y Ortopedia Clínica", price: "$35.900", checkout: "https://pay.hotmart.com/B106913952R" },
  { slug: "pack-estudiante", name: "Pack KineCheck Estudiante", price: "$49.900", checkout: "https://pay.hotmart.com/Q106891608M" },
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

async function assertOpenGraph(page, label) {
  for (const property of ["og:type", "og:locale", "og:site_name", "og:title", "og:description", "og:url"]) {
    const content = await page.locator(`meta[property="${property}"]`).getAttribute("content") || "";
    assert.ok(content.trim(), `${label}: falta ${property}`);
  }
}

async function assertPublicMenu(page, label, interactive) {
  const button = page.locator("[data-menu-button]");
  const navigation = page.locator("#public-navigation");
  assert.equal(await button.getAttribute("aria-expanded"), "false", `${label}: estado inicial de menú incorrecto`);
  assert.equal(await button.getAttribute("aria-label"), "Abrir menú", `${label}: nombre inicial de menú incorrecto`);
  assert.equal(await button.getAttribute("aria-controls"), "public-navigation", `${label}: aria-controls incorrecto`);
  assert.equal(await navigation.getAttribute("aria-label"), "Navegación principal", `${label}: navegación sin etiqueta`);
  assert.equal(await page.locator("h1").count(), 1, `${label}: debe existir un solo h1`);

  if (!interactive) return;
  await button.click();
  assert.equal(await button.getAttribute("aria-expanded"), "true", `${label}: el menú no informa apertura`);
  assert.equal(await button.getAttribute("aria-label"), "Cerrar menú", `${label}: nombre de cierre incorrecto`);
  await page.keyboard.press("Escape");
  assert.equal(await button.getAttribute("aria-expanded"), "false", `${label}: Escape no cierra el menú`);
  assert.equal(await button.getAttribute("aria-label"), "Abrir menú", `${label}: Escape no restaura el nombre`);
}

async function openPublicPage(page, path, device) {
  const join = path.includes("?") ? "&" : "?";
  await page.goto(`${BASE}${path}${join}qa=${device}-${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
}

async function assertCatalogDestination(page, context, device) {
  const catalog = page.locator(".kc-catalog-button");
  await catalog.waitFor({ state: "attached", timeout: 15000 });
  const href = await catalog.getAttribute("href") || "";

  if (href === "../#productos") return;

  // Compatibilidad con páginas que aún conserven en caché el enlace público heredado.
  assert.equal(href, "../kinecheck/", `${device}: enlace de catálogo interno inválido: ${href}`);
  const compatibilityPage = await context.newPage();
  try {
    await compatibilityPage.goto(new URL(href, page.url()).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
    await compatibilityPage.waitForURL((url) => url.origin === new URL(BASE).origin && url.pathname === "/" && url.hash === "#productos", { timeout: 15000 });
  } finally {
    await compatibilityPage.close();
  }
}

try {
  const noJsContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, locale: "es-CL" });
  try {
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto(`${BASE}/productos/?qa=no-js-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const noJsText = await pageText(noJsPage);
    assert.ok(noJsText.includes("KineCheck Clínico"), "sin JS: falta el producto clínico por defecto");
    assert.ok(noJsText.includes("12 meses desde la aprobación"), "sin JS: falta vigencia clínica");
    assert.ok(noJsText.includes("Kinesiólogos titulados"), "sin JS: falta público objetivo");
    assert.equal(await noJsPage.locator("[data-checkout]").first().getAttribute("href"), "https://pay.hotmart.com/L106791841D", "sin JS: checkout clínico incorrecto");
    assert.equal(await noJsPage.locator("[data-access]").first().getAttribute("href"), "../academy/", "sin JS: acceso no apunta a Academy");
    assert.equal(await noJsPage.locator('link[rel="canonical"]').getAttribute("href"), "https://kinecheck.cl/productos/", "sin JS: canonical incorrecto");
    await assertOpenGraph(noJsPage, "sin JS/productos");
    await checkOverflow(noJsPage, "sin JS/productos");
  } finally {
    await noJsContext.close();
  }

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
    await assertPublicMenu(page, `${device}/portada`, viewport.width <= 900);
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
    await assertOpenGraph(page, `${device}/profesionales`);
    await assertPublicMenu(page, `${device}/profesionales`, viewport.width <= 900);
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
    await assertOpenGraph(page, `${device}/estudiantes`);
    await assertPublicMenu(page, `${device}/estudiantes`, viewport.width <= 900);
    await checkOverflow(page, `${device}/estudiantes`);

    // Recupera: precio visible, vigencia y acceso limpio.
    await openPublicPage(page, "/recupera/", device);
    assert.equal(await page.locator("#incluye .price").count(), 1, `${device}: Recupera debe mostrar su precio en la sección principal`);
    const recoveryText = await pageText(page);
    assert.ok(recoveryText.includes("$9.990 CLP"), `${device}/recupera: falta precio`);
    assert.ok(recoveryText.includes("Acceso por 3 meses"), `${device}/recupera: falta vigencia`);
    assert.ok(recoveryText.includes("No diagnostica ni reemplaza una evaluación profesional"), `${device}/recupera: falta disclaimer de no diagnóstico`);
    await assertCleanAcademyLinks(page, `${device}/recupera`);
    await assertOpenGraph(page, `${device}/recupera`);
    await assertPublicMenu(page, `${device}/recupera`, viewport.width <= 900);
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
    assert.equal(await page.locator("[data-checkout]").first().getAttribute("href"), "https://pay.hotmart.com/L106791841D", `${device}/productos: CTA por defecto inválido`);
    await assertOpenGraph(page, `${device}/productos`);
    await checkOverflow(page, `${device}/productos`);

    // Las ocho fichas de producto siguen disponibles y enlazan a Hotmart/Academy.
    for (const { slug, name, price, checkout: expectedCheckout } of PRODUCTS) {
      await openPublicPage(page, `/productos/?producto=${encodeURIComponent(slug)}`, device);
      await page.waitForSelector("#product-title", { timeout: 15000 });
      await page.waitForSelector(".product-detail-price", { timeout: 15000 });
      const text = await pageText(page);
      assert.ok(text.includes(name), `${device}/${slug}: falta nombre del producto`);
      assert.ok(text.includes(price), `${device}/${slug}: falta ${price}`);
      const checkout = page.locator("[data-checkout]").first();
      assert.equal(await checkout.getAttribute("href"), expectedCheckout, `${device}/${slug}: checkout inválido`);
      const access = page.locator("[data-access]").first();
      const accessHref = await access.getAttribute("href") || "";
      assert.ok(accessHref.includes("/academy/") && !accessHref.includes("20260806-final5"), `${device}/${slug}: acceso a Academy inválido`);
      await assertOpenGraph(page, `${device}/${slug}`);
      await checkOverflow(page, `${device}/${slug}`);
    }

    // Ruta histórica y puerta única de acceso.
    const platformShell = await context.request.get(`${BASE}/platform/?qa=shell-${Date.now()}`);
    const platformSource = await platformShell.text();
    assert.ok(platformSource.includes('http-equiv="refresh"') && platformSource.includes("../academy/"), `${device}: /platform/ perdió su redirección de compatibilidad`);
    assert.ok(!platformSource.includes('id="login-view"'), `${device}: /platform/ no debe convertirse en aplicación independiente`);
    await openPublicPage(page, "/platform/", device);
    await page.waitForURL(/\/academy\//, { timeout: 15000 });
    assert.ok(page.url().includes("/academy/"), `${device}: /platform/ debe redirigir a Mi KineCheck`);
    await page.waitForSelector("#login-view", { timeout: 15000 });
    await page.waitForSelector("#auth-form", { timeout: 15000 });
    const privateText = await pageText(page);
    assert.ok(/Ingresa a KineCheck|Entra una vez/i.test(privateText), `${device}: falta una puerta de autenticación reconocible`);
    assert.ok(!/Academy clásica|PLATAFORMA 5\.0/i.test(privateText), `${device}: quedan nombres privados superpuestos`);
    await assertCatalogDestination(page, context, device);
    await checkOverflow(page, `${device}/mi-kinecheck`);

    const legacyRoutes = [
      ["/kinecheck/", (url) => url.pathname === "/" && url.hash === "#productos"],
      ["/kinecheck/profesionales/", (url) => url.pathname === "/profesionales/"],
      ["/kinecheck/estudiantes/", (url) => url.pathname === "/estudiantes/"],
      ["/kinecheck/recupera/", (url) => url.pathname === "/recupera/"],
    ];
    for (const [legacyPath, destination] of legacyRoutes) {
      await openPublicPage(page, legacyPath, device);
      await page.waitForURL((url) => url.origin === new URL(BASE).origin && destination(url), { timeout: 15000 });
    }

    assert.deepEqual(errors, [], `${device}: errores de navegador: ${errors.join(" | ")}`);
    report.push({ device, status: "passed", products: PRODUCTS.length, publicProfiles: 3 });
    await context.close();
  }

  console.log(JSON.stringify({ status: "passed", report }, null, 2));
} finally {
  await browser.close();
}
