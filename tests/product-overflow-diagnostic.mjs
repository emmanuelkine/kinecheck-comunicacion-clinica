import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const NO_JS = process.env.NO_JS === "1";
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    javaScriptEnabled: !NO_JS,
    viewport: { width: 390, height: 844 },
    locale: "es-CL",
    timezoneId: "America/Santiago",
    extraHTTPHeaders: {
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
  const page = await context.newPage();
  const failedResources = [];
  page.on("response", (response) => {
    if (response.status() >= 400 && ["stylesheet", "image"].includes(response.request().resourceType())) {
      failedResources.push({ status: response.status(), url: response.url() });
    }
  });
  const target = `${BASE}/productos/kinecheck-clinico/?qa=overflow-${NO_JS ? "nojs" : "js"}-${Date.now()}`;
  const response = await page.goto(target, {
    // DOMContentLoaded can precede CSS/image completion without deferred JS.
    // Measure the rendered layout after the load event in the no-JS case.
    waitUntil: NO_JS ? "load" : "networkidle",
    timeout: 60000,
  });
  assert.ok(response && response.status() < 500, `La ficha canónica respondió ${response?.status() ?? "sin respuesta"}`);

  const stylesheets = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((link) => ({ href: link.href, loaded: Boolean(link.sheet) })));
  assert.ok(stylesheets.length > 0, "La ficha debe declarar sus estilos");
  assert.deepEqual(stylesheets.filter((sheet) => !sheet.loaded), [], `Estilos sin cargar: ${JSON.stringify({ stylesheets, failedResources })}`);
  const brokenBrandImages = await page.locator("header img, footer img").evaluateAll((images) => images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc || image.src));
  assert.deepEqual(brokenBrandImages, [], `Logotipos sin cargar: ${JSON.stringify({ brokenBrandImages, failedResources })}`);
  assert.deepEqual(failedResources, [], "Las dependencias visuales no deben devolver errores HTTP");

  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const normalized = text.toLocaleLowerCase("es-CL");
  assert.ok(normalized.includes("kinecheck clínico"), "La ficha canónica no muestra KineCheck Clínico");
  assert.ok(text.includes("$39.990 CLP"), "La ficha canónica no muestra el precio esperado");
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  assert.equal(canonical, "https://kinecheck.cl/productos/kinecheck-clinico/");

  const result = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll("body *")]
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || "",
          className: typeof el.className === "string" ? el.className : "",
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          display: style.display,
          position: style.position,
          whiteSpace: style.whiteSpace,
          text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
        };
      })
      .filter((item) => item.right > viewport + 1 || item.left < -1 || item.scrollWidth > item.clientWidth + 3)
      .sort((a, b) => Math.max(b.right - viewport, b.scrollWidth - b.clientWidth) - Math.max(a.right - viewport, a.scrollWidth - a.clientWidth))
      .slice(0, 25);

    return {
      viewport,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders,
    };
  });

  console.log(JSON.stringify({ mode: NO_JS ? "no-js" : "js", target, ...result }, null, 2));
  assert.ok(
    result.documentScrollWidth <= result.viewport + 3,
    `Overflow móvil (${NO_JS ? "sin JS" : "con JS"}) en ficha canónica: ${result.documentScrollWidth}/${result.viewport}`,
  );
  await context.close();
} finally {
  await browser.close();
}
