import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const POST_URL = "https://kinecheck-clinico.emmanuelkine.chatgpt.site/api/license/sso";
const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";
const CONSENT_VERSION = "2026-08-09-health-v1";

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

for (const product of ["kinecheck-estudiante", "kinecheck-recupera"]) {
  test(`${product} conserva el SSO probado y el handoff protegido`, async ({ page }) => {
    let capturedPost = "";
    await page.route(POST_URL, async (route) => {
      capturedPost = route.request().postData() || "";
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: "<!doctype html><html><body><main id=relay-ok>SSO recibido</main></body></html>",
      });
    });

    await page.goto(`${BASE}/academy/?qa=app-relay-source-${product}-${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    const { issuedAt, expiresAt, accessToken } = await seedHandoff(page, product);

    const postRequest = page.waitForRequest(
      (request) => request.url() === POST_URL && request.method() === "POST",
      { timeout: 10000 },
    );

    await page.goto(`${BASE}/academy/app-sso-relay.html?qa=${product}-${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    if (product === "kinecheck-recupera") {
      await expect(page).toHaveURL(/\/recupera\/consentimiento(?:\.html)?\/?$/);
      await page.locator("#recupera-consent").check();
      await page.getByRole("button", { name: "Aceptar y abrir KineCheck Recupera" }).click();
    }

    const request = await postRequest;
    const body = new URLSearchParams(request.postData() || capturedPost);
    expect(request.url()).toBe(POST_URL);
    expect(body.get("product")).toBe(product);
    expect(body.get("access_token")).toBe(accessToken);
    expect(body.get("expires_at")).toBe(String(expiresAt));
    expect(body.get("issued_at")).toBe(String(issuedAt));
    expect(body.get("handoff_type")).toBe(HANDOFF_TYPE);
    if (product === "kinecheck-recupera") {
      expect(body.get("privacy_consent_version")).toBe(CONSENT_VERSION);
      expect(body.get("privacy_consent_at")).toBeTruthy();
    }

    await expect(page.locator("#relay-ok")).toHaveText("SSO recibido");
    await expect.poll(async () => page.evaluate(() => window.name)).toBe("");
  });
}
