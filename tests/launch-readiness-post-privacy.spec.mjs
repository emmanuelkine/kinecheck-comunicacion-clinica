import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const VIEWPORTS = [
  ["mobile", { width: 390, height: 844 }],
  ["tablet", { width: 820, height: 1180 }],
  ["desktop", { width: 1440, height: 1000 }],
];
const RECUPERA_CHECKOUT = "https://pay.hotmart.com/P106806251E";

function normalize(text) {
  return String(text || "").replace(/\s+/g, " ");
}

async function text(page) {
  return normalize(await page.locator("body").innerText());
}

async function noOverflow(page, label) {
  const box = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert.ok(box.sw <= box.cw + 3, `${label}: overflow horizontal ${box.sw}/${box.cw}`);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const [device, viewport] of VIEWPORTS) {
    const context = await browser.newContext({ viewport, locale: "es-CL", timezoneId: "America/Santiago" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !/favicon|metric-event|cloudflareinsights/i.test(`${message.text()} ${message.location().url || ""}`)) errors.push(message.text());
    });

    await page.goto(`${BASE}/?qa=post-privacy-${device}-${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
    const home = await text(page);
    assert.ok(home.includes("KineCheck Clínico") && home.includes("KineCheck Estudiante") && home.includes("KineCheck Recupera"), `${device}: portada incompleta`);
    await noOverflow(page, `${device}/home`);

    await page.goto(`${BASE}/recupera/?qa=post-privacy-${device}-${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
    const recovery = await text(page);
    assert.ok(/Próximamente/i.test(recovery), `${device}: Recupera no aparece como Próximamente`);
    assert.ok(!recovery.includes("$9.990"), `${device}: Recupera vuelve a publicar precio operativo`);
    const recoveryLinks = await page.locator("a").evaluateAll((nodes) => nodes.map((node) => node.href).filter(Boolean));
    assert.ok(!recoveryLinks.includes(RECUPERA_CHECKOUT), `${device}: Recupera vuelve a exponer checkout Hotmart`);
    await noOverflow(page, `${device}/recupera`);

    await page.goto(`${BASE}/academy/?qa=post-privacy-${device}-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert.equal(await page.locator("#login-view").count(), 1, `${device}: falta login de Academy`);
    assert.equal(await page.locator("#kc-toast").count(), 1, `${device}: falta kc-toast`);
    assert.equal(await page.locator("#kc-bottom-nav").count(), 1, `${device}: falta navegación móvil`);
    assert.ok((await page.locator('[data-kc-view-link="biblioteca"]').count()) >= 1, `${device}: falta navegación Biblioteca`);
    await noOverflow(page, `${device}/academy`);

    assert.deepEqual(errors, [], `${device}: errores críticos de consola: ${errors.join(" | ")}`);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log("Launch readiness post-privacy OK en móvil, tablet y escritorio.");
