import { test, expect } from "@playwright/test";

const BASE = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");

function rgb(value) {
  const match = String(value).match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/i);
  if (!match) throw new Error(`Color no interpretable: ${value}`);
  return match.slice(1, 4).map(Number);
}

function luminance([r, g, b]) {
  const c = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

async function exposeDashboard(page) {
  await page.goto(`${BASE}/academy/?qa=tester-visual-${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => {
    const login = document.querySelector("#login-view");
    const dashboard = document.querySelector("#dashboard-view");
    if (login) login.hidden = true;
    if (dashboard) dashboard.hidden = false;
    document.body.dataset.kcView = "biblioteca";
  });
  await page.waitForTimeout(150);
}

function intersects(a, b) {
  const aRight = a.x + a.width;
  const aBottom = a.y + a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.height;
  return !(aRight <= b.x || a.x >= bRight || aBottom <= b.y || a.y >= bBottom);
}

async function assertNoOverflow(page) {
  const pageOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(pageOverflow.scrollWidth).toBeLessThanOrEqual(pageOverflow.clientWidth + 3);
}

async function assertNoClippedHeadings(page) {
  const clipped = await page.locator("h1:visible,h2:visible,h3:visible").evaluateAll((nodes) => nodes
    .map((node) => {
      const style = getComputedStyle(node);
      const horizontal = node.scrollWidth > node.clientWidth + 2 && ["hidden", "clip"].includes(style.overflowX);
      const vertical = node.scrollHeight > node.clientHeight + 2 && ["hidden", "clip"].includes(style.overflowY);
      return horizontal || vertical ? {
        text: (node.textContent || "").trim().slice(0, 100),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        clientHeight: node.clientHeight,
        scrollHeight: node.scrollHeight,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
      } : null;
    })
    .filter(Boolean));
  expect(clipped, JSON.stringify(clipped)).toEqual([]);
}

async function assertImagesLoaded(page) {
  const broken = await page.locator("img").evaluateAll((images) => images
    .filter((image) => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0)
    .map((image) => image.currentSrc || image.getAttribute("src") || "imagen sin src"));
  expect(broken, JSON.stringify(broken)).toEqual([]);
}

async function assertPublicControlsUsable(page) {
  const controls = page.locator('main a[href],footer a[href]');
  const total = await controls.count();
  expect(total).toBeGreaterThan(0);
  for (let index = 0; index < total; index += 1) {
    const control = controls.nth(index);
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeVisible();
    const state = await control.evaluate((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {
        pointerEvents: style.pointerEvents,
        visibility: style.visibility,
        width: rect.width,
        height: rect.height,
        href: node.getAttribute("href"),
        text: (node.textContent || "").trim().slice(0, 80),
      };
    });
    expect(state.pointerEvents, JSON.stringify(state)).not.toBe("none");
    expect(state.visibility, JSON.stringify(state)).not.toBe("hidden");
    expect(state.width, JSON.stringify(state)).toBeGreaterThan(0);
    expect(state.height, JSON.stringify(state)).toBeGreaterThan(0);
  }
}

for (const viewport of [
  { name: "public-mobile", width: 390, height: 844 },
  { name: "public-tablet", width: 820, height: 1180 },
  { name: "public-desktop", width: 1440, height: 1000 },
]) {
  test(`${viewport.name}: portada, imágenes y controles están utilizables`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${BASE}/?qa=public-visual-${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });

    await expect(page.locator("h1")).toContainText("Evaluación musculoesquelética y razonamiento clínico");
    await expect(page.locator(".kc-testimonial")).toHaveCount(6);
    await expect(page.locator(".kc-stars")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("★★★★★");

    for (const href of ["./profesionales/", "./estudiantes/", "/recupera/", "./demo/", "./academy/", "./metodologia/"]) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeAttached();
    }

    await assertNoOverflow(page);
    await assertNoClippedHeadings(page);
    await assertImagesLoaded(page);

    if (viewport.width <= 700) {
      const menu = page.locator("[data-menu-button]");
      const nav = page.locator("[data-public-nav]");
      await expect(menu).toBeVisible();
      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await expect(nav).toBeVisible();
      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
    }

    const profileCta = page.getByRole("link", { name: "Elegir mi perfil" }).first();
    await profileCta.click();
    await expect(page.locator("#elige")).toBeInViewport();

    await assertPublicControlsUsable(page);
  });
}

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
]) {
  test(`TF-003/005 ${viewport.name}: soporte, navegación y títulos no se solapan ni recortan`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await exposeDashboard(page);

    await assertNoOverflow(page);

    if (viewport.width <= 760) {
      const launcher = page.locator("#support-launcher");
      const bottomNav = page.locator("#kc-bottom-nav");
      await expect(launcher).toBeVisible();
      await expect(bottomNav).toBeVisible();
      const [launcherBox, navBox, geometry] = await Promise.all([
        launcher.boundingBox(),
        bottomNav.boundingBox(),
        page.evaluate(() => {
          const launcherNode = document.querySelector("#support-launcher");
          const navNode = document.querySelector("#kc-bottom-nav");
          const launcherStyle = launcherNode ? getComputedStyle(launcherNode) : null;
          const navStyle = navNode ? getComputedStyle(navNode) : null;
          return {
            viewportHeight: window.innerHeight,
            launcher: launcherStyle ? {
              position: launcherStyle.position,
              bottom: launcherStyle.bottom,
              height: launcherStyle.height,
              zIndex: launcherStyle.zIndex,
            } : null,
            nav: navStyle ? {
              position: navStyle.position,
              bottom: navStyle.bottom,
              height: navStyle.height,
              paddingBottom: navStyle.paddingBottom,
              zIndex: navStyle.zIndex,
            } : null,
          };
        }),
      ]);
      expect(launcherBox).not.toBeNull();
      expect(navBox).not.toBeNull();
      const diagnostic = JSON.stringify({ launcherBox, navBox, geometry });
      expect(intersects(launcherBox, navBox), diagnostic).toBe(false);
    }

    await assertNoClippedHeadings(page);
    await assertImagesLoaded(page);
  });
}

test("TF-004: tokens premium mantienen contraste mínimo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await exposeDashboard(page);
  const tokens = await page.locator("#dashboard-view").evaluate((node) => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;color:var(--kc-ink);background:var(--kc-surface)";
    node.appendChild(probe);
    const probeStyle = getComputedStyle(probe);
    const main = { text: probeStyle.color, surface: probeStyle.backgroundColor };
    probe.style.color = "var(--kc-muted)";
    const muted = getComputedStyle(probe).color;
    probe.remove();
    return { ...main, muted };
  });
  const mainRatio = contrast(rgb(tokens.text), rgb(tokens.surface));
  const mutedRatio = contrast(rgb(tokens.muted), rgb(tokens.surface));
  expect(mainRatio).toBeGreaterThanOrEqual(4.5);
  expect(mutedRatio).toBeGreaterThanOrEqual(4.5);
});
