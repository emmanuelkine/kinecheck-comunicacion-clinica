import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:4173";
const SUPABASE = "https://eqhcdclyeoapmqtlduwf.supabase.co";

test.describe("KineCheck Clínico · controles móviles", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("acceso: no duplica correo y contraseña cuando falta sesión", async ({ page }) => {
    await page.goto(`${BASE}/kinecheck-clinico-curso/`, { waitUntil: "networkidle" });

    await expect(page.locator("#auth-form")).toHaveCount(0);
    await expect(page.locator("#email")).toHaveCount(0);
    await expect(page.locator("#password")).toHaveCount(0);
    await expect(page.locator("#sign-out")).toBeHidden();
    await expect(page.locator("#access-progress")).toBeHidden();
    await expect(page.locator("#ecosystem-entry")).toBeVisible();
    await expect(page.locator("#ecosystem-entry")).toContainText("Un solo acceso");
    await expect(page.locator(".ecosystem-entry-link")).toHaveJSProperty("href", `${BASE}/academy/#biblioteca`);
  });

  test("acceso: reutiliza automáticamente la sesión del ecosistema", async ({ page }) => {
    await page.route(`${SUPABASE}/**`, async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/v1/user")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "usuario-prueba", email: "profesional@ejemplo.cl" }),
        });
        return;
      }
      if (url.includes("/functions/v1/protected-course-key")) {
        await route.fulfill({
          status: 200,
          contentType: "text/javascript",
          body: "document.querySelector('#root').innerHTML='<main id=\"course-opened\"><div class=\"kc-top-actions\"></div><h1>Curso abierto</h1></main>';",
        });
        return;
      }
      await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    });

    await page.addInitScript(() => {
      localStorage.setItem("kinecheck_secure_session_v1", JSON.stringify({
        access_token: "token-sesion-ecosistema-prueba-1234567890",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
      }));
    });

    await page.goto(`${BASE}/kinecheck-clinico-curso/`, { waitUntil: "networkidle" });
    await expect(page.locator("#course-opened")).toBeVisible();
    await expect(page.locator("#access-shell")).toBeHidden();
    await expect(page.locator("#ecosystem-entry")).toBeHidden();
    await expect(page.locator(".kc-top-actions #sign-out")).toBeVisible();
    await expect(page.locator("#kinecheck-dynamic-watermark")).toBeVisible();
  });

  test("curso: licencia denegada no ejecuta contenido protegido ni publica el curso", async ({ page, request }) => {
    let protectedRequests = 0;
    await page.route(`${SUPABASE}/**`, async (route) => {
      if (route.request().url().includes("/auth/v1/user")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "usuario-prueba", email: "profesional@ejemplo.cl" }) });
      } else if (route.request().url().includes("/functions/v1/protected-course-key")) {
        protectedRequests += 1;
        expect(route.request().headers().authorization).toBe("Bearer token-prueba-licencia-denegada");
        expect(route.request().postDataJSON()).toEqual({ courseSlug: "kinecheck-clinico-curso" });
        await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Licencia activa requerida" }) });
      } else {
        await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
      }
    });
    await page.addInitScript(() => {
      localStorage.setItem("kinecheck_secure_session_v1", JSON.stringify({ access_token: "token-prueba-licencia-denegada", expires_at: Math.floor(Date.now() / 1000) + 3600 }));
    });
    await page.goto(`${BASE}/kinecheck-clinico-curso/`, { waitUntil: "networkidle" });
    await expect.poll(() => protectedRequests).toBe(1);
    await expect(page.locator("#access-shell")).toBeVisible();
    await expect(page.locator("#root")).toBeHidden();
    await expect(page.locator("#auth-message")).toContainText("Licencia activa requerida");
    for (const file of ["course-data.js", "renderer.js"]) {
      const response = await request.get(`${BASE}/kinecheck-clinico-curso/${file}`);
      expect(response.status()).toBe(404);
    }
  });

  test("controles públicos: temario accesible, Escape y cierre de sesión", async ({ page }) => {
    await page.goto(`${BASE}/tests/blank.html`);
    await page.setContent(`<div id="root"><div class="kc-top-actions"></div><aside data-sidebar class="open"><button data-open-module class="active">Módulo de prueba</button></aside><button data-toggle-sidebar>Temario</button></div><button id="sign-out">Salir</button>`);
    await page.addScriptTag({ url: `${BASE}/kinecheck-clinico-curso/access-ui-fix.js` });
    const toggle = page.locator("[data-toggle-sidebar]");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAttribute("aria-controls", "kc-course-sidebar");
    await expect(page.locator("[data-open-module]")).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-sidebar]")).not.toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await expect(page.locator(".kc-top-actions #sign-out")).toHaveText("Cerrar sesión");
    await page.locator("#sign-out").click();
    await expect(page.locator("#sign-out")).toBeDisabled();
    await expect(page.locator("#sign-out")).toHaveAttribute("aria-busy", "true");
  });

  test("guía: anonimización, copiar, imprimir y limpiar", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
    await page.goto(`${BASE}/tests/blank.html`);
    await page.setContent(`<!doctype html><html><body>
      <input id="anon-confirm" type="checkbox">
      <nav id="section-nav"></nav>
      <form id="guide-form"></form>
      <strong id="progress-value">0%</strong><i id="progress-bar"></i>
      <section class="synthesis-panel"><div class="actions">
        <button id="copy-summary" class="button primary" type="button">Copiar síntesis</button>
        <button id="print-guide" class="button secondary" type="button">Imprimir o guardar PDF</button>
      </div><pre id="summary-output"></pre></section>
      <button id="reset-guide" type="button">Limpiar guía</button>
      <div id="toast" hidden></div>
    </body></html>`);
    await page.addStyleTag({ url: `${BASE}/kinecheck-clinico-guia/guide.css` });
    await page.addStyleTag({ url: `${BASE}/kinecheck-clinico-guia/guide-ui-fix.css` });
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (value) => { window.__copiedSummary = value; } },
      });
      window.print = () => { window.__printCalled = true; };
    });
    await page.addScriptTag({ url: `${BASE}/kinecheck-clinico-guia/guide.js` });
    await page.addScriptTag({ url: `${BASE}/kinecheck-clinico-guia/guide-ui-fix.js` });
    await page.evaluate(() => window.KineCheckClinicoGuide.start());

    await expect(page.locator("#section-nav a")).toHaveCount(10);
    const caseCode = page.locator("#case_code");
    await expect(caseCode).toBeDisabled();

    await page.locator("#anon-confirm").check();
    await expect(caseCode).toBeEnabled();
    await caseCode.fill("CASO-PRUEBA-01");

    await page.locator("#copy-summary").click();
    await expect.poll(() => page.evaluate(() => window.__copiedSummary || "")).toContain("CASO-PRUEBA-01");

    await page.locator("#print-guide").click();
    await expect.poll(() => page.evaluate(() => Boolean(window.__printCalled))).toBe(true);

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#reset-guide").click();
    await expect(page.locator("#anon-confirm")).not.toBeChecked();
    await expect(caseCode).toHaveValue("");
    await expect(caseCode).toBeDisabled();
  });
});
