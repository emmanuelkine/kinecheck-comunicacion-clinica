import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const processMigrationUrl = new URL(
  "../supabase/migrations/20260729_process_hotmart_event.sql",
  import.meta.url,
);
const accessTermsMigrationUrl = new URL(
  "../supabase/migrations/20260804_access_terms.sql",
  import.meta.url,
);
const hardeningMigrationUrl = new URL(
  "../supabase/migrations/20260814152228_harden_hotmart_access_consistency.sql",
  import.meta.url,
);
const adminScriptUrl = new URL("../admin/admin.js", import.meta.url);
const automationMigrationUrl = new URL(
  "../supabase/migrations/20260814184550_version_critical_automation_functions.sql",
  import.meta.url,
);
const productGrantsSeedUrl = new URL(
  "../supabase/seeds/20260729_hotmart_product_grants.sql",
  import.meta.url,
);
const webhookUrl = new URL(
  "../supabase/functions/hotmart-webhook/index.ts",
  import.meta.url,
);
const approvedPurchasePageUrl = new URL(
  "../academy/compra-aprobada.html",
  import.meta.url,
);

const schema = String.raw`
  create role anon;
  create role authenticated;
  create role service_role;

  create table public.hotmart_product_grants (
    product_id bigint not null,
    course_slug text not null,
    product_name text,
    created_at timestamptz not null default now(),
    access_term_months smallint,
    primary key (product_id, course_slug)
  );

  create table public.hotmart_webhook_events (
    event_id text primary key,
    event_name text not null,
    transaction_id text,
    received_at timestamptz not null default now()
  );

  create table public.hotmart_purchases (
    transaction_id text not null,
    product_id bigint not null,
    buyer_email text not null,
    buyer_name text,
    status text not null,
    event_name text not null,
    purchased_at timestamptz,
    last_event_at timestamptz not null default now(),
    raw_event_id text,
    primary key (transaction_id, product_id)
  );
  grant delete on public.hotmart_purchases to service_role;

  create table public.course_access (
    email text not null,
    course_slug text not null,
    active boolean not null default false,
    hotmart_product_id text,
    transaction_id text,
    last_event text,
    updated_at timestamptz not null default now(),
    purchase_date timestamptz,
    warranty_date timestamptz,
    product_ucode text,
    access_source text not null default 'manual',
    last_event_at timestamptz,
    access_expires_at timestamptz,
    access_term_months smallint,
    access_grandfathered boolean not null default false,
    primary key (email, course_slug)
  );

  create table public.kinecheck_public_events (
    event_name text not null,
    occurred_at timestamptz not null default now(),
    product_slug text
  );
  create table public.kinecheck_support_requests (
    status text not null default 'open',
    priority text not null default 'normal',
    created_at timestamptz not null default now()
  );
  create table public.beta_applications (
    status text not null default 'new',
    triage_band text not null default 'pending',
    created_at timestamptz not null default now()
  );
  create table public.kinecheck_reconciliation_issues (
    status text not null default 'open'
  );
  create table public.kinecheck_outbox (
    recipient text not null,
    status text not null default 'queued'
  );
  create table public.kinecheck_notifications (
    read_at timestamptz
  );
  create table public.kinecheck_daily_metrics (
    metric_date date primary key,
    payload jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
`;

async function makeDatabase(t, { hardened = true } = {}) {
  const db = new PGlite();
  t.after(async () => db.close());
  await db.exec(schema);
  await db.exec(await readFile(accessTermsMigrationUrl, "utf8"));
  await db.exec(await readFile(processMigrationUrl, "utf8"));
  if (hardened) {
    await db.exec(await readFile(hardeningMigrationUrl, "utf8"));
  }
  await db.exec(`
    insert into public.hotmart_product_grants (product_id, course_slug)
    values (101, 'course-a'), (202, 'course-b');
  `);
  return db;
}

