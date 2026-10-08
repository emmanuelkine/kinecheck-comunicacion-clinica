import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const beta = readFileSync("supabase/functions/beta-apply/index.ts", "utf8");
const metrics = readFileSync("supabase/functions/metric-event/index.ts", "utf8");

test("anonymous beta route never updates existing application", () => {
  assert.match(beta, /if \(existing\)\s*\{\s*return json\(/);
  assert.doesNotMatch(beta, /\.update\(payload\)/);
  assert.match(beta, /\.insert\(payload\)/);
  assert.match(beta, /error\.code !== "23505"/);
});
test("both public functions enforce actual streamed body size", () => {
  for (const [source, max] of [[beta, "20_000"], [metrics, "8_000"]]) {
    assert.match(source, new RegExp("const maxBytes = " + max));
    assert.match(source, /await reader\.read\(\)/);
    assert.match(source, /size > maxBytes/);
    assert.match(source, /413/);
  }
});
test("metrics rejects arbitrary client metadata", () => {
  assert.match(metrics, /metadataKeys = new Set/);
  assert.match(metrics, /metadataKeys\.has\(key\)/);
  assert.match(metrics, /safeMetadataValue\.test\(candidate\)/);
  assert.doesNotMatch(metrics, /output\[safeKey\] = clean\(raw/);
});
