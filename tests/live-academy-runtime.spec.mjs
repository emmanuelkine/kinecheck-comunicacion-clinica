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
  expect(consoleErrors).toEqual([]);
});

test("Mis productos muestra un error visible si la sesión no permite navegar", async ({ page }) => {
  const consoleErrors = collectUnexpectedConsoleErrors(page);
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
    probe.id = "qa-owned-no-session";
    probe.type = "button";
    probe.dataset.kcOpenOwned = "comunicacion-clinica";
    probe.textContent = "Abrir sin sesión QA";
    host?.appendChild(probe);
  });

  const button = page.locator("#qa-owned-no-session");
  await button.click();
  await expect(page.locator("#kc-toast")).toBeVisible();
  await expect(page.locator("#kc-toast")).toContainText(/sesión/i);
  await expect(button).not.toHaveAttribute("aria-busy", "true");
  expect(consoleErrors).toEqual([]);
});

test("navegación móvil real y botones nativos conservan eventos de puntero", async ({ page }) => {
  await openAcademy(page, "live-pointer");

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

test("Academy no conserva overlays invisibles ni bloquea el scroll o los controles", async ({ page }) => {
  await page.setViewportSize({ width: 1867, height: 976 });

  await page.addInitScript(() => {
    const session = {
      access_token: "qa-owner-access-token-with-safe-runtime-length",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: "qa-owner-user",
        email: "emmanuelkine@gmail.com",
      },
    };
    localStorage.setItem("kinecheck_secure_session_v1", JSON.stringify(session));
    localStorage.removeItem("kinecheck_learning_stage_v1:emmanuelkine@gmail.com");
  });

  await page.route("**/auth/v1/user", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        id: "qa-owner-user",
        email: "emmanuelkine@gmail.com",
        created_at: "2026-01-01T00:00:00.000Z",
      }),
    });
  });
  await page.route("**/functions/v1/metric-event", async (route) => {
    await route.fulfill({ status: 202, contentType: "application/json", body: '{"ok":true}' });
  });

  await openAcademy(page, "scroll-and-controls");
  await expect(page.locator("#dashboard-view")).toBeVisible();
  await expect(page.locator("#course-grid .course-card")).toHaveCount(9);
  await page.locator('.topbar-nav [data-kc-view-link="biblioteca"]').click();
  await expect(page.locator("body")).toHaveAttribute("data-kc-view", "biblioteca");

  // El selector legado intentaba abrirse 350 ms después del dashboard.
  await page.waitForTimeout(900);

  const interactionState = await page.evaluate(() => {
    const modal = document.querySelector("#kc-stage-modal");
    return {
      bodyClass: document.body.className,
      bodyOverflow: getComputedStyle(document.body).overflow,
      documentOverflow: getComputedStyle(document.documentElement).overflow,
      modalHidden: modal?.hidden ?? true,
      modalDisplay: modal ? getComputedStyle(modal).display : "missing",
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  });

  expect(interactionState.bodyClass).not.toContain("kc-stage-modal-open");
  expect(interactionState.bodyOverflow).not.toBe("hidden");
  expect(interactionState.documentOverflow).not.toBe("hidden");
  expect(interactionState.modalHidden || interactionState.modalDisplay === "none").toBeTruthy();
  expect(interactionState.scrollHeight).toBeGreaterThan(interactionState.viewportHeight);

  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  for (const view of ["biblioteca", "herramientas", "perfil", "inicio"]) {
    await page.locator(`.topbar-nav [data-kc-view-link="${view}"]`).click();
    await expect(page.locator("body")).toHaveAttribute("data-kc-view", view);
  }

  await page.locator("#support-launcher").click();
  await expect(page.locator("#support-panel")).toBeVisible();
  await page.locator("[data-support-close]").click();
  await expect(page.locator("#support-panel")).toBeHidden();

  // También repara una pestaña restaurada por el navegador con locks antiguos.
  await page.evaluate(() => {
    document.body.classList.add("kc-stage-modal-open", "review-open");
    const stageModal = document.querySelector("#kc-stage-modal");
    const reviewModal = document.querySelector("#review-modal");
    if (stageModal) stageModal.hidden = true;
    if (reviewModal) reviewModal.hidden = true;
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  await expect.poll(() => page.evaluate(() => document.body.className)).not.toContain("modal-open");
  await expect.poll(() => page.evaluate(() => document.body.className)).not.toContain("review-open");
});
