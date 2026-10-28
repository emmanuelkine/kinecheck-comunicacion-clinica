import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const renderer = await readFile(resolve(root, 'academy/kinecheck-ortho/renderer.js'), 'utf8');
const fixture = {
  title: 'Rehabilitación musculoesquelética avanzada', subtitle: 'Versión sintética para probar el reproductor.', level: 'Intermedio y avanzado', durationHours: 50,
  competencies: ['Razonamiento clínico', 'Prescripción individualizada'],
  modules: Array.from({ length: 12 }, (_, index) => ({
    id: `m${index+1}`, title: `Módulo de prueba ${index+1}`, hours: index === 0 ? 3 : 4,
    lessons: [{ id: `l${index+1}`, title: `Lección de prueba ${index+1}`, body: ['Contenido ficticio para una comprobación de interfaz.'], ...(index === 0 ? { case: {
      id: 'case-fixture', title: 'Caso ficticio progresivo', introduction: 'Cada etapa se revela después de registrar una decisión.',
      stages: [
        { prompt: '¿Qué dato ampliarías primero?', reveal: 'La persona describe su objetivo funcional.', options: ['Explorar actividad y objetivo', 'Solicitar imagen sin pregunta clínica'], feedback: 'Contrasta utilidad, riesgo y preferencias.' },
        { prompt: '¿Qué medirías ahora?', reveal: 'La fuerza está reducida y el movimiento provoca síntomas tolerables.', options: ['Medida de fuerza y actividad', 'Una prueba aislada como diagnóstico'], feedback: 'Relaciona la medida con una hipótesis revisable.' },
        { prompt: '¿Cómo revisarías la respuesta?', reveal: 'Tras dos semanas informa que cumple el plan parcialmente.', options: ['Acordar ajuste y nuevo seguimiento', 'Mantener el plan sin preguntar'], feedback: 'La respuesta invita a adaptar la dosis y explorar barreras.' },
      ],
    } } : {}) }],
  })),
};
const server = createServer(async (request, response) => {
  let path = resolve(root, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
  if (!(path === root || path.startsWith(root + sep))) { response.writeHead(404).end(); return; }
  if (!extname(path)) path = resolve(path, 'index.html');
  try { response.setHeader('content-type', mime[extname(path)] || 'application/octet-stream'); response.end(await readFile(path)); }
  catch { response.writeHead(404).end(); }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await webkit.launch({ headless: true });
  for (const width of [320, 390, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/academy/kinecheck-ortho/`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Abre Ortho desde Academy' }).waitFor();
    assert.match(await page.locator('#gate').innerText(), /acceso activo/);
    assert.equal(await page.locator('#course-root').isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no horizontal overflow at ${width}px`);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(axe.violations.map(issue => issue.id), [], `aXe violations at ${width}px`);
    assert.deepEqual(errors, [], `browser errors at ${width}px`);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem('kinecheck_secure_session_v1', JSON.stringify({ access_token: 'synthetic-browser-test-token', expires_at: Date.now()/1000+3600 })));
  await context.route('**/*', async route => {
    if (route.request().url().startsWith(origin + '/')) return route.continue();
    if (route.request().url().startsWith('blob:')) return route.continue();
    if (route.request().url() === 'https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1/protected-course-key') {
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: `window.KC_ORTHO_DATA=${JSON.stringify(fixture)};\n${renderer}` });
    }
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/academy/kinecheck-ortho/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  if (!(await page.locator('#course-root').isVisible())) throw new Error(`Synthetic access gate failed: ${await page.locator('#gate').innerText()} | page errors: ${errors.join('; ')}`);
  await page.getByRole('heading', { name: 'Rehabilitación musculoesquelética avanzada' }).waitFor();
  assert.equal(await page.locator('.module-list button').count(), 12);
  const stageOne = page.getByText('¿Qué dato ampliarías primero?', { exact: false });
  await stageOne.waitFor();
  assert.equal(await page.getByText('¿Qué medirías ahora?', { exact: false }).count(), 0, 'later case information stays unrevealed');
  const choices = page.locator('[data-case-stage] select');
  await choices.selectOption('0');
  await page.locator('[data-case-stage] textarea').fill('Lo pregunto porque cambia el objetivo acordado y ayuda a elegir una medida pertinente.');
  await page.getByRole('button', { name: 'Registrar decisión y revelar la próxima etapa' }).click();
  await page.getByText('¿Qué medirías ahora?', { exact: false }).waitFor();
  assert.match(await page.locator('.course-grid').innerText(), /Evaluación sumativa desactivada/);
  assert.match(await page.locator('.course-grid').innerText(), /OTEC deshabilitada/);
  const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, offenders: [...document.querySelectorAll('body *')].map(node => ({ tag: node.tagName, cls: String(node.className || ''), right: Math.round(node.getBoundingClientRect().right), left: Math.round(node.getBoundingClientRect().left) })).filter(node => node.right > innerWidth + 1 || node.left < -1).slice(0, 8) }));
  assert.ok(overflow.width <= overflow.viewport, `responsive overflow: ${JSON.stringify(overflow)}`);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(axe.violations.map(issue => issue.id), [], 'aXe violations on synthetic student view');
  assert.deepEqual(errors, [], 'browser errors on synthetic student view');
  await context.close();
  console.log('WebKit: no-session gate at 320/390/768/1280 px; synthetic licensed UI at 390 px reveals case data in stages. Zero overflow, aXe violations or page errors. Fixture only; no real entitlement or course content was loaded.');
} finally {
  await browser?.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
