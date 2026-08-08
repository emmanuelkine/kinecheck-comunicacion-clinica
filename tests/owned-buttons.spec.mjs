import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX_SCRIPT = path.join(ROOT, "academy", "academy-recommended-buttons-fix.js");

const applications = ["kinecheck-estudiante", "kinecheck-recupera"];
const courses = [
  "kinecheck-clinico-curso",
  "comunicacion-clinica",
  "mas-alla-del-dolor",
  "evidencia-aplicada",
  "traumatologia-ortopedia-clinica",
];

test.use({ viewport: { width: 1440, height: 900 } });

async function installHarness(page) {
  await page.setContent(`
    <!doctype html>
    <html><head></head><body>
      <div id="kc-toast" hidden></div>
      <section id="home-app-grid"></section>
      <section id="home-course-grid"></section>
      <section id="course-grid"></section>
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
}

test("los botones de aplicaciones en Mis productos abren la aplicación exacta", async ({ page }) => {
  await installHarness(page);

  await page.evaluate((slugs) => {
    document.querySelector("#home-app-grid").innerHTML = slugs.map((slug) => `
      <article><button type="button" data-kc-open-product="${slug}">Abrir</button></article>
    `).join("");
  }, applications);

  for (const product of applications) {
    await page.locator(`[data-kc-open-product="${product}"]`).click();
  }

  await expect.poll(async () => page.evaluate(() => window.__openedProducts)).toEqual(
    applications.map((product) => ({ product, text: "Abrir" })),
  );
});

test("los botones de cursos en Inicio y Mis cursos abren el curso exacto", async ({ page }) => {
  await installHarness(page);

  await page.evaluate((slugs) => {
    document.querySelector("#home-course-grid").innerHTML = slugs.slice(0, 2).map((slug) => `
      <article><button type="button" data-kc-open-product="${slug}">Continuar</button></article>
    `).join("");
    document.querySelector("#course-grid").innerHTML = slugs.slice(2).map((slug) => `
      <article><button type="button" data-course="${slug}">Continuar</button></article>
    `).join("");
  }, courses);

  for (const product of courses.slice(0, 2)) {
    await page.locator(`[data-kc-open-product="${product}"]`).click();
  }
  for (const product of courses.slice(2)) {
    await page.locator(`#course-grid [data-course="${product}"]`).click();
  }

  await expect.poll(async () => page.evaluate(() => window.__openedProducts)).toEqual(
    courses.map((product) => ({ product, text: "Continuar" })),
  );
});

test("al volver a Academy se libera cualquier estado de navegación", async ({ page }) => {
  await installHarness(page);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect.poll(async () => page.evaluate(() => window.__navigationResets)).toBeGreaterThan(0);
});
