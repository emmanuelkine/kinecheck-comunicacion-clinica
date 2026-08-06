import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX_SCRIPT = path.join(ROOT, "academy", "academy-recommended-buttons-fix.js");

const products = [
  "mas-alla-del-dolor",
  "traumatologia-ortopedia-clinica",
  "comunicacion-clinica",
  "evidencia-aplicada",
];

test.use({ viewport: { width: 1440, height: 900 } });

test("los cuatro botones dinámicos abren su producto exacto", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html><head></head><body>
      <div id="kc-toast" hidden></div>
      <div id="kc-stage-recommendations"></div>
    </body></html>
  `);

  await page.evaluate(() => {
    window.__openedProducts = [];
    window.__navigationResets = 0;
    window.KINECHECK_RESET_PRODUCT_NAVIGATION = () => {
      window.__navigationResets += 1;
    };
    window.KINECHECK_OPEN_PRODUCT = async (product, button) => {
      window.__openedProducts.push({ product, text: button.textContent.trim() });
    };
  });

  await page.addScriptTag({ path: FIX_SCRIPT });

  await page.evaluate((slugs) => {
    const container = document.querySelector("#kc-stage-recommendations");
    container.innerHTML = slugs.map((slug) => `
      <article>
        <button type="button" data-kc-path-open="${slug}">Continuar</button>
      </article>
    `).join("");
  }, products);

  for (const product of products) {
    await page.locator(`[data-kc-path-open="${product}"]`).click();
  }

  await expect.poll(async () => page.evaluate(() => window.__openedProducts)).toEqual(
    products.map((product) => ({ product, text: "Continuar" })),
  );
});

test("al regresar al ecosistema se libera cualquier navegación bloqueada", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html><head></head><body>
      <div id="kc-toast" hidden></div>
      <div id="kc-stage-recommendations">
        <button type="button" data-kc-path-open="comunicacion-clinica" aria-busy="true">Abriendo…</button>
      </div>
    </body></html>
  `);

  await page.evaluate(() => {
    window.__openedProducts = [];
    window.__navigationResets = 0;
    window.KINECHECK_RESET_PRODUCT_NAVIGATION = () => {
      window.__navigationResets += 1;
      document.querySelectorAll('[aria-busy="true"]').forEach((button) => {
        button.removeAttribute("aria-busy");
        button.style.pointerEvents = "";
      });
    };
    window.KINECHECK_OPEN_PRODUCT = async (product) => {
      window.__openedProducts.push(product);
    };
  });

  await page.addScriptTag({ path: FIX_SCRIPT });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));

  await expect.poll(async () => page.evaluate(() => window.__navigationResets)).toBeGreaterThan(0);
  await page.locator('[data-kc-path-open="comunicacion-clinica"]').click();
  await expect.poll(async () => page.evaluate(() => window.__openedProducts)).toEqual(["comunicacion-clinica"]);
});
