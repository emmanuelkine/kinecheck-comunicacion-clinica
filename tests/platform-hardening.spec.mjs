import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [health, ready, runtime, observability, publicJs, academyBrand] = await Promise.all([
  read("functions/api/health.js"),
  read("functions/api/ready.js"),
  read("assets/runtime-config.js"),
  read("assets/observability.js"),
  read("kinecheck/site-v5.js"),
  read("academy/academy-brand-identity.js"),
]);

assert.match(health, /status:\s*"ok"/);
assert.match(health, /cache-control/);
assert.match(ready, /publicSite/);
assert.match(ready, /academy/);
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

console.log("KineCheck platform hardening OK: health, readiness, runtime config y diagnósticos seguros.");
