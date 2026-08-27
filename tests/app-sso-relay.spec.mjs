import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const POST_URL = "https://apps.kinecheck.cl/api/license/sso";
const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";

async function seedHandoff(page, product) {
  const issuedAt = Date.now();
  const expiresAt = Math.floor(issuedAt / 1000) + 3600;
  const accessToken = `qa-${product}-access-token-abcdefghijklmnopqrstuvwxyz0123456789`;
  await page.evaluate(({ type, issuedAtValue, expiresAtValue, token, productSlug }) => {
    localStorage.removeItem("kinecheck_recupera_health_consent_v1");
    sessionStorage.removeItem("kinecheck_recupera_consent_handoff_v1");
    window.name = JSON.stringify({
      type,
      issuedAt: issuedAtValue,
      product: productSlug,
      access_token: token,
      expires_at: expiresAtValue,
      session: {
        access_token: token,
        expires_at: expiresAtValue,
        token_type: "bearer",
        handoff_access_only: true,
      },
    });
  }, {
    type: HANDOFF_TYPE,
    issuedAtValue: issuedAt,
    expiresAtValue: expiresAt,
    token: accessToken,
    productSlug: product,
  });
  return { issuedAt, expiresAt, accessToken };
}

test("kinecheck-estudiante conserva el SSO probado y el handoff protegido", async ({ page }) => {
  let capturedPost = "";
  await page.route(POST_URL, async (route) => {
    capturedPost = route.request().postData() || "";
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html><body><main id=relay-ok>SSO recibido</main></body></html>",
    });
  });

  await page.goto(`${BASE}/academy/?qa=app-relay-source-student-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  const { issuedAt, expiresAt, accessToken } = await seedHandoff(page, "kinecheck-estudiante");
  const postRequest = page.waitForRequest(
    (request) => request.url() === POST_URL && request.method() === "POST",
    { timeout: 10000 },
  );

  await page.goto(`${BASE}/academy/app-sso-relay.html?qa=student-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  const request = await postRequest;
  const body = new URLSearchParams(request.postData() || capturedPost);
  expect(request.url()).toBe(POST_URL);
  expect(body.get("product")).toBe("kinecheck-estudiante");
  expect(body.get("access_token")).toBe(accessToken);
  expect(body.get("expires_at")).toBe(String(expiresAt));
  expect(body.get("issued_at")).toBe(String(issuedAt));
  expect(body.get("handoff_type")).toBe(HANDOFF_TYPE);
  await expect(page.locator("#relay-ok")).toHaveText("SSO recibido");
  await expect.poll(async () => page.evaluate(() => window.name)).toBe("");
});

test("kinecheck-recupera rechaza el handoff y la ruta antigua no recopila datos", async ({ page }) => {
  let postCount = 0;
  await page.route(POST_URL, async (route) => {
    postCount += 1;
    await route.abort();
  });

  await page.goto(`${BASE}/academy/?qa=app-relay-source-recupera-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await seedHandoff(page, "kinecheck-recupera");
  await page.goto(`${BASE}/academy/app-sso-relay.html?qa=recupera-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await expect(page.locator("#relay-error")).toContainText("Próximamente");
  await expect(page.locator("#relay-error")).toContainText("no está disponible para registrar información");
  await expect.poll(async () => page.evaluate(() => window.name)).toBe("");
  await page.waitForTimeout(250);
  expect(postCount).toBe(0);

  await page.goto(`${BASE}/recupera/consentimiento.html?qa=blocked-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await expect(page.getByRole("heading", { name: "KineCheck Recupera permanece bloqueado." })).toBeVisible();
  await expect(page.locator("form, input, textarea")).toHaveCount(0);
  await expect(page.getByText("No está disponible para compra, acceso ni registro de información")).toBeVisible();
  expect(postCount).toBe(0);
});
