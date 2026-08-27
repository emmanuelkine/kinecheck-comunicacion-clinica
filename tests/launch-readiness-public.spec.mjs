import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const IS_LOCAL = ["127.0.0.1", "localhost"].includes(new URL(BASE).hostname);
const PRODUCTS = [
  { slug: "kinecheck-clinico", name: "KineCheck Clínico", family: "KINECHECK FORMACIÓN", price: "$39.990", checkout: "https://pay.hotmart.com/L106791841D" },
  { slug: "kinecheck-estudiante", name: "KineCheck Estudiante", family: "KineCheck Apps", price: "$14.990", checkout: "https://pay.hotmart.com/G106801166S" },
  { slug: "comunicacion-clinica", name: "Comunicación Clínica", family: "KineCheck Formación", price: "$19.900", checkout: "https://pay.hotmart.com/T106883983U" },
  { slug: "mas-alla-del-dolor", name: "Más allá del dolor", family: "KineCheck Formación", price: "$39.990", checkout: "https://pay.hotmart.com/W106888386Q" },
  { slug: "evidencia-aplicada", name: "Evidencia Aplicada", family: "KineCheck Formación", price: "$29.990", checkout: "https://pay.hotmart.com/F106921972I" },
  { slug: "traumatologia-ortopedia-clinica", name: "Traumatología y Ortopedia Clínica", family: "KineCheck Formación", price: "$35.900", checkout: "https://pay.hotmart.com/B106913952R" },
  { slug: "pack-estudiante", name: "Pack KineCheck Estudiante", family: "KineCheck Packs", price: "$49.900", checkout: "https://pay.hotmart.com/Q106891608M" },
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
  if (await button.count() === 0) {
    const staticNavigation = page.locator("header nav");
    assert.equal(await staticNavigation.count(), 1, `${label}: falta navegación principal`);
    assert.equal(await staticNavigation.getAttribute("aria-label"), "Navegación principal", `${label}: navegación estática sin etiqueta`);
    assert.equal(await page.locator("h1").count(), 1, `${label}: debe existir un solo h1`);
    return;
  }
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
  await page.goto(`${BASE}${path}${join}qa=${device}-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 30000 });
}

async function assertCatalogDestination(page, context, device) {
  const legacyCatalog = page.locator(".kc-catalog-button");
  const catalog = (await legacyCatalog.count()) > 0 ? legacyCatalog : page.locator('a[href="../#productos"]').first();
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
    assert.ok(noJsText.includes("KINECHECK FORMACIÓN"), "sin JS: falta familia del producto clínico");
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
    if (IS_LOCAL) {
      await page.route("https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1/metric-event", (route) => route.fulfill({ status: 204, body: "" }));
      await page.route(`${BASE}/api/health`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"status":"ok"}' }));
    }
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message} @ ${page.url()}`));
    page.on("console", (message) => {
      const source = message.location().url || "origen desconocido";
      const detail = `${message.text()} ${source}`;
      const cloudflareAnalyticsError = /(?:^|[^a-z0-9.-])(?:static\.)?cloudflareinsights\.com(?:[^a-z0-9.-]|$)/i.test(detail)
        || /(?:^|[^a-z0-9.])beacon\.min\.js(?:[^a-z0-9.]|$)/i.test(detail);
      const allowedError = /favicon|metric-event/i.test(detail) || cloudflareAnalyticsError;
      if (message.type() === "error" && !allowedError) {
        errors.push(`console: ${message.text()} @ ${source}`);
      }
    });

    // Portada vigente: tres experiencias y Recupera explícitamente pausado.
    await openPublicPage(page, "/", device);
    await page.waitForSelector("#contenido", { timeout: 20000 });
    assert.equal(await page.locator(".audience-card").count(), 3, `${device}: deben existir tres experiencias por perfil`);
    const homeText = await pageText(page);
    assert.ok(homeText.includes("KineCheck Recupera") && homeText.includes("Próximamente"), `${device}: la portada no comunica que Recupera está pausado`);
    assert.ok(homeText.includes("privacidad") && homeText.includes("protección de datos"), `${device}: la portada no explica el bloqueo de Recupera`);
    assert.ok(!homeText.includes("$9.990"), `${device}: la portada expone el precio de Recupera pausado`);
    assert.equal(await page.locator('a[href*="P106806251E"]').count(), 0, `${device}: la portada expone el checkout de Recupera pausado`);
    assert.equal(await page.locator("#confianza").count(), 0, `${device}: reapareció la sección de autor retirada del main vigente`);
    assert.ok(!homeText.includes("$59.900"), `${device}: aparece precio antiguo del pack`);
    assert.ok(!/Academy clásica|PLATAFORMA 5\.0/i.test(homeText), `${device}: aparecen experiencias retiradas`);
    assert.ok((await page.locator('a[href^="mailto:soporte.kinecheck@gmail.com"]').count()) >= 1, `${device}: soporte de portada no es funcional`);
    await assertCleanAcademyLinks(page, `${device}/portada`);
    await assertPublicMenu(page, `${device}/portada`, viewport.width <= 900);
    await checkOverflow(page, `${device}/portada`);

    // Profesionales: seis cursos disponibles, precios y CTA honestos.
    await openPublicPage(page, "/profesionales/", device);
    assert.equal(await page.locator("#cursos .product").count(), 6, `${device}: profesionales debe mostrar seis cursos disponibles`);
    assert.equal(await page.locator("#cursos .price").count(), 6, `${device}: profesionales debe mostrar seis precios`);
    assert.equal(await page.locator("#cursos .tag", { hasText: "PRÓXIMAMENTE" }).count(), 0, `${device}: profesionales no debe presentar cursos disponibles como próximos`);
    const professionalText = await pageText(page);
    for (const price of ["$39.990 CLP", "$19.900 CLP", "$29.990 CLP", "$35.900 CLP"]) {
      assert.ok(professionalText.includes(price), `${device}/profesionales: falta ${price}`);
    }
    const professionalCheckoutLabels = await page.locator('a[href*="pay.hotmart.com"]').allInnerTexts();
    assert.ok(professionalCheckoutLabels.every((label) => label.trim() !== "Ver curso"), `${device}/profesionales: un checkout sigue rotulado como “Ver curso”`);
    assert.equal(await page.locator("#cursos .product.featured").count(), 2, `${device}/profesionales: deben distinguirse los dos cursos destacados`);
    for (const course of ["KineCheck Clínico", "Dolor Lumbar Persistente", "Comunicación Clínica", "Más allá del Dolor", "Evidencia Aplicada", "Traumatología y Ortopedia Clínica"]) {
      assert.ok(professionalText.includes(course), `${device}/profesionales: falta ${course}`);
    }
    assert.ok(professionalText.includes("KINECHECK FORMACIÓN") && professionalText.includes("CURSO-APLICACIÓN KINECHECK"), `${device}/profesionales: arquitectura de Formación incompleta`);
    assert.ok(!professionalText.includes("Registro kinésico profesional"), `${device}/profesionales: Clínico volvió a presentarse como aplicación de registro`);
    await assertCleanAcademyLinks(page, `${device}/profesionales`);
    await assertOpenGraph(page, `${device}/profesionales`);
    await assertPublicMenu(page, `${device}/profesionales`, viewport.width <= 900);
    await checkOverflow(page, `${device}/profesionales`);

    // Estudiantes: cinco opciones, precios completos y badge unificado.
    await openPublicPage(page, "/estudiantes/", device);
    assert.equal(await page.locator("#opciones .product").count(), 5, `${device}: estudiantes debe mostrar cinco productos`);
    assert.equal(await page.locator("#opciones .price").count(), 5, `${device}: estudiantes debe mostrar cinco precios`);
    const studentText = await pageText(page);
    for (const price of ["$14.990 CLP", "$39.990 CLP", "$49.900 CLP", "$19.900 CLP", "$29.990 CLP"]) {
      assert.ok(studentText.includes(price), `${device}/estudiantes: falta ${price}`);
    }
    assert.ok(studentText.includes("RECOMENDADO"), `${device}/estudiantes: falta badge RECOMENDADO`);
    assert.ok(!studentText.includes("PRODUCTO PRINCIPAL"), `${device}/estudiantes: conserva badge anterior`);
    const studentCheckoutLabels = await page.locator('a[href*="pay.hotmart.com"]').allInnerTexts();
    assert.ok(studentCheckoutLabels.every((label) => label.trim() !== "Ver curso"), `${device}/estudiantes: un checkout sigue rotulado como “Ver curso”`);
    assert.ok(studentText.includes("KINECHECK APPS") && studentText.includes("KINECHECK FORMACIÓN") && studentText.includes("KINECHECK PACKS") && studentText.includes("CURSO-APLICACIÓN KINECHECK"), `${device}/estudiantes: arquitectura de marca incompleta`);
    await assertCleanAcademyLinks(page, `${device}/estudiantes`);
    await assertOpenGraph(page, `${device}/estudiantes`);
    await assertPublicMenu(page, `${device}/estudiantes`, viewport.width <= 900);
    await checkOverflow(page, `${device}/estudiantes`);

    // Recupera: bloqueo explícito, sin precio, checkout ni captura de datos.
    await openPublicPage(page, "/recupera/", device);
    const recoveryText = await pageText(page);
    assert.ok(recoveryText.includes("PRÓXIMAMENTE"), `${device}/recupera: falta estado Próximamente`);
    assert.ok(recoveryText.includes("No se encuentra disponible para compra ni para registro de datos"), `${device}/recupera: falta bloqueo explícito`);
    assert.ok(!recoveryText.includes("$9.990") && !recoveryText.includes("Acceso por 3 meses"), `${device}/recupera: expone condiciones comerciales mientras está pausado`);
    assert.equal(await page.locator('a[href*="pay.hotmart.com"]').count(), 0, `${device}/recupera: expone checkout mientras está pausado`);
    assert.equal(await page.locator("form, input, textarea, select").count(), 0, `${device}/recupera: conserva captura de datos mientras está pausado`);
    await assertCleanAcademyLinks(page, `${device}/recupera`);
    await assertOpenGraph(page, `${device}/recupera`);
    await assertPublicMenu(page, `${device}/recupera`, viewport.width <= 900);
    await checkOverflow(page, `${device}/recupera`);

    // La ruta legacy conserva compatibilidad y redirige a la ficha canónica exacta.
    await openPublicPage(page, "/productos/?producto=kinecheck-clinico", device);
    await page.waitForURL((url) => url.pathname === "/productos/kinecheck-clinico/", { timeout: 15000 });
    await page.getByRole("heading", { name: "Evaluación, seguridad y razonamiento musculoesquelético." }).waitFor({ timeout: 15000 });
    const defaultProductText = await pageText(page);
    assert.equal(await page.title(), "KineCheck Clínico | Curso profesional", `${device}/productos: la ruta legacy no abrió Clínico`);
    assert.ok(defaultProductText.includes("$39.990 CLP"), `${device}/productos: falta precio de Clínico`);
    assert.ok((await page.locator('a[href="https://pay.hotmart.com/L106791841D"]').count()) >= 1, `${device}/productos: CTA clínico incorrecto`);
    assert.ok((await page.locator('a[href*="academy/"]').count()) >= 1, `${device}/productos: falta acceso a Academy`);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://kinecheck.cl/productos/kinecheck-clinico/", `${device}/productos: canonical de Clínico incorrecta`);
    await assertOpenGraph(page, `${device}/productos/kinecheck-clinico`);
    await checkOverflow(page, `${device}/productos/kinecheck-clinico`);

    // Las siete fichas activas siguen disponibles y enlazan a Hotmart/Academy.
    for (const { slug, name, price, checkout: expectedCheckout } of PRODUCTS) {
      await openPublicPage(page, `/productos/${encodeURIComponent(slug)}/`, device);
      const text = await pageText(page);
      assert.ok((await page.title()).includes(name), `${device}/${slug}: falta nombre del producto`);
      assert.ok(text.includes(price), `${device}/${slug}: falta ${price}`);
      assert.ok((await page.locator(`a[href="${expectedCheckout}"]`).count()) >= 1, `${device}/${slug}: checkout inválido`);
      const accessHrefs = await page.locator('a[href*="academy/"]').evaluateAll((links) => links.map((link) => link.href));
      assert.ok(accessHrefs.length > 0 && accessHrefs.every((href) => !href.includes("20260806-final5")), `${device}/${slug}: acceso a Academy inválido`);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://kinecheck.cl/productos/${slug}/`, `${device}/${slug}: canonical incorrecta`);
      await assertOpenGraph(page, `${device}/${slug}`);
      await checkOverflow(page, `${device}/${slug}`);
    }

    // La ficha histórica de Recupera sigue accesible solo como aviso bloqueado.
    await openPublicPage(page, "/productos/kinecheck-recupera/", device);
    const pausedRecoveryText = await pageText(page);
    assert.ok(pausedRecoveryText.includes("PRÓXIMAMENTE"), `${device}/productos/kinecheck-recupera: falta estado Próximamente`);
    assert.ok(pausedRecoveryText.includes("No disponible para compra ni registro de información"), `${device}/productos/kinecheck-recupera: falta bloqueo explícito`);
    assert.ok(!pausedRecoveryText.includes("$9.990"), `${device}/productos/kinecheck-recupera: expone precio`);
    assert.equal(await page.locator('a[href*="pay.hotmart.com"]').count(), 0, `${device}/productos/kinecheck-recupera: expone checkout`);
    assert.equal(await page.locator("form, input, textarea, select").count(), 0, `${device}/productos/kinecheck-recupera: conserva captura de datos`);
    await assertOpenGraph(page, `${device}/productos/kinecheck-recupera`);
    await checkOverflow(page, `${device}/productos/kinecheck-recupera`);

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
    const authSubmitText = (await page.locator("#auth-submit").innerText()).trim();
    assert.match(authSubmitText, /^(?:Ingresar a KineCheck|Entrar a Mi KineCheck)$/i, `${device}: CTA de autenticación irreconocible`);
    assert.ok(privateText.includes("Si compraste en Hotmart, usa el mismo correo de la compra."), `${device}: falta contexto del correo de compra`);
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
