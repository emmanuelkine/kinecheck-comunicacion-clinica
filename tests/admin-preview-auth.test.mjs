import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../admin/admin.js", import.meta.url), "utf8");

test("admin Preview authenticates without changing the production login path", () => {
  assert.match(source, /hostname\.endsWith\(`\.\$\{PAGES_PROJECT_HOST\}`\)/);
  assert.match(source, /hostname !== PAGES_PROJECT_HOST/);
  assert.match(source, /preview\s*\?\s*"\/auth\/v1\/token\?grant_type=password"\s*:\s*"\/functions\/v1\/platform-login"/);
});

test("admin Preview requires verified owner authorization before saving a session", () => {
  assert.match(source, /functions\/v1\/platform-context/);
  assert.match(source, /data\.owner !== true/);
  assert.match(source, /if \(preview\) await requireOwner\(data\);\s*saveSession\(data\);/);
  assert.match(source, /\$\("#admin-password"\)\.value = ""/);
});
