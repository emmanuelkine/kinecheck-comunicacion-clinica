import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX_SCRIPT = path.join(ROOT, "academy", "academy-recommended-buttons-fix.js");
const OPEN_SCRIPT = path.join(ROOT, "academy", "academy-open-v6.js");
const MI_SCRIPT = path.join(ROOT, "academy", "mi-kinecheck-v1.js");
const BRIDGE_SCRIPT = path.join(ROOT, "academy", "academy-owned-native-bridge-v1.js");

test.use({ viewport: { width: 1440, height: 900 } });

async function installNativeHarness(page) {
  await page.setContent(`
    <!doctype html>
    <html><head></head><body data-kc-experience="professional">
      <div id="kc-toast" hidden></div>
      <section id="dashboard-view"></section>
      <section id="inicio"></section>
      <section id="home-app-grid"></section>
      <section id="home-course-grid"></section>
      <section id="guided-route"></section>
      <section id="course-grid"></section>
      <button id="continue-button" type="button">Continuar</button>
    </body></html>
  `);

  await page.evaluate(() => {
    window.__nativeHome = [];
    window.__nativeLibrary = [];
    window.KINECHECK_ACADEMY_CONFIG = { ownerEmails: [] };

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-kc-open-product]");
      if (button) window.__nativeHome.push(button.dataset.kcOpenProduct);
    });

    document.querySelector("#course-grid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-course]");
      if (button && !button.disabled) window.__nativeLibrary.push(button.dataset.course);
    });
  });

  await page.addScriptTag({ path: OPEN_SCRIPT });
  await page.addScriptTag({ path: FIX_SCRIPT });
}

function decodeBase64UrlJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

test("Inicio deja pasar data-kc-open-product al flujo nativo", async ({ page }) => {
  await installNativeHarness(page);

  await page.evaluate(() => {
    document.querySelector("#home-app-grid").innerHTML = `
      <article><button type="button" data-kc-open-product="kinecheck-estudiante">Abrir</button></article>
    `;
  });

  await page.locator('[data-kc-open-product="kinecheck-estudiante"]').click();
  await expect.poll(async () => page.evaluate(() => window.__nativeHome)).toEqual(["kinecheck-estudiante"]);
});

test("Mis productos deja pasar data-course al openCourse nativo", async ({ page }) => {
  await installNativeHarness(page);

  await page.evaluate(() => {
    document.querySelector("#course-grid").innerHTML = `
      <article><button type="button" data-course="kinecheck-estudiante">Abrir desde biblioteca</button></article>
    `;
  });

  await page.locator('#course-grid [data-course="kinecheck-estudiante"]').click();
  await expect.poll(async () => page.evaluate(() => window.__nativeLibrary)).toEqual(["kinecheck-estudiante"]);
});

test("el bridge de window gana a interceptores de document y termina en el botón nativo", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html><head></head><body>
      <section id="inicio">
        <button type="button" data-kc-open-product="kinecheck-estudiante">Abrir Estudiante</button>
        <button type="button" data-kc-open-owned="kinecheck-recupera">Abrir Recupera</button>
      </section>
      <section id="course-grid">
        <button type="button" data-course="kinecheck-estudiante">Nativo Estudiante</button>
        <button type="button" data-course="kinecheck-recupera">Nativo Recupera</button>
      </section>
    </body></html>
  `);

  await page.evaluate(() => {
    window.__nativeLibrary = [];
    window.__blockedAtDocument = 0;

    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-kc-open-product], [data-kc-open-owned]")) return;
      window.__blockedAtDocument += 1;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    document.querySelector("#course-grid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-course]");
      if (button && !button.disabled) window.__nativeLibrary.push(button.dataset.course);
    });
  });

  await page.addScriptTag({ path: BRIDGE_SCRIPT });

  await page.locator('[data-kc-open-product="kinecheck-estudiante"]').click();
  await page.locator('[data-kc-open-owned="kinecheck-recupera"]').click();

  await expect.poll(async () => page.evaluate(() => window.__nativeLibrary)).toEqual([
    "kinecheck-estudiante",
    "kinecheck-recupera",
  ]);
  await expect.poll(async () => page.evaluate(() => window.__blockedAtDocument)).toBe(0);
});

test("los cursos externos evitan listeners de document y usan el opener privado", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html><body>
      <section id="inicio">
        <button type="button" data-kc-open-product="mas-alla-del-dolor">Más allá</button>
      </section>
      <section id="kc-stage-recommendations">
        <button type="button" data-kc-path-open="evidencia-aplicada">Evidencia</button>
      </section>
      <section id="course-grid">
        <button type="button" data-course="mas-alla-del-dolor">Biblioteca Más allá</button>
        <button type="button" data-course="evidencia-aplicada">Biblioteca Evidencia</button>
      </section>
    </body></html>
  `);

  await page.evaluate(() => {
    window.__external = [];
    window.__documentIntercepts = 0;
    window.KINECHECK_OPEN_PRODUCT = (slug) => { window.__external.push(slug); };

    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-kc-open-product], [data-kc-path-open], [data-course]")) return;
      window.__documentIntercepts += 1;
      event.stopImmediatePropagation();
    }, true);
  });

  await page.addScriptTag({ path: BRIDGE_SCRIPT });

  await page.locator('[data-kc-open-product="mas-alla-del-dolor"]').click();
  await page.locator('[data-kc-path-open="evidencia-aplicada"]').click();
  await page.locator('#course-grid [data-course="mas-alla-del-dolor"]').click();

  await expect.poll(async () => page.evaluate(() => window.__external)).toEqual([
    "mas-alla-del-dolor",
    "evidencia-aplicada",
    "mas-alla-del-dolor",
  ]);
  await expect.poll(async () => page.evaluate(() => window.__documentIntercepts)).toBe(0);
});

