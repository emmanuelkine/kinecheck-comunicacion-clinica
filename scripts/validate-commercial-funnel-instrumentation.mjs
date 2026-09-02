import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const metrics = read("metrics-v1.js");
const metricEvent = read("supabase/functions/metric-event/index.ts");
const commerce = read("academy/academy-commerce-v4.js");
const home = read("index.html");

assert(home.includes("metrics-v1.js?v=20260902-commercial1"), "Home does not load metrics");
assert(metrics.includes("/^\\/productos\\/([^/]+)(?:\\/|$)/i"), "Product slug is not derived from /productos/{slug}/");
for (const event of ["buy_click", "checkout_start", "hotmart_outbound"]) {
  assert(metrics.includes(`\"${event}\"`), `Client metric missing: ${event}`);
  assert(metricEvent.includes(`\"${event}\"`), `Server allowlist missing: ${event}`);
}
assert(metricEvent.includes('"access_error"'), "Server allowlist missing access_error");
assert(commerce.includes('window.KINECHECK_METRIC("buy_click"'), "Academy buy click is not instrumented");
assert(commerce.includes('window.KINECHECK_METRIC("hotmart_outbound"'), "Academy outbound is not instrumented");
assert(commerce.indexOf('window.KINECHECK_METRIC("hotmart_outbound"') < commerce.indexOf("window.location.assign(checkout)"), "Academy outbound must be recorded before navigation");

const productRoot = path.join(root, "productos");
const slugs = fs.readdirSync(productRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(productRoot, entry.name, "index.html")))
  .map((entry) => entry.name)
  .sort();
assert(slugs.length > 0, "No product pages discovered");

for (const slug of slugs) {
  const html = read(`productos/${slug}/index.html`);
  assert(html.includes("metrics-v1.js?v=20260902-commercial1"), `Metrics missing on product page: ${slug}`);
  assert(metrics.includes(`\"${slug}\"`), `Client product allowlist missing: ${slug}`);
  assert(metricEvent.includes(`\"${slug}\"`), `Server product allowlist missing: ${slug}`);
}

const payloadBlock = metrics.match(/const payload = \{([\s\S]*?)\n    \};/);
assert(payloadBlock, "Metrics payload not found");
for (const forbidden of ["email", "access_token", "refresh_token", "nombre", "patient", "paciente"]) {
  assert(!payloadBlock[1].toLowerCase().includes(forbidden), `Sensitive key in metrics payload: ${forbidden}`);
}

console.log(`COMMERCIAL_FUNNEL_INSTRUMENTATION = PASS (${slugs.length} product pages)`);
console.log(`PRODUCTS = ${slugs.join(",")}`);
