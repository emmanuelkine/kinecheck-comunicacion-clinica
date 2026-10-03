import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");

const lab = read("lab/index.html");
assert.match(lab, /En preparación/i);
assert.doesNotMatch(lab, /<script\s+src="\.\/app\.js"/i);
assert.match(lab, /noindex,nofollow/i);

const exercise = read("productos/ejercicio-terapeutico/index.html");
assert.match(exercise, /Carga académica auditada: 6 h/);
assert.match(exercise, /15 ítems/);
assert.match(exercise, /80 %/);
assert.match(exercise, /course-certification-status-v1\.js\?v=20261003-dashboard1/);

const cert = read("productos/course-certification-status-v1.js");
assert.match(cert, /"ejercicio-terapeutico": "Ejercicio Terapéutico"/);
assert.doesNotMatch(cert, /"banderas-clinicas"/);
assert.match(cert, /OTEC en preparación/);
assert.match(cert, /no es SENCE/i);

const academy = read("academy/academy-v39.js");
assert.match(academy, /course\.status === "preparing" \? "Versión en desarrollo" : "Acceso KineCheck"/);

const academyHtml = read("academy/index.html");
const versionMatches = [...academyHtml.matchAll(/20261003-dashboard-closeout1/g)];
assert.ok(versionMatches.length >= 15, "Academy direct assets must share the new cache version");
assert.doesNotMatch(academyHtml, /20261002-final-assessment1/);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /productos\/dolor-musculoesqueletico\//);
assert.match(sitemap, /productos\/ejercicio-terapeutico\//);

const pack = read("docs/academic/programas-otec/programas-kinecheck-v1-2026-10-01.md");
assert.match(pack, /ocho cursos/i);
assert.match(pack, /# 8\. Ejercicio Terapéutico/);
assert.match(pack, /certificación OTEC permanecerá desactivada/i);

console.log("KineCheck dashboard closeout source checks: OK");
