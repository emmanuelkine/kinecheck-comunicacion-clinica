import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const BASE = String(process.env.BASE_URL || "http://127.0.0.1:4173").replace(
  /\/$/,
  "",
);
const AVAILABLE_BROWSERS = [
  ["Chromium", chromium],
  ["WebKit", webkit],
];
const requestedBrowsers = new Set(
  String(process.env.BROWSERS || "chromium,webkit")
    .toLowerCase()
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);
const BROWSERS = AVAILABLE_BROWSERS.filter(([name]) =>
  requestedBrowsers.has(name.toLowerCase()),
);
assert.ok(BROWSERS.length > 0, "BROWSERS debe incluir chromium o webkit");
const VIEWPORTS = [
  ["mobile", { width: 390, height: 844 }],
  ["desktop", { width: 1440, height: 1000 }],
];

async function assertNoOverflow(page, label) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(
    scrollWidth <= clientWidth + 3,
    `${label}: desbordamiento ${scrollWidth}/${clientWidth}`,
  );
}

for (const [browserName, browserType] of BROWSERS) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const [device, viewport] of VIEWPORTS) {
      const context = await browser.newContext({
        viewport,
        locale: "es-CL",
        timezoneId: "America/Santiago",
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on("pageerror", (error) => runtimeErrors.push(error.message));

      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      assert.equal(
        await page.locator("#confianza").count(),
        1,
        `${browserName}/${device}: falta confianza`,
      );
      assert.equal(
        await page.locator('a[href^="./muestras/"]').count(),
        5,
        `${browserName}/${device}: faltan CTA de muestra`,
      );
      const appsText = await page
        .locator(".brand-family-card", { hasText: "KINECHECK APPS" })
        .innerText();
      assert.ok(
        !appsText.includes("Clínico"),
        `${browserName}/${device}: Clínico figura como app`,
      );
      await assertNoOverflow(page, `${browserName}/${device}/home`);

      await page.goto(`${BASE}/productos/?producto=kinecheck-clinico`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector("#temario .module-card");
      assert.equal(
        await page.locator("#temario .module-card").count(),
        10,
        `${browserName}/${device}: temario incompleto`,
      );
      assert.equal(
        (await page.locator("#product-family").innerText()).trim(),
        "KINECHECK FORMACIÓN",
        `${browserName}/${device}: familia clínica incorrecta`,
      );
      assert.ok(
        (await page.locator("#metodologia").innerText()).includes(
          "Emmanuel Zúñiga",
        ),
        `${browserName}/${device}: falta autoría`,
      );
      await assertNoOverflow(page, `${browserName}/${device}/clinico`);

      await page.goto(`${BASE}/muestras/`, { waitUntil: "domcontentloaded" });
      assert.equal(
        await page.locator(".demo-section").count(),
        3,
        `${browserName}/${device}: muestras incompletas`,
      );
      await page.locator('[data-clinical-quiz] input[value="2"]').check();
      await page.locator('[data-clinical-quiz] button[type="submit"]').click();
      assert.ok(
        (await page.locator("[data-clinical-feedback]").innerText()).includes(
          "Decisión defendible",
        ),
        `${browserName}/${device}: quiz sin feedback`,
      );
      await page.locator('[data-student-step="3"]').click();
      await page
        .locator("#student-reasoning")
        .fill(
          "Priorizar seguridad y justificar qué hallazgo cambiaría la conducta.",
        );
      assert.ok(
        Number(await page.locator("[data-student-count]").innerText()) > 20,
        `${browserName}/${device}: contador inactivo`,
      );
      await page.locator("[data-build-summary]").click();
      assert.ok(
        (await page.locator("[data-daily-summary]").innerText()).includes(
          "Resumen demostrativo",
        ),
        `${browserName}/${device}: resumen inactivo`,
      );
      await assertNoOverflow(page, `${browserName}/${device}/muestras`);

      assert.deepEqual(
        runtimeErrors,
        [],
        `${browserName}/${device}: errores de ejecución: ${runtimeErrors.join(" | ")}`,
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

console.log(
  `Confianza pública validada en ${BROWSERS.map(([name]) => name).join(" y ")}, móvil y escritorio.`,
);
