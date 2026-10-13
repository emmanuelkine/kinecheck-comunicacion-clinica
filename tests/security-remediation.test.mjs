import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT);
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");

function filesUnder(path, suffix) {
  const start = join(ROOT_PATH, path);
  const output = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const current = join(directory, entry.name);
      if (entry.isDirectory()) visit(current);
      else if (!suffix || current.endsWith(suffix)) output.push(current);
    }
  };
  visit(start);
  return output;
}

test("automation-status requires an active owner grant", () => {
  const source = read("supabase/functions/automation-status/index.ts");

  assert.match(source, /\.select\("active,access_source,last_event"\)/);
  assert.match(source, /\.eq\("active", true\)/);
  assert.match(source, /row\.active === true/);
});

test("beta-apply cannot overwrite an existing anonymous application", () => {
  const source = read("supabase/functions/beta-apply/index.ts");

  assert.match(source, /Existing records are immutable through this unauthenticated endpoint/);
  assert.match(source, /if \(existing\) \{[\s\S]*?Postulación recibida/);
  assert.match(source, /\.from\("beta_applications"\)\.insert\(payload\)/);
  assert.match(source, /error\.code !== "23505"/);
  assert.doesNotMatch(source, /\.from\("beta_applications"\)[\s\S]{0,160}\.update\(/);
  assert.doesNotMatch(source, /\.from\("beta_applications"\)[\s\S]{0,160}\.upsert\(/);
});

test("evidence Hotmart events use the atomic shared processor", () => {
  const source = read("supabase/functions/evidence-hotmart-webhook/index.ts");

  assert.match(source, /\.rpc\("process_hotmart_event"/);
  assert.doesNotMatch(source, /\.from\("course_access"\)/);
  assert.doesNotMatch(source, /\.from\("hotmart_events"\)/);
});

test("course-key fails closed and enforces access terms", () => {
  const source = read("supabase/functions/course-key/index.ts");

  assert.match(source, /access_expires_at/);
  assert.match(source, /if \(accessesError\)[\s\S]*?return json\([^;]+, 500\)/);
  assert.match(source, /if \(accessError\)[\s\S]*?return json\([^;]+, 500\)/);
  assert.doesNotMatch(source, /legacySelect|compatibility fallback|schema fallback/i);
});

test("premium course payloads stay outside the public tree", () => {
  const forbidden = [
    "kinecheck-clinico-curso/course-data.js",
    "kinecheck-clinico-curso/renderer.js",
    "academy/dolor-lumbar-persistente/data-v6.js",
    "academy/dolor-lumbar-persistente/app-v6.js",
    "academy/preview-dolor-lumbar/data-v6.js",
    "academy/preview-dolor-lumbar/app-v6.js",
  ];

  for (const path of forbidden) {
    assert.equal(existsSync(new URL(path, ROOT)), false, path);
  }

  const protectedCourse = read("supabase/functions/protected-course-key/index.ts");
  const lumbarCourse = read("supabase/functions/dolor-lumbar-course-key/index.ts");
  assert.match(protectedCourse, /\.from\("course-assets"\)/);
  assert.match(protectedCourse, /isUsableAccess\(access\)/);
  assert.match(lumbarCourse, /\.from\("course-assets"\)\.download\(path\)/);
  assert.match(lumbarCourse, /Boolean\(access\?\.active\)/);
  assert.match(lumbarCourse, /expiresAt > Date\.now\(\)/);
});

test("deployed metric privacy controls remain in source control", () => {
  const source = read("supabase/functions/metric-event/index.ts");

  assert.match(source, /consentVersion !== "20260925-v1"/);
  assert.match(source, /authenticatedFunnelEvents\.has\(eventName\) && !userId/);
  assert.match(source, /const maxBytes = 8_000/);
  assert.match(source, /if \(size > maxBytes\)/);
});

test("GitHub Actions and service containers use immutable references", () => {
  for (const path of filesUnder(".github/workflows/").filter((value) => /\.ya?ml$/.test(value))) {
    const source = readFileSync(path, "utf8");
    const name = relative(ROOT_PATH, path);

    for (const line of source.split(/\r?\n/).filter((value) => /uses:\s*actions\//.test(value))) {
      assert.match(line, /uses:\s*actions\/[\w-]+@[0-9a-f]{40}(?:\s+#\s+v\d+)?\s*$/, name);
    }
    for (const line of source.split(/\r?\n/).filter((value) => /image:\s*postgres:/.test(value))) {
      assert.match(line, /image:\s*postgres:17@sha256:[0-9a-f]{64}\s*$/, name);
    }
  }
});

test("Edge Function imports are pinned to exact versions", () => {
  for (const path of filesUnder("supabase/functions/", "index.ts")) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /supabase-js@2["/]/, path);
    assert.doesNotMatch(source, /jsr:@supabase\/functions-js\/edge-runtime/, path);
  }
});
