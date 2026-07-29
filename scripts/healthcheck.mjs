import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const PUBLIC_BASE = "https://emmanuelkine.github.io/kinecheck-comunicacion-clinica";
const SUPABASE_BASE = "https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1";
const TIMEOUT_MS = 20000;

let failures = 0;
let warnings = 0;

function logOk(message) {
  console.log(`✅ ${message}`);
}

function logWarn(message) {
  warnings += 1;
  console.warn(`::warning::${message}`);
}

function logFail(message) {
  failures += 1;
  console.error(`::error::${message}`);
}

async function fileText(path) {
  return readFile(new URL(path, ROOT), "utf8");
}

async function ensureLocalFile(path) {
  try {
    await access(new URL(path, ROOT));
    logOk(`Archivo local presente: ${path}`);
  } catch {
    logFail(`Falta el archivo local: ${path}`);
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "manual",
      headers: {
        "user-agent": "KineCheck-Healthcheck/1.0",
        ...(options.headers || {}),
      },
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function isReachableStatus(status) {
  return (status >= 200 && status < 400) || [401, 403, 405, 429].includes(status);
}

async function checkUrl(label, url, options = {}) {
  try {
    const response = await fetchWithTimeout(url, options);
    if (response.status === 404 || response.status === 410 || response.status >= 500) {
      logFail(`${label} respondió HTTP ${response.status}: ${url}`);
      return false;
    }
    if (!isReachableStatus(response.status)) {
      logWarn(`${label} respondió HTTP ${response.status}: ${url}`);
      return true;
    }
    logOk(`${label} responde HTTP ${response.status}`);
    return true;
  } catch (error) {
    logFail(`${label} no respondió: ${url} (${error.message})`);
    return false;
  }
}

function extractCheckoutUrls(html) {
  return [...html.matchAll(/href="(https:\/\/pay\.hotmart\.com\/[A-Za-z0-9]+)"/g)]
    .map((match) => match[1]);
}

function extractLandingProductIds(html) {
  return [...html.matchAll(/data-product-id="([^"]+)"/g)].map((match) => match[1]);
}

function extractAcademyProducts(config) {
  const courseSection = config.split("courses: [")[1]?.split("]\n});")[0] || "";
  return courseSection
    .split(/\n\s*},\s*\n/)
    .map((block) => {
      const productId = block.match(/productId:\s*"([^"]+)"/)?.[1];
      const title = block.match(/title:\s*"([^"]+)"/)?.[1];
      const status = block.match(/status:\s*"([^"]+)"/)?.[1];
      const url = block.match(/url:\s*"([^"]+)"/)?.[1];
      return { productId, title, status, url };
    })
    .filter((item) => item.productId && item.title);
}

async function main() {
  console.log("\nKineCheck end-to-end healthcheck\n");

  const landing = await fileText("kinecheck/index.html");
  const academyIndex = await fileText("academy/index.html");
  const academyConfig = await fileText("academy/academy-bootstrap-v28.js");

  await Promise.all([
    ensureLocalFile("academy/academy-v39.js"),
    ensureLocalFile("academy/academy.css"),
    ensureLocalFile("academy/academy-reviews.js"),
    ensureLocalFile("academy/salir.html"),
    ensureLocalFile("academy/compra-aprobada.html"),
    ensureLocalFile("academy/pago-pendiente.html"),
    ensureLocalFile("academy/pago-en-analisis.html"),
    ensureLocalFile("kinecheck/site.css"),
  ]);

  if (!academyIndex.includes("academy-v39.js?v=39")) {
    logFail("Academy no está apuntando al script estable v39.");
  } else {
    logOk("Academy utiliza el script estable v39.");
  }

  const landingIds = new Set(extractLandingProductIds(landing));
  const academyProducts = extractAcademyProducts(academyConfig);
  const activeProducts = academyProducts.filter((product) => product.status === "active");

  for (const product of activeProducts) {
    if (!landingIds.has(product.productId)) {
      logFail(`Producto activo ausente de la página pública: ${product.title} (${product.productId})`);
    } else {
      logOk(`Producto activo presente en página pública: ${product.title}`);
    }
  }

  const pendingCheckoutIds = [...landing.matchAll(/data-product-id="([^"]+)"[^>]*data-checkout-status="pending"/g)]
    .map((match) => match[1]);
  for (const productId of pendingCheckoutIds) {
    const product = activeProducts.find((item) => item.productId === productId);
    logWarn(`Checkout pendiente de vincular: ${product?.title || productId}`);
  }

  const checkoutUrls = [...new Set(extractCheckoutUrls(landing))];
  if (!checkoutUrls.length) logFail("No se encontraron checkout de Hotmart en la página pública.");
  for (const url of checkoutUrls) {
    await checkUrl("Checkout Hotmart", url);
  }

  await checkUrl("Página pública KineCheck", `${PUBLIC_BASE}/kinecheck/`);
  await checkUrl("KineCheck Academy", `${PUBLIC_BASE}/academy/?v=39`);
  await checkUrl("Página compra aprobada", `${PUBLIC_BASE}/academy/compra-aprobada.html`);
  await checkUrl("Página pago pendiente", `${PUBLIC_BASE}/academy/pago-pendiente.html`);
  await checkUrl("Página compra en análisis", `${PUBLIC_BASE}/academy/pago-en-analisis.html`);

  for (const product of activeProducts) {
    if (!product.url) {
      logFail(`Producto activo sin URL de acceso: ${product.title}`);
      continue;
    }
    const url = product.url.startsWith("http")
      ? product.url
      : new URL(product.url, `${PUBLIC_BASE}/academy/`).href;
    await checkUrl(`Acceso ${product.title}`, url);
  }

  await checkUrl("Edge Function course-key", `${SUPABASE_BASE}/course-key`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ courseSlug: "healthcheck" }),
  });
  await checkUrl("Webhook Hotmart general", `${SUPABASE_BASE}/hotmart-webhook`, { method: "GET" });
  await checkUrl("Contenido Evidencia Aplicada", `${SUPABASE_BASE}/evidence-content`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ courseSlug: "evidencia-aplicada" }),
  });
  await checkUrl("Webhook Evidencia Aplicada", `${SUPABASE_BASE}/evidence-hotmart-webhook`, { method: "GET" });

  console.log(`\nResultado: ${failures} fallo(s), ${warnings} advertencia(s).\n`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
