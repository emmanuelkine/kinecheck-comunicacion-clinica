import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://kinecheck.cl";
const LOCAL_HARNESS = /^http:\/\/127\.0\.0\.1:4173(?:\/|$)/i.test(BASE);

test.use({ viewport: { width: 390, height: 844 } });

function isExpectedHarnessNoise(text) {
  if (!LOCAL_HARNESS) return false;
  return /Origin http:\/\/127\.0\.0\.1:4173 is not allowed by Access-Control-Allow-Origin/i.test(text)
    || /http:\/\/127\.0\.0\.1:4173\/api\/health(?:\s|$|\?)/i.test(text);
}

test("Academy real carga el bridge y conecta tarjetas proxy con openCourse nativo", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = `${message.text()} ${message.location().url || ""}`;
    if (/favicon|metric-event|cloudflareinsights\.com|static\.cloudflareinsights\.com|beacon\.min\.js/i.test(text)) return;
    if (isExpectedHarnessNoise(text)) return;
    consoleErrors.push(text);
  });

  await page.goto(`${BASE}/academy/?qa=live-runtime-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await expect.poll(async () => page.evaluate(() => ({
    opener: typeof window.KINECHECK_OPEN_PRODUCT,
    native: typeof window.openCourse,
    bridge: window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__ === true,
  })), { timeout: 10000 }).toEqual({ opener: "function", native: "function", bridge: true });

  const runtime = await page.evaluate(() => ({
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
    watermarkPointerEvents: document.querySelector("#kinecheck-dynamic-watermark")
      ? getComputedStyle(document.querySelector("#kinecheck-dynamic-watermark")).pointerEvents
      : "not-rendered",
  }));
  expect(runtime.scripts.some((src) => src.includes("academy-brand-identity.js"))).toBeTruthy();
  expect(runtime.scripts.some((src) => src.includes("academy-open-v6.js"))).toBeTruthy();
  expect(runtime.scripts.some((src) => src.includes("academy-owned-native-bridge-v1.js"))).toBeTruthy();
  expect(["none", "not-rendered"]).toContain(runtime.watermarkPointerEvents);

  await page.evaluate(() => {
    const login = document.querySelector("#login-view");
    const dashboard = document.querySelector("#dashboard-view");
    if (login) login.hidden = true;
    if (dashboard) dashboard.hidden = false;

    window.__runtimeOpened = [];
    window.__originalOpenCourse = window.openCourse;
    window.openCourse = async (slug) => {
      window.__runtimeOpened.push(slug);
    };

    const host = document.querySelector("#inicio .kc-home-actions");
    const probe = document.createElement("button");
    probe.id = "qa-product";
    probe.type = "button";
    probe.dataset.kcOpenProduct = "comunicacion-clinica";
    probe.textContent = "Abrir curso QA";
    host?.appendChild(probe);
  });

  await page.locator("#qa-product").evaluate((element) => element.scrollIntoView({ block: "center", inline: "center" }));
  await page.locator("#qa-product").click();
  await expect.poll(async () => page.evaluate(() => window.__runtimeOpened)).toEqual(["comunicacion-clinica"]);
  expect(consoleErrors).toEqual([]);
});

test("navegación móvil real y botones nativos conservan eventos de puntero", async ({ page }) => {
  await page.goto(`${BASE}/academy/?qa=live-pointer-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await expect.poll(async () => page.evaluate(() => window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__ === true), { timeout: 10000 }).toBe(true);

  await page.evaluate(() => {
    document.querySelector("#login-view")?.setAttribute("hidden", "");
    const dashboard = document.querySelector("#dashboard-view");
    if (dashboard) dashboard.hidden = false;
    window.__nativePointerEvents = [];

    const grid = document.querySelector("#course-grid");
    if (grid) {
      const probe = document.createElement("button");
      probe.id = "qa-native-course";
      probe.type = "button";
      probe.dataset.course = "qa-native-course";
      probe.textContent = "Curso nativo QA";
      grid.prepend(probe);
      grid.addEventListener("click", (event) => {
        if (event.target.closest("#qa-native-course")) window.__nativePointerEvents.push("course-grid");
      });
    }
  });

  const bottomProducts = page.locator('#kc-bottom-nav [data-kc-view-link="biblioteca"]');
  await expect(bottomProducts).toBeVisible();
  await bottomProducts.click();
  await expect(page.locator("body")).toHaveAttribute("data-kc-view", "biblioteca");
  await expect.poll(async () => page.evaluate(() => location.hash)).toBe("#biblioteca");

  await page.locator("#qa-native-course").evaluate((element) => element.scrollIntoView({ block: "center", inline: "center" }));
  await page.locator("#qa-native-course").click();
  await expect.poll(async () => page.evaluate(() => window.__nativePointerEvents)).toEqual(["course-grid"]);

  const menu = page.locator("#mobile-menu");
  await menu.click();
  await expect(page.locator("#academy-sidebar")).toHaveClass(/open/);
  await expect(menu).toHaveAttribute("aria-expanded", "true");
});
