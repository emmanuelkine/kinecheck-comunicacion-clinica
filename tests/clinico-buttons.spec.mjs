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
    await expect(page.locator(".ecosystem-entry-link")).toHaveAttribute("href", "../academy/#biblioteca");
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
      if (url.includes("/functions/v1/course-key")) {
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

  test("curso: temario, módulos, comprobación y progreso", async ({ page }) => {
    await page.goto(`${BASE}/tests/blank.html`);
    await page.setContent(`<!doctype html><html><body><div id="root"></div><button id="sign-out" type="button" hidden>Cerrar sesión</button></body></html>`);
    await page.addStyleTag({ url: `${BASE}/kinecheck-clinico-curso/course.css` });
    await page.addStyleTag({ url: `${BASE}/kinecheck-clinico-curso/access-ui-fix.css` });
    await page.addScriptTag({ url: `${BASE}/kinecheck-clinico-curso/course-data.js` });
    await page.addScriptTag({ url: `${BASE}/kinecheck-clinico-curso/access-ui-fix.js` });
    await page.addScriptTag({ url: `${BASE}/kinecheck-clinico-curso/renderer.js` });

    await expect(page.locator("[data-open-module]")).toHaveCount(10);
    await expect(page.locator("[data-module].active")).toHaveCount(1);

    const sidebar = page.locator("[data-sidebar]");
    const temario = page.locator("[data-toggle-sidebar]");
    await temario.click();
    await expect(sidebar).toHaveClass(/open/);
    await expect(temario).toHaveAttribute("aria-expanded", "true");

    const secondModule = page.locator("[data-open-module]").nth(1);
    const secondId = await secondModule.getAttribute("data-open-module");
    await secondModule.click();
    await expect(page.locator(`[data-module="${secondId}"]`)).toHaveClass(/active/);
    await expect(secondModule).toHaveAttribute("aria-current", "page");
    await expect(sidebar).not.toHaveClass(/open/);

    await temario.click();
    await expect(sidebar).toHaveClass(/open/);
    await page.keyboard.press("Escape");
    await expect(sidebar).not.toHaveClass(/open/);
    await expect(temario).toHaveAttribute("aria-expanded", "false");

    const lesson = page.locator(`[data-module="${secondId}"] details.kc-lesson`).first();
    await lesson.locator("summary").click();
    const lessonId = await lesson.getAttribute("data-lesson");
    const checkButton = lesson.locator("[data-check-quiz]");
    const feedback = lesson.locator("[data-quiz-feedback]");
    const completeButton = lesson.locator("[data-complete-lesson]");

    await checkButton.click();
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText("Selecciona una alternativa");
    await expect(completeButton).toBeDisabled();

    const correctAnswer = await page.evaluate((id) => {
      const lessons = window.__KINECHECK_COURSE_PAYLOAD__.modules.flatMap((module) => module.lessons);
      return lessons.find((item) => item.id === id).quiz.answer;
    }, lessonId);
    await lesson.locator(`input[type="radio"][value="${correctAnswer}"]`).check();
    await checkButton.click();
    await expect(feedback).toContainText("Correcto");
    await expect(completeButton).toBeEnabled();

    await completeButton.click();
    await expect(completeButton).toHaveText("Marcar como pendiente");
    await expect(lesson).toHaveClass(/completed/);

    await page.evaluate(() => { document.querySelector("#sign-out").hidden = false; });
    await expect(page.locator(".kc-top-actions #sign-out")).toBeVisible();
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
