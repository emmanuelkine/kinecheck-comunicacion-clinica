import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../horas-disponibles/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../horas-disponibles/app.js', import.meta.url), 'utf8');
const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const migration = fs.readdirSync(migrationsDir).filter(name => name.startsWith('20261029120'))
  .sort().map(name => fs.readFileSync(new URL(name, migrationsDir), 'utf8')).join('\n');

test('professional declaration is unchecked by default and matches the approved text', () => {
  assert.match(html, /id="responsibilityAccepted" type="checkbox" required(?![^>]*checked)/);
  assert.match(html, /Declaro bajo mi responsabilidad que toda la información que proporciono y publico en KineCheck es verídica, exacta y se encuentra actualizada/);
  assert.match(html, /Declaro contar con las habilitaciones legales correspondientes para ejercer mi profesión/);
  assert.match(html, /mantener actualizadas o retirar las horas que dejen de estar disponibles/);
  assert.doesNotMatch(html, /profileRegistry|Número de registro profesional/);
});

test('client records acceptance under authenticated user and never supplies its timestamp', () => {
  assert.match(app, /kc_health_responsibility_acceptances/);
  assert.match(app, /user_id:user\.id,accepted:true,declaration_version:DECLARATION_VERSION/);
  assert.doesNotMatch(app, /accepted_at\s*:/);
  assert.match(app, /if\(!\$\('responsibilityAccepted'\)\.checked\)/);
});

test('database stamps immutable version and time and gates active slot writes', () => {
  assert.match(migration, /auth\.uid\(\) is null or new\.user_id is distinct from auth\.uid\(\)/);
  assert.match(migration, /new\.declaration_version\s*:=\s*'2026-10-29-v1'/);
  assert.match(migration, /new\.accepted_at\s*:=\s*statement_timestamp\(\)/);
  assert.match(migration, /La aceptación es un registro inmutable/);
  assert.match(migration, /before insert or update of status,\s*professional_id on public\.kc_health_slots/);
  assert.match(migration, /declaration_version\s*=\s*'2026-10-29-v1'/);
});

test('publication still requires the pre-existing independent verification gate', () => {
  assert.match(app, /profile\?\.verification_status!=='verified'/);
  assert.match(migration, /aceptación y verificación independiente vigente/);
  assert.match(html, /KineCheck no afirma haber comprobado credenciales que no haya validado por una fuente independiente/);
});
