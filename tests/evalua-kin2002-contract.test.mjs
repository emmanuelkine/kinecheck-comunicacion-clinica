import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ui = readFileSync(new URL('../evalua/kin2002/index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../evalua/kin2002/evalua.js', import.meta.url), 'utf8');
const evalua = readFileSync(new URL('../evalua/index.html', import.meta.url), 'utf8');

test('KIN2002 pilot is accessible from Evalúa without changing existing public beta', () => {
  assert.match(evalua, /href="\.\/kin2002\/"/);
  assert.match(ui, /KINECHECK EVALÚA/);
  for (const id of ['sim1', 'sim2', 'rep1', 'rep2', 'process', 'reset', 'export']) {
    assert.match(ui, new RegExp('id="' + id + '"'));
  }
});

test('KIN2002 pilot does not store or transmit student records', () => {
  assert.doesNotMatch(js, /\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|WebSocket)\b/);
  // The OOXML namespace URL is a schema identifier, not a network request.
  assert.doesNotMatch(js, /(?:navigator\.sendBeacon|\bfetch\s*\(|\bXMLHttpRequest\s*\()/);
  assert.match(js, /new DOMParser\(\)/);
  assert.match(js, /URL\.createObjectURL/);
  assert.match(ui, /no envío de datos al servidor/);
  assert.match(ui, /no se han migrado usuarios/i);
});

test('Only eight valid rubric levels result in scores; never replace missing with zero', () => {
  assert.match(js, /levels\.length\s*!==\s*8/);
  assert.match(js, /levels\.every\(validLevel\)/);
  assert.match(js, /const weightsSim\s*=\s*\[8,16,16,12,20,12,8,8\]/);
  assert.match(js, /const weightsReport\s*=\s*\[20,20,15,10,15,10,5,5\]/);
  assert.match(js, /!b\[0\]\.approved/);
  assert.match(js, /a\.length>1/);
  assert.match(js, /b\.length>1/);
});

test('CSV export neutralizes spreadsheet formulas', () => {
  assert.match(js, /function csvCell\(value\)/);
  assert.match(js, /\[=\+@-\]/);
  assert.match(js, /replaceAll\('"',\s*'""'\)/);
});
