import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Academy conserva el contrato DOM de inicialización y sus listeners directos", async () => {
  const [index, core, shell] = await Promise.all([
    read("academy/index.html"),
    read("academy/academy-v39.js"),
    read("academy/academy-kinecheck-v4.js"),
  ]);

  const selectors = new Map(
    [...core.matchAll(/const\s+(\w+)\s*=\s*\$\("([^"]+)"\);/g)]
      .map((match) => [match[1], match[2]]),
  );
  const directListenerBindings = [
    ...new Set([...core.matchAll(/^(\w+)\.addEventListener\(/gm)].map((match) => match[1])),
  ].filter((binding) => !["document", "window"].includes(binding));

  assert.equal(
    selectors.get("searchInput"),
    "#library-search",
    "El buscador de Academy debe usar el ID publicado por academy/index.html.",
  );
  assert.equal(
    selectors.get("activeCount"),
    "#active-license-count",
    "El resumen de licencias debe usar el ID publicado por Academy.",
  );
  assert.match(
    core,
    /if\s*\(currentYear\)\s*currentYear\.textContent/,
    "El año del pie es opcional y no debe detener Academy cuando el elemento no existe.",
  );
  assert.match(shell, /\$\("\[data-kc-home-apps-grid\]"\)/);
  assert.match(shell, /\$\("\[data-kc-home-courses-grid\]"\)/);

  for (const binding of directListenerBindings) {
    const selector = selectors.get(binding);
    assert.ok(selector, `${binding} registra un listener directo sin selector DOM verificable.`);
    assert.match(selector, /^#[A-Za-z][\w-]*$/, `${binding} debe apuntar a un ID estable.`);
    const id = selector.slice(1);
    assert.match(
      index,
      new RegExp(`\\bid=["']${id}["']`),
      `${binding} apunta a ${selector}, pero ese elemento no existe en academy/index.html.`,
    );
  }
});
