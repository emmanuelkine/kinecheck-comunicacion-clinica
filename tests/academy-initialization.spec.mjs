import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const SSO_POST_URL = "https://apps.kinecheck.cl/api/license/sso";

function fakeJwt() {
  const payload = Buffer.from(JSON.stringify({
    sub: "qa-owner",
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString("base64url");
  return `qa.${payload}.signature`;
}

test.use({ viewport: { width: 390, height: 844 } });

test("Academy inicializa aplicaciones, cursos y relay Estudiante sin excepciones DOM", async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (/frame-ancestors.*ignored when delivered via/i.test(message.text())) return;
    consoleErrors.push(message.text());
  });

  const accessToken = fakeJwt();
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes("/auth/v1/user")) {
        return Promise.resolve(new Response(JSON.stringify({
          id: "qa-owner",
          email: "emmanuelkine+owner@gmail.com",
          created_at: "2026-01-01T00:00:00.000Z",
        }), { status: 200, headers: { "content-type": "application/json" } }));
      }
      if (url.includes("/functions/v1/metric-event")) {
        return Promise.resolve(new Response('{"ok":true}', {
          status: 202,
          headers: { "content-type": "application/json" },
        }));
      }
      if (url.includes("/functions/v1/course-key")) {
        return Promise.resolve(new Response('{"ok":true}', {
          status: 200,
          headers: { "content-type": "application/json" },
        }));
      }
      return nativeFetch(input, init);
    };
  });
  await page.route(SSO_POST_URL, (route) => route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: '<!doctype html><html><body><main id="relay-ok">Relay Estudiante recibido</main></body></html>',
  }));

  await page.goto(`${BASE}/academy/?qa=academy-dom-contract-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.evaluate((token) => {
    window.__KINECHECK_NATIVE_ACCESS_TOKEN__ = token;
    window.dispatchEvent(new Event("kinecheck:native-session"));
  }, accessToken);

  await expect(page.locator("#dashboard-view")).toBeVisible();
  await expect(page.locator("#sidebar-access")).toHaveText("Acceso propietario");
  await expect(page.locator("[data-kc-home-apps-grid]")).not.toContainText("Verificando tus aplicaciones");
  await expect(page.locator("[data-kc-home-courses-grid]")).not.toContainText("Verificando tus cursos");
  await expect(page.locator('[data-kc-open-product="kinecheck-estudiante"]')).toBeVisible();
  await expect(page.locator("[data-kc-home-courses-grid] .kc-summary-card").first()).toBeVisible();

  await page.locator("#library-search").evaluate((input) => {
    input.value = "evidencia";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
  await page.locator('.mobile-bottom-nav [data-kc-view-link="biblioteca"]').click();
  await expect(page.locator("body")).toHaveAttribute("data-kc-view", "biblioteca");
  await page.locator('.mobile-bottom-nav [data-kc-view-link="inicio"]').click();
  await expect(page.locator("body")).toHaveAttribute("data-kc-view", "inicio");

  const relayPost = page.waitForRequest(
    (request) => request.url() === SSO_POST_URL && request.method() === "POST",
    { timeout: 10000 },
  );
  await page.locator('[data-kc-open-product="kinecheck-estudiante"]').click();
  const relayRequest = await relayPost;
  expect(new URLSearchParams(relayRequest.postData() || "").get("product")).toBe("kinecheck-estudiante");
  await expect(page.locator("#relay-ok")).toHaveText("Relay Estudiante recibido");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
