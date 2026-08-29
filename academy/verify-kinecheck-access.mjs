import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (name) => readFile(new URL(name, import.meta.url), "utf8");
const [index, bootstrap, config, core, opener, bridge, router, relayHtml, relayJs, recovery, reviews, learningPath, integrationGuard, evidence, courseAuthGate] = await Promise.all([
  read("index.html"),
  read("academy-bootstrap-v28.js"),
  read("config.js"),
  read("academy-v39.js"),
  read("academy-open-v6.js"),
  read("academy-owned-native-bridge-v1.js"),
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

const appOrigin = "https://apps.kinecheck.cl";
const ssoProducts = ["kinecheck-estudiante"];
const localClinicoRoutes = ["kinecheck-clinico-guia", "kinecheck-clinico-curso"];
const manualRoutes = ["access.html#activar", "student-access.html#activar", "patient-access.html#activar"];

assert.match(index, /form-action 'self'/, "La política principal debe conservar form-action restringido al origen propio para el flujo local.");
assert.doesNotMatch(index, /form-action[^>]*\*/i, "form-action no debe usar comodines.");
assert.match(relayHtml, new RegExp(`form-action ${appOrigin.replaceAll(".", "\\.")}`));
assert.doesNotMatch([bootstrap, config, relayHtml, relayJs].join("\n"), new RegExp("chatgpt" + "\\.site", "i"), "El flujo activo de aplicaciones no debe depender del host técnico heredado.");
assert.match(bootstrap, /__KINECHECK_APP_SSO_FORM_GUARD__/);
assert.match(bootstrap, /app-sso-relay\.html/);
assert.match(bootstrap, /https:\/\/apps\.kinecheck\.cl\/sso\.html\?product=kinecheck-estudiante/);
assert.doesNotMatch(bootstrap, /https:\/\/apps\.kinecheck\.cl\/sso\.html\?product=kinecheck-recupera/);
assert.match(config, /baseUrl:\s*"https:\/\/apps\.kinecheck\.cl"/);

for (const product of ssoProducts) {
  for (const source of [bootstrap, config]) {
    assert.match(source, new RegExp(`sso\\.html\\?product=${product}`));
    assert.match(source, new RegExp(`ssoProduct:\\s*"${product}"`));
  }
  assert.match(core, new RegExp(`"${product}"`));
  assert.match(opener, new RegExp(`"${product}"`));
  assert.match(relayJs, new RegExp(`"${product}"`));
}

for (const source of [bootstrap, config]) {
  assert.match(source, /slug:\s*"kinecheck-recupera"[\s\S]*?status:\s*"preparing"[\s\S]*?url:\s*""[\s\S]*?ssoProduct:\s*""/);
  assert.doesNotMatch(source, /sso\.html\?product=kinecheck-recupera/);
}
assert.match(core, /const PAUSED_PRODUCT = "kinecheck-recupera"/);
assert.match(opener, /const PAUSED_PRODUCT = "kinecheck-recupera"/);
assert.match(relayJs, /product === PAUSED_PRODUCT[\s\S]*?fail\(PAUSED_MESSAGE\)[\s\S]*?return/);

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
assert.match(router, /academy-open-v6\.js/);
assert.match(integrationGuard, /academy-open-v6\.js/);
assert.match(opener, /app-sso-relay\.html/);
assert.match(relayJs, /method = "POST"/);
assert.match(relayJs, /handoff_type/);
assert.match(relayJs, /https:\/\/apps\.kinecheck\.cl\/api\/license\/sso/);

// El handoff externo debe funcionar también en sesiones privadas frescas sin popup/opener.
assert.match(opener, /kc_handoff/);
assert.match(opener, /externalHandoffUrl\(/);
assert.match(opener, /location\.assign\(externalHandoffUrl\(targetUrl, session, product\)\)/);
assert.match(opener, /handoff_access_only:\s*true/);
assert.doesNotMatch(opener.match(/function accessOnly[\s\S]*?\n  }/)?.[0] || "", /refresh_token|email|user|password/);
assert.doesNotMatch(opener, /window\.open\(|popup\.postMessage|popup\.name/);

// La interfaz visible debe tener un único controlador directo, sin clicks proxy.
assert.match(bridge, /window\.addEventListener\("click"[\s\S]*?true\);/);
assert.match(bridge, /KINECHECK_OPEN_PRODUCT/);
assert.match(bridge, /data-kc-open-product/);
assert.match(bridge, /data-kc-open-owned/);
assert.match(bridge, /data-kc-path-open/);
assert.match(bridge, /#course-grid \[data-course\]/);
assert.doesNotMatch(bridge, /target\.click\(|button\.click\(/);

assert.match(opener, /comunicacion-clinica\.html\?course=comunicacion-clinica/);
assert.match(courseAuthGate, /COURSE_SESSION_PREFIX = "kinecheck_course_session_v2:"/);
assert.match(courseAuthGate, /LEGACY_COURSE_SESSION_PREFIX = "kinecheck_course_session_v1:"/);
assert.match(courseAuthGate, /handoff\?\.type !== HANDOFF_TYPE/);
assert.doesNotMatch(courseAuthGate, /kinecheck-sso-v2/);

for (const sessionConsumer of [opener, recovery, reviews, learningPath, evidence]) {
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

console.log("KineCheck Academy OK: navegación directa, Clínico local, POST SSO de Estudiante preservado, Recupera rechazado, CSP restringida y recuperación de contraseña.");
