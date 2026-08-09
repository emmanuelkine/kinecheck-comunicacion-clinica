import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://kinecheck.cl";

test.use({ viewport: { width: 390, height: 844 } });

test("Academy real carga opener y bridge y responde a clicks directos", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = `${message.text()} ${message.location().url || ""}`;
    if (/favicon|metric-event|cloudflareinsights\.com|static\.cloudflareinsights\.com|beacon\.min\.js/i.test(text)) return;
    consoleErrors.push(text);
  });

  await page.goto(`${BASE}/academy/?qa=live-runtime-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await expect.poll(async () => page.evaluate(() => ({
    opener: typeof window.KINECHECK_OPEN_PRODUCT,
    bridge: window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__ === true,
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
  })), { timeout: 10000 }).toMatchObject({ opener: "function", bridge: true });

  const runtime = await page.evaluate(() => ({
    opener: typeof window.KINECHECK_OPEN_PRODUCT,
    bridge: window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__ === true,
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
  }));

  expect(runtime.scripts.some((src) => src.includes("academy-brand-identity.js"))).toBeTruthy();
  expect(runtime.scripts.some((src) => src.includes("academy-open-v6.js"))).toBeTruthy();
  expect(runtime.scripts.some((src) => src.includes("academy-owned-native-bridge-v1.js"))).toBeTruthy();

  await page.evaluate(() => {
    const login = document.querySelector("#login-view");
    const dashboard = document.querySelector("#dashboard-view");
    if (login) login.hidden = true;
    if (dashboard) dashboard.hidden = false;

    window.__runtimeOpened = [];
    window.__realKineCheckOpenProduct = window.KINECHECK_OPEN_PRODUCT;
    window.KINECHECK_OPEN_PRODUCT = async (slug) => {
      window.__runtimeOpened.push(slug);
    };

    const probe = document.createElement("div");
    probe.id = "qa-runtime-probe";
    probe.innerHTML = `
      <button id="qa-product" type="button" data-kc-open-product="comunicacion-clinica">Abrir curso</button>
      <button id="qa-view" type="button" data-kc-view-link="biblioteca">Mis productos</button>
    `;
    document.body.appendChild(probe);
  });

  await page.locator("#qa-product").click();
  await expect.poll(async () => page.evaluate(() => window.__runtimeOpened)).toEqual(["comunicacion-clinica"]);

  await page.locator("#qa-view").click();
  await expect(page.locator("body")).toHaveAttribute("data-kc-view", "biblioteca");
  await expect.poll(async () => page.evaluate(() => location.hash)).toBe("#biblioteca");

  expect(consoleErrors).toEqual([]);
});