for (const [product, pathname] of [
  ["mas-alla-del-dolor", "/mas-alla-del-dolor/"],
  ["evidencia-aplicada", "/kinecheck-evidencia-aplicada/"],
]) {
  test(`sesión fresca entrega ${product} por fragmento efímero sin datos extra`, async ({ page }) => {
    const accessToken = "private-session-access-token-1234567890";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    await page.setContent(`
      <!doctype html><html><body>
        <div id="kc-toast" hidden></div>
        <button type="button" data-kc-path-open="${product}">Abrir externo</button>
      </body></html>
    `);
    await page.evaluate(({ accessToken: token, expiresAt: expiry }) => {
      window.KINECHECK_ACADEMY_SESSION = {
        get: () => ({
          access_token: token,
          expires_at: expiry,
          refresh_token: "NO-DEBE-SALIR",
          user: { email: "no-debe-salir@example.com" },
        }),
      };
    }, { accessToken, expiresAt });

    await page.route(`https://emmanuelkine.github.io${pathname}**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Destino</title>" });
    });
    await page.addScriptTag({ path: OPEN_SCRIPT });

    await Promise.all([
      page.waitForURL((url) => url.hostname === "emmanuelkine.github.io" && url.pathname === pathname),
      page.locator(`[data-kc-path-open="${product}"]`).click(),
    ]);

    const destination = new URL(page.url());
    const encoded = new URLSearchParams(destination.hash.slice(1)).get("kc_handoff");
    expect(encoded).toBeTruthy();

    const handoff = decodeBase64UrlJson(encoded);
    expect(handoff.type).toBe("kinecheck-sso-v3-access-only");
    expect(handoff.product).toBe(product);
    expect(handoff.session.access_token).toBe(accessToken);
    expect(handoff.session.expires_at).toBe(expiresAt);
    expect(handoff.session.refresh_token).toBeUndefined();
    expect(handoff.session.user).toBeUndefined();
    expect(JSON.stringify(handoff)).not.toContain("no-debe-salir@example.com");
    expect(JSON.stringify(handoff)).not.toContain("NO-DEBE-SALIR");
  });
}

test("los botones Abrir de la ruta guiada reutilizan el flujo nativo de Mis productos", async ({ page }) => {
  const guidedProducts = ["kinecheck-estudiante", "kinecheck-recupera", "comunicacion-clinica"];
  await installNativeHarness(page);

  await page.evaluate((slugs) => {
    document.querySelector("#guided-route").innerHTML = slugs.map((slug) => `
      <article><button type="button" data-kc-open-owned="${slug}">Abrir</button></article>
    `).join("");
    document.querySelector("#course-grid").innerHTML = slugs.map((slug) => `
      <article><button type="button" data-course="${slug}">Abrir desde biblioteca</button></article>
    `).join("");
  }, guidedProducts);

  await page.addScriptTag({ path: MI_SCRIPT });

  for (const product of guidedProducts) {
    await page.locator(`#guided-route [data-kc-open-owned="${product}"]`).click();
  }

  await expect.poll(async () => page.evaluate(() => window.__nativeLibrary)).toEqual(guidedProducts);
});

test("las recomendaciones especiales conservan el router alternativo", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html><head></head><body>
      <div id="kc-toast" hidden></div>
      <section id="kc-stage-recommendations">
        <button type="button" data-kc-path-open="comunicacion-clinica">Abrir recomendación</button>
      </section>
    </body></html>
  `);

  await page.evaluate(() => {
    window.__recommended = [];
    window.KINECHECK_OPEN_PRODUCT = async (product) => { window.__recommended.push(product); };
    window.KINECHECK_RESET_PRODUCT_NAVIGATION = () => {};
  });
  await page.addScriptTag({ path: FIX_SCRIPT });

  await page.locator('[data-kc-path-open="comunicacion-clinica"]').click();
  await expect.poll(async () => page.evaluate(() => window.__recommended)).toEqual(["comunicacion-clinica"]);
});

test("al volver a Academy se libera cualquier estado de navegación", async ({ page }) => {
  await page.setContent('<!doctype html><html><body><div id="kc-toast" hidden></div></body></html>');
  await page.evaluate(() => {
    window.__navigationResets = 0;
    window.KINECHECK_RESET_PRODUCT_NAVIGATION = () => { window.__navigationResets += 1; };
  });
  await page.addScriptTag({ path: FIX_SCRIPT });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect.poll(async () => page.evaluate(() => window.__navigationResets)).toBeGreaterThan(0);
});
