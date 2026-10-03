import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const library = fs.readFileSync(
  new URL("../gratis/index.html", import.meta.url),
  "utf8",
);
const metricFunction = fs.readFileSync(
  new URL("../supabase/functions/metric-event/index.ts", import.meta.url),
  "utf8",
);
const migration = fs.readFileSync(
  new URL(
    "../supabase/migrations/20261003181500_track_free_library_resources.sql",
    import.meta.url,
  ),
  "utf8",
);

test("every free-library card link has a stable tracking slug", () => {
  const cards = [
    ...library.matchAll(/<article class="card[^"]*">[\s\S]*?<\/article>/g),
  ].map((match) => match[0]);
  assert.ok(cards.length >= 10);
  for (const card of cards) {
    assert.match(card, /data-kc-resource="[a-z0-9-]+"/);
  }
});

test("library loads consent metrics and emits generic and eBook events", () => {
  assert.match(library, /metrics-privacy-v1\.css/);
  assert.match(library, /metrics-v1\.js/);
  assert.match(library, /KINECHECK_METRIC\("free_resource_open"/);
  assert.match(library, /KINECHECK_METRIC\("ebook_download"/);
});

test("backend and database allow the new events", () => {
  for (const eventName of ["free_resource_open", "ebook_download"]) {
    assert.ok(metricFunction.includes(`"${eventName}"`));
    assert.ok(migration.includes(`'${eventName}'::text`));
  }
  assert.match(migration, /is_qa = false/);
  assert.match(migration, /revoke all .* from public, anon, authenticated/s);
});
