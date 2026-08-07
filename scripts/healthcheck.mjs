import { readFile, access } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const PUBLIC_BASE = "https://kinecheck.cl";
const SUPABASE_BASE = "https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1";
const TIMEOUT_MS = 20000;

const CHECKOUT_EXPECTATIONS = [
  { label: "KineCheck Clínico", url: "https://pay.hotmart.com/L106791841D", keywords: ["kinecheck clínico", "kinecheck clinico"] },
  { label: "Comunicación Clínica", url: "https://pay.hotmart.com/T106883983U", keywords: ["comunicación clínica", "comunicacion clinica"] },
  { label: "KineCheck Estudiante", url: "https://pay.hotmart.com/G106801166S", keywords: ["kinecheck estudiante"] },
  { label: "Pack KineCheck Estudiante", url: "https://pay.hotmart.com/Q106891608M", keywords: ["pack kinecheck estudiante", "kinecheck estudiante"] },
  { label: "KineCheck Recupera", url: "https://pay.hotmart.com/P106806251E", keywords: ["kinecheck recupera"] },
  { label: "Más allá del Dolor", url: "https://pay.hotmart.com/W106888386Q", keywords: ["más allá del dolor", "mas alla del dolor"] },
  { label: "KineCheck Evidencia Aplicada", url: "https://pay.hotmart.com/F106921972I", keywords: ["kinecheck evidencia aplicada", "evidencia aplicada", "razonamiento clínico con evidencia", "razonamiento clinico con evidencia"] },
  { label: "Traumatología y Ortopedia Clínica", url: "https://pay.hotmart.com/B106913952R", keywords: ["traumatología", "traumatologia", "ortopedia clínica", "ortopedia clinica"] },
];

const PRODUCT_CHECKOUT_BY_ID = Object.freeze({
  "8150019": "https://pay.hotmart.com/L106791841D",
  "8154796": "https://pay.hotmart.com/G106801166S",
  "8157431": "https://pay.hotmart.com/P106806251E",
  "8192814": "https://pay.hotmart.com/T106883983U",
  "8194777": "https://pay.hotmart.com/W106888386Q",
  "8208817": "https://pay.hotmart.com/F106921972I",
  "8205453": "https://pay.hotmart.com/B106913952R",
});

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

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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
  const maxAttempts = options.method && options.method !== "GET" ? 1 : 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        redirect: "manual",
        headers: {
          "user-agent": "KineCheck-Healthcheck/2.0",
          ...(options.headers || {}),
        },
        ...options,
        signal: controller.signal,
      });
      if (response.status < 500 || attempt === maxAttempts) return response;
      await response.body?.cancel();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
    } finally {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 400));
  }
  throw new Error("No fue posible completar la comprobación.");
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

async function checkCheckout(expectation) {
  try {
    const response = await fetchWithTimeout(expectation.url, { redirect: "follow" });
    if (response.status >= 500) {
      logFail(`Checkout ${expectation.label} respondió HTTP ${response.status}: ${expectation.url}`);
      return;
    }
    if (response.status >= 400) {
      logWarn(`Checkout ${expectation.label} respondió HTTP ${response.status}; Hotmart puede limitar solicitudes automatizadas.`);
      return;
    }

    const finalUrl = response.url || expectation.url;
    if (!/hotmart\.com/i.test(finalUrl)) {
      logFail(`Checkout ${expectation.label} terminó fuera de Hotmart: ${finalUrl}`);
      return;
    }

    const html = await response.text();
    const normalizedHtml = normalize(html);
    const matched = expectation.keywords.some((keyword) => normalizedHtml.includes(normalize(keyword)));
    if (matched) {
      logOk(`Checkout correcto: ${expectation.label} (HTTP ${response.status})`);
    } else {
      logWarn(`El checkout responde en Hotmart, pero el nombre de ${expectation.label} no está expuesto en el HTML automatizable.`);
    }
  } catch (error) {
    logWarn(`Checkout ${expectation.label} no pudo verificarse automáticamente: ${error.message}`);
  }
}

