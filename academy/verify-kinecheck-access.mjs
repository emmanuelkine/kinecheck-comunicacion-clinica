import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (name) => readFile(new URL(name, import.meta.url), "utf8");
const [index, bootstrap, config, core, router, relayHtml, relayJs, recovery, reviews, learningPath, integrationGuard, evidence, courseAuthGate] = await Promise.all([
  read("index.html"),
  read("academy-bootstrap-v28.js"),
  read("config.js"),
  read("academy-v39.js"),
  read("academy-launch-router-v4.js"),
  read("app-sso-relay.html"),
  read("app-sso-relay.js"),
  read("academy-kinecheck-v4.js"),
  read("academy-reviews.js"),
  read("academy-learning-path-v4.js"),
  read("academy-integration-guard-v4.js"),
  read("academy-evidence-alerts.js"),
  read("../auth-gate.js"),
]);

const appOrigin = "https://kinecheck-clinico.emmanuelkine.chatgpt.site";
const ssoProducts = ["kinecheck-estudiante", "kinecheck-recupera"];
const localClinicoRoutes = ["kinecheck-clinico-guia", "kinecheck-clinico-curso"];
const manualRoutes = ["access.html#activar", "student-access.html#activar", "patient-access.html#activar"];

assert.match(
  index,
  new RegExp(`form-action 'self' ${appOrigin.replaceAll(".", "\\.")}`),
  "La política principal debe permitir únicamente el POST al dominio oficial además del origen propio.",
);
assert.doesNotMatch(index, /form-action[^>]*\*/i, "form-action no debe usar comodines.");
assert.match(relayHtml, new RegExp(`form-action ${appOrigin.replaceAll(".", "\\.")}`));

for (const product of ssoProducts) {
  for (const source of [bootstrap, config]) {
    assert.match(source, new RegExp(`sso\\.html\\?product=${product}`));
    assert.match(source, new RegExp(`ssoProduct:\\s*"${product}"`));
  }
  assert.match(core, new RegExp(`"${product}"`));
  assert.match(router, new RegExp(`"${product}"`));
  assert.match(relayJs, new RegExp(`"${product}"`));
}

for (const route of localClinicoRoutes) {
  assert.match(bootstrap, new RegExp(route));
  assert.match(config, new RegExp(route));
}
assert.match(bootstrap, /slug:\s*"kinecheck-clinico"/);
assert.match(bootstrap, /slug:\s*"kinecheck-clinico-curso"/);

for (const route of manualRoutes) {
  assert.doesNotMatch(bootstrap, new RegExp(route.replaceAll(".", "\\.")));
  assert.doesNotMatch(config, new RegExp(route.replaceAll(".", "\\.")));
}

assert.match(core, /function submitSsoAccess\(/);
assert.match(core, /function receiveNativeSession\(/);
assert.match(core, /kinecheck:native-session/);
assert.match(core, /KINECHECK_ACADEMY_SESSION\s*=\s*Object\.freeze/);
assert.match(core, /async refresh\(\)/);
assert.match(core, /return validSession\(\)/);
assert.match(core, /access_token:\s*accessToken/);
assert.doesNotMatch(core.match(/function submitSsoAccess[\s\S]*?\n}\n/)?.[0] || "", /refresh_token|password|transaction|email/);
assert.match(router, /transport:\s*"form-post"/);
assert.match(router, /app-sso-relay\.html/);
assert.match(relayJs, /method = "POST"/);
assert.match(relayJs, /handoff_type/);
assert.match(router, /popup\.name = JSON\.stringify\(payload\)/);
assert.match(integrationGuard, /popup\.name = JSON\.stringify\(payload\)/);
assert.match(router, /comunicacion-clinica\.html\?course=comunicacion-clinica/);
assert.match(courseAuthGate, /COURSE_SESSION_PREFIX = "kinecheck_course_session_v2:"/);
assert.match(courseAuthGate, /LEGACY_COURSE_SESSION_PREFIX = "kinecheck_course_session_v1:"/);
assert.match(courseAuthGate, /handoff\?\.type !== HANDOFF_TYPE/);
assert.doesNotMatch(courseAuthGate, /kinecheck-sso-v2/);

for (const sessionConsumer of [router, recovery, reviews, learningPath, integrationGuard, evidence]) {
  assert.match(
    sessionConsumer,
    /KINECHECK_ACADEMY_SESSION\?\.get\?\.\(\)/,
    "Todos los módulos activos deben reutilizar la sesión transitoria entregada por KineCheck App.",
  );
}

assert.match(index, /id="forgot-password"/);
assert.match(index, /id="recovery-request-form"/);
assert.match(index, /id="recovery-update-form"/);
assert.match(recovery, /\/auth\/v1\/recover/);
assert.match(recovery, /method:\s*"PUT"/);
assert.match(recovery, /\/auth\/v1\/user/);
assert.match(recovery, /password\.length < 8/);

console.log("KineCheck Academy OK: Clínico local, SSO de Estudiante y Recupera, sesión móvil transitoria, CSP restringida y recuperación de contraseña.");
