import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeContactUrl, normalizeProfile, toLocalISO, demoIdentifier } from '../horas-disponibles/demo/demo-core.mjs';

const base = {
  public_name: 'Alex Demo', profession: 'Kinesiólogo/a', specialty: 'Musculoesquelética',
  region: 'Región Metropolitana', comuna: 'Providencia', location_label: 'Sector Plaza Demo',
  modality: 'Presencial', exercise_type: 'independent', institution_name: '',
  contact_type: 'whatsapp', contact_value: '+56912345678',
};

test('profile normalization accepts only the demo contact mode and bounded public fields', () => {
  const normalized = normalizeProfile(base);
  assert.equal(normalized.contact_type, 'whatsapp');
  assert.equal(normalized.published, true);
  assert.equal(normalized.institution_name, null);
  assert.throws(() => normalizeProfile({ ...base, contact_value: 'javascript:alert(1)' }), /WhatsApp ficticio/);
  assert.throws(() => normalizeProfile({ ...base, modality: 'unknown' }), /modalidad válida/);
});

test('institutional channel requires HTTPS; userinfo and script URLs are rejected', () => {
  const institutional = { ...base, exercise_type: 'institutional', institution_name: 'Centro Demo', contact_type: 'institution_website', contact_value: 'https://agenda.example.cl/reservar' };
  assert.equal(normalizeProfile(institutional).contact_type, 'institution_website');
  assert.throws(() => normalizeProfile({ ...institutional, contact_value: 'javascript:alert(1)' }), /HTTPS/);
  assert.throws(() => normalizeProfile({ ...institutional, contact_value: 'https://user:pass@example.cl' }), /HTTPS/);
});

test('WhatsApp link contains selected Santiago date and time and requires a patient click', () => {
  const selected = new Date('2030-01-14T17:30:00.000Z');
  const link = new URL(makeContactUrl(base, selected));
  assert.equal(link.origin, 'https://wa.me');
  assert.equal(link.pathname, '/56912345678');
  assert.match(link.searchParams.get('text'), /14 de enero de 2030/);
  assert.match(link.searchParams.get('text'), /14:30/);
  assert.match(link.searchParams.get('text'), /no genera una reserva real/);
});

test('institutional URL opens the configured HTTPS booking channel', () => {
  const profile = { ...base, exercise_type: 'institutional', institution_name: 'Centro Demo', contact_type: 'institution_website', contact_value: 'https://agenda.example.cl/book' };
  assert.equal(makeContactUrl(profile, '2030-01-14T17:30:00.000Z'), profile.contact_value);
});

test('slot input must be a valid future local date and time', () => {
  assert.match(toLocalISO('2030-01-14', '14:30'), /^2030-/);
  assert.throws(() => toLocalISO('2020-01-14', '14:30'), /futura/);
  assert.throws(() => toLocalISO('2030-13-45', '99:00'), /existentes/);
});

test('demo identifiers use a recognizable prefix and random hexadecimal token', () => {
  assert.match(demoIdentifier(new Uint8Array([0, 1, 15, 255])), /^DEMO-00010FFF$/);
});

test('demo configuration points only at staging and public HTML uses DOM-built text, not interpolated HTML', async () => {
  const [app, migration, headers] = await Promise.all([
    readFile(new URL('../horas-disponibles/demo/demo.js', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261023200836_hours_available_demo_isolated.sql', import.meta.url), 'utf8'),
    readFile(new URL('../_headers', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /https:\/\/mhnqtyvwxytppekktvxb\.supabase\.co/);
  assert.doesNotMatch(app, /eqhcdclyeoapmqtlduwf/);
  assert.match(app, /textContent = text/);
  assert.match(migration, /force row level security/i);
  assert.match(migration, /grant select \([\s\S]*\) on public\.kc_demo_health_profiles to anon/i);
  assert.doesNotMatch(migration, /service_role/i);
  assert.match(headers, /horas-disponibles\/demo\/\*[\s\S]*X-Robots-Tag: noindex, nofollow[\s\S]*connect-src 'self' https:\/\/mhnqtyvwxytppekktvxb\.supabase\.co/);
});

test('implicit confirmation sessions hydrate the Supabase user id before owner-scoped writes', async () => {
  const app = await readFile(new URL('../horas-disponibles/demo/demo.js', import.meta.url), 'utf8');
  assert.match(app, /auth\/v1\/user/);
  assert.match(app, /async function hydrateSessionUser\(\)/);
  assert.match(app, /if \(!state\.session\?\.user\?\.id\) throw new Error\('La sesión no tiene una identidad válida/);
});
