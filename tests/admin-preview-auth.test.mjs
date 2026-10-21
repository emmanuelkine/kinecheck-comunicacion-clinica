import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../admin/admin.js", import.meta.url), "utf8");

test("admin Preview authenticates without changing the production login path", () => {
  assert.match(source, /hostname\.endsWith\(`\.\$\{PAGES_PROJECT_HOST\}`\)/);
  assert.match(source, /hostname !== PAGES_PROJECT_HOST/);
  assert.match(source, /preview\s*\?\s*"\/api\/admin-preview-login"\s*:\s*`\$\{SUPABASE_URL\}\/functions\/v1\/platform-login`/);
});

test("admin Preview sends credentials only to its same-origin login endpoint", () => {
  assert.match(source, /headers:\s*preview\s*\?\s*\{ "Content-Type": "application\/json" \}/);
  assert.doesNotMatch(source, /auth\/v1\/token\?grant_type=password/);
  assert.match(source, /saveSession\(data\);/);
  assert.match(source, /\$\("#admin-password"\)\.value = ""/);
});

test("admin Preview loads and controls the dashboard through its owner-checked same-origin proxy", () => {
  assert.match(source, /preview \? "\/api\/admin-preview-automation" : `\$\{SUPABASE_URL\}\/functions\/v1\/automation-status`/);
  assert.match(source, /preview \? "\/api\/admin-preview-automation" : `\$\{SUPABASE_URL\}\/functions\/v1\/automation-control`/);
  assert.match(source, /JSON\.stringify\(\{ operation: "status" \}\)/);
  assert.match(source, /JSON\.stringify\(preview \? \{ operation: "control", payload \} : payload\)/);
});
