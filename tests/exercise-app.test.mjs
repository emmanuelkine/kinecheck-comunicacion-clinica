import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculate } from "../supabase/functions/_shared/exercise-calculations.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("1RM estimation returns both equations and rejects out-of-range repetitions", () => {
  const result = calculate("estimate-1rm", { load: 100, reps: 5 });
  assert.match(result.label, /Epley: 116\.7 kg/);
  assert.match(result.label, /Brzycki: 112\.5 kg/);
  assert.throws(() => calculate("estimate-1rm", { load: 100, reps: 8 }), /entre 1 y 7/);
  assert.throws(() => calculate("estimate-1rm", { load: -2, reps: 5 }), /mayor que cero/);
});

test("RPE and RIR stay separate values and are range checked", () => {
  const result = calculate("rpe-rir", { rpe: 8.5, rir: 2 });
  assert.match(result.label, /RPE registrado: 8\.5\/10/);
  assert.match(result.label, /RIR estimado: 2/);
  assert.match(result.label, /sin conversión automática/);
  assert.throws(() => calculate("rpe-rir", { rpe: 11, rir: 0 }), /entre 0 y 10/);
});

test("volume-load and load variation use explicit arithmetic", () => {
  assert.match(calculate("volume-load", { sets: 3, reps: 8, load: 20 }).label, /480 kg·repeticiones/);
  assert.match(calculate("load-variation", { previous: 1000, current: 1125 }).label, /Variación: 12\.5%/);
  assert.throws(() => calculate("load-variation", { previous: 0, current: 1 }), /mayor que cero/);
});

test("heart-rate reserve uses measured values and validates ordering", () => {
  assert.match(calculate("heart-rate-reserve", { maxHr: 190, restHr: 60, intensity: 50 }).label, /125 lpm/);
  assert.throws(() => calculate("heart-rate-reserve", { maxHr: 60, restHr: 70, intensity: 50 }), /Revisa/);
  assert.throws(() => calculate("heart-rate-reserve", { maxHr: 190, restHr: 60, intensity: 0 }), /entre 1 y 100/);
});

test("app contains exactly two demo conditions and eight named Pro locks", async () => {
  const app = await read("../exercise/app.js");
  const names = ["Dolor lumbar inespecífico", "Tendinopatía rotuliana", "Cervicalgia", "Artrosis de rodilla", "Artrosis de cadera", "Tendinopatía aquílea", "Dolor de hombro relacionado con manguito rotador", "Dolor femoropatelar", "Epicondilalgia lateral", "Esguince lateral de tobillo"];
  for (const name of names) assert.ok(app.includes(name), `Missing condition: ${name}`);
  assert.equal((app.match(/demo: true/g) || []).length, 2);
  assert.equal((app.match(/demo: false/g) || []).length, 8);
  assert.match(app, /ACCESS_NOT_ACTIVE/);
  assert.match(app, /localStorage\.getItem\(SESSION_KEY\)/);
  assert.doesNotMatch(app, /localStorage\.setItem\([^,]*(?:clinical|patient|form|exercise)/i);
});

test("Pro endpoint verifies JWT user and entitlement before calculations", async () => {
  const api = await read("../supabase/functions/exercise-pro-api/index.ts");
  assert.match(api, /userClient\.auth\.getUser\(\)/);
  assert.match(api, /COURSE_SLUG = "kinecheck-exercise-pro"/);
  assert.match(api, /admin\.rpc\("has_course_access"/);
  assert.ok(api.indexOf("if (allowed !== true)") < api.indexOf("calculate(action, inputs"));
  assert.match(api, /Cache-Control.*private, no-store/);
  assert.doesNotMatch(api, /localStorage|user_metadata|SUPABASE_SERVICE_ROLE_KEY.{0,80}return/i);
});

test("evidence records expose traceability fields and are explicitly pending clinical review", async () => {
  const evidence = JSON.parse(await read("../exercise/evidence.json"));
  assert.equal(evidence.clinicalReview, "pending");
  assert.equal(evidence.items.length, 2);
  for (const item of evidence.items) {
    for (const key of ["citation", "url", "population", "intervention", "result", "limitations", "reviewStatus"]) assert.ok(item[key], `${item.id} missing ${key}`);
    assert.equal(item.reviewStatus, "bibliographic facts checked; professional clinical review pending");
  }
  assert.equal(evidence.items[0].recommendation, "Conditional recommendation in favour of use; low certainty evidence.");
});

test("PWA scope is isolated and worker only caches local shell GET requests", async () => {
  const manifest = JSON.parse(await read("../exercise/manifest.webmanifest"));
  const worker = await read("../exercise/sw.js");
  assert.equal(manifest.scope, "/exercise/");
  assert.equal(manifest.start_url, "/exercise/");
  assert.match(worker, /url\.pathname\.startsWith\("\/exercise\/"\)/);
  assert.match(worker, /request\.method !== "GET"/);
  assert.doesNotMatch(worker, /functions\/v1|supabase\.co/);
});

test("free library entry links to the standalone exercise app", async () => {
  const gratis = await read("../gratis/index.html");
  assert.match(gratis, /href="\/exercise\/"/);
  assert.match(gratis, /KineCheck Exercise/);
  assert.match(gratis, /Prescripción del ejercicio basada en evidencia científica/);
  assert.match(gratis, /Explorar aplicación/);
});
