// Local integration test. All identity checks and KV data are synthetic and
// confined to this process. No requests to production are allowed.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { onRequestGet, onRequestPost, onRequestPut } from '../functions/api/library-feedback.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const records = new Map();
const store = {
  async get(key, type) { const raw = records.get(key); return raw === undefined ? null : type === 'json' ? JSON.parse(raw) : raw; },
  async put(key, value) { records.set(key, value); },
  async list({ prefix }) { return { keys: [...records.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  assert.equal(String(url), 'https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1/platform-context');
  return Response.json({ owner: options.headers.authorization === 'Bearer local-synthetic-owner' });
};
const payloads = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const origin = `http://${req.headers.host}`;
    const url = new URL(req.url, origin);
    if (url.pathname === '/__local-test__/owner-session') {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end('<script>sessionStorage.setItem("kinecheck_admin_session_v1",JSON.stringify({access_token:"local-synthetic-owner"}))</script><a href="/admin/feedback/">Moderación local</a>');
      return;
    }
    if (url.pathname === '/api/library-feedback') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const headers = new Headers(req.headers);
      headers.set('cf-connecting-ip', '198.51.100.7');
      const request = new Request(url, { method: req.method, headers, ...(body.length ? { body } : {}) });
      if (req.method === 'POST') payloads.push(JSON.parse(body));
      const handler = { GET: onRequestGet, POST: onRequestPost, PUT: onRequestPut }[req.method];
      const response = await handler({ request, env: { LIBRARY_FEEDBACK: store, FEEDBACK_RATE_LIMIT_SECRET: 'local-synthetic-rate-secret-0000000000000000' } });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (url.pathname.startsWith('/api/')) { res.writeHead(404); res.end('{}'); return; }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname), url.pathname.endsWith('/') ? 'index.html' : '');
    if (!path.startsWith(root + sep) && path !== root) { res.writeHead(403); res.end(); return; }
    const bytes = await readFile(path);
    res.setHeader('content-type', mime[extname(path)] || 'application/octet-stream');
    res.end(bytes);
  } catch (error) { res.writeHead(500); res.end(String(error.message)); }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let activePage;
