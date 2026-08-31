import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [workflow, plan, managedServices, edgeInventory] = await Promise.all([
  read(".github/workflows/kinecheck-disaster-recovery-v2.yml"),
  read("docs/continuidad/plan-recuperacion-kinecheck.md"),
  read("docs/continuidad/recuperacion-servicios-administrados.md"),
  read("docs/continuidad/inventario-edge-functions-2026-08-30.md"),
]);

const requireTokens = (source, tokens, label) => {
  for (const token of tokens) {
    assert.ok(source.includes(token), `${label}: falta ${token}`);
  }
};

requireTokens(workflow, [
  "image: postgres:17",
  "postgres:17",
  "pg_dump",
  "--schema=public",
  "Inventory external dependencies in public dump",
  "kinecheck-public-schema.sql",
  "public-external-schema-references.txt",
  "public-external-fks.tsv",
  "pg_restore",
  "--exit-on-error",
  "restored-counts.json",
  "manifest.json",
  '"storage_objects_included": false',
  '"auth_users_included": false',
  "-aes-256-cbc",
  "-pbkdf2",
  "-iter 250000",
  "openssl enc -d",
  "expected_checksum",
  "actual_checksum",
  "Confirm plaintext removal",
  "retention-days: 30",
], "workflow v2");

for (const relation of [
  "course_access",
  "hotmart_product_grants",
  "hotmart_purchases",
  "hotmart_webhook_events",
  "kinecheck_access_policy",
  "platform_feature_flags",
  "platform_cases",
  "platform_user_preferences",
  "kinecheck_legal_acceptances",
  "kinecheck_support_requests",
  "kinecheck_restore_drills",
]) {
  assert.ok(workflow.includes(relation), `workflow v2: falta tabla crítica ${relation}`);
}

for (const routine of [
  "process_hotmart_event",
  "deactivate_expired_course_access",
  "run_kinecheck_config_restore_drill",
]) {
  assert.ok(workflow.includes(routine), `workflow v2: falta función crítica ${routine}`);
}

const restoreBlock = workflow.slice(
  workflow.indexOf("- name: Restore dump into temporary PostgreSQL 17"),
  workflow.indexOf("- name: Validate restored application structure"),
);
assert.ok(restoreBlock.length > 0, "workflow v2: falta bloque de restauración PostgreSQL 17");
requireTokens(restoreBlock, [
  "postgres:17",
  "psql",
  "--dbname=kinecheck_restore",
  "--set=ON_ERROR_STOP=1",
  "DROP SCHEMA IF EXISTS public CASCADE;",
  "CREATE SCHEMA auth;",
  "CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);",
  "CREATE FUNCTION auth.uid() RETURNS uuid",
  "CREATE SCHEMA extensions;",
  "CREATE EXTENSION pgcrypto WITH SCHEMA extensions;",
  "restore-role-stubs.sql",
  "--section=\"$section\"",
  "auth-user-stub-seed.sql",
  "--section=post-data",
  "c.convalidated",
  "where email is not null",
  "pg_restore",
  "--exit-on-error",
], "restauración PostgreSQL 17");
assert.ok(
  restoreBlock.indexOf("DROP SCHEMA IF EXISTS public CASCADE;") < restoreBlock.indexOf("pg_restore"),
  "la base temporal debe quedar sin public antes de pg_restore",
);
assert.ok(
  restoreBlock.indexOf("--section=\"$section\"") < restoreBlock.indexOf("auth-user-stub-seed.sql") &&
    restoreBlock.indexOf("auth-user-stub-seed.sql") < restoreBlock.indexOf("--section=post-data"),
  "los IDs placeholder deben insertarse después de los datos y antes de restaurar constraints",
);
assert.doesNotMatch(
  restoreBlock,
  /--disable-triggers/,
  "la restauración no debe omitir validación de constraints mediante --disable-triggers",
);
assert.equal(
  (restoreBlock.match(/pg_restore/g) ?? []).length,
  2,
  "la restauración debe ejecutar pg_restore por pre-data/data y luego post-data",
);
assert.equal(
  (restoreBlock.match(/--exit-on-error/g) ?? []).length,
  2,
  "cada invocación de pg_restore debe conservar --exit-on-error",
);

