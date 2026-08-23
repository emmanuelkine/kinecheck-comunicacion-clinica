import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRIDGE_SCRIPT = path.join(ROOT, "academy", "academy-owned-native-bridge-v1.js");
const ACCESS_RECOVERY_SCRIPT = path.join(ROOT, "academy", "academy-access-recovery-v1.js");
const MI_SCRIPT = path.join(ROOT, "academy", "mi-kinecheck-v1.js");
const SIMPLIFY_SCRIPT = path.join(ROOT, "academy", "mi-kinecheck-simplify-v2.js");

test.use({ viewport: { width: 390, height: 844 } });

async function installHarness(page) {
  await page.setContent(`
    <!doctype html>
    <html><head></head><body data-kc-view="inicio" data-kc-experience="professional">
      <div id="kc-toast" hidden></div>
      <button id="mobile-menu" type="button" aria-expanded="false">Menu</button>
      <div id="sidebar-overlay" hidden style="position:fixed;inset:0;z-index:10"></div>
      <aside id="academy-sidebar"></aside>
      <div id="support-panel" hidden></div>
      <button id="support-launcher" data-support-open aria-expanded="false">Soporte</button>

      <nav>
        <a id="nav-inicio" href="#inicio" data-kc-view-link="inicio">Inicio</a>
        <a id="nav-productos" href="#biblioteca" data-kc-view-link="biblioteca">Mis productos</a>
        <a id="nav-recursos" href="#herramientas" data-kc-view-link="herramientas">Recursos</a>
        <a id="nav-cuenta" href="#perfil" data-kc-view-link="perfil">Cuenta y ayuda</a>
      </nav>

      <button id="onboarding-action" type="button" data-kc-view-link="biblioteca">Mis productos</button>
      <button id="simple-resources" type="button" data-mi-kc-view="herramientas">Abrir recursos</button>

      <section id="course-grid">
        <button type="button" data-course="comunicacion-clinica">Comunicación</button>
        <button type="button" data-course="kinecheck-clinico-curso">Clínico curso</button>
        <button type="button" data-course="traumatologia-ortopedia-clinica">Trauma</button>
        <button type="button" data-course="kinecheck-recupera">Recupera</button>
        <button type="button" data-course="evidencia-aplicada">Evidencia</button>
        <button type="button" data-course="dolor-lumbar-persistente">Dolor lumbar</button>
        <button type="button" data-course="dolor-musculoesqueletico">Dolor musculoesquelético</button>
        <button type="button" data-course="banderas-clinicas">Banderas</button>
      </section>

      <button id="home-clinico" type="button" data-kc-open-product="kinecheck-clinico">Clínico</button>
      <button id="owned-student" type="button" data-kc-open-owned="kinecheck-estudiante">Estudiante</button>
      <button id="recommended-pain" type="button" data-kc-path-open="mas-alla-del-dolor">Dolor</button>
      <button id="home-recupera" type="button" data-kc-open-product="kinecheck-recupera">Recupera home</button>
      <button id="continue-button" type="button" data-course="evidencia-aplicada">Continuar</button>
      <button id="kc-home-continue" type="button">Continuar actividad</button>
    </body></html>
  `);

  await page.evaluate(() => {
    window.__openedCore = [];
    window.__openedUnified = [];
    window.__nativeGridClicks = [];
    window.__nativeContinueClicks = [];
    window.__nativeProxyClicks = [];

    window.openCourse = async (slug) => {
      window.__openedCore.push(slug);
    };
    window.KINECHECK_OPEN_PRODUCT = async (slug) => {
      window.__openedUnified.push(slug);
    };

    document.querySelector("#course-grid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-course]");
      if (button) window.__nativeGridClicks.push(button.dataset.course);
    });
    document.querySelector("#continue-button").addEventListener("click", (event) => {
      window.__nativeContinueClicks.push(event.currentTarget.dataset.course);
    });
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-kc-open-product]");
      if (button) window.__nativeProxyClicks.push(button.dataset.kcOpenProduct);
    });
  });

  await page.addScriptTag({ path: BRIDGE_SCRIPT });
}

test("tarjetas dinámicas conservan su controlador nativo y el bridge no bloquea el clic", async ({ page }) => {
  await installHarness(page);

  await page.locator("#home-clinico").click();
  await page.locator("#owned-student").click();
  await page.locator("#recommended-pain").click();
  await page.locator("#home-recupera").click();

  await expect.poll(async () => page.evaluate(() => window.__nativeProxyClicks)).toEqual([
    "kinecheck-clinico",
    "kinecheck-recupera",
  ]);
  await expect.poll(async () => page.evaluate(() => window.__openedUnified)).toEqual([
    "kinecheck-estudiante",
    "mas-alla-del-dolor",
  ]);
  await expect.poll(async () => page.evaluate(() => window.__openedCore)).toEqual([]);
});

