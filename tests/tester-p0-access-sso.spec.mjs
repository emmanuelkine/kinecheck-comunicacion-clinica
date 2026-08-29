import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELAY = path.join(ROOT, "academy", "app-sso-relay.js");
const BRIDGE = path.join(ROOT, "academy", "academy-owned-native-bridge-v1.js");
const POST_URL = "https://apps.kinecheck.cl/api/license/sso";
const HANDOFF_TYPE = "kinecheck-sso-v3-access-only";

async function relayHarness(page, handoff) {
  await page.setContent(`<!doctype html><html><body>
    <p id="relay-status">Preparando acceso…</p>
    <p id="relay-error" hidden></p>
    <a id="relay-back" hidden href="#">Volver</a>
  </body></html>`);
  await page.evaluate((value) => { window.name = JSON.stringify(value); }, handoff);
}

function activeStudentHandoff({ issuedAt = Date.now(), expiresOffset = 3600 } = {}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    type: HANDOFF_TYPE,
    issuedAt,
    product: "kinecheck-estudiante",
    access_token: "qa-student-access-token-abcdefghijklmnopqrstuvwxyz0123456789",
    expires_at: nowSeconds + expiresOffset,
  };
}

test("TF-001: handoff reciente en milisegundos no se marca como vencido", async ({ page }) => {
  let method = "";
  await page.route(POST_URL, async (route) => {
    method = route.request().method();
    await route.fulfill({ status: 200, contentType: "text/html", body: "<main id='ok'>ok</main>" });
  });
  await relayHarness(page, activeStudentHandoff());
  const request = page.waitForRequest((r) => r.url() === POST_URL && r.method() === "POST");
  await page.addScriptTag({ path: RELAY });
  await request;
  expect(method).toBe("POST");
  await expect(page.locator("#relay-error")).toBeHidden();
});

test("TF-001: handoff reciente legado en segundos tampoco se marca como vencido", async ({ page }) => {
  let postCount = 0;
  await page.route(POST_URL, async (route) => {
    postCount += 1;
    await route.fulfill({ status: 200, contentType: "text/html", body: "<main id='ok'>ok</main>" });
  });
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  await relayHarness(page, activeStudentHandoff({ issuedAt: issuedAtSeconds }));
  await page.addScriptTag({ path: RELAY });
  await expect.poll(() => postCount).toBe(1);
  await expect(page.locator("#relay-error")).toBeHidden();
});

test("TF-001: un handoff realmente vencido sí es rechazado y no hace POST", async ({ page }) => {
  let postCount = 0;
  page.on("request", (request) => {
    if (request.url() === POST_URL && request.method() === "POST") postCount += 1;
  });
  await relayHarness(page, activeStudentHandoff({ issuedAt: Date.now() - 180000 }));
  await page.addScriptTag({ path: RELAY });
  await expect(page.locator("#relay-error")).toContainText("acceso temporal venció");
  expect(postCount).toBe(0);
});

test("TF-002: botón Estudiante usa opener unificado y Recupera permanece bloqueado", async ({ page }) => {
  await page.setContent(`<!doctype html><html><body>
    <div id="kc-toast" hidden></div>
    <button id="student" data-kc-open-owned="kinecheck-estudiante">Estudiante</button>
    <button id="recupera" data-kc-open-product="kinecheck-recupera">Recupera</button>
  </body></html>`);
  await page.evaluate(() => {
    window.__opened = [];
    window.KINECHECK_OPEN_PRODUCT = async (slug) => window.__opened.push(slug);
  });
  await page.addScriptTag({ path: BRIDGE });
  await page.locator("#student").click();
  await expect.poll(async () => page.evaluate(() => window.__opened)).toEqual(["kinecheck-estudiante"]);
  await expect(page.locator("#recupera")).toBeDisabled();
});

test("TF-002: relay Estudiante conserva POST y campos contractuales", async ({ page }) => {
  let body = null;
  await page.route(POST_URL, async (route) => {
    body = new URLSearchParams(route.request().postData() || "");
    await route.fulfill({ status: 200, contentType: "text/html", body: "<main>ok</main>" });
  });
  await relayHarness(page, activeStudentHandoff());
  await page.addScriptTag({ path: RELAY });
  await expect.poll(() => body !== null).toBe(true);
  expect(body.get("product")).toBe("kinecheck-estudiante");
  expect(body.get("access_token")).toBeTruthy();
  expect(body.get("handoff_type")).toBe(HANDOFF_TYPE);
});
