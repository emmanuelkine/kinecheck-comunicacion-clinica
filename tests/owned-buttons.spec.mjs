import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRIDGE_SCRIPT = path.join(ROOT, "academy", "academy-owned-native-bridge-v1.js");

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
    window.__opened = [];
    window.__courseGridProxyClicks = 0;
    window.KINECHECK_OPEN_PRODUCT = async (slug) => {
      window.__opened.push(slug);
    };
    document.querySelector("#course-grid").addEventListener("click", () => {
      window.__courseGridProxyClicks += 1;
    });
  });

  await page.addScriptTag({ path: BRIDGE_SCRIPT });
}

test("todos los puntos de entrada abren el producto directamente, sin click proxy", async ({ page }) => {
  await installHarness(page);

  await page.locator("#home-clinico").click();
  await page.locator("#owned-student").click();
  await page.locator("#recommended-pain").click();
  await page.locator('#course-grid [data-course="comunicacion-clinica"]').click();
  await page.locator('#course-grid [data-course="kinecheck-clinico-curso"]').click();
  await page.locator("#home-recupera").click();
  await page.locator("#continue-button").click();

  await expect.poll(async () => page.evaluate(() => window.__opened)).toEqual([
    "kinecheck-clinico",
    "kinecheck-estudiante",
    "mas-alla-del-dolor",
    "comunicacion-clinica",
    "kinecheck-clinico-curso",
    "kinecheck-recupera",
    "evidencia-aplicada",
  ]);

  await expect.poll(async () => page.evaluate(() => window.__courseGridProxyClicks)).toBe(0);
});

test("Continuar actividad usa el producto recordado sin depender de otro listener", async ({ page }) => {
  await installHarness(page);

  await page.evaluate(() => {
    document.querySelector("#continue-button").dataset.course = "traumatologia-ortopedia-clinica";
  });
  await page.locator("#kc-home-continue").click();

  await expect.poll(async () => page.evaluate(() => window.__opened)).toEqual([
    "traumatologia-ortopedia-clinica",
  ]);
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

test("si el opener termina de cargar después del render, el primer click se conserva", async ({ page }) => {
  await page.setContent(`
    <!doctype html><html><body>
      <div id="kc-toast" hidden></div>
      <button id="late" type="button" data-kc-open-product="evidencia-aplicada">Abrir</button>
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
