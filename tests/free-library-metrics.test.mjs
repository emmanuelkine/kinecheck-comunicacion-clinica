import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const library = fs.readFileSync(
  new URL("../gratis/profesionales/index.html", import.meta.url),
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

test("the audience landing keeps both library routes and the consent loader", () => {
  const landing = fs.readFileSync(new URL('../gratis/index.html', import.meta.url), 'utf8');
  assert.match(landing, /href="\/gratis\/profesionales\/"/);
  assert.match(landing, /href="\/gratis\/pacientes\/"/);
  assert.match(landing, /metrics-v1\.js\?v=[\w-]+/);
});

test("backend and database allow the new events", () => {
  for (const eventName of ["free_resource_open", "ebook_download"]) {
    assert.ok(metricFunction.includes(`"${eventName}"`));
    assert.ok(migration.includes(`'${eventName}'::text`));
  }
  assert.match(migration, /is_qa = false/);
  assert.match(migration, /revoke all .* from public, anon, authenticated/s);
});

// A move into /gratis/profesionales/ must not break shared brand/readability CSS.
test("each audience library resolves its local stylesheets after folder moves", () => {
  const repository = new URL("../", import.meta.url);
  for (const path of ["gratis/index.html", "gratis/profesionales/index.html", "gratis/pacientes/index.html"]) {
    const file = new URL(path, repository);
    const html = fs.readFileSync(file, "utf8");
    const links = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag);
    const styles = links.filter((tag) => /rel=["']stylesheet["']/.test(tag));
    assert.ok(styles.length > 0 || /<style\b/.test(html), `${path}: no styling`);
    for (const tag of styles) {
      const href = tag.match(/href=["']([^"']+)["']/)?.[1];
      assert.ok(href, `${path}: stylesheet without href`);
      if (/^https?:/.test(href)) continue;
      const resolved = href.startsWith("/") ? new URL(href.slice(1), repository) : new URL(href, file);
      resolved.search = "";
      assert.ok(fs.existsSync(resolved), `${path}: stylesheet does not exist: ${href}`);
    }
  }
});
