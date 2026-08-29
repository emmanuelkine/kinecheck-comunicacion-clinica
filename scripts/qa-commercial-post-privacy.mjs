import fs from "node:fs/promises";

const BASE = String(process.env.BASE_URL || "https://kinecheck.cl").replace(/\/$/, "");
const ACTIVE = [
  ["kinecheck-clinico", "KineCheck Clínico", "$39.990", "https://pay.hotmart.com/L106791841D"],
  ["kinecheck-estudiante", "KineCheck Estudiante", "$14.990", "https://pay.hotmart.com/G106801166S"],
  ["comunicacion-clinica", "Comunicación Clínica", "$19.900", "https://pay.hotmart.com/T106883983U"],
  ["mas-alla-del-dolor", "Más allá del dolor", "$39.990", "https://pay.hotmart.com/W106888386Q"],
  ["evidencia-aplicada", "Evidencia Aplicada", "$29.990", "https://pay.hotmart.com/F106921972I"],
  ["traumatologia-ortopedia-clinica", "Traumatología y Ortopedia Clínica", "$35.900", "https://pay.hotmart.com/B106913952R"],
  ["pack-estudiante", "Pack KineCheck Estudiante", "$49.900", "https://pay.hotmart.com/Q106891608M"],
];
const RECUPERA_CHECKOUT = "https://pay.hotmart.com/P106806251E";
const results = [];
let failures = 0;

function record(name, ok, detail) {
  results.push({ name, status: ok ? "PASS" : "FAIL", detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "✓" : "✗"} ${name}: ${detail}`);
}

async function read(path) {
  return fs.readFile(path, "utf8");
}

async function sourceChecks() {
  for (const [slug, name, price, checkout] of ACTIVE) {
    const html = await read(`productos/${slug}/index.html`);
    record(`Source ${name}`, html.includes(name) && html.includes(price) && html.includes(checkout) && html.includes("../../academy/"), "producto activo conserva precio, checkout canónico y acceso a Academy");
  }

  const recovery = await read("recupera/index.html");
  const detail = await read("productos/kinecheck-recupera/index.html");
  const combined = `${recovery}\n${detail}`;
  record("Recupera pausado en fuente", /Próximamente/i.test(combined), "Recupera se presenta como Próximamente");
  record("Recupera sin checkout activo", !combined.includes(RECUPERA_CHECKOUT), "no existe enlace Hotmart operativo de Recupera");
  record("Recupera sin precio público activo", !/\$9\.990(?:\s*CLP)?/i.test(combined), "no se publica precio operativo de Recupera");

  const academy = await read("academy/index.html");
  record("Academy shell", academy.includes('id="login-view"') && academy.includes('id="kc-toast"') && academy.includes('id="kc-bottom-nav"'), "Academy conserva login, toast y navegación móvil");
}

async function get(path) {
  const response = await fetch(`${BASE}${path}${path.includes("?") ? "&" : "?"}qa=post-privacy-${Date.now()}`, {
    redirect: "follow",
    headers: { "User-Agent": "KineCheck-QA-post-privacy/1.0", "Cache-Control": "no-cache" },
  });
  const text = await response.text();
  return { response, text };
}

async function liveChecks() {
  for (const [slug, name, price, checkout] of ACTIVE) {
    try {
      const { response, text } = await get(`/productos/${slug}/`);
      record(`Live ${name}`, response.ok && text.includes(name) && text.includes(price) && text.includes(checkout), `${response.status} producto activo`);
    } catch (error) {
      record(`Live ${name}`, false, error instanceof Error ? error.message : String(error));
    }
  }

  try {
    const { response, text } = await get("/recupera/");
    record("Live Recupera Próximamente", response.ok && /Próximamente/i.test(text), `${response.status} Recupera pausado`);
    record("Live Recupera sin comercio", !text.includes(RECUPERA_CHECKOUT) && !/\$9\.990(?:\s*CLP)?/i.test(text), "sin checkout ni precio operativo");
  } catch (error) {
    record("Live Recupera", false, error instanceof Error ? error.message : String(error));
  }
}

await sourceChecks();
await liveChecks();
await fs.writeFile("qa-commercial-report.json", JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE, failures, results }, null, 2));

if (failures) {
  console.error(`Commercial QA post-privacy failed with ${failures} blocking issue(s).`);
  process.exit(1);
}
console.log("Commercial QA post-privacy passed.");
