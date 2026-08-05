import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const results = [];

function check(name, condition, detail = "") {
  const passed = Boolean(condition);
  results.push({ name, passed, detail });
  console.log(`${passed ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) process.exitCode = 1;
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function noSecondaryCredentials(name, source) {
  check(`${name}: sin formulario secundario`, !/id=["']auth-form["']/i.test(source));
  check(`${name}: sin campo de contraseña`, !/type=["']password["']/i.test(source));
  check(`${name}: entrada al ecosistema`, /ecosystem-entry|academy\/#biblioteca/i.test(source));
}

function setItems(source, variableName) {
  const expression = new RegExp(`const\\s+${variableName}\\s*=\\s*new\\s+Set\\(\\[([\\s\\S]*?)\\]\\)`, "m");
  const match = source.match(expression);
  if (!match) return [];
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1]).sort();
}

function sameItems(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "KineCheck-access-validator" },
  });
  if (!response.ok) throw new Error(`${url} respondió ${response.status}`);
  return response.text();
}

const academy = read("academy/index.html");
check("Academy conserva el único formulario de ingreso", /id=["']auth-form["']/i.test(academy));
check("Academy conserva recuperación de contraseña", /id=["']forgot-password["']/i.test(academy));

const protectedLocalPages = [
  ["Comunicación Clínica", read("comunicacion-clinica.html")],
  ["Traumatología", read("traumatologia/index.html")],
  ["KineCheck Clínico curso", read("kinecheck-clinico-curso/index.html")],
  ["Ruta antigua segura", read("secure-index.html")],
];
for (const [name, source] of protectedLocalPages) noSecondaryCredentials(name, source);

const guidePage = read("kinecheck-clinico-guia/index.html");
check("Guía Clínico sin autenticación duplicada", !/type=["']password["']/i.test(guidePage));
check("Guía Clínico advierte que requiere licencia", /ACCESO ASOCIADO A KINECHECK CLÍNICO/i.test(guidePage));

const communicationConfig = read("config.js");
const traumaConfig = read("traumatologia/config.js");
const clinicoConfig = read("kinecheck-clinico-curso/config.js");
check("Comunicación fija su slug", /courseSlug:\s*["']comunicacion-clinica["']/.test(communicationConfig));
check("Traumatología fija su slug", /courseSlug:\s*["']traumatologia-ortopedia-clinica["']/.test(traumaConfig));
check("Curso Clínico fija su slug", /courseSlug:\s*["']kinecheck-clinico-curso["']/.test(clinicoConfig));

const commonGate = read("auth-gate.js");
check("Gate común no inicia sesión por contraseña", !/grant_type=password|auth\/v1\/signup/.test(commonGate));
check("Gate común solicita el slug configurado", /body:\s*JSON\.stringify\(\{\s*courseSlug\s*\}\)/m.test(commonGate));
check("Gate común valida identidad", /auth\/v1\/user/.test(commonGate));

const courseKey = read("supabase/functions/course-key/index.ts");
check("Course-key compara correo autenticado", /auth\.getUser\(\)/.test(courseKey));
check("Course-key filtra slug exacto", /\.eq\("course_slug",\s*courseSlug\)/.test(courseKey));
check("Course-key exige licencia activa", /if\s*\(!isUsableAccess\(access\)\)/.test(courseKey));
check("Course-key separa contenido por slug", /protectedModules:\s*Record<string, string>/.test(courseKey));

const router = read("academy/academy-launch-router-v4.js");
const relay = read("academy/app-sso-relay.js");
const expectedApps = ["kinecheck-estudiante", "kinecheck-recupera"];
check("Router limita aplicaciones externas", sameItems(setItems(router, "APPLICATIONS"), expectedApps));
check("Relay limita aplicaciones externas", sameItems(setItems(relay, "PRODUCTS"), expectedApps));
check("Ruta Clínica antigua excluida del relay", !setItems(relay, "PRODUCTS").includes("kinecheck-clinico"));
check("Router usa sesión temporal primero", /parseSession\(sessionStorage\)/.test(router));
check("Router transfiere el producto solicitado", /product,\s*access_token/m.test(router));
check("Relay envía product al servidor", /hidden\(form,\s*["']product["'],\s*product\)/.test(relay));

const academyConfig = read("academy/config.js");
check("Clínico se abre como guía local", /slug:\s*["']kinecheck-clinico["'][\s\S]*?kinecheck-clinico-guia/.test(academyConfig));
check("Clínico incluye curso central", /slug:\s*["']kinecheck-clinico-curso["']/.test(academyConfig));
check("Config SSO solo expone Estudiante y Recupera", !/routes:[\s\S]*?["']kinecheck-clinico["']\s*:/.test(academyConfig));

const externalSources = {
  masIndex: await fetchText("https://raw.githubusercontent.com/emmanuelkine/mas-alla-del-dolor/main/index.html"),
  masGate: await fetchText("https://raw.githubusercontent.com/emmanuelkine/mas-alla-del-dolor/main/auth-gate.js"),
  masSso: await fetchText("https://raw.githubusercontent.com/emmanuelkine/mas-alla-del-dolor/main/sso-handoff.js"),
  evidenceIndex: await fetchText("https://raw.githubusercontent.com/emmanuelkine/kinecheck-evidencia-aplicada/main/index.html"),
  evidenceGate: await fetchText("https://raw.githubusercontent.com/emmanuelkine/kinecheck-evidencia-aplicada/main/auth-gate.js"),
  evidenceSso: await fetchText("https://raw.githubusercontent.com/emmanuelkine/kinecheck-evidencia-aplicada/main/sso-handoff.js"),
  evidenceContent: await fetchText("https://raw.githubusercontent.com/emmanuelkine/kinecheck-evidencia-aplicada/main/supabase/functions/evidence-content/index.ts"),
};

noSecondaryCredentials("Más allá del dolor", externalSources.masIndex);
check("Más allá fija producto exacto", /EXPECTED_COURSE\s*=\s*["']mas-alla-del-dolor["']/.test(externalSources.masGate));
check("Más allá solicita licencia exacta", /courseSlug:\s*EXPECTED_COURSE/.test(externalSources.masGate));
check("Más allá usa sesión temporal", /sessionStorage\.setItem\(SESSION_KEY/.test(externalSources.masSso));
check("Más allá rechaza handoff de otro producto", /handoff\?\.product\s*!==\s*EXPECTED_PRODUCT/.test(externalSources.masSso));
check("Más allá no permite login local", !/grant_type=password|auth\/v1\/signup/.test(externalSources.masGate));

noSecondaryCredentials("Evidencia Aplicada", externalSources.evidenceIndex);
check("Evidencia fija producto exacto", /EXPECTED_COURSE\s*=\s*["']evidencia-aplicada["']/.test(externalSources.evidenceGate));
check("Evidencia solicita contenido exacto", /courseSlug:\s*EXPECTED_COURSE/.test(externalSources.evidenceGate));
check("Evidencia usa sesión temporal", /sessionStorage\.setItem\(SESSION_KEY/.test(externalSources.evidenceSso));
check("Evidencia rechaza handoff de otro producto", /handoff\?\.product\s*!==\s*EXPECTED_PRODUCT/.test(externalSources.evidenceSso));
check("Evidencia no permite login local", !/grant_type=password|auth\/v1\/signup/.test(externalSources.evidenceGate));
check("Backend Evidencia fija course slug", /const COURSE_SLUG = ["']evidencia-aplicada["']/.test(externalSources.evidenceContent));
check("Backend Evidencia rechaza otro slug", /requestedSlug !== COURSE_SLUG/.test(externalSources.evidenceContent));
check("Backend Evidencia filtra licencia exacta", /\.eq\("course_slug", COURSE_SLUG\)/.test(externalSources.evidenceContent));

const report = {
  generatedAt: new Date().toISOString(),
  status: process.exitCode ? "failed" : "passed",
  checks: results,
  summary: {
    total: results.length,
    passed: results.filter((item) => item.passed).length,
    failed: results.filter((item) => !item.passed).length,
  },
};
fs.writeFileSync("ecosystem-access-report.json", JSON.stringify(report, null, 2));

if (process.exitCode) {
  console.error(`Acceso del ecosistema: ${report.summary.failed} control(es) fallaron.`);
} else {
  console.log(`Acceso del ecosistema aprobado: ${report.summary.passed}/${report.summary.total} controles.`);
}
