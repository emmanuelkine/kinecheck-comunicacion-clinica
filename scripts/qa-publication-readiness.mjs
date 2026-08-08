import { readFile } from "node:fs/promises";

const baseUrl = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const results = [];
let failed = false;

function record(ok, label, detail = "") {
  results.push({ ok, label, detail });
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) failed = true;
}

async function read(path) {
  return await readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function fetchText(path, expectedStatus = 200) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "KineCheck-Publication-QA/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    record(response.status === expectedStatus, `Public ${path}`, `${response.status} ${url}`);
    return { response, text, url };
  } catch (error) {
    record(false, `Public ${path}`, error?.message || "network error");
    return { response: null, text: "", url };
  }
}

const requiredFiles = [
  "ayuda/index.html",
  "ayuda/ayuda.js",
  "bienvenida/index.html",
  "bienvenida/bienvenida.js",
  "platform/onboarding.js",
  "platform/onboarding.css",
  "404.html",
  "robots.txt",
  "sitemap.xml",
  "site.webmanifest",
];

for (const path of requiredFiles) {
  try {
    const source = await read(path);
    record(source.trim().length > 30, `Source ${path}`, `${source.length} chars`);
  } catch (error) {
    record(false, `Source ${path}`, error?.message || "missing");
  }
}

const securityBootstrap = await read("platform/security-bootstrap.js");
record(securityBootstrap.includes("onboarding.js"), "Platform loads onboarding", "security bootstrap reference");
record(securityBootstrap.includes("../soporte/"), "Platform routes support", "automated support path");
record(securityBootstrap.includes("legalAcceptanceVersioned: true"), "Legal acceptance remains active");
record(securityBootstrap.includes("serverRateLimit: true"), "Server login rate limit remains active");

const helpSource = await read("ayuda/index.html");
record(helpSource.includes("Centro de Ayuda") && helpSource.includes("../soporte/"), "Help center content and support routing");
record(!helpSource.includes("mailto:soporte.kinecheck@gmail.com"), "Help center avoids manual email-first support");

const welcomeSource = await read("bienvenida/index.html");
record(welcomeSource.includes("product-selector") && welcomeSource.includes("../academy/") && !welcomeSource.includes("../platform/"), "Personalized welcome guide uses canonical Academy access");

const robotsSource = await read("robots.txt");
record(robotsSource.includes("Sitemap: https://kinecheck.cl/sitemap.xml"), "Robots references sitemap");
record(robotsSource.includes("Disallow: /admin/") && robotsSource.includes("Disallow: /platform/"), "Private routes excluded from crawlers");

const sitemapSource = await read("sitemap.xml");
for (const path of ["/", "/productos/", "/ayuda/", "/bienvenida/", "/soporte/", "/legal/terminos.html", "/legal/privacidad.html", "/legal/reembolsos.html"]) {
  record(sitemapSource.includes(`<loc>https://kinecheck.cl${path}</loc>`), `Sitemap includes ${path}`);
}

const publicPaths = [
  "/",
  "/productos/?producto=kinecheck-clinico",
  "/ayuda/",
  "/bienvenida/?producto=kinecheck-clinico",
  "/soporte/",
  "/legal/terminos.html",
  "/legal/privacidad.html",
  "/legal/reembolsos.html",
  "/robots.txt",
  "/sitemap.xml",
  "/site.webmanifest",
  "/404.html",
  "/platform/",
];

for (const path of publicPaths) {
  const { response, text } = await fetchText(path);
  if (!response) continue;
  if (path === "/ayuda/") record(text.includes("Centro de Ayuda"), "Deployed help center has expected content");
  if (path.startsWith("/bienvenida/")) record(text.includes("Primeros pasos") || text.includes("BIENVENIDO A KINECHECK"), "Deployed welcome guide has expected content");
  if (path === "/robots.txt") record(text.includes("sitemap.xml"), "Deployed robots is valid");
  if (path === "/sitemap.xml") record(text.includes("/ayuda/") && text.includes("/bienvenida/"), "Deployed sitemap contains new routes");
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  passed: !failed,
  results,
};
await import("node:fs/promises").then(({ writeFile }) => writeFile("qa-publication-readiness-report.json", JSON.stringify(report, null, 2)));

if (failed) {
  console.error("Publication readiness QA found blocking issues.");
  process.exit(1);
}
console.log("Publication readiness QA passed.");
