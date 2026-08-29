import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLINICO_GUARD = path.join(ROOT, "kinecheck-clinico-guia", "privacy-guard-v1.js");

test.use({ viewport: { width: 390, height: 844 } });

test("Clínico muestra guard contextual y marca educativa de impresión", async ({ page }) => {
  await page.setContent(`<!doctype html><html><head></head><body>
    <form id="guide-form"><label>Hipótesis<input type="text"></label><label>Notas<textarea></textarea></label></form>
    <section class="synthesis-panel"><pre>Resumen ficticio</pre></section>
  </body></html>`);
  await page.addScriptTag({ path: CLINICO_GUARD });

  await expect(page.locator(".kc-privacy-field-warning")).toHaveCount(2);
  await expect(page.locator(".kc-privacy-field-warning").first()).toContainText("información ficticia, simulada o debidamente anonimizada");
  await expect(page.locator(".kc-educational-document-label")).toHaveText("Documento educativo — no corresponde a una ficha clínica");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".kc-educational-document-label")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("portal Estudiantes mantiene advertencias junto a sus textos libres", async ({ page }) => {
  await page.goto(`${BASE}/portal-estudiantes/?qa=privacy-${Date.now()}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#studentPrivacyGuidance")).toContainText("No ingreses nombres, RUT, teléfonos, correos, números de ficha ni información de pacientes reales");
  await expect(page.locator("#expectationsPrivacy")).toContainText("No incluyas datos identificables");
  await expect(page.locator("#experiencePrivacy")).toContainText("no relates casos ni datos de pacientes reales");
  await expect(page.locator("#priorExperience")).toHaveAttribute("placeholder", /actividades académicas simuladas/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("consentimiento legacy de Recupera no contiene controles de captura", async ({ page }) => {
  await page.goto(`${BASE}/recupera/consentimiento.html?qa=privacy-${Date.now()}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#recupera-paused-status")).toContainText("No está disponible para compra, acceso ni registro de información");
  await expect(page.locator("form, input, textarea, select, button")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
