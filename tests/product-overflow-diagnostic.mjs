import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "es-CL",
    timezoneId: "America/Santiago",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/productos/?qa=overflow-${Date.now()}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForFunction(() => {
    const title = document.querySelector("#product-title")?.textContent || "";
    return title.includes("KineCheck Clínico") && Boolean(document.querySelector(".product-detail-price"));
  }, { timeout: 15000 });

  const result = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll("body *")]
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || "",
          className: typeof el.className === "string" ? el.className : "",
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          display: style.display,
          position: style.position,
          whiteSpace: style.whiteSpace,
          text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
        };
      })
      .filter((item) => item.right > viewport + 1 || item.left < -1 || item.scrollWidth > item.clientWidth + 3)
      .sort((a, b) => Math.max(b.right - viewport, b.scrollWidth - b.clientWidth) - Math.max(a.right - viewport, a.scrollWidth - a.clientWidth))
      .slice(0, 25);

    return {
      viewport,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  assert.ok(
    result.documentScrollWidth <= result.viewport + 3,
    `Overflow móvil en /productos/: ${result.documentScrollWidth}/${result.viewport}`,
  );
  await context.close();
} finally {
  await browser.close();
}
