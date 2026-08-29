import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [health, ready, runtime, observability, academyHtml, academyBrand, academyRelay, academyV39, headers] = await Promise.all([
  read("functions/api/health.js"),
  read("functions/api/ready.js"),
  read("assets/runtime-config.js"),
  read("assets/observability.js"),
  read("academy/index.html"),
  read("academy/academy-brand-identity.js"),
  read("academy/app-sso-relay.js"),
  read("academy/academy-v39.js"),
  read("_headers"),
]);

assert.match(health, /status:\s*"ok"/);
assert.match(health, /cache-control/i);
for (const token of ["publicSite", "academy", "auth", "licenseService", "sso", "503"]) assert.match(ready, new RegExp(token));

assert.match(runtime, /KINECHECK_RUNTIME/);
assert.match(runtime, /canonicalOrigin:\s*"https:\/\/kinecheck\.cl"/);
assert.match(runtime, /health:\s*"\/api\/health"/);
assert.match(runtime, /ready:\s*"\/api\/ready"/);

assert.match(observability, /unhandledrejection/);
assert.match(observability, /\[redacted\]/);
assert.match(observability, /sessionStorage/);
assert.doesNotMatch(observability, /localStorage/);

// Contrato real de Academy posterior al hardening de privacidad.
for (const script of ["academy-brand-identity.js", "academy-open-v6.js", "academy-owned-native-bridge-v1.js"]) {
  assert.match(academyHtml, new RegExp(script.replace(".", "\\.")));
}
assert.match(academyHtml, /id="kc-toast"/);
assert.match(academyHtml, /id="kc-bottom-nav"/);
assert.match(academyHtml, /data-kc-view-link="biblioteca"/);

// Recupera debe permanecer visible como producto pausado, nunca como flujo operativo.
assert.match(academyBrand, /slug:\s*"kinecheck-recupera"/);
assert.match(academyBrand, /Próximamente/);
assert.match(academyBrand, /Acceso bloqueado/);
assert.doesNotMatch(academyBrand, /P106806251E/);

// Estudiante conserva POST SSO; Recupera no puede entrar al relay operativo.
assert.match(academyV39, /method\s*=\s*["']post["']/i);
assert.match(academyV39, /submit\(\)/);
assert.match(academyRelay, /kinecheck-estudiante/);
assert.doesNotMatch(academyRelay, /new Set\([^)]*["']kinecheck-recupera["']/s);

assert.match(headers, /\/academy\/\*/);
assert.match(headers, /X-Robots-Tag:\s*noindex, nofollow/);

console.log("KineCheck platform hardening post-privacy OK: Academy, SSO Estudiante, Recupera pausado y controles de privacidad alineados con producción.");
