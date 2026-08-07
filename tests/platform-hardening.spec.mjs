import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [health, ready, runtime, observability, publicJs, academyBrand, academySecurity, headers] = await Promise.all([
  read("functions/api/health.js"),
  read("functions/api/ready.js"),
  read("assets/runtime-config.js"),
  read("assets/observability.js"),
  read("kinecheck/site-v5.js"),
  read("academy/academy-brand-identity.js"),
  read("academy/security-hardening-v1.js"),
  read("_headers"),
]);

assert.match(health, /status:\s*"ok"/);
assert.match(health, /cache-control/);
assert.match(ready, /publicSite/);
assert.match(ready, /academy/);
assert.match(ready, /auth/);
assert.match(ready, /licenseService/);
assert.match(ready, /sso/);
assert.match(ready, /auth\/v1\/health/);
assert.match(ready, /functions\/v1\/course-key/);
assert.match(ready, /503/);

assert.match(runtime, /KINECHECK_RUNTIME/);
assert.match(runtime, /canonicalOrigin:\s*"https:\/\/kinecheck\.cl"/);
assert.match(runtime, /features:\s*Object\.freeze/);
assert.match(runtime, /health:\s*"\/api\/health"/);
assert.match(runtime, /ready:\s*"\/api\/ready"/);

assert.match(observability, /unhandledrejection/);
assert.match(observability, /\[email\]/);
assert.match(observability, /\[redacted\]/);
assert.match(observability, /sessionStorage/);
assert.doesNotMatch(observability, /localStorage/);

assert.match(publicJs, /runtime-config\.js/);
assert.match(publicJs, /observability\.js/);
assert.match(academyBrand, /runtime-config\.js/);
assert.match(academyBrand, /observability\.js/);
assert.match(academyBrand, /security-hardening-v1\.js/);

assert.match(academyBrand, /#onboarding-action/);
assert.match(academyBrand, /data-kc-view-link/);
assert.match(academyBrand, /"biblioteca"/);
assert.match(academyBrand, /a\[hidden\]\[aria-hidden="true"\]:empty/);
assert.match(academyBrand, /Compré y todavía no aparece mi acceso/);
assert.match(academyBrand, /mismo correo utilizado en Hotmart/);
assert.match(academyBrand, /código de transacción de Hotmart/);
assert.match(academyBrand, /No envíes contraseñas, datos clínicos ni información sensible/);

assert.match(academySecurity, /GENERIC_RECOVERY_MESSAGE/);
assert.match(academySecurity, /Si existe una cuenta asociada a este correo/);
assert.match(academySecurity, /stopImmediatePropagation/);
assert.match(academySecurity, /recovery-request-form/);
assert.match(academySecurity, /reduceRoadmapNoise/);
assert.match(academySecurity, /Novedades KineCheck/);

assert.match(headers, /\/academy\/\*/);
assert.match(headers, /X-Robots-Tag:\s*noindex, nofollow/);

console.log("KineCheck platform hardening OK: salud, readiness de dependencias, recuperación no enumerable, navegación, soporte post-compra y noindex de Academy.");