const results = [];
try {
  browser = await chromium.launch({ headless: true });
  const newContext = async (width = 390) => {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    context.setDefaultTimeout(15000);
    await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    return context;
  };
  for (let rating = 1; rating <= 5; rating++) {
    const context = await newContext(rating === 1 ? 320 : 390);
    const page = await context.newPage();
    activePage = page;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const path = ['/gratis/', '/gratis/pacientes/', '/gratis/profesionales/'][(rating - 1) % 3];
    await page.goto(origin + path);
    const metricsConsent = page.getByRole('button', { name: 'Rechazar métricas', exact: true });
    if (await metricsConsent.isVisible()) await metricsConsent.click();
    const widget = page.locator('#kc-feedback');
    await widget.locator('#kc-fb-average').filter({ hasText: 'Aún sin valoraciones' }).waitFor();
    await widget.locator('.kc-fb-ratings label').nth(rating - 1).click();
    assert.equal(await widget.locator(`input[value="${rating}"]`).isChecked(), true);
    await widget.locator('textarea').fill(`PRUEBA SINTÉTICA UI ${rating}: <img src=x onerror=alert(1)> texto de verificación.`);
    await widget.getByRole('button', { name: 'Enviar opinión anónima' }).click();
    await widget.getByText('Gracias. Tu valoración quedó registrada y aparecerá tras la moderación.').waitFor();
    assert.equal(payloads.at(-1).page, path);
    assert.equal(Number(payloads.at(-1).rating), rating);
    assert.deepEqual(errors, []);
    const cookie = (await context.cookies()).find(cookie => cookie.name === 'kc_feedback_submitted');
    assert.equal(cookie?.path, '/api/library-feedback');
    if (rating === 1) {
      await widget.locator('.kc-fb-ratings label').nth(0).click();
      await widget.getByRole('button', { name: 'Enviar opinión anónima' }).click();
      await widget.getByText('Ya registramos una opinión desde este navegador.').waitFor();
    }
    await context.close();
    console.log(`Synthetic ${rating}-star submission passed for ${path}.`);
  }
  results.push('All five star choices submit successfully, correct page on all three libraries, cookie blocks duplicate, no page ReferenceError.');

  const context = await newContext();
  const page = await context.newPage();
  activePage = page;
  await page.goto(origin + '/admin/feedback/');
  assert.equal(await page.locator('#results').isVisible(), false);
  assert.match(await page.locator('#status').textContent(), /Inicia sesión/);
  await page.goto(origin + '/__local-test__/owner-session');
  await page.getByRole('link', { name: 'Moderación local' }).click();
  await page.locator('#results').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#pending-count').textContent(), '5');
  for (let rating = 1; rating <= 4; rating++) {
    const review = page.locator('#pending .review').filter({ hasText: `PRUEBA SINTÉTICA UI ${rating}` });
    const approve = review.getByRole('button', { name: 'Aprobar y publicar' });
    assert.equal(await approve.isDisabled(), true);
    await review.locator('textarea').fill(`PRUEBA SINTÉTICA UI ${rating}: texto anonimizado de prueba. ${rating === 1 ? 'x'.repeat(360) : ''}`);
    await review.getByRole('checkbox').check();
    await approve.click();
    await page.locator('#pending-count').filter({ hasText: String(5 - rating) }).waitFor();
  }
  await page.locator('#pending .review').filter({ hasText: 'PRUEBA SINTÉTICA UI 5' }).getByRole('button', { name: 'Rechazar', exact: true }).click();
  await page.locator('#pending-count').filter({ hasText: '0' }).waitFor();
  assert.equal(await page.locator('#count').textContent(), '4');
  assert.equal(await page.locator('#average').textContent(), '2.5/5');
  results.push('Authenticated local owner can redact/approve/reject; anonymous view stays hidden. Public summary is 4 approved, 2.5/5, distribution [1,1,1,1,0].');

  const artifactDir = process.env.FEEDBACK_QA_DIR;
  if (artifactDir) await mkdir(artifactDir, { recursive: true });
  for (const width of [320, 390, 768, 1365]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/gratis/');
    const metricsConsent = page.getByRole('button', { name: 'Rechazar métricas', exact: true });
    if (await metricsConsent.isVisible()) await metricsConsent.click();
    const widget = page.locator('#kc-feedback');
    await widget.getByText('4 evaluaciones aprobadas', { exact: true }).waitFor();
    assert.equal(await widget.locator('#kc-fb-comments article').count(), 4);
    assert.equal(await widget.locator('#kc-fb-comments img, #kc-fb-comments script').count(), 0);
    const geometry = await widget.evaluate(node => ({ left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right, viewport: innerWidth, scroll: node.scrollWidth, width: node.clientWidth }));
    assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewport + 1 && geometry.scroll <= geometry.width + 1, JSON.stringify(geometry));
    const ratingTops = await widget.locator('.kc-fb-ratings label').evaluateAll(labels => labels.map(label => label.getBoundingClientRect().top));
    assert.ok(Math.max(...ratingTops) - Math.min(...ratingTops) < 1, 'All five star controls must fit on one row.');
    const countFont = await widget.locator('#kc-fb-average p').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    assert.ok(countFont < 20, 'The count must not inherit the large average font.');
    assert.ok(await page.locator('header img[src*="kinecheck-3d-"]').count() > 0);
    if (artifactDir && [320, 1365].includes(width)) await widget.screenshot({ path: resolve(artifactDir, `feedback-${width}.png`) });
  }
  results.push('No horizontal overflow at 320, 390, 768, 1365px; long comments wrap, original logo assets remain, comment markup never executes.');
  await context.close();
  console.log(JSON.stringify({ environment: 'local; synthetic KV and mocked owner verification; no Cloudflare E2E claim', passed: true, results }, null, 2));
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    const detail = await activePage.locator('#kc-feedback, #status').allTextContents();
    console.error('Synthetic browser state:', detail.join('\n').slice(0, 3000));
    if (process.env.FEEDBACK_QA_DIR) {
      await mkdir(process.env.FEEDBACK_QA_DIR, { recursive: true });
      await activePage.screenshot({ path: resolve(process.env.FEEDBACK_QA_DIR, 'failure.png'), fullPage: true });
      await writeFile(resolve(process.env.FEEDBACK_QA_DIR, 'failure.txt'), String(error) + '\n' + detail.join('\n'));
    }
  }
  throw error;
} finally {
  if (browser) await browser.close();
  records.clear();
  assert.equal(records.size, 0);
  console.log('Local synthetic records and rate-limit keys removed; no production data touched.');
  globalThis.fetch = originalFetch;
  await new Promise(resolve => server.close(resolve));
}
