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
  check(`${name}: regreso claro a biblioteca`, /biblioteca|ecosystem-entry/i.test(source));
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
  const response = await fetch(url, { headers: { "User-Agent": "KineCheck-access-validator" } });
  if (!response.ok) throw new Error(`${url} respondió ${response.status}`);
  return response.text();
}

const academy = read("academy/index.html");
check("Academy conserva el único formulario de ingreso", /id=["']auth-form["']/i.test(academy));
check("Academy conserva recuperación de contraseña", /id=["']forgot-password["']/i.test(academy));
check("Academy carga bootstrap de sesión privada", /academy-bootstrap-v28\.js\?v=20260809-private1/.test(academy));

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
check("Gate común no envía Cache-Control como request header", !/["']Cache-Control["']\s*:/.test(commonGate));
check("Gate común conserva sesión ante error de red", /NETWORK_ERROR[\s\S]*?Reintentar acceso/i.test(commonGate));

const courseKey = read("supabase/functions/course-key/index.ts");
check("Course-key compara correo autenticado", /auth\.getUser\(\)/.test(courseKey));
check("Course-key filtra slug exacto", /\.eq\("course_slug",\s*courseSlug\)/.test(courseKey));
check("Course-key exige licencia activa", /if\s*\(!isUsableAccess\(access\)\)/.test(courseKey));
check("Course-key separa contenido por slug", /protectedModules:\s*Record<string, string>/.test(courseKey));

const opener = read("academy/academy-open-v6.js");
const bridge = read("academy/academy-owned-native-bridge-v1.js");
const bootstrap = read("academy/academy-bootstrap-v28.js");
const legacyRouter = read("academy/academy-launch-router-v4.js");
const integrationGuard = read("academy/academy-integration-guard-v4.js");
const relay = read("academy/app-sso-relay.js");
const expectedApps = ["kinecheck-estudiante", "kinecheck-recupera"];
const expectedExternalCourses = ["evidencia-aplicada", "mas-alla-del-dolor"];

check("Opener final está instalado", /__KINECHECK_OPEN_V6__/.test(opener));
check("Opener limita aplicaciones externas", sameItems(setItems(opener, "APPLICATIONS"), expectedApps));
check("Opener limita cursos alojados externamente", sameItems(Object.keys({
  ...(opener.includes('"mas-alla-del-dolor"') ? { "mas-alla-del-dolor": true } : {}),
  ...(opener.includes('"evidencia-aplicada"') ? { "evidencia-aplicada": true } : {}),
}), expectedExternalCourses));
check("Opener usa sesión temporal", /parse\(sessionStorage\)/.test(opener));
check("Bridge cubre Inicio, ruta, recomendaciones, Mis productos y Continuar",
  /data-kc-open-product/.test(bridge)
  && /data-kc-open-owned/.test(bridge)
  && /data-kc-path-open/.test(bridge)
  && /data-course/.test(bridge)
  && /continue-button/.test(bridge));
check("Bridge usa captura antes de handlers de document", /window\.addEventListener\(["']click["'][\s\S]*?},\s*true\);/.test(bridge));
check("Opener usa handoff efímero por fragmento", /kc_handoff/.test(opener) && /url\.hash\s*=/.test(opener));
check("Opener navega cursos externos en la misma pestaña", /location\.assign\(externalHandoffUrl\(/.test(opener));
check("Opener no depende de popup para cursos externos", !/window\.open\(/.test(opener) && !/popup\.postMessage/.test(opener));
check("Opener no transfiere refresh_token ni identidad", !/refresh_token|user\s*:|email\s*:/i.test(opener));
check("Opener publica versión private1", /20260809-private1/.test(opener));
check("Bootstrap publica brand identity private1", /academy-brand-identity\.js\?v=20260809-private1/.test(bootstrap));
check("Router legado solo delega", /academy-open-v6\.js/.test(legacyRouter) && !/location\.assign\(destination\)/.test(legacyRouter));
check("Guard antiguo no intercepta clicks", !/addEventListener\(["']click["']/.test(integrationGuard));
check("Relay limita aplicaciones externas", sameItems(setItems(relay, "PRODUCTS"), expectedApps));
check("Ruta Clínica antigua excluida del relay", !setItems(relay, "PRODUCTS").includes("kinecheck-clinico"));
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
check("Más allá consume handoff privado", /FRAGMENT_KEY\s*=\s*["']kc_handoff["']/.test(externalSources.masSso) && /readFragmentHandoff/.test(externalSources.masSso));
check("Más allá limpia el handoff de la URL", /history\.replaceState/.test(externalSources.masSso));
check("Más allá conserva postMessage como compatibilidad", /kinecheck-sso-ready/.test(externalSources.masSso) && /addEventListener\(["']message["']/.test(externalSources.masSso));
check("Más allá no borra sesión por falta de opener", !/if\s*\(!window\.opener\)\s*\{[\s\S]*?clear/i.test(externalSources.masSso));
check("Más allá no envía Cache-Control como request header", !/["']Cache-Control["']\s*:/.test(externalSources.masGate));
check("Más allá conserva sesión ante error de red", /NETWORK_ERROR[\s\S]*?Reintentar acceso/i.test(externalSources.masGate));
check("Más allá no permite login local", !/grant_type=password|auth\/v1\/signup/.test(externalSources.masGate));
check("Más allá carga handoff private1 antes del gate", /sso-handoff\.js\?v=20260809-private1[\s\S]*?auth-gate\.js/.test(externalSources.masIndex));

noSecondaryCredentials("Evidencia Aplicada", externalSources.evidenceIndex);
check("Evidencia fija producto exacto", /EXPECTED_COURSE\s*=\s*["']evidencia-aplicada["']/.test(externalSources.evidenceGate));
check("Evidencia solicita contenido exacto", /courseSlug:\s*EXPECTED_COURSE/.test(externalSources.evidenceGate));
check("Evidencia usa sesión temporal", /sessionStorage\.setItem\(SESSION_KEY/.test(externalSources.evidenceSso));
check("Evidencia consume handoff privado", /FRAGMENT_KEY\s*=\s*["']kc_handoff["']/.test(externalSources.evidenceSso) && /readFragmentHandoff/.test(externalSources.evidenceSso));
check("Evidencia limpia el handoff de la URL", /history\.replaceState/.test(externalSources.evidenceSso));
check("Evidencia conserva postMessage como compatibilidad", /kinecheck-sso-ready/.test(externalSources.evidenceSso) && /addEventListener\(["']message["']/.test(externalSources.evidenceSso));
check("Evidencia no borra sesión por falta de opener", !/if\s*\(!window\.opener\)\s*\{[\s\S]*?clear/i.test(externalSources.evidenceSso));
check("Evidencia no envía Cache-Control como request header", !/["']Cache-Control["']\s*:/.test(externalSources.evidenceGate));
check("Evidencia conserva sesión ante error de red", /NETWORK_ERROR[\s\S]*?Reintentar acceso/i.test(externalSources.evidenceGate));
check("Evidencia no permite login local", !/grant_type=password|auth\/v1\/signup/.test(externalSources.evidenceGate));
check("Evidencia carga handoff private1 antes del gate", /sso-handoff\.js\?v=20260809-private1[\s\S]*?auth-gate\.js/.test(externalSources.evidenceIndex));
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
