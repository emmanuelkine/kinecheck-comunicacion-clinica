import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../microapps/index.html", import.meta.url), "utf8");
const library = readFileSync(new URL("../gratis/index.html", import.meta.url), "utf8");

test("Clinical MicroApps has a complete free fictional lateral elbow case", () => {
  assert.match(html, /tendinopatía lateral de codo/i);
  assert.match(html, /Gratuito · Disponible/);
  assert.match(html, /caso-gratuito/);
  assert.match(html, /PubMed/);
  assert.match(html, /educativ[oa]/i);
});

test("Future cases are visible but not purchasable", () => {
  for (const condition of [/dolor lumbar persistente/i, /dolor cervical persistente/i, /dolor de hombro persistente/i]) {
    assert.match(html, condition);
  }
  assert.match(html, /En construcción · Acceso no habilitado/);
  assert.match(html, /No se solicita pago por contenido no habilitado/);
});

test("No patient personal data fields or client storage in MicroApps", () => {
  assert.doesNotMatch(html, /<textarea\b/i);
  assert.doesNotMatch(html, /<input[^>]*type=["'](?:text|email|tel|date|file|number)["']/i);
  assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB)\b/);
  assert.doesNotMatch(html, /<script[^>]*src=/i);
});

test("KineCheck free library links to the clinical microapps catalogue", () => {
  assert.match(library, /href="\/microapps\/"/);
  assert.match(library, /Tendinopatía lateral de codo/i);
  assert.doesNotMatch(library, /href=["'][^"']*chatgpt/i);
});