test("los cursos nuevos conservan el controlador nativo de la Biblioteca", async ({ page }) => {
  await installHarness(page);

  for (const slug of ["dolor-lumbar-persistente", "dolor-musculoesqueletico", "banderas-clinicas"]) {
    await page.locator(`#course-grid [data-course="${slug}"]`).click();
  }

  await expect.poll(async () => page.evaluate(() => window.__nativeGridClicks)).toEqual([
    "dolor-lumbar-persistente",
    "dolor-musculoesqueletico",
    "banderas-clinicas",
  ]);
});

test("productos activos permiten verificar acceso y los que están en preparación usan CTA correcto", async ({ page }) => {
  await page.setContent(`
    <!doctype html><html><head></head><body>
      <div id="library-message" hidden></div>
      <div class="kc-home-product-explorer"></div>
      <section id="course-grid">
        <article data-card-course="dolor-musculoesqueletico">
          <span class="status-badge">No adquirido</span>
          <h3>Dolor Musculoesquelético</h3>
          <div class="course-meta">Licencia asociada a la compra</div>
          <button class="course-button" type="button" data-course="dolor-musculoesqueletico" disabled>No disponible en tu cuenta</button>
        </article>
        <article data-card-course="banderas-clinicas">
          <span class="status-badge">Disponible</span>
          <h3>KineCheck Banderas Clínicas</h3>
          <div class="course-meta">Versión en desarrollo</div>
          <button class="course-button" type="button" data-course="banderas-clinicas">Comenzar curso</button>
        </article>
      </section>
    </body></html>
  `);

  await page.evaluate(() => {
    window.KINECHECK_ACADEMY_CONFIG = {
      courses: [
        { slug: "dolor-musculoesqueletico" },
        { slug: "banderas-clinicas" },
      ],
    };
  });
  await page.addScriptTag({ path: ACCESS_RECOVERY_SCRIPT });

  const dm = page.locator('[data-card-course="dolor-musculoesqueletico"]');
  await expect(dm.locator(".status-badge")).toHaveText("No adquirido");
  await expect(dm.locator(".course-meta")).toContainText("Licencia asociada a la compra");
  await expect(dm.locator('button[data-course="dolor-musculoesqueletico"]')).toBeHidden();
  await expect(page.locator('[data-kc-retry-access="dolor-musculoesqueletico"]')).toHaveText("Verificar acceso");
  await expect(page.locator('[data-kc-retry-access="dolor-musculoesqueletico"]')).toBeEnabled();

  const flags = page.locator('[data-card-course="banderas-clinicas"]');
  await expect(flags.locator(".status-badge")).toHaveText("EN CONSTRUCCIÓN");
  await expect(flags.locator('button[data-course="banderas-clinicas"]')).toHaveText("Abrir versión de revisión");
  await expect(flags.locator('button[data-course="banderas-clinicas"]')).toBeEnabled();

  await expect(page.locator('[data-kc-catalog-extension] [data-kc-catalog-product]')).toHaveCount(3);
  await expect(page.locator('[data-kc-catalog-product="dolor-lumbar-persistente"]')).toHaveAttribute("href", "../productos/dolor-lumbar-persistente/");
  await expect(page.locator('[data-kc-catalog-product="dolor-musculoesqueletico"]')).toHaveAttribute("href", "../productos/dolor-musculoesqueletico/");
  await expect(page.locator('[data-kc-catalog-product="banderas-clinicas"]')).toHaveAttribute("href", "../productos/banderas-clinicas/");
});

test("Continuar usa el opener unificado sin alterar los botones nativos del catálogo", async ({ page }) => {
  await installHarness(page);

  await page.locator('#course-grid [data-course="comunicacion-clinica"]').click();
  await page.locator('#course-grid [data-course="kinecheck-clinico-curso"]').click();
  await page.locator("#continue-button").click();

  await expect.poll(async () => page.evaluate(() => window.__nativeGridClicks)).toEqual([
    "comunicacion-clinica",
    "kinecheck-clinico-curso",
  ]);
  await expect.poll(async () => page.evaluate(() => window.__nativeContinueClicks)).toEqual([]);
  await expect.poll(async () => page.evaluate(() => window.__openedCore)).toEqual([]);
  await expect.poll(async () => page.evaluate(() => window.__openedUnified)).toEqual([
    "evidencia-aplicada",
  ]);
});