async function event(db, {
  id,
  name,
  transaction,
  product = 101,
  email = "buyer@customer.test",
  status,
  at,
}) {
  const result = await db.query(
    `select public.process_hotmart_event(
      $1, $2, $3, $4, $5, 'QA Buyer', $6, $7, $8
    ) as result`,
    [id, name, transaction, product, email, status, at, at],
  );
  return result.rows[0].result;
}

async function access(db, email = "buyer@customer.test", slug = "course-a") {
  const result = await db.query(
    `select active, transaction_id, access_source, last_event
     from public.course_access
     where email=$1 and course_slug=$2`,
    [email, slug],
  );
  return result.rows[0] ?? null;
}

test("duplicate webhook and stale approval cannot reactivate a refunded purchase", async (t) => {
  const db = await makeDatabase(t);
  assert.equal(await event(db, {
    id: "approve-1", name: "PURCHASE_APPROVED", transaction: "tx-1",
    status: "active", at: "2026-01-02T10:00:00Z",
  }), "active");

  assert.equal(await event(db, {
    id: "approve-1", name: "PURCHASE_REFUNDED", transaction: "tx-1",
    status: "revoked", at: "2026-01-03T10:00:00Z",
  }), "duplicate");
  assert.equal((await access(db)).active, true);

  assert.equal(await event(db, {
    id: "refund-1", name: "PURCHASE_REFUNDED", transaction: "tx-1",
    status: "revoked", at: "2026-01-04T10:00:00Z",
  }), "revoked");
  assert.equal((await access(db)).active, false);

  assert.equal(await event(db, {
    id: "approve-stale", name: "PURCHASE_APPROVED", transaction: "tx-1",
    status: "active", at: "2026-01-03T10:00:00Z",
  }), "stale_event");
  assert.equal((await access(db)).active, false);
});

test("approval after an earlier refund restores the same transaction", async (t) => {
  const db = await makeDatabase(t);
  await event(db, {
    id: "refund-first", name: "PURCHASE_REFUNDED", transaction: "tx-order",
    status: "revoked", at: "2026-02-01T10:00:00Z",
  });
  await event(db, {
    id: "approval-later", name: "PURCHASE_APPROVED", transaction: "tx-order",
    status: "active", at: "2026-02-01T10:01:00Z",
  });
  assert.deepEqual(await access(db), {
    active: true,
    transaction_id: "tx-order",
    access_source: "hotmart",
    last_event: "PURCHASE_APPROVED",
  });
});

test("unknown product is recorded for reconciliation but grants no access", async (t) => {
  const db = await makeDatabase(t);
  assert.equal(await event(db, {
    id: "unknown-product", name: "PURCHASE_APPROVED", transaction: "tx-unknown",
    product: 9999999, status: "active", at: "2026-02-02T10:00:00Z",
  }), "unmapped_product");

  const purchases = await db.query(
    "select status from public.hotmart_purchases where transaction_id='tx-unknown'",
  );
  assert.deepEqual(purchases.rows, [{ status: "active" }]);
  assert.equal(await access(db), null);
});

test("one pack approval grants every mapped course", async (t) => {
  const db = await makeDatabase(t);
  await db.exec(`
    insert into public.hotmart_product_grants (product_id, course_slug)
    values (303, 'pack-course-a'), (303, 'pack-course-b');
  `);

  assert.equal(await event(db, {
    id: "pack-approved", name: "PURCHASE_APPROVED", transaction: "tx-pack",
    product: 303, status: "active", at: "2026-02-03T10:00:00Z",
  }), "active");

  const grants = await db.query(`
    select course_slug, active, transaction_id
    from public.course_access
    where transaction_id='tx-pack'
    order by course_slug
  `);
  assert.deepEqual(grants.rows, [
    { course_slug: "pack-course-a", active: true, transaction_id: "tx-pack" },
    { course_slug: "pack-course-b", active: true, transaction_id: "tx-pack" },
  ]);
});

