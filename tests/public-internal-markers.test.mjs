import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public refund policy does not expose internal launch QA markers", async () => {
  const source = await read("legal/reembolsos.html");
  assert.doesNotMatch(source, /QA interno/i);
  assert.doesNotMatch(source, /Pendiente de certificación comercial/i);
});
