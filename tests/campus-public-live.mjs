// Read-only guest checks against the actual HTTPS deployment. No routes,
// accounts, sessions, roles or upstream responses are mocked in this script.
import { chromium, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { isCampusPreviewHost } from '../campus/environment.mjs';

const origin = process.env.KINECHECK_PUBLIC_ORIGIN;
assert.ok(/^https:\/\/(?:kinecheck\.cl|[a-z0-9-]+\.kinecheck-comunicacion-clinica\.pages\.dev)$/.test(origin || ''), 'Se requiere un origen público permitido.');
const root = new URL('../', import.meta.url);
const output = new URL('qa-campus-public/', root);
await mkdir(output, { recursive: true });
const digest = value => createHash('sha256').update(value).digest('hex');
const assets = ['campus/index.html', 'campus/campus.js', 'campus/campus.css', 'exercise/app.css', 'exercise/sw.js'];
const expected = await Promise.all(assets.map(async path => ({ path, hash: digest(await readFile(new URL(path, root))) })));
let ready = false;
for (let attempt = 0; attempt < 24 && !ready; attempt++) {
  const actual = await Promise.all(expected.map(async ({ path, hash }) => {
    try {
      const response = await fetch(`${origin}/${path}?campus_verify=${hash.slice(0, 16)}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      return response.ok && digest(Buffer.from(await response.arrayBuffer())) === hash;
    } catch { return false; }
  }));
  ready = actual.every(Boolean);
  if (!ready && attempt < 23) await new Promise(resolve => setTimeout(resolve, 10000));
}
assert.ok(ready, 'El despliegue público no sirve todavía los cinco archivos exactos de esta revisión.');
const reports = [];
for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [360, 390, 768, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600, locale: 'es-CL' });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const response = await page.goto(`${origin}/campus/`);
        assert.equal(response.status(), 200);
        assert.match(response.headers()['content-security-policy'], /default-src 'self'/);
        assert.match(response.headers()['cache-control'], /no-store/);
        await page.locator('#routesGrid article').last().waitFor();
        await page.waitForFunction(() => !document.querySelector('#globalStatus').textContent);
        assert.equal(await page.locator('#routesGrid article').count(), 6);
        assert.equal(await page.locator('#resourcesGrid article').count(), 10);
        assert.equal(await page.locator('#signedIn').isVisible(), false);
        assert.equal(await page.locator('#teacherWorkspace').isVisible(), false);
        assert.equal(await page.locator('#adminWorkspace').isVisible(), false);
        assert.equal(await page.getByText('Entorno de pruebas de Campus.', { exact: false }).isVisible(), isCampusPreviewHost(new URL(origin).hostname));
        const layout = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: innerWidth }));
        assert.ok(layout.scroll <= layout.client, `Campus desborda a ${width}px.`);
        await page.locator('.skip').focus();
        await page.keyboard.press('Enter');
        assert.ok(page.url().includes('#contenido'));
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        await writeFile(new URL(`${engineName}-${width}-axe.json`, output), JSON.stringify(axe.violations, null, 2));
        assert.deepEqual(axe.violations.map(item => item.id), []);
        await page.screenshot({ path: new URL(`${engineName}-${width}-inicio.png`, output).pathname });
        await page.locator('#routesGrid button').filter({ hasText: 'Resolver caso' }).first().click();
        for (const [index, answer] of [0, 1, 2].entries()) {
          const field = page.locator('.case-step').nth(index);
          await field.locator(`input[value="${answer}"]`).check();
          await field.getByRole('button', { name: 'Comprobar y continuar' }).click();
          await field.locator('.feedback').waitFor();
        }
        await page.locator('#finishCase').click();
        await page.locator('#caseResult').filter({ hasText: 'sin guardar' }).waitFor();
        assert.match(await page.locator('#caseResult').textContent(), /100%/);
        const dialogAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        assert.deepEqual(dialogAxe.violations.map(item => item.id), []);
        assert.equal(await page.locator('#caseDialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth), true);
        await page.screenshot({ path: new URL(`${engineName}-${width}-caso.png`, output).pathname });
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#caseDialog').evaluate(dialog => dialog.open), false);
        const protectedResponse = await context.request.post(`${origin}/api/campus/action`, { headers: { origin }, data: { action: 'context', payload: {} } });
        assert.equal(protectedResponse.status(), 401);
        const crossOrigin = await context.request.post(`${origin}/api/campus/action`, { headers: { origin: 'https://example.invalid' }, data: { action: 'context', payload: {} } });
        assert.equal(crossOrigin.status(), 403);
        assert.deepEqual(errors, []);
        reports.push({ engine: engineName, width, layout, guestCase: '100%, sin guardar', anonymousAccess: 401, crossOrigin: 403, axeViolations: 0, live: true });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
const result = { origin, verifiedAt: new Date().toISOString(), source: process.env.GITHUB_SHA || null, exactAssets: expected, reports };
await writeFile(new URL('results.json', output), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