test("approval retry with a new event id never extends the same transaction", async (t) => {
  const db = await makeDatabase(t);
  await db.exec(`
    update public.kinecheck_access_policy
    set effective_at='2025-01-01T00:00:00Z', enabled=true;
    update public.hotmart_product_grants
    set access_term_months=12
    where product_id=101 and course_slug='course-a';
  `);

  await event(db, {
    id: "retry-approval-1", name: "PURCHASE_APPROVED", transaction: "tx-retry",
    status: "active", at: "2026-02-04T10:00:00Z",
  });
  const before = await db.query(`
    select access_expires_at, access_term_months
    from public.course_access where transaction_id='tx-retry'
  `);

  await event(db, {
    id: "retry-approval-2", name: "PURCHASE_COMPLETE", transaction: "tx-retry",
    status: "active", at: "2026-02-05T10:00:00Z",
  });
  const after = await db.query(`
    select access_expires_at, access_term_months
    from public.course_access where transaction_id='tx-retry'
  `);
  assert.deepEqual(after.rows, before.rows);
});

test("cancel, expiry, refund and chargeback revoke the final active purchase", async (t) => {
  for (const eventName of [
    "PURCHASE_CANCELED",
    "PURCHASE_EXPIRED",
    "PURCHASE_REFUNDED",
    "PURCHASE_CHARGEBACK",
  ]) {
    const db = await makeDatabase(t);
    await event(db, {
      id: `${eventName}-approved`, name: "PURCHASE_APPROVED",
      transaction: `tx-${eventName}`, status: "active",
      at: "2026-02-06T10:00:00Z",
    });
    await event(db, {
      id: `${eventName}-revoked`, name: eventName,
      transaction: `tx-${eventName}`, status: "revoked",
      at: "2026-02-07T10:00:00Z",
    });
    const row = await access(db);
    assert.equal(row.active, false, eventName);
    assert.equal(row.last_event, eventName, eventName);
  }
});

test("production grant snapshot contains 12 products and only two documented NULL terms", async (t) => {
  const db = new PGlite();
  t.after(async () => db.close());
  await db.exec(`
    create table public.hotmart_product_grants (
      product_id bigint not null,
      course_slug text not null,
      product_name text,
      created_at timestamptz not null default now(),
      access_term_months smallint,
      primary key (product_id, course_slug)
    );
  `);
  await db.exec(await readFile(productGrantsSeedUrl, "utf8"));

  const counts = await db.query(`
    select count(*)::int as grants, count(distinct product_id)::int as products
    from public.hotmart_product_grants
  `);
  assert.deepEqual(counts.rows[0], { grants: 14, products: 12 });

  const indefinite = await db.query(`
    select product_id::text as product_id, course_slug
    from public.hotmart_product_grants
    where access_term_months is null
    order by product_id
  `);
  assert.deepEqual(indefinite.rows, [
    { product_id: "8289351", course_slug: "kinecheck-escalas" },
    { product_id: "8289677", course_slug: "kinecheck-pruebas-especiales" },
  ]);
});