test("Continuar actividad usa el opener unificado con el producto recordado", async ({ page }) => {
  await installHarness(page);

  await page.evaluate(() => {
    document.querySelector("#continue-button").dataset.course = "traumatologia-ortopedia-clinica";
  });
  await page.locator("#kc-home-continue").click();

  await expect.poll(async () => page.evaluate(() => window.__openedUnified)).toEqual([
    "traumatologia-ortopedia-clinica",
  ]);
  await expect.poll(async () => page.evaluate(() => window.__openedCore)).toEqual([]);
});

test("Mis productos, Recursos, Cuenta y navegación móvil funcionan desde el controlador directo", async ({ page }) => {
  await installHarness(page);

  await page.locator("#onboarding-action").click();
  await expect(page.locator("body")).toHaveAttribute("data-kc-view", "biblioteca");
  await expect(page.locator("#nav-productos")).toHaveClass(/active/);
  await expect.poll(async () => page.evaluate(() => location.hash)).toBe("#biblioteca");

  await page.locator("#simple-resources").click();
  await expect(page.locator("body")).toHaveAttribute("data-kc-view", "herramientas");
  await expect(page.locator("#nav-recursos")).toHaveClass(/active/);

  await page.locator("#nav-cuenta").click();
  await expect(page.locator("body")).toHaveAttribute("data-kc-view", "perfil");
  await expect(page.locator("#nav-cuenta")).toHaveClass(/active/);

  await page.locator("#mobile-menu").click();
  await expect(page.locator("#academy-sidebar")).toHaveClass(/open/);
  await expect(page.locator("#mobile-menu")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#sidebar-overlay")).not.toHaveAttribute("hidden", "");

  await page.locator("#sidebar-overlay").click({ position: { x: 1, y: 1 } });
  await expect(page.locator("#academy-sidebar")).not.toHaveClass(/open/);
  await expect(page.locator("#mobile-menu")).toHaveAttribute("aria-expanded", "false");
});

test("Soporte responde aunque los listeners secundarios no carguen", async ({ page }) => {
  await installHarness(page);

  await page.locator("#support-launcher").click();
  await expect(page.locator("#support-panel")).not.toHaveAttribute("hidden", "");
  await expect(page.locator("#support-launcher")).toHaveAttribute("aria-expanded", "true");
});

test("si el opener todavía no cargó, el bridge espera su disponibilidad", async ({ page }) => {
  await page.setContent(`
    <!doctype html><html><body>
      <div id="kc-toast" hidden></div>
      <button id="late" type="button" data-kc-open-owned="evidencia-aplicada">Abrir</button>
    </body></html>
  `);
  await page.evaluate(() => {
    window.__opened = [];
  });
  await page.addScriptTag({ path: BRIDGE_SCRIPT });
  await page.locator("#late").click();
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    window.KINECHECK_OPEN_PRODUCT = async (slug) => window.__opened.push(slug);
  });

  await expect.poll(async () => page.evaluate(() => window.__opened), { timeout: 2000 }).toEqual([
    "evidencia-aplicada",
  ]);
});

test("la personalización no renombra la marca ni reintroduce clicks proxy", async ({ page }) => {
  const miSource = readFileSync(MI_SCRIPT, "utf8");
  const simplifySource = readFileSync(SIMPLIFY_SCRIPT, "utf8");
  expect(miSource).not.toContain("target.click()");
  expect(miSource).not.toContain("__KINECHECK_NATIVE_OWNED_PROXY__");
  expect(simplifySource).not.toContain("button.click()");

  await page.setContent(`
    <!doctype html><html><body data-kc-view="inicio">
      <section id="dashboard-view"></section>
      <a class="topbar-brand" data-kc-view-link="inicio"><div><strong>KineCheck</strong><span>MI KINECHECK</span></div></a>
      <a id="real-inicio" data-kc-view-link="inicio"><span>Inicio</span></a>
      <div id="sidebar-email">profesional@ejemplo.cl</div>
      <div id="account-email">profesional@ejemplo.cl</div>
      <section id="inicio"></section>
      <section id="course-grid"><button data-course="comunicacion-clinica">Comunicación</button></section>
      <div class="kc-home-hero"><span class="eyebrow">MI KINECHECK</span><h1>Inicio</h1></div>
      <p id="welcome"></p><button id="kc-home-continue"></button>
    </body></html>
  `);
  await page.evaluate(() => {
    window.KINECHECK_ACADEMY_CONFIG = { ownerEmails: [] };
  });
  await page.addScriptTag({ path: MI_SCRIPT });
  await page.addScriptTag({ path: SIMPLIFY_SCRIPT });
  await page.waitForTimeout(250);

  await expect(page.locator(".topbar-brand span")).toHaveText("MI KINECHECK");
  await expect(page.locator("#real-inicio span")).toHaveText("Inicio");
});
