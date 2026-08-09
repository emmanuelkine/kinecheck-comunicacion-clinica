import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX_SCRIPT = path.join(ROOT, "academy", "academy-recommended-buttons-fix.js");
const OPEN_SCRIPT = path.join(ROOT, "academy", "academy-open-v6.js");
const MI_SCRIPT = path.join(ROOT, "academy", "mi-kinecheck-v1.js");
const BRIDGE_SCRIPT = path.join(ROOT, "academy", "academy-owned-native-bridge-v1.js");

test.use({ viewport: { width: 1440, height: 900 } });

async function installNativeHarness(page) {
  await page.setContent(`
    <!doctype html>
    <html><head></head><body data-kc-experience="professional">
      <div id="kc-toast" hidden></div>
      <section id="dashboard-view"></section>
      <section id="inicio"></section>
      <section id="home-app-grid"></section>
      <section id="home-course-grid"></section>
      <section id="guided-route"></section>
      <section id="course-grid"></section>
      <button id="continue-button" type="button">Continuar</button>
    </body></html>
  `);

  await page.evaluate(() => {
    window.__nativeHome = [];
    window.__nativeLibrary = [];
    window.KINECHECK_ACADEMY_CONFIG = { ownerEmails: [] };

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-kc-open-product]");
      if (button) window.__nativeHome.push(button.dataset.kcOpenProduct);
    });

    document.querySelector("#course-grid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-course]");
      if (button && !button.disabled) window.__nativeLibrary.push(button.dataset.course);
    });
  });

  await page.addScriptTag({ path: OPEN_SCRIPT });
  await page.addScriptTag({ path: FIX_SCRIPT });
}

test("Inicio deja pasar data-kc-open-product al flujo nativo", async ({ page }) => {
  await installNativeHarness(page);

  await page.evaluate(() => {
    document.querySelector("#home-app-grid").innerHTML = `
      <article><button type="button" data-kc-open-product="kinecheck-estudiante">Abrir</button></article>
    `;
  });

  await page.locator('[data-kc-open-product="kinecheck-estudiante"]').click();
  await expect.poll(async () => page.evaluate(() => window.__nativeHome)).toEqual(["kinecheck-estudiante"]);
});

test("Mis productos deja pasar data-course al openCourse nativo", async ({ page }) => {
  await installNativeHarness(page);

  await page.evaluate(() => {
    document.querySelector("#course-grid").innerHTML = `
      <article><button type="button" data-course="kinecheck-estudiante">Abrir desde biblioteca</button></article>
    `;
  });

  await page.locator('#course-grid [data-course="kinecheck-estudiante"]').click();
  await expect.poll(async () => page.evaluate(() => window.__nativeLibrary)).toEqual(["kinecheck-estudiante"]);
});

test("el bridge de window gana a interceptores de document y termina en el botón nativo", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html><head></head><body>
      <section id="inicio">
        <button type="button" data-kc-open-product="kinecheck-estudiante">Abrir Estudiante</button>
        <button type="button" data-kc-open-owned="kinecheck-recupera">Abrir Recupera</button>
      </section>
      <section id="course-grid">
        <button type="button" data-course="kinecheck-estudiante">Nativo Estudiante</button>
        <button type="button" data-course="kinecheck-recupera">Nativo Recupera</button>
      </section>
    </body></html>
  `);

  await page.evaluate(() => {
    window.__nativeLibrary = [];
    window.__blockedAtDocument = 0;

    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-kc-open-product], [data-kc-open-owned]")) return;
      window.__blockedAtDocument += 1;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    document.querySelector("#course-grid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-course]");
      if (button && !button.disabled) window.__nativeLibrary.push(button.dataset.course);
    });
  });

  await page.addScriptTag({ path: BRIDGE_SCRIPT });

  await page.locator('[data-kc-open-product="kinecheck-estudiante"]').click();
  await page.locator('[data-kc-open-owned="kinecheck-recupera"]').click();

  await expect.poll(async () => page.evaluate(() => window.__nativeLibrary)).toEqual([
    "kinecheck-estudiante",
    "kinecheck-recupera",
  ]);
  await expect.poll(async () => page.evaluate(() => window.__blockedAtDocument)).toBe(0);
});

test("los botones Abrir de la ruta guiada reutilizan el flujo nativo de Mis productos", async ({ page }) => {
  const guidedProducts = ["kinecheck-estudiante", "kinecheck-recupera", "comunicacion-clinica"];
  await installNativeHarness(page);

  await page.evaluate((slugs) => {
    document.querySelector("#guided-route").innerHTML = slugs.map((slug) => `
      <article><button type="button" data-kc-open-owned="${slug}">Abrir</button></article>
    `).join("");
    document.querySelector("#course-grid").innerHTML = slugs.map((slug) => `
      <article><button type="button" data-course="${slug}">Abrir desde biblioteca</button></article>
    `).join("");
  }, guidedProducts);

  await page.addScriptTag({ path: MI_SCRIPT });

  for (const product of guidedProducts) {
    await page.locator(`#guided-route [data-kc-open-owned="${product}"]`).click();
  }

  await expect.poll(async () => page.evaluate(() => window.__nativeLibrary)).toEqual(guidedProducts);
});

test("las recomendaciones especiales conservan el router alternativo", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html><head></head><body>
      <div id="kc-toast" hidden></div>
      <section id="kc-stage-recommendations">
        <button type="button" data-kc-path-open="comunicacion-clinica">Abrir recomendación</button>
      </section>
    </body></html>
  `);

  await page.evaluate(() => {
    window.__recommended = [];
    window.KINECHECK_OPEN_PRODUCT = async (product) => { window.__recommended.push(product); };
    window.KINECHECK_RESET_PRODUCT_NAVIGATION = () => {};
  });
  await page.addScriptTag({ path: FIX_SCRIPT });

  await page.locator('[data-kc-path-open="comunicacion-clinica"]').click();
  await expect.poll(async () => page.evaluate(() => window.__recommended)).toEqual(["comunicacion-clinica"]);
});

test("al volver a Academy se libera cualquier estado de navegación", async ({ page }) => {
  await page.setContent('<!doctype html><html><body><div id="kc-toast" hidden></div></body></html>');
  await page.evaluate(() => {
    window.__navigationResets = 0;
    window.KINECHECK_RESET_PRODUCT_NAVIGATION = () => { window.__navigationResets += 1; };
  });
  await page.addScriptTag({ path: FIX_SCRIPT });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect.poll(async () => page.evaluate(() => window.__navigationResets)).toBeGreaterThan(0);
});