import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://kinecheck.cl";
const LOCAL_HARNESS = /^http:\/\/127\.0\.0\.1:4173(?:\/|$)/i.test(BASE);

test.use({ viewport: { width: 390, height: 844 } });

function isExpectedHarnessNoise(text) {
  if (!LOCAL_HARNESS) return false;
  return /Origin http:\/\/127\.0\.0\.1:4173 is not allowed by Access-Control-Allow-Origin/i.test(text)
    || /http:\/\/127\.0\.0\.1:4173\/api\/health(?:\s|$|\?)/i.test(text);
}

function collectUnexpectedConsoleErrors(page) {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = `${message.text()} ${message.location().url || ""}`;
    if (/favicon|metric-event|cloudflareinsights\.com|static\.cloudflareinsights\.com|beacon\.min\.js/i.test(text)) return;
    if (isExpectedHarnessNoise(text)) return;
    consoleErrors.push(text);
  });
  return consoleErrors;
}

function withoutFakeTokenCourseKeyNoise(errors) {
  return errors.filter((text) => !(
    /status of 401(?:\s|\(|$)/i.test(text)
    && /\/functions\/v1\/course-key(?:\s|$|\?)/i.test(text)
  ));
}

async function captureMetrics(page) {
  const events = [];
  await page.route("**/functions/v1/metric-event", async (route) => {
    try {
      const payload = JSON.parse(route.request().postData() || "{}");
      events.push(payload);
    } catch {
      // Un cuerpo no JSON no debe romper la prueba de navegación.
    }
    await route.fulfill({
      status: 202,
      contentType: "application/json; charset=utf-8",
      body: '{"ok":true}',
    });
  });
  return events;
}

async function openAcademy(page, label) {
  await page.goto(`${BASE}/academy/?qa=${label}-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await expect.poll(async () => page.evaluate(() => ({
    opener: typeof window.KINECHECK_OPEN_PRODUCT,
    native: typeof window.openCourse,
    bridge: window.__KINECHECK_OWNED_NATIVE_BRIDGE_V1__ === true,
  })), { timeout: 10000 }).toEqual({ opener: "function", native: "function", bridge: true });
}

test("Mis productos registra el toque, usa el opener real y completa una navegación de curso", async ({ page }) => {
  const consoleErrors = collectUnexpectedConsoleErrors(page);
  const metricEvents = await captureMetrics(page);
  await page.route("**/functions/v1/course-key", (route) => route.fulfill({
    status: 401,
    contentType: "application/json; charset=utf-8",
    body: '{"error":"invalid QA token"}',
  }));
  await openAcademy(page, "owned-real-open");

  await expect.poll(() => metricEvents.some((event) => event.eventName === "page_view")).toBe(true);

  const runtime = await page.evaluate(() => ({
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
    watermarkPointerEvents: document.querySelector("#kinecheck-dynamic-watermark")
      ? getComputedStyle(document.querySelector("#kinecheck-dynamic-watermark")).pointerEvents
      : "not-rendered",
  }));
  expect(runtime.scripts.some((src) => src.includes("academy-brand-identity.js"))).toBeTruthy();
  expect(runtime.scripts.some((src) => src.includes("academy-open-v6.js"))).toBeTruthy();
  expect(runtime.scripts.some((src) => src.includes("academy-owned-native-bridge-v1.js"))).toBeTruthy();
  expect(runtime.scripts.some((src) => src.includes("academy-learning-path-v4.js"))).toBeFalsy();
  expect(runtime.scripts.some((src) => src.includes("academy-launch-router-v4.js"))).toBeFalsy();
  expect(runtime.scripts.some((src) => src.includes("academy-integration-guard-v4.js"))).toBeFalsy();
  expect(["none", "not-rendered"]).toContain(runtime.watermarkPointerEvents);

  await page.route("**/comunicacion-clinica.html?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html><body><main id=qa-destination>Destino QA</main></body></html>",
    });
  });

  await page.evaluate(() => {
    const login = document.querySelector("#login-view");
    const dashboard = document.querySelector("#dashboard-view");
    if (login) login.hidden = true;
    if (dashboard) dashboard.hidden = false;

    // Token deliberadamente ficticio: basta para probar el transporte de sesión
    // y navegación. Los motores pueden registrar el 401 del chequeo de course-key
    // en consola aunque el destino QA se complete correctamente.
    const session = {
      access_token: "qa-access-token-for-runtime-navigation",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: "bearer",
    };
    window.KINECHECK_ACADEMY_SESSION = Object.freeze({
      get: () => session,
      refresh: async () => session,
    });

    const host = document.querySelector("#inicio .kc-home-actions");
    const probe = document.createElement("button");
    probe.id = "qa-owned-product";
    probe.type = "button";
    probe.dataset.kcOpenOwned = "comunicacion-clinica";
    probe.textContent = "Abrir curso adquirido QA";
    host?.appendChild(probe);
  });

  const ownedButton = page.locator("#qa-owned-product");
  await ownedButton.evaluate((element) => element.scrollIntoView({ block: "center", inline: "center" }));

  await Promise.all([
    page.waitForURL(/\/comunicacion-clinica\.html\?course=comunicacion-clinica/, { timeout: 10000 }),
    ownedButton.click(),
  ]);

  await expect.poll(() => metricEvents.some((event) => (
    event.eventName === "course_open"
    && event.productSlug === "comunicacion-clinica"
  ))).toBe(true);
  await expect(page.locator("#qa-destination")).toHaveText("Destino QA");
  expect(withoutFakeTokenCourseKeyNoise(consoleErrors)).toEqual([]);
});

test("Mis productos muestra un error visible si la sesión no permite navegar", async ({ page }) => {
  const consoleErrors = collectUnexpectedConsoleErrors(page);
  await captureMetrics(page);
  await openAcademy(page, "owned-visible-error");

  await page.evaluate(() => {
    document.querySelector("#login-view")?.setAttribute("hidden", "");
    const dashboard = document.querySelector("#dashboard-view");
    if (dashboard) dashboard.hidden = false;

    localStorage.removeItem("kinecheck_secure_session_v1");
    sessionStorage.removeItem("kinecheck_secure_session_v1");
    window.KINECHECK_ACADEMY_SESSION = Object.freeze({
      get: () => null,
      refresh: async () => null,
    });

    const host = document.querySelector("#inicio .kc-home-actions");
    const probe = document.createElement("button");
    probe.id = "qa-expired-product";
    probe.type = "button";
    probe.dataset.kcOpenOwned = "comunicacion-clinica";
    probe.textContent = "Abrir sin sesión QA";
    host?.appendChild(probe);
  });

  await page.locator("#qa-expired-product").click();
  await expect(page.locator("#kc-toast")).toContainText("Tu sesión terminó");
  await expect(page.locator("#qa-expired-product")).not.toHaveAttribute("aria-busy", "true");
  expect(consoleErrors).toEqual([]);
});

test("navegación móvil real y botones nativos conservan eventos de puntero", async ({ page }) => {
  const consoleErrors = collectUnexpectedConsoleErrors(page);
  await captureMetrics(page);
  await openAcademy(page, "mobile-pointer");

  await page.evaluate(() => {
    document.querySelector("#login-view")?.setAttribute("hidden", "");
    const dashboard = document.querySelector("#dashboard-view");
    if (dashboard) dashboard.hidden = false;
  });

  const library = page.locator('#kc-bottom-nav [data-kc-view-link="biblioteca"]');
  await expect(library).toHaveCSS("pointer-events", "auto");
  await library.click();
  await expect(page.locator("body")).toHaveAttribute("data-kc-view", "biblioteca");

  const tools = page.locator('#kc-bottom-nav [data-kc-view-link="herramientas"]');
  await expect(tools).toHaveCSS("pointer-events", "auto");
  await tools.click();
  await expect(page.locator("body")).toHaveAttribute("data-kc-view", "herramientas");

  const profile = page.locator('#kc-bottom-nav [data-kc-view-link="perfil"]');
  await expect(profile).toHaveCSS("pointer-events", "auto");
  await profile.click();
  await expect(page.locator("body")).toHaveAttribute("data-kc-view", "perfil");

  expect(consoleErrors).toEqual([]);
});

test("Academy no conserva overlays invisibles ni bloquea el scroll o los controles", async ({ page }) => {
  const consoleErrors = collectUnexpectedConsoleErrors(page);
  await captureMetrics(page);
  await openAcademy(page, "overlay-scroll");

  await page.evaluate(() => {
    document.querySelector("#login-view")?.setAttribute("hidden", "");
    const dashboard = document.querySelector("#dashboard-view");
    if (dashboard) dashboard.hidden = false;
  });

  const state = await page.evaluate(() => {
    const overlay = document.querySelector("#sidebar-overlay");
    const support = document.querySelector("#support-panel");
    return {
      bodyOverflow: getComputedStyle(document.body).overflow,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      overlayHidden: !overlay || overlay.hidden,
      overlayPointerEvents: overlay ? getComputedStyle(overlay).pointerEvents : "none",
      supportHidden: !support || support.hidden,
      supportPointerEvents: support ? getComputedStyle(support).pointerEvents : "none",
    };
  });

  expect(state.overlayHidden || state.overlayPointerEvents === "none").toBeTruthy();
  expect(state.supportHidden || state.supportPointerEvents === "none").toBeTruthy();
  expect(state.bodyOverflow).not.toBe("hidden");
  expect(state.htmlOverflow).not.toBe("hidden");
  expect(consoleErrors).toEqual([]);
});
