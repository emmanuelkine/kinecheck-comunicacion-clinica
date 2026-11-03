import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html=readFileSync(new URL("../microapps/index.html",import.meta.url),"utf8");
test("Clinical MicroApps is a fictional educational simulator",()=>{
  assert.match(html,/completamente ficticios/);
  assert.match(html,/MSK Clinical Reasoning/);
  assert.match(html,/Caso A/);
  assert.match(html,/Caso B/);
  assert.match(html,/Resultado formativo/);
});
test("Clinical MicroApps has no patient input or persistence mechanism",()=>{
  assert.doesNotMatch(html,/<textarea\b/i);
  assert.doesNotMatch(html,/<input[^>]*type=["'](?:text|email|tel|date|file|number)["']/i);
  assert.doesNotMatch(html,/\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB)\b/);
  assert.doesNotMatch(html,/<script[^>]*src=/i);
});
