import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("las métricas opcionales requieren aceptación", async () => {
  const source = await read("metrics-v1.js");
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /if \(metricsChoice !== "yes"\) return Promise\.resolve\(null\)/);
  assert.match(source, /function startMetrics\(\) \{\s*if \(metricsStarted \|\| metricsChoice !== "yes"\) return;/);
  assert.match(source, /function init\(\) \{\s*cleanAcademyTrackingParams\(\);\s*mountMetricsPreferences\(\);\s*startMetrics\(\);/);
  assert.match(source, /data-kc-metrics="no"/);
  assert.match(source, /data-kc-metrics="yes"/);
  assert.match(source, /kc_optional_metrics_choice_v1/);
  assert.match(source, /consentVersion: "20260925-v1"/);
});

test("el visitante puede informarse y cambiar su elección", async () => {
  const [policy, styles, home] = await Promise.all([
    read("legal/privacidad.html"),
    read("assets/metrics-privacy-v1.css"),
    read("index.html"),
  ]);
  assert.match(policy, /id="almacenamiento"/);
  assert.match(policy, /Rechazar métricas/);
  assert.match(policy, /25 de septiembre de 2026/);
  assert.match(styles, /#kc-metrics-panel/);
  assert.match(styles, /:focus-visible/);
  assert.match(home, /metrics-v1\.js\?v=20260925-consent1/);
});

test("el servidor descarta métricas enviadas por clientes antiguos sin preferencia", async () => {
  const source = await read("supabase/functions/metric-event/index.ts");
  assert.match(source, /consentVersion !== "20260925-v1"/);
  assert.match(source, /recorded: false, reason: "consent_required"/);
});
