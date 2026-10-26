import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit, devices } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8", ".png": "image/png", ".webp": "image/webp" };
const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/exercise/") pathname = "/exercise/index.html";
  if (pathname === "/gratis/") pathname = "/gratis/index.html";
  if (pathname === "/") pathname = "/index.html";
  const path = normalize(join(root, pathname));
  if (!path.startsWith(root)) { response.writeHead(403).end(); return; }
  try {
    const body = await readFile(path);
    response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream", "Service-Worker-Allowed": "/exercise/" });
    response.end(body);
  } catch { response.writeHead(404).end("not found"); }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
const reports = [];

async function verify(browserType, device = null) {
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({ ...(device || {}), serviceWorkers: "allow" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/exercise/`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Prescripción del ejercicio" }).waitFor();
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      if (registration.scope !== `${location.origin}/exercise/`) throw new Error("Service worker fuera del alcance de Exercise.");
    });
    await page.reload({ waitUntil: "networkidle" });
    if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) throw new Error("Service worker no controla la PWA tras la segunda carga.");
    if (await page.locator("main").count() !== 1) throw new Error("Falta el landmark main.");
    if (await page.locator("h1").count() !== 1) throw new Error("Debe existir un único encabezado principal.");
    const unlabeled = await page.locator("input, select, textarea").evaluateAll((fields) => fields.filter((field) => !field.labels?.length && !field.getAttribute("aria-label")).length);
    if (unlabeled) throw new Error(`${unlabeled} controles de formulario carecen de etiqueta accesible.`);
    if (await page.locator(".condition-card").count() !== 10) throw new Error("No se muestran las diez condiciones.");
    if (await page.locator(".condition-card.is-pro").count() !== 8) throw new Error("No se muestran ocho condiciones Pro bloqueadas.");
    await page.getByRole("button", { name: "Ver evidencia de Dolor lumbar inespecífico" }).click();
    await page.getByLabel("Irritabilidad informada").selectOption("Moderada");
    await page.getByLabel("Tolerancia actual a la carga").selectOption("Buena");
    await page.getByLabel("Limitaciones o contraindicaciones relevantes").selectOption("No identificadas en evaluación");
    await page.getByLabel("Revisé si hay señales de alarma, trauma importante o síntomas nuevos que requieren evaluación clínica antes de usar esta herramienta.").check();
    await page.getByRole("button", { name: "Consultar evidencia" }).click();
    await page.getByText("Sin recomendación individual").waitFor();
    await page.getByRole("link", { name: /Abrir fuente verificable/ }).waitFor();
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    if (width.scroll > width.client + 1) throw new Error(`Overflow horizontal: ${JSON.stringify(width)}`);
    await page.getByRole("button", { name: "Verificar acceso Pro" }).click();
    await page.getByText("Inicia sesión en KineCheck y vuelve a verificar.").waitFor();
    if (await page.locator("#pro-tools").isVisible()) throw new Error("Pro se mostró sin sesión autorizada.");
    if (errors.length) throw new Error(`Errores de página: ${errors.join("; ")}`);
    const manifest = await page.locator('link[rel="manifest"]').getAttribute("href");
    if (manifest !== "/exercise/manifest.webmanifest") throw new Error("Manifest PWA ausente o incorrecto.");
    const manifestData = await page.evaluate(async (href) => {
      const response = await fetch(href);
      const data = await response.json();
      return { ok: response.ok, scope: data.scope, startUrl: data.start_url, display: data.display, icons: data.icons?.length || 0 };
    }, manifest);
    if (!manifestData.ok || manifestData.scope !== "/exercise/" || manifestData.startUrl !== "/exercise/" || manifestData.display !== "standalone" || manifestData.icons < 1) throw new Error(`Manifest no cumple requisitos básicos: ${JSON.stringify(manifestData)}`);
    await page.goto(`${base}/gratis/`, { waitUntil: "domcontentloaded" });
    const launchCard = page.locator(".exercise-launch-card");
    await launchCard.getByRole("heading", { name: "KineCheck Exercise" }).waitFor();
    if (!(await launchCard.getByText("NOVEDAD", { exact: false }).isVisible())) throw new Error("El distintivo de novedad no está visible.");
    if (await launchCard.getByRole("link", { name: /Explorar aplicación/ }).getAttribute("href") !== "/exercise/") throw new Error("La tarjeta no enlaza a Exercise.");
    const libraryWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    if (libraryWidth.scroll > libraryWidth.client + 1) throw new Error(`Overflow horizontal en Biblioteca: ${JSON.stringify(libraryWidth)}`);
    reports.push({ engine: browserType.name(), device: device?.defaultBrowserType ? "mobile preset" : "desktop", viewport: width, conditions: 10, proLocked: 8, serviceWorker: "active and scoped", manifest: manifestData, libraryCard: "new and responsive" });
    await context.close();
  } finally { await browser.close(); }
}

try {
  await verify(chromium);
  await verify(webkit);
  await verify(chromium, devices["iPhone 13"]);
  await verify(webkit, devices["iPhone 13"]);
  await verify(chromium, devices["Pixel 7"]);
  console.log(JSON.stringify({ result: "passed", reports }, null, 2));
} finally {
  server.close();
}