test("webhook handles unmapped products without logging PII or secrets", async () => {
  const source = await readFile(webhookUrl, "utf8");
  assert.match(source, /result === "unmapped_product"[\s\S]*?status: "unmapped_product"[\s\S]*?422/);
  assert.doesNotMatch(source, /console\.error\([\s\S]{0,260}\bbuyerEmail\s*:/);
  assert.doesNotMatch(source, /console\.error\([\s\S]{0,260}\btransactionId\s*:/);
  assert.doesNotMatch(source, /console\.error\([\s\S]{0,260}(receivedHottok|expectedHottok)/);
  assert.doesNotMatch(source, /console\.error\([\s\S]{0,260}processError\.message/);
  assert.doesNotMatch(source, /message:\s*processError\.message/);
});

test("approved purchase returns to Academy for license refresh", async () => {
  const page = await readFile(approvedPurchasePageUrl, "utf8");
  assert.match(page, /content="4;url=\.\/\?purchase=approved"/);
  assert.match(page, /href="\.\/\?purchase=approved"/);
  assert.match(page, /mismo correo/i);
  assert.match(page, /No compres nuevamente/i);
  assert.match(page, /Actualizar mis licencias/i);
  assert.doesNotMatch(page, /platform\/|pages\.dev/);
});

async function lateRevocationScenario(t, eventName, { hardened }) {
  const db = await makeDatabase(t, { hardened });
  await event(db, {
    id: "a-approved", name: "PURCHASE_APPROVED", transaction: "tx-old",
    status: "active", at: "2026-03-01T10:00:00Z",
  });
  await event(db, {
    id: "b-approved", name: "PURCHASE_APPROVED", transaction: "tx-new",
    status: "active", at: "2026-03-02T10:00:00Z",
  });
  await event(db, {
    id: `a-${eventName.toLowerCase()}`, name: eventName, transaction: "tx-old",
    status: "revoked", at: "2026-03-03T10:00:00Z",
  });

  return { db, row: await access(db) };
}

test("late refund or chargeback of purchase A cannot revoke newer purchase B", async (t) => {
  for (const eventName of ["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK"]) {
    const before = await lateRevocationScenario(t, eventName, {
      hardened: false,
    });
    assert.deepEqual(before.row, {
      active: false,
      transaction_id: "tx-old",
      access_source: "hotmart",
      last_event: eventName,
    }, `${eventName}: the previous implementation reproduces the defect`);

    const after = await lateRevocationScenario(t, eventName, {
      hardened: true,
    });

    assert.deepEqual(after.row, {
      active: true,
      transaction_id: "tx-new",
      access_source: "hotmart",
      last_event: "PURCHASE_APPROVED",
    }, `${eventName}: purchase B remains the source of the active entitlement`);

    const purchases = await after.db.query(
      `select transaction_id, status
       from public.hotmart_purchases
       order by transaction_id`,
    );
    assert.deepEqual(purchases.rows, [
      { transaction_id: "tx-new", status: "active" },
      { transaction_id: "tx-old", status: "revoked" },
    ]);
  }
});

test("refund of the last remaining active purchase revokes access", async (t) => {
  const db = await makeDatabase(t);
  await event(db, {
    id: "a-approved-final", name: "PURCHASE_APPROVED", transaction: "tx-a-final",
    status: "active", at: "2026-03-01T10:00:00Z",
  });
  await event(db, {
    id: "a-refunded-final", name: "PURCHASE_REFUNDED", transaction: "tx-a-final",
    status: "revoked", at: "2026-03-02T10:00:00Z",
  });
  await event(db, {
    id: "b-approved-final", name: "PURCHASE_APPROVED", transaction: "tx-b-final",
    status: "active", at: "2026-03-03T10:00:00Z",
  });
  await event(db, {
    id: "b-refunded-final", name: "PURCHASE_REFUNDED", transaction: "tx-b-final",
    status: "revoked", at: "2026-03-04T10:00:00Z",
  });

  assert.deepEqual(await access(db), {
    active: false,
    transaction_id: "tx-b-final",
    access_source: "hotmart",
    last_event: "PURCHASE_REFUNDED",
  });
});

test("commercial refund cannot overwrite owner, beta or manual QA access", async (t) => {
  for (const [source, lastEvent] of [
    ["owner", "OWNER_ACCESS"],
    ["beta", "BETA_ACCESS_GRANTED"],
    ["manual_test", "MANUAL_QA_GRANTED"],
    ["manual", "HOTMART_AREA_TEST"],
  ]) {
    const db = await makeDatabase(t);
    const email = `${source}@internal.test`;
    await db.query(
      `insert into public.course_access
       (email, course_slug, active, transaction_id, last_event, access_source, last_event_at)
       values ($1, 'course-a', true, $2, $3, $4, now())`,
      [email, `${source}:course-a`, lastEvent, source],
    );
    await event(db, {
      id: `refund-${source}`, name: "PURCHASE_REFUNDED",
      transaction: `tx-${source}`, email, status: "revoked",
      at: "2026-04-01T10:00:00Z",
    });
    const row = await access(db, email);
    assert.equal(row.active, true, source);
    assert.equal(row.access_source, source, source);
    assert.equal(row.last_event, lastEvent, source);
  }
});

test("purchase deletion requires a reason, is audited, and access remains resilient", async (t) => {
  const db = await makeDatabase(t);
  await event(db, {
    id: "survivor-approved", name: "PURCHASE_APPROVED",
    transaction: "tx-survivor", status: "active",
    at: "2026-05-01T10:00:00Z",
  });
  await db.exec(`
    insert into public.course_access
      (email, course_slug, active, transaction_id, last_event,
       access_source, last_event_at)
    values
      ('owner-delete@internal.test', 'course-a', true, 'owner:course-a',
       'OWNER_ACCESS', 'owner', now());
  `);
  await event(db, {
    id: "owner-purchase-approved", name: "PURCHASE_APPROVED",
    transaction: "tx-owner-delete", email: "owner-delete@internal.test",
    status: "active", at: "2026-05-01T10:01:00Z",
  });

  const privilege = await db.query(
    `select has_table_privilege(
       'service_role', 'public.hotmart_purchases', 'DELETE'
     ) as can_delete`,
  );
  assert.equal(privilege.rows[0].can_delete, false);

  await assert.rejects(
    db.exec(`delete from public.hotmart_purchases where transaction_id='tx-survivor'`),
    /DELETE requires an explicit audit reason/,
  );

  const preserved = await db.query(
    `select count(*)::int as total
     from public.hotmart_purchases
     where transaction_id='tx-survivor'`,
  );
  assert.equal(preserved.rows[0].total, 1);

  await db.exec(`
    begin;
    select set_config(
      'kinecheck.hotmart_purchase_delete_reason',
      'QA regression: simulate historical missing row',
      true
    );
    delete from public.hotmart_purchases
    where transaction_id in ('tx-survivor', 'tx-owner-delete');
    commit;
  `);

  const audit = await db.query(
    `select operation, transaction_id, delete_reason, old_status,
            buyer_email_sha256,
            old_row ? 'buyer_email' as snapshot_has_plain_email
     from public.kinecheck_hotmart_purchase_audit
     where transaction_id='tx-survivor'
     order by audit_id desc
     limit 1`,
  );
  assert.deepEqual(audit.rows[0], {
    operation: "DELETE",
    transaction_id: "tx-survivor",
    delete_reason: "QA regression: simulate historical missing row",
    old_status: "active",
    buyer_email_sha256: audit.rows[0].buyer_email_sha256,
    snapshot_has_plain_email: false,
  });
  assert.match(audit.rows[0].buyer_email_sha256, /^[0-9a-f]{64}$/);

  const result = await db.query(
    `select public.has_course_access('course-a', 'buyer@customer.test') as allowed`,
  );
  assert.equal(result.rows[0].allowed, true);

  assert.deepEqual(await access(db, "owner-delete@internal.test"), {
    active: true,
    transaction_id: "owner:course-a",
    access_source: "owner",
    last_event: "OWNER_ACCESS",
  });
});

test("expired commercial access deactivates without affecting owner access", async (t) => {
  const db = await makeDatabase(t);
  await db.exec(`
    update public.kinecheck_access_policy
    set effective_at='2025-01-01T00:00:00Z', enabled=true;
    update public.hotmart_product_grants
    set access_term_months=1
    where product_id=101 and course_slug='course-a';

    insert into public.course_access
      (email, course_slug, active, hotmart_product_id, transaction_id,
       last_event, purchase_date, access_source, last_event_at)
    values
      ('expired@customer.test', 'course-a', true, '101', 'tx-expired',
       'PURCHASE_APPROVED', now() - interval '2 months', 'hotmart',
       now() - interval '2 months'),
      ('owner@internal.test', 'course-a', true, '101', 'owner:course-a',
       'OWNER_ACCESS', now() - interval '2 years', 'owner',
       now() - interval '2 years');
  `);

  const deactivated = await db.query(
    `select public.deactivate_expired_course_access() as total`,
  );
  assert.equal(deactivated.rows[0].total, 1);

  const rows = await db.query(
    `select email, active, last_event, access_expires_at
     from public.course_access order by email`,
  );
  assert.equal(rows.rows[0].email, "expired@customer.test");
  assert.equal(rows.rows[0].active, false);
  assert.equal(rows.rows[0].last_event, "ACCESS_TERM_EXPIRED");
  assert.equal(rows.rows[1].email, "owner@internal.test");
  assert.equal(rows.rows[1].active, true);
  assert.equal(rows.rows[1].access_expires_at, null);
});

test("commercial metrics exclude owner, beta, manual QA and hotmart_test", async (t) => {
  const db = await makeDatabase(t);
  await db.exec(`
    insert into public.hotmart_purchases
      (transaction_id, product_id, buyer_email, status, event_name, last_event_at)
    values
      ('real-active', 101, 'customer@customer.test', 'active', 'PURCHASE_APPROVED', now()),
      ('owner-active', 101, 'owner@internal.test', 'active', 'PURCHASE_APPROVED', now()),
      ('unknown-state', 202, 'unknown@customer.test', 'pending_review', 'PURCHASE_DELAYED', now());

    insert into public.hotmart_webhook_events
      (event_id, event_name, transaction_id)
    values
      ('event-real', 'PURCHASE_APPROVED', 'real-active'),
      ('event-owner', 'PURCHASE_APPROVED', 'owner-active'),
      ('event-missing-purchase', 'PURCHASE_APPROVED', 'deleted-purchase');

    insert into public.course_access
      (email, course_slug, active, transaction_id, last_event, access_source, last_event_at)
    values
      ('customer@customer.test', 'course-a', true, 'real-active', 'PURCHASE_APPROVED', 'hotmart', now()),
      ('owner@internal.test', 'course-a', true, 'owner:course-a', 'OWNER_ACCESS', 'owner', now()),
      ('beta@internal.test', 'course-b', true, 'beta:course-b', 'BETA_ACCESS_GRANTED', 'beta', now()),
      ('manual@internal.test', 'course-b', true, 'qa:course-b', 'HOTMART_AREA_TEST', 'manual', now());
  `);

  for (let index = 1; index <= 7; index += 1) {
    await db.query(
      `insert into public.hotmart_purchases
       (transaction_id, product_id, buyer_email, status, event_name, last_event_at)
       values ($1, 202, $2, 'revoked', 'PURCHASE_REFUNDED', now())`,
      [`qa-revoked-${index}`, `qa-${index}@example.com`],
    );
    await db.query(
      `insert into public.hotmart_webhook_events
       (event_id, event_name, transaction_id)
       values ($1, 'PURCHASE_REFUNDED', $2)`,
      [`event-qa-refund-${index}`, `qa-revoked-${index}`],
    );
  }

  const result = await db.query(
    `select public.kinecheck_rollup_daily_metrics() as payload`,
  );
  const payload = result.rows[0].payload;
  assert.equal(payload.active_purchases, 2);
  assert.equal(payload.commercial_active_purchases, 1);
  assert.equal(payload.qa_active_purchases, 1);
  assert.equal(payload.active_purchases_total, 2);
  assert.equal(payload.active_purchases_nonproduction, 1);
  assert.equal(payload.revoked_purchases, 7);
  assert.equal(payload.commercial_revoked_purchases, 0);
  assert.equal(payload.qa_revoked_purchases, 7);
  assert.equal(payload.revoked_purchases_total, 7);
  assert.equal(payload.revoked_purchases_nonproduction, 7);
  assert.equal(payload.unclassified_purchases, 1);
  assert.equal(payload.legacy_purchase_metrics_scope, "all_including_qa");
  assert.equal(payload.active_licenses, 4);
  assert.equal(payload.active_licenses_commercial, 1);
  assert.equal(payload.active_licenses_nonproduction, 3);
  assert.equal(payload.purchase_approvals_today, 3);
  assert.equal(payload.commercial_purchase_approvals_today, 1);
  assert.equal(payload.qa_purchase_approvals_today, 1);
  assert.equal(payload.purchase_approvals_today_total, 3);
  assert.equal(payload.purchase_approvals_today_nonproduction, 1);
  assert.equal(payload.purchase_approvals_today_unclassified, 1);
  assert.equal(payload.revocation_events_today, 7);
  assert.equal(payload.commercial_revocation_events_today, 0);
  assert.equal(payload.qa_revocation_events_today, 7);
  assert.equal(payload.revocation_events_today_total, 7);
  assert.equal(payload.revocation_events_today_nonproduction, 7);
  assert.equal(payload.revocation_events_today_unclassified, 0);
});

test("invariant queries expose missing, orphaned, revoked and duplicate states", async (t) => {
  const db = await makeDatabase(t);
  await db.exec(`
    insert into public.hotmart_purchases
      (transaction_id, product_id, buyer_email, status, event_name, last_event_at)
    values
      ('missing-access', 101, 'missing@customer.test', 'active', 'PURCHASE_APPROVED', now()),
      ('revoked-active', 101, 'revoked@customer.test', 'revoked', 'PURCHASE_REFUNDED', now()),
      ('duplicate-product', 101, 'duplicate@customer.test', 'active', 'PURCHASE_APPROVED', now()),
      ('duplicate-product', 202, 'duplicate@customer.test', 'active', 'PURCHASE_APPROVED', now());

    insert into public.course_access
      (email, course_slug, active, transaction_id, hotmart_product_id, last_event, access_source, last_event_at)
    values
      ('orphan@customer.test', 'course-a', true, 'orphan-access', '101', 'PURCHASE_APPROVED', 'hotmart', now()),
      ('revoked@customer.test', 'course-a', true, 'revoked-active', '101', 'PURCHASE_APPROVED', 'hotmart', now());
  `);

  const result = await db.query(`
    with expected as (
      select hp.transaction_id, hp.product_id, lower(hp.buyer_email) email,
             hp.status, g.course_slug
      from public.hotmart_purchases hp
      join public.hotmart_product_grants g on g.product_id=hp.product_id
    )
    select
      (select count(*) from expected e where e.status='active' and not exists (
        select 1 from public.course_access ca
        where lower(ca.email)=e.email and ca.course_slug=e.course_slug and ca.active
      ))::int as active_without_access,
      (select count(*) from public.course_access ca where ca.active
        and lower(ca.access_source) in ('hotmart','hotmart_test') and not exists (
          select 1 from expected e where e.status='active'
            and e.email=lower(ca.email) and e.course_slug=ca.course_slug
        ))::int as access_without_active_purchase,
      (select count(*) from expected e where e.status='revoked' and exists (
        select 1 from public.course_access ca
        where lower(ca.email)=e.email and ca.course_slug=e.course_slug
          and ca.active and ca.transaction_id=e.transaction_id
      ))::int as revoked_with_active_access,
      (select count(*) from (
        select transaction_id from public.hotmart_purchases
        group by transaction_id having count(distinct product_id)>1
      ) d)::int as duplicated_transactions;
  `);

  assert.deepEqual(result.rows[0], {
    active_without_access: 3,
    access_without_active_purchase: 2,
    revoked_with_active_access: 1,
    duplicated_transactions: 1,
  });
});

test("migration is idempotent and never deletes purchase history", async (t) => {
  const db = await makeDatabase(t);
  const migration = await readFile(hardeningMigrationUrl, "utf8");
  assert.doesNotMatch(migration, /delete\s+from\s+public\.hotmart_purchases/i);
  await db.exec(migration);
  const triggers = await db.query(
    `select count(*)::int as total from pg_trigger
     where tgname in (
       'zz_kinecheck_guard_hotmart_access_revocation',
       'aa_kinecheck_require_hotmart_purchase_delete_reason',
       'zz_kinecheck_audit_hotmart_purchase_change'
     )
       and not tgisinternal`,
  );
  assert.equal(triggers.rows[0].total, 3);

  const auditPrivileges = await db.query(
    `select
       has_table_privilege(
         'service_role', 'public.kinecheck_hotmart_purchase_audit', 'SELECT'
       ) as service_can_read,
       has_table_privilege(
         'service_role', 'public.kinecheck_hotmart_purchase_audit', 'UPDATE'
       ) as service_can_update,
       has_table_privilege(
         'service_role', 'public.kinecheck_hotmart_purchase_audit', 'DELETE'
       ) as service_can_delete,
       has_table_privilege(
         'authenticated', 'public.kinecheck_hotmart_purchase_audit', 'SELECT'
       ) as authenticated_can_read`,
  );
  assert.deepEqual(auditPrivileges.rows[0], {
    service_can_read: true,
    service_can_update: false,
    service_can_delete: false,
    authenticated_can_read: false,
  });
});

test("admin dashboard labels commercial, QA, unclassified and legacy totals explicitly", async () => {
  const source = await readFile(adminScriptUrl, "utf8");
  assert.match(source, /Compras comerciales activas/);
  assert.match(source, /Compras comerciales revocadas/);
  assert.match(source, /Compras QA activas/);
  assert.match(source, /Compras QA revocadas/);
  assert.match(source, /Compras sin clasificar/);
  assert.match(source, /Compras totales \(incluye QA\)/);
  assert.doesNotMatch(source, /\["Compras activas", metrics\.active_purchases/);
  assert.doesNotMatch(source, /\["Compras revocadas", metrics\.revoked_purchases/);
});

test("versioned automation function bodies match the deployed production source", async () => {
  const source = await readFile(automationMigrationUrl, "utf8");
  const expectedHashes = {
    kinecheck_cleanup_automation_data:
      "273213b6afe22976a85d4cd1951df1a9db9423a250ed6d94f9dd88ed2791ec73",
    kinecheck_generate_expiry_notifications:
      "407dec0131d650e5db50f8501af463e7c5527559af30149f66790d1a5a465cc4",
    kinecheck_reconcile_hotmart_access:
      "889c47c3f05b0ec56b3fe8ff1b7f6ff0fcde0dcf77ddb4e49d17f85b758e0876",
    kinecheck_triage_beta:
      "aac2d0b774bf66e7549d8cdac1606b8ab4a9477ae830609d764225aa7111f4a8",
    run_kinecheck_daily_automation:
      "4123781dad7af007b8b0c0b42eafb34a997f53ab65701c674926c9d53efa1921",
  };

  for (const [name, expected] of Object.entries(expectedHashes)) {
    const pattern = new RegExp(
      `create or replace function public\\.${name}\\(\\)[\\s\\S]*?`
        + `as \\$function\\$\\r?\\n([\\s\\S]*?)\\r?\\n\\$function\\$;`,
      "i",
    );
    const match = source.match(pattern);
    assert.ok(match, `missing source-of-truth for ${name}`);
    const normalized = match[1].replace(/\s/g, "");
    const actual = createHash("sha256").update(normalized).digest("hex");
    assert.equal(actual, expected, `${name} differs from deployed production`);
  }

  assert.doesNotMatch(
    source,
    /delete\s+from\s+(public\.)?hotmart_purchases/i,
  );
});