const dependencyBlock = workflow.slice(
  workflow.indexOf("- name: Inventory external dependencies in public dump"),
  workflow.indexOf("- name: Restore dump into temporary PostgreSQL 17"),
);
requireTokens(dependencyBlock, [
  "pg_restore",
  "--schema-only",
  "source-nonpublic-schemas.txt",
  "public-external-schema-references.txt",
  "public-external-object-references.txt",
  "expected-external-objects.txt",
  "printf '%s\\n' auth extensions",
  "auth.users",
  "auth.uid",
  "extensions.digest",
  "restore-roles.txt",
  "anon|authenticated|service_role",
  "public-external-fks.tsv",
  "target_schema",
  'target_schema" != "auth"',
  'target_table" != "users"',
  'target_column" != "id"',
  'target_type" != "uuid"',
  'key_width" != "1"',
], "inventario de dependencias externas");

assert.doesNotMatch(workflow, /set\s+-[^\n]*x/, "workflow v2 no debe habilitar trazas de shell");
for (const line of workflow.split(/\r?\n/)) {
  if (/echo/.test(line) && /\$\{?(?:SUPABASE_DB_URL|BACKUP_ENCRYPTION_PASSPHRASE)/.test(line)) {
    assert.match(line, /::add-mask::/, "workflow v2 no debe imprimir secretos");
  }
}

const uploadBlock = workflow.slice(
  workflow.indexOf("- name: Upload encrypted recovery package"),
  workflow.indexOf("- name: Write workflow summary"),
);
assert.ok(uploadBlock.length > 0, "workflow v2: falta bloque de upload");
assert.doesNotMatch(
  uploadBlock,
  /kinecheck-public\.dump(?:\s|$)/m,
  "el artefacto no debe incluir el dump sin cifrar",
);
assert.doesNotMatch(
  uploadBlock,
  /kinecheck-public\.dump\.sha256/,
  "el artefacto no debe incluir la huella del dump sin cifrar",
);
for (const transient of [
  "kinecheck-public-schema.sql",
  "source-nonpublic-schemas.txt",
  "public-external-schema-references.txt",
  "expected-external-schemas.txt",
  "public-external-object-references.txt",
  "expected-external-objects.txt",
  "restore-roles.txt",
  "restore-role-stubs.sql",
  "public-external-fks.tsv",
  "auth-user-stub-seed.sql",
]) {
  assert.ok(
    workflow.includes(`test ! -e disaster-recovery/${transient}`),
    `workflow v2 debe verificar la eliminación de ${transient}`,
  );
  assert.ok(
    !uploadBlock.includes(transient),
    `el artefacto no debe incluir ${transient}`,
  );
}

requireTokens(plan, [
  "KineCheck Disaster Recovery v2",
  "PostgreSQL 17",
  "kinecheck-public.dump.enc",
  "restored-counts.json",
  "Storage",
  "Auth",
  "no se puede cerrar",
], "plan de recuperación");

requireTokens(managedServices, [
  "course-assets",
  "Storage",
  "Auth",
  "Edge Functions",
  "Cloudflare",
  "DNS",
  "nombres de secretos",
  "18",
  "8",
  "Diez",
], "checklist de servicios administrados");

requireTokens(edgeInventory, [
  "18 Edge Functions `ACTIVE`",
  "ocho tienen fuente",
  "diez no tienen fuente",
  "automation-control",
  "beta-password-once",
  "dolor-lumbar-course-key",
  "evidence-access",
  "evidence-content",
  "pain-content",
  "pain-hotmart-webhook",
  "platform-login",
  "student-semester-intake",
  "support-request",
  "No copiar el cuerpo desde producción",
  "No crear branches/proyectos Supabase con costo",
  "fuente autorizada y trazable",
], "inventario de Edge Functions");

console.log("Disaster-recovery contract: PASS");
