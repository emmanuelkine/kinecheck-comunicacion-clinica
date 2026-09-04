import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Recupera remains non-purchasable across Academy and public help", async () => {
  const [academyConfig, help, recovery] = await Promise.all([
    read("academy/config.js"),
    read("ayuda/index.html"),
    read("recupera/index.html"),
  ]);

  assert.match(academyConfig, /slug:\s*"kinecheck-recupera"[\s\S]*?status:\s*"preparing"/);
  assert.match(recovery, /PRÓXIMAMENTE/);
  assert.match(recovery, /No se encuentra disponible para compra ni para registro de datos/);
  assert.doesNotMatch(recovery, /pay\.hotmart\.com/i);

  assert.match(help, /KineCheck Recupera permanece Próximamente y no admite compras nuevas/);
  assert.doesNotMatch(help, /KineCheck Recupera tiene una vigencia de 3 meses para compras nuevas/);
});
