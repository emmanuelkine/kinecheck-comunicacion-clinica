import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const pages = [
  ['index.html','https://kinecheck.cl/'],
  ['gratis/index.html','https://kinecheck.cl/gratis/'],
  ['gratis/profesionales/index.html','https://kinecheck.cl/gratis/profesionales/'],
  ['gratis/pacientes/index.html','https://kinecheck.cl/gratis/pacientes/'],
  ['campus/index.html','https://kinecheck.cl/campus/'],
  ['evidencia-msk/index.html','https://kinecheck.cl/evidencia-msk/']
];
test('Public pages have an individual canonical, description and title', () => {
  for (const [path, canonical] of pages) {
    const html = read(path);
    assert.match(html, /<title>[^<]+<\/title>/i, path + ': title');
    assert.match(html, /<meta\s+name="description"/i, path + ': description');
    assert.ok(html.includes('rel="canonical" href="' + canonical + '"'), path + ': canonical');
    assert.ok(html.includes('name="twitter:card"'), path + ': social card');
  }
});
test('Public libraries are advertised in sitemap and not blocked by robots.txt', () => {
  const sitemap = read('sitemap.xml');
  const robots = read('robots.txt');
  for (const [path, canonical] of pages) {
    assert.ok(sitemap.includes('<loc>' + canonical + '</loc>'), path + ': sitemap');
  }
  assert.doesNotMatch(robots, /Disallow:\s*\/gratis\//i);
});
test('Free library navigation links to both audiences', () => {
  const html = read('gratis/index.html');
  assert.ok(html.includes('href="/gratis/profesionales/"'));
  assert.ok(html.includes('href="/gratis/pacientes/"'));
});
