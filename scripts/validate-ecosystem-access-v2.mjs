import fs from "node:fs";

const checks = [];
function test(name, ok) {
  const passed = Boolean(ok);
  checks.push({ name, passed });
  console.log(`${passed ? "✓" : "✗"} ${name}`);
  if (!passed) process.exitCode = 1;
}
function read(path) { return fs.readFileSync(path, "utf8"); }

const academy = read("academy/index.html");
const opener = read("academy/academy-open-v6.js");
const bridge = read("academy/academy-owned-native-bridge-v1.js");
const relay = read("academy/app-sso-relay.js");
const shell = read("academy/mas-alla-del-dolor.html");
const shellJs = read("academy/mas-alla-del-dolor-shell-v1.js");
const courseKey = read("supabase/functions/course-key/index.ts");

// Entrada única y recuperación de cuenta.
test("Academy mantiene un único ingreso", academy.includes('id="auth-form"') && academy.includes('id="forgot-password"'));
test("Academy publica Inicio y Biblioteca", academy.includes('data-kc-view-link="inicio"') && academy.includes('data-kc-view-link="biblioteca"'));

// Apertura de productos desde todos los puntos de la interfaz.
test("Bridge cubre Continuar y productos", bridge.includes("continue-button") && bridge.includes("data-kc-open-product") && bridge.includes("data-kc-open-owned") && bridge.includes("data-course"));
test("Opener vigente", opener.includes("__KINECHECK_OPEN_V6__") && /const RELEASE = "\d{8}[^"]*";/.test(opener));
test("Solo Estudiante usa relay", opener.includes('new Set(["kinecheck-estudiante"])') && relay.includes('const PRODUCTS = new Set(["kinecheck-estudiante"])'));
test("Recupera permanece bloqueado", opener.includes('PAUSED_PRODUCT = "kinecheck-recupera"') && relay.includes('PAUSED_PRODUCT = "kinecheck-recupera"') && relay.includes("product === PAUSED_PRODUCT"));
test("Evidencia usa handoff externo", opener.includes('"evidencia-aplicada"') && opener.includes("externalHandoffUrl"));
test("Más allá del dolor queda same-origin", opener.includes('"mas-alla-del-dolor": `./mas-alla-del-dolor.html') && shell.includes("Validando tu acceso dentro de KineCheck"));

// Autorización de cursos.
test("Más allá usa slug exacto", shellJs.includes('COURSE_SLUG = "mas-alla-del-dolor"'));
test("Más allá solicita course-key", shellJs.includes("COURSE_KEY_FUNCTION = \"course-key\"") && shellJs.includes("courseSlug: COURSE_SLUG"));
test("Más allá carga contenido protegido", shellJs.includes("new Blob([source]") && shellJs.includes("await import(moduleUrl)"));
test("Course-key valida usuario autenticado", courseKey.includes("auth.getUser()"));
test("Course-key filtra slug exacto", courseKey.includes('.eq("course_slug", courseSlug)'));
test("Course-key exige acceso utilizable", courseKey.includes("if (!isUsableAccess(access))"));
test("Course-key protege Más allá del dolor", courseKey.includes('"mas-alla-del-dolor"') && courseKey.includes('"index-nmhIRPii.js"'));

const report = {
  generatedAt: new Date().toISOString(),
  status: process.exitCode ? "failed" : "passed",
  checks,
  summary: {
    total: checks.length,
    passed: checks.filter((item) => item.passed).length,
    failed: checks.filter((item) => !item.passed).length,
  },
};
fs.writeFileSync("ecosystem-access-report.json", JSON.stringify(report, null, 2));

if (process.exitCode) {
  console.error(`Acceso del ecosistema: ${report.summary.failed} control(es) fallaron.`);
} else {
  console.log(`Acceso del ecosistema aprobado: ${report.summary.passed}/${report.summary.total} controles.`);
}
