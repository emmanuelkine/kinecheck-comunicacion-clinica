// Local integration test: synthetic KV, loopback-only site, no production requests.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { onRequestGet, onRequestPost } from '../functions/api/library-feedback.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const records = new Map();
const store = {
  async get(key, type) { const raw = records.get(key); return raw === undefined ? null : type === 'json' ? JSON.parse(raw) : raw; },
  async put(key, value) { records.set(key, value); },
  async list({ prefix }) { return { keys: [...records.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
};
const payloads = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const origin = `http://${req.headers.host}`;
    const url = new URL(req.url, origin);
    if (url.pathname === '/api/library-feedback') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const headers = new Headers(req.headers);
      headers.set('cf-connecting-ip', '198.51.100.7');
      const request = new Request(url, { method: req.method, headers, ...(body.length ? { body } : {}) });
      if (req.method === 'POST') payloads.push(JSON.parse(body));
      const handler = { GET: onRequestGet, POST: onRequestPost }[req.method];
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
try {
  browser = await chromium.launch({ headless: true });
  const contexts = [];
  const newContext = async (width = 390) => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width <= 430, hasTouch: width <= 430 });
    contexts.push(context);
    context.setDefaultTimeout(15000);
    await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    return context;
  };
  const paths = ['/gratis/', '/gratis/pacientes/', '/gratis/profesionales/', '/gratis/', '/gratis/'];
  for (let i = 0; i < 5; i++) {
    const context = await newContext(i === 0 ? 320 : 390);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const path = paths[i];
    await page.goto(origin + path);
    const metricsConsent = page.getByRole('button', { name: 'Rechazar métricas', exact: true });
    if (await metricsConsent.isVisible()) await metricsConsent.click();
    const widget = page.locator('#kc-feedback');
    await widget.locator('#kc-fb-average').waitFor();
    if (i === 0) await widget.getByText('Aún sin puntuaciones').waitFor();
    else await widget.getByText(`${i} ${i === 1 ? 'puntuación' : 'puntuaciones'}`, { exact: true }).waitFor();
    await widget.locator('.ratings label').nth(i).click();
    assert.equal(await widget.locator(`input[value="${i + 1}"]`).isChecked(), true);
    await widget.getByRole('button', { name: 'Enviar puntuación' }).click();
    await widget.getByText('Tu puntuación se registró y ya forma parte del promedio público.').waitFor();
    assert.equal(payloads.at(-1).page, path);
    assert.equal(Number(payloads.at(-1).rating), i + 1);
    assert.equal(Object.hasOwn(payloads.at(-1), 'comment'), false);
    assert.deepEqual(errors, []);
    const cookie = (await context.cookies()).find(cookie => cookie.name === 'kc_feedback_submitted');
    assert.equal(cookie?.path, '/api/library-feedback');
    assert.ok((await widget.locator('#kc-fb-average').innerText()).startsWith(`${(i + 1) / (i + 1) * (i + 2) / 2} / 5`));
    await context.close();
    contexts.splice(contexts.indexOf(context), 1);
  }

  const desktop = await newContext(1365);
  const page = await desktop.newPage();
  await page.goto(origin + '/gratis/');
  const metricsConsent = page.getByRole('button', { name: 'Rechazar métricas', exact: true });
  if (await metricsConsent.isVisible()) await metricsConsent.click();
  const widget = page.locator('#kc-feedback');
  await widget.getByText('5 puntuaciones', { exact: true }).waitFor();
  assert.ok((await widget.locator('#kc-fb-average').innerText()).startsWith('3 / 5'));
  assert.equal(await widget.locator('.kc-fb-row').count(), 5);
  for (const width of [320, 390, 768, 1365]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await widget.evaluate(node => ({ left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right, viewport: innerWidth, scroll: node.scrollWidth, width: node.clientWidth }));
    assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewport + 1 && geometry.scroll <= geometry.width + 1, JSON.stringify(geometry));
    const tops = await widget.locator('.ratings label').evaluateAll(labels => labels.map(label => label.getBoundingClientRect().top));
    assert.ok(Math.max(...tops) - Math.min(...tops) < 1, 'Five star controls should fit on one row.');
    assert.ok(await page.locator('header img[src*="kinecheck-3d-"]').count() > 0);
  }
  assert.equal([...records.keys()].filter(key => key.startsWith('feedback:')).length, 5);
  assert.deepEqual([...records.values()].map(JSON.parse).map(row => row.rating), [1, 2, 3, 4, 5]);
  console.log(JSON.stringify({
    environment: 'local synthetic KV; loopback browser; no Cloudflare E2E claim',
    passed: true,
    results: [
      'All five star choices submit successfully across the three library paths; ratings are stored without comment fields.',
      'Public average and distribution reflect the five stored values (3/5; [1,1,1,1,1]).',
      'Responsive browser checks passed at 320, 390, 768 and 1365px; five controls fit in one row with no horizontal overflow.',
    ],
  }, null, 2));
  await desktop.close();
  contexts.splice(contexts.indexOf(desktop), 1);
  for (const context of contexts) await context.close();
} finally {
  if (browser) await browser.close();
  records.clear();
  assert.equal(records.size, 0);
  console.log('Synthetic records and rate-limit keys removed; no production data touched.');
  await new Promise(resolve => server.close(resolve));
}
