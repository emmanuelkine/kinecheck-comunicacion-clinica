import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const origin = 'https://apps.kinecheck.cl';
const warning = 'Uso exclusivamente educativo. No ingreses datos reales de pacientes. Está prohibido registrar nombre, RUT, teléfono, correo electrónico, fotografías identificables, número de ficha clínica u otros datos personales o sensibles. Utiliza siempre datos ficticios o anonimizados.';
const documentMark = 'Documento educativo — no corresponde a una ficha clínica';
const sentinel = 'CASO-FICTICIO-ISSUE-78';
const legacyHost = 'chatgpt.site';

function parseCookie(raw) {
  const first = raw.split(';', 1)[0];
  const index = first.indexOf('=');
  if (index <= 0) throw new Error('Cannot parse application cookie');
  return {
    name: first.slice(0, index).trim(),
    value: first.slice(index + 1).trim(),
    domain: 'apps.kinecheck.cl',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax'
  };
}

test('Issue #78 production privacy and access gate', async ({ context, page, browserName }) => {
  const cookieFile = process.env.APP_COOKIE_FILE;
  expect(cookieFile).toBeTruthy();
  await context.addCookies([parseCookie(await readFile(cookieFile, 'utf8'))]);

  const requests = [];
  page.on('request', request => {
    requests.push({ url: request.url(), payload: request.postData() || '' });
  });

  const response = await page.goto(`${origin}/app`, { waitUntil: 'networkidle' });
  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(400);
  expect(page.url()).toBe(`${origin}/app`);

  const banner = page.locator('.academic-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(documentMark);
  await expect(banner).toContainText(warning);

  const inventory = await page.locator('body').evaluate((body, expectedWarning) => {
    const warningTerms = ['ficticio', 'ficticia', 'simulado', 'simulada', 'anonimiz', 'no ingreses datos reales', 'no uses datos reales', 'uso educativo'];
    const excludedTypes = new Set(['hidden', 'password', 'email', 'checkbox', 'radio', 'range', 'number', 'date', 'time', 'button', 'submit', 'reset']);
    const fields = [...body.querySelectorAll('textarea,[contenteditable="true"],input')].filter(field => {
      const type = String(field.getAttribute('type') || '').toLowerCase();
      const descriptor = `${field.id || ''} ${field.name || ''} ${field.getAttribute('placeholder') || ''}`.toLowerCase();
      return !excludedTypes.has(type) && type !== 'search' && !/buscar|search/.test(descriptor);
    });
    const missing = fields.filter(field => {
      const parent = field.parentElement;
      const nearby = `${parent?.innerText || ''} ${parent?.parentElement?.innerText || ''}`.toLowerCase();
      return !warningTerms.some(term => nearby.includes(term));
    }).map(field => field.id || field.outerHTML.slice(0, 120));
    return {
      count: fields.length,
      missing,
      bodyText: body.innerText,
      exactWarning: body.innerText.includes(expectedWarning)
    };
  }, warning);

  expect(inventory.count).toBe(64);
  expect(inventory.missing).toEqual([]);
  expect(inventory.exactWarning).toBe(true);
  for (const term of ['nombre', 'RUT', 'teléfono', 'correo electrónico', 'fotografías identificables', 'número de ficha clínica']) {
    expect(inventory.bodyText.toLowerCase()).toContain(term.toLowerCase());
  }

  await page.locator('#patientName').fill(sentinel);
  await page.locator('#subject').fill('EJERCICIO-SIMULADO-ISSUE-78');
  await page.locator('#generalNotes').fill('Texto libre ficticio temporal para validación');
  await page.waitForTimeout(500);

  const storageBeforeReload = await page.evaluate(() => ({
    local: Object.fromEntries(Object.entries(localStorage)),
    session: Object.fromEntries(Object.entries(sessionStorage))
  }));
  expect(JSON.stringify(storageBeforeReload)).not.toContain(sentinel);
  expect(Object.keys(storageBeforeReload.local).filter(key => key.startsWith('kinecheck-student-'))).toEqual([]);
  expect(requests.map(item => item.payload).join('\n')).not.toContain(sentinel);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#patientName')).toHaveValue('');
  await expect(page.locator('#generalNotes')).toHaveValue('');
  const storageAfterReload = await page.evaluate(() => ({
    local: Object.fromEntries(Object.entries(localStorage)),
    session: Object.fromEntries(Object.entries(sessionStorage))
  }));
  expect(JSON.stringify(storageAfterReload)).not.toContain(sentinel);

  await page.locator('#patientName').fill(sentinel);
  await page.locator('#subject').fill('EJERCICIO-SIMULADO-ISSUE-78');

  page.once('dialog', dialog => dialog.accept());
  const [csvDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#exportBtn').click()
  ]);
  const csv = await readFile(await csvDownload.path(), 'utf8');
  expect(csv).toContain(documentMark);
  expect(csv).toContain(warning);

  page.once('dialog', dialog => dialog.accept());
  const [jsonDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#backupBtn').click()
  ]);
  const backup = JSON.parse(await readFile(await jsonDownload.path(), 'utf8'));
  expect(backup.educationalNotice).toBe(documentMark);
  expect(backup.privacyNotice).toBe(warning);

  await page.emulateMedia({ media: 'print' });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(documentMark);

  expect(requests.some(item => item.url.toLowerCase().includes(legacyHost))).toBe(false);
  expect(requests.map(item => item.payload).join('\n')).not.toContain(sentinel);

  await page.goto(`${origin}/patient-access.html`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Próximamente' })).toBeVisible();
  await expect(page.locator('form, input, textarea, select')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Hotmart');
  expect(requests.some(item => item.url.toLowerCase().includes(legacyHost))).toBe(false);

  await mkdir('test-results', { recursive: true });
  await writeFile(`test-results/${browserName}-issue-78-summary.json`, JSON.stringify({
    browser: browserName,
    authenticatedApp: true,
    fieldsWarned: inventory.count,
    fieldsMissingWarning: inventory.missing.length,
    sentinelInStorage: false,
    sentinelInRequests: false,
    csvDisclaimer: true,
    jsonDisclaimer: true,
    printDisclaimer: true,
    recuperaCaptureFields: 0,
    legacyHostTouched: false
  }, null, 2));
});