function extractCheckoutUrls(html) {
  return [...html.matchAll(/(?:href\s*=\s*["']|:\s*["'])(https:\/\/pay\.hotmart\.com\/[A-Za-z0-9]+)["']/g)]
    .map((match) => match[1]);
}

function extractAcademyProducts(config) {
  const courseSection = config.split("courses: [")[1]?.split("]\n});")[0] || "";
  return courseSection
    .split(/\n\s*},\s*\n/)
    .map((block) => ({
      slug: block.match(/slug:\s*"([^"]+)"/)?.[1],
      productId: block.match(/productId:\s*"([^"]+)"/)?.[1],
      title: block.match(/title:\s*"([^"]+)"/)?.[1],
      status: block.match(/status:\s*"([^"]+)"/)?.[1],
      url: block.match(/url:\s*"([^"]+)"/)?.[1],
    }))
    .filter((item) => item.productId && item.title);
}

function groupProductsById(products) {
  const groups = new Map();
  for (const product of products) {
    const current = groups.get(product.productId) || [];
    current.push(product);
    groups.set(product.productId, current);
  }
  return groups;
}

async function main() {
  console.log("\nKineCheck end-to-end healthcheck · producción canónica\n");

  const home = await fileText("index.html");
  const professionalPage = await fileText("profesionales/index.html");
  const studentPage = await fileText("estudiantes/index.html");
  const recoveryPage = await fileText("recupera/index.html");
  const publicCommerce = [home, professionalPage, studentPage, recoveryPage].join("\n");
  const academyIndex = await fileText("academy/index.html");
  const academyConfig = await fileText("academy/academy-bootstrap-v28.js");
  const academyCore = await fileText("academy/academy-v39.js");
  const opener = await fileText("academy/academy-open-v6.js");
  const launchRouter = await fileText("academy/academy-launch-router-v4.js");
  const integrationGuard = await fileText("academy/academy-integration-guard-v4.js");
  const courseAuthGate = await fileText("auth-gate.js");

  await Promise.all([
    ensureLocalFile("index.html"),
    ensureLocalFile("profesionales/index.html"),
    ensureLocalFile("estudiantes/index.html"),
    ensureLocalFile("recupera/index.html"),
    ensureLocalFile("productos/index.html"),
    ensureLocalFile("productos/product.js"),
    ensureLocalFile("academy/index.html"),
    ensureLocalFile("academy/academy-v39.js"),
    ensureLocalFile("academy/academy-open-v6.js"),
    ensureLocalFile("academy/academy-launch-router-v4.js"),
    ensureLocalFile("academy/academy-integration-guard-v4.js"),
    ensureLocalFile("academy/salir.html"),
    ensureLocalFile("academy/compra-aprobada.html"),
    ensureLocalFile("academy/pago-pendiente.html"),
    ensureLocalFile("academy/pago-en-analisis.html"),
    ensureLocalFile("kinecheck/index.html"),
    ensureLocalFile("kinecheck/profesionales/index.html"),
    ensureLocalFile("kinecheck/estudiantes/index.html"),
    ensureLocalFile("kinecheck/recupera/index.html"),
    ensureLocalFile("assets/kinecheck-mark.svg"),
    ensureLocalFile("comunicacion-clinica.html"),
  ]);

  const academyScriptMatch = academyIndex.match(/academy-v39\.js\?v=([A-Za-z0-9._-]+)/);
  if (!academyScriptMatch) logFail("Academy no apunta al runtime estable con una versión de caché válida.");
  else logOk(`Academy utiliza el runtime estable con caché v${academyScriptMatch[1]}.`);

  const publicAcademyLinks = [...publicCommerce.matchAll(/href=["']([^"']*academy\/[^"']*)["']/g)].map((match) => match[1]);
  if (!publicAcademyLinks.length) {
    logFail("Las páginas públicas no exponen acceso a Academy.");
  } else if (publicAcademyLinks.some((href) => /20260806-final5|\?v=41/.test(href))) {
    logFail("Quedan enlaces públicos a Academy con parámetros internos retirados.");
  } else {
    logOk("Las páginas públicas apuntan a la entrada canónica limpia de Academy.");
  }

  if (!academyCore.includes("async refresh()") || !academyCore.includes("return validSession();")) {
    logFail("Academy no expone la renovación segura de sesión a los botones de lanzamiento.");
  } else {
    logOk("Los botones de lanzamiento pueden renovar la sesión antes de abrir un producto.");
  }

  for (const [label, source] of [["router principal", launchRouter], ["router de recomendaciones", integrationGuard]]) {
    if (!source.includes("academy-open-v6.js")) logFail(`El ${label} no delega en el opener unificado vigente.`);
    else logOk(`El ${label} delega en el opener unificado vigente.`);
  }

  if (!opener.includes("../comunicacion-clinica.html?course=comunicacion-clinica")) {
    logFail("El opener unificado no utiliza la ruta protegida de Comunicación Clínica.");
  } else if (!opener.includes("KINECHECK_ACADEMY_SESSION?.refresh")) {
    logFail("El opener unificado no intenta renovar una sesión vencida.");
  } else if (!opener.includes("popup.name = JSON.stringify(transfer)")) {
    logFail("El opener unificado no conserva el respaldo del traspaso para cursos externos.");
  } else {
    logOk("El opener unificado mantiene ruta protegida, renovación y traspaso de sesión.");
  }

  if (!courseAuthGate.includes('COURSE_SESSION_PREFIX = "kinecheck_course_session_v2:"')) {
    logFail("Los cursos no utilizan la sesión aislada vigente por producto.");
  } else if (!courseAuthGate.includes('LEGACY_COURSE_SESSION_PREFIX = "kinecheck_course_session_v1:"')) {
    logFail("Los cursos no conservan la migración controlada desde sesiones antiguas.");
  } else if (courseAuthGate.includes("kinecheck-sso-v2")) {
    logFail("Los cursos todavía aceptan un tipo de traspaso SSO obsoleto.");
  } else {
    logOk("Los cursos protegidos conservan la sesión aislada y el traspaso SSO vigente.");
  }

  const academyProducts = extractAcademyProducts(academyConfig);
  const activeProducts = academyProducts.filter((product) => product.status === "active");
  const activeProductGroups = groupProductsById(activeProducts);
  const checkoutUrls = [...new Set(extractCheckoutUrls(publicCommerce))];
  const expectedUrls = new Set(CHECKOUT_EXPECTATIONS.map((item) => item.url));

  for (const [productId, products] of activeProductGroups) {
    const expectedCheckout = PRODUCT_CHECKOUT_BY_ID[productId];
    const labels = products.map((product) => product.title).join(" / ");
    if (!expectedCheckout) {
      logFail(`Producto activo sin checkout mapeado en el healthcheck: ${labels} (${productId})`);
    } else if (!checkoutUrls.includes(expectedCheckout)) {
      logFail(`Producto activo sin checkout en las páginas públicas canónicas: ${labels} (${productId})`);
    } else {
      logOk(`Producto activo representado en páginas públicas canónicas: ${labels}`);
    }
  }

  for (const url of checkoutUrls) {
    if (!expectedUrls.has(url)) logWarn(`Checkout público no incorporado al mapa de pruebas: ${url}`);
  }

  for (const expectation of CHECKOUT_EXPECTATIONS) {
    if (!checkoutUrls.includes(expectation.url)) {
      logFail(`Las páginas públicas no contienen el checkout esperado de ${expectation.label}: ${expectation.url}`);
    } else {
      await checkCheckout(expectation);
    }
  }

  await checkUrl("Portada KineCheck", `${PUBLIC_BASE}/`);
  await checkUrl("Página para profesionales", `${PUBLIC_BASE}/profesionales/`);
  await checkUrl("Página para estudiantes", `${PUBLIC_BASE}/estudiantes/`);
  await checkUrl("Página Recupera", `${PUBLIC_BASE}/recupera/`);
  await checkUrl("Detalle de productos", `${PUBLIC_BASE}/productos/`);
  await checkUrl("Ruta heredada KineCheck", `${PUBLIC_BASE}/kinecheck/`);
  await checkUrl("Acceso Comunicación Clínica", `${PUBLIC_BASE}/comunicacion-clinica.html?course=comunicacion-clinica`);
  await checkUrl("KineCheck Academy", `${PUBLIC_BASE}/academy/`);
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
