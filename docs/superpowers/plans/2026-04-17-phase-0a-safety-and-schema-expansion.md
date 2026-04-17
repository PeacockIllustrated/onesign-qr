# Phase 0.A — Safety Infrastructure + Schema Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the additive schema changes required for the B2B organisation model (new `organizations`, `organization_members`, `organization_invites`, `platform_admins` tables and nullable `org_id` columns on owned tables), plus the safety infrastructure that guarantees printed production QR codes keep working during this and subsequent migrations.

**Architecture:** All schema changes in this phase are **purely additive** — no existing column is dropped, renamed, or has its type changed. No RLS policies are touched. No application code path changes behaviour. The redirect handler at `/r/[slug]` bypasses RLS via the admin client, which means schema additions cannot affect redirects as long as the columns the handler reads (`slug`, `destination_url`, `is_active`, `analytics_enabled`, `mode` on `qr_codes`) are not modified. This plan introduces a CI-level lint that makes breaking those columns impossible going forward.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (PostgreSQL), Vitest, Zod, Tailwind CSS. Supabase migrations are plain SQL files numbered `0000N_description.sql`.

**Scope boundary (read before starting):**
- ✅ **In scope:** safety tooling, migration 00015 with new tables and nullable `org_id` columns, TypeScript types, Zod schemas, unit tests for the safety tools and schemas, staging rehearsal, production deploy of additive changes.
- ❌ **Out of scope (deferred to subsequent plans):** data backfill (Phase 0.B), RLS rewrite (Phase 0.C), active-org session cookie, org switcher UI, invite API, signup-flow update to auto-create personal orgs, dropping the `UNIQUE(owner_id)` constraint on `bio_link_pages`. **Do not touch any of these in this plan.**

**Reference spec:** `docs/superpowers/specs/2026-04-17-onesign-lynx-h1-h2-design.md` — especially sections 2, 5, and 6.

---

## File structure

Files this plan creates or modifies:

**Created:**
- `supabase/migrations/00015_organizations_and_org_id_columns.sql` — the additive schema migration.
- `src/types/organization.ts` — TypeScript types for the new tables.
- `src/validations/organization.ts` — Zod schemas for creating/updating orgs and members.
- `src/__tests__/validations/organization.test.ts` — unit tests for the Zod schemas.
- `scripts/migration-safety/schema-lint.ts` — CI-runnable check that fails if future migrations break `qr_codes` redirect-critical columns.
- `scripts/migration-safety/schema-lint.test.ts` — unit tests for the lint.
- `scripts/migration-safety/slug-integrity-snapshot.ts` — captures `(slug, destination_url, is_active)` for every `qr_codes` row.
- `scripts/migration-safety/slug-integrity-diff.ts` — compares two snapshots and emits a report.
- `scripts/migration-safety/row-count-snapshot.ts` — captures `COUNT(*)` for a fixed list of tables.
- `scripts/migration-safety/row-count-diff.ts` — compares two row-count snapshots.
- `src/__tests__/app/r/slug-route.test.ts` — regression tests for the redirect handler.
- `docs/superpowers/runbooks/phase-0-migration.md` — operator-facing runbook.

**Modified:**
- `package.json` — add three scripts: `migration:schema-lint`, `migration:snapshot`, `migration:diff`.

---

## Part 1 — Safety infrastructure

These tasks build the rails that protect production QRs throughout all Phase 0 migrations. They must ship before the migration in Part 2 is applied to staging or production.

---

### Task 1: Redirect handler regression tests

**Files:**
- Create: `src/__tests__/app/r/slug-route.test.ts`

The redirect handler at [src/app/r/[slug]/route.ts](src/app/r/%5Bslug%5D/route.ts) is the production life-support path for printed QR codes. These tests pin its behaviour against a mocked admin Supabase client so that any future code change that alters `mode`/`is_active`/`analytics_enabled` handling or the select list fails CI.

We mock the Supabase admin client because there is no local Supabase or integration test harness in this repo, and introducing one is out of scope for this plan.

- [ ] **Step 1: Write the failing test file**

```typescript
// src/__tests__/app/r/slug-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the admin client module before importing the route handler.
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

// Mock url-validator to isolate handler branching.
vi.mock('@/lib/security/url-validator', () => ({
  validateRedirectUrl: vi.fn().mockReturnValue(true),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { GET } from '@/app/r/[slug]/route';

type QrRow = {
  id: string;
  destination_url: string;
  is_active: boolean;
  analytics_enabled: boolean;
};

function mockAdminClientWith(row: QrRow | null, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data: row, error });
  const eqMode = vi.fn().mockReturnValue({ single });
  const eqSlug = vi.fn().mockReturnValue({ eq: eqMode });
  const select = vi.fn().mockReturnValue({ eq: eqSlug });
  const from = vi.fn().mockReturnValue({ select });
  const insert = vi.fn().mockResolvedValue({ error: null });

  // Second from() call (for scan_events insert) also routes through from.
  from.mockImplementation((table: string) => {
    if (table === 'qr_codes') return { select };
    if (table === 'qr_scan_events') return { insert };
    throw new Error(`Unexpected table: ${table}`);
  });

  (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
  return { from, select, insert };
}

function mkRequest() {
  return new NextRequest('http://localhost:3000/r/test-slug', {
    headers: { 'user-agent': 'test' },
  });
}

function paramsFor(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe('GET /r/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IP_HASH_SALT = 'test-salt';
  });

  it('redirects with 307 to destination_url for an active managed QR', async () => {
    mockAdminClientWith({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: true,
      analytics_enabled: false,
    });

    const res = await GET(mkRequest(), paramsFor('test-slug'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://example.com/menu');
  });

  it('redirects to /?error=qr-not-found when the slug does not exist', async () => {
    mockAdminClientWith(null, { code: 'PGRST116' });

    const res = await GET(mkRequest(), paramsFor('missing'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=qr-not-found');
  });

  it('redirects to /?error=qr-inactive when is_active is false', async () => {
    mockAdminClientWith({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: false,
      analytics_enabled: false,
    });

    const res = await GET(mkRequest(), paramsFor('inactive-slug'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=qr-inactive');
  });

  it('selects exactly the columns the handler relies on', async () => {
    const { select } = mockAdminClientWith({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: true,
      analytics_enabled: false,
    });

    await GET(mkRequest(), paramsFor('test-slug'));

    // This assertion locks the select list. Adding or removing columns here
    // means the redirect handler's contract has changed — deliberate change
    // required.
    expect(select).toHaveBeenCalledWith(
      'id, destination_url, is_active, analytics_enabled'
    );
  });

  it('records a scan event when analytics_enabled is true', async () => {
    const { insert } = mockAdminClientWith({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: true,
      analytics_enabled: true,
    });

    await GET(mkRequest(), paramsFor('test-slug'));

    // Allow the fire-and-forget insert microtask to run.
    await new Promise((r) => setTimeout(r, 0));

    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('does not record a scan event when analytics_enabled is false', async () => {
    const { insert } = mockAdminClientWith({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: true,
      analytics_enabled: false,
    });

    await GET(mkRequest(), paramsFor('test-slug'));
    await new Promise((r) => setTimeout(r, 0));

    expect(insert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they pass against current code**

Run: `npm run test:run -- src/__tests__/app/r/slug-route.test.ts`
Expected: all 6 tests PASS. These tests describe current behaviour; if any fails now it means the mock or the handler itself has drifted.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/app/r/slug-route.test.ts
git commit -m "test: pin redirect handler behaviour with regression suite"
```

---

### Task 2: Schema-lint CI check

**Files:**
- Create: `scripts/migration-safety/schema-lint.ts` (pure library, no side effects on import)
- Create: `scripts/migration-safety/schema-lint-cli.ts` (CLI entry that calls the library and exits the process)
- Create: `scripts/migration-safety/schema-lint.test.ts`
- Modify: `package.json` (add one npm script)

This check scans `supabase/migrations/*.sql` for statements that would drop, rename, or change the type of the redirect-critical columns on `qr_codes`. It is run in CI on every PR. The script exits non-zero with a clear error if it finds a forbidden pattern.

The protected columns are: `slug`, `destination_url`, `is_active`, `analytics_enabled`, `mode`.

**Why the split:** the library file exports pure functions for the tests to import. The CLI file is the only thing that calls `process.exit()`. This avoids the classic ESM-mode bug where a `require.main === module` check at module bottom runs unexpectedly during test imports.

- [ ] **Step 1: Write the failing test file**

```typescript
// scripts/migration-safety/schema-lint.test.ts
import { describe, it, expect } from 'vitest';
import { lintMigrationContent } from './schema-lint';

describe('lintMigrationContent', () => {
  it('passes an empty migration', () => {
    expect(lintMigrationContent('').violations).toEqual([]);
  });

  it('passes an additive migration', () => {
    const sql = `
      CREATE TABLE foo (id uuid primary key);
      ALTER TABLE qr_codes ADD COLUMN org_id UUID;
    `;
    expect(lintMigrationContent(sql).violations).toEqual([]);
  });

  it('flags DROP COLUMN slug on qr_codes', () => {
    const sql = `ALTER TABLE qr_codes DROP COLUMN slug;`;
    const { violations } = lintMigrationContent(sql);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('slug');
  });

  it('flags DROP COLUMN destination_url on qr_codes case-insensitively', () => {
    const sql = `alter table qr_codes drop column destination_url;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
  });

  it('flags RENAME of is_active on qr_codes', () => {
    const sql = `ALTER TABLE qr_codes RENAME COLUMN is_active TO active;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
  });

  it('flags ALTER COLUMN ... TYPE on mode', () => {
    const sql = `ALTER TABLE qr_codes ALTER COLUMN mode TYPE TEXT;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
  });

  it('flags DROP TABLE qr_codes', () => {
    const sql = `DROP TABLE qr_codes;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
  });

  it('does not flag DROP COLUMN on unrelated tables', () => {
    const sql = `ALTER TABLE bio_link_pages DROP COLUMN some_column;`;
    expect(lintMigrationContent(sql).violations).toEqual([]);
  });

  it('does not flag mentions of protected columns inside comments', () => {
    const sql = `-- We keep slug and destination_url on qr_codes.`;
    expect(lintMigrationContent(sql).violations).toEqual([]);
  });

  it('does not flag analytics_enabled on a different table', () => {
    const sql = `ALTER TABLE bio_link_pages DROP COLUMN analytics_enabled;`;
    expect(lintMigrationContent(sql).violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- scripts/migration-safety/schema-lint.test.ts`
Expected: FAIL — `lintMigrationContent` is not defined / module not found.

- [ ] **Step 3: Write the lint implementation**

```typescript
// scripts/migration-safety/schema-lint.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROTECTED_TABLE = 'qr_codes';
const PROTECTED_COLUMNS = [
  'slug',
  'destination_url',
  'is_active',
  'analytics_enabled',
  'mode',
];

export interface LintResult {
  violations: string[];
}

/**
 * Strips SQL line comments (-- ...) and block comments (/* ... *\/) so pattern
 * matching only looks at executable SQL.
 */
function stripComments(sql: string): string {
  const withoutBlock = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  return withoutBlock
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

export function lintMigrationContent(sql: string): LintResult {
  const violations: string[] = [];
  const cleaned = stripComments(sql);
  const normalized = cleaned.toLowerCase();

  // DROP TABLE qr_codes
  if (new RegExp(`drop\\s+table\\s+(if\\s+exists\\s+)?${PROTECTED_TABLE}\\b`).test(normalized)) {
    violations.push(`DROP TABLE on protected table "${PROTECTED_TABLE}" is forbidden.`);
  }

  // Find ALTER TABLE qr_codes ... statements, then check the body of each.
  const alterRegex = new RegExp(
    `alter\\s+table\\s+(only\\s+)?${PROTECTED_TABLE}\\b([^;]*);`,
    'g'
  );
  let match: RegExpExecArray | null;
  while ((match = alterRegex.exec(normalized)) !== null) {
    const body = match[2];
    for (const col of PROTECTED_COLUMNS) {
      const bodyPatterns = [
        new RegExp(`drop\\s+column\\s+(if\\s+exists\\s+)?${col}\\b`),
        new RegExp(`rename\\s+column\\s+${col}\\b`),
        new RegExp(`alter\\s+column\\s+${col}\\s+type\\b`),
        new RegExp(`alter\\s+column\\s+${col}\\s+set\\s+data\\s+type\\b`),
      ];
      if (bodyPatterns.some((p) => p.test(body))) {
        violations.push(
          `Forbidden change to protected column "${PROTECTED_TABLE}.${col}". ` +
            `This column is relied on by the production redirect handler.`
        );
      }
    }
  }

  return { violations };
}

export function lintMigrationsDirectory(dir: string): LintResult {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const allViolations: string[] = [];
  for (const file of files) {
    const content = readFileSync(join(dir, file), 'utf8');
    const { violations } = lintMigrationContent(content);
    for (const v of violations) {
      allViolations.push(`${file}: ${v}`);
    }
  }
  return { violations: allViolations };
}
```

- [ ] **Step 4: Write the CLI entry**

```typescript
// scripts/migration-safety/schema-lint-cli.ts
import { join } from 'node:path';
import { lintMigrationsDirectory } from './schema-lint';

const dir = join(process.cwd(), 'supabase', 'migrations');
const { violations } = lintMigrationsDirectory(dir);

if (violations.length > 0) {
  console.error('Migration schema-lint failed:');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('Migration schema-lint passed.');
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:run -- scripts/migration-safety/schema-lint.test.ts`
Expected: all 10 tests PASS.

- [ ] **Step 6: Add the npm script and verify it runs clean against current migrations**

Edit `package.json` scripts section. Add after the existing `test:coverage` line:

```json
"migration:schema-lint": "tsx scripts/migration-safety/schema-lint-cli.ts",
```

Then install `tsx` as a dev dependency if not already present:

Run: `npm install --save-dev tsx`
Run: `npm run migration:schema-lint`
Expected: `Migration schema-lint passed.` (exit 0)

- [ ] **Step 7: Commit**

```bash
git add scripts/migration-safety/schema-lint.ts scripts/migration-safety/schema-lint-cli.ts scripts/migration-safety/schema-lint.test.ts package.json package-lock.json
git commit -m "feat: add schema-lint CI check for qr_codes redirect-critical columns"
```

---

### Task 3: Slug-integrity snapshot + diff scripts

**Files:**
- Create: `scripts/migration-safety/slug-integrity-snapshot.ts`
- Create: `scripts/migration-safety/slug-integrity-diff.ts`
- Modify: `package.json` (add two scripts)

These scripts take a snapshot of every `(id, slug, destination_url, is_active)` row in `qr_codes` to a JSON file, and diff two snapshots to detect any changes. Used pre- and post-migration to prove no redirect has been tampered with. The snapshot runs via the admin client against whatever `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are in the environment, so it can target staging or production.

- [ ] **Step 1: Write the snapshot script**

```typescript
// scripts/migration-safety/slug-integrity-snapshot.ts
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

interface QrRow {
  id: string;
  slug: string;
  destination_url: string;
  is_active: boolean;
}

async function snapshot(outFile: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
  }

  const client = createClient(url, key, {
    auth: { persistSession: false },
  });

  const rows: QrRow[] = [];
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await client
      .from('qr_codes')
      .select('id, slug, destination_url, is_active')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...(data as QrRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  rows.sort((a, b) => a.id.localeCompare(b.id));

  writeFileSync(
    outFile,
    JSON.stringify({ takenAt: new Date().toISOString(), rows }, null, 2)
  );

  console.log(`Snapshot written: ${outFile} (${rows.length} rows)`);
}

const outFile = process.argv[2];
if (!outFile) {
  console.error(
    'Usage: tsx scripts/migration-safety/slug-integrity-snapshot.ts <output-file.json>'
  );
  process.exit(1);
}

snapshot(outFile).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Write the diff script**

```typescript
// scripts/migration-safety/slug-integrity-diff.ts
import { readFileSync } from 'node:fs';

interface Row {
  id: string;
  slug: string;
  destination_url: string;
  is_active: boolean;
}

interface Snapshot {
  takenAt: string;
  rows: Row[];
}

function loadSnapshot(path: string): Snapshot {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as Snapshot;
}

function index(rows: Row[]): Map<string, Row> {
  const m = new Map<string, Row>();
  for (const r of rows) m.set(r.id, r);
  return m;
}

function diff(beforePath: string, afterPath: string): number {
  const before = loadSnapshot(beforePath);
  const after = loadSnapshot(afterPath);
  const b = index(before.rows);
  const a = index(after.rows);

  const removed: string[] = [];
  const added: string[] = [];
  const changed: string[] = [];

  for (const [id, row] of b) {
    const other = a.get(id);
    if (!other) {
      removed.push(id);
      continue;
    }
    if (
      other.slug !== row.slug ||
      other.destination_url !== row.destination_url ||
      other.is_active !== row.is_active
    ) {
      changed.push(id);
    }
  }
  for (const id of a.keys()) {
    if (!b.has(id)) added.push(id);
  }

  const totalIssues = removed.length + changed.length;

  console.log(`Before: ${before.rows.length} rows (${before.takenAt})`);
  console.log(`After:  ${after.rows.length} rows (${after.takenAt})`);
  console.log(`Added:   ${added.length}`);
  console.log(`Removed: ${removed.length}`);
  console.log(`Changed: ${changed.length}`);

  if (removed.length > 0) console.log('Removed IDs:', removed.slice(0, 20).join(', '));
  if (changed.length > 0) console.log('Changed IDs:', changed.slice(0, 20).join(', '));

  if (totalIssues > 0) {
    console.error(
      '\nSLUG INTEGRITY FAILURE: rows were removed or changed. ' +
        'This is a migration-critical problem for printed production QR codes.'
    );
    return 1;
  }

  console.log('\nSlug integrity OK.');
  return 0;
}

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error(
    'Usage: tsx scripts/migration-safety/slug-integrity-diff.ts <before.json> <after.json>'
  );
  process.exit(1);
}
process.exit(diff(beforePath, afterPath));
```

- [ ] **Step 3: Add npm scripts**

Edit `package.json`. Add two scripts:

```json
"migration:snapshot": "tsx scripts/migration-safety/slug-integrity-snapshot.ts",
"migration:diff": "tsx scripts/migration-safety/slug-integrity-diff.ts",
```

- [ ] **Step 4: Smoke-test against local env**

Create a throwaway `.env.test.local` pointing at your staging Supabase (service role key required). Then:

Run: `npm run migration:snapshot -- /tmp/slug-before.json`
Expected: `Snapshot written: /tmp/slug-before.json (N rows)` where N is the current production row count.

Take a second snapshot immediately:

Run: `npm run migration:snapshot -- /tmp/slug-after.json`
Run: `npm run migration:diff -- /tmp/slug-before.json /tmp/slug-after.json`
Expected: `Slug integrity OK.` (exit 0)

- [ ] **Step 5: Commit**

```bash
git add scripts/migration-safety/slug-integrity-snapshot.ts scripts/migration-safety/slug-integrity-diff.ts package.json
git commit -m "feat: add slug-integrity snapshot and diff scripts"
```

---

### Task 4: Row-count snapshot + diff scripts

**Files:**
- Create: `scripts/migration-safety/row-count-snapshot.ts`
- Create: `scripts/migration-safety/row-count-diff.ts`

Records `COUNT(*)` for every table that will be touched during Phase 0 migrations. Used to detect data loss between before and after states.

- [ ] **Step 1: Write the snapshot script**

```typescript
// scripts/migration-safety/row-count-snapshot.ts
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const TABLES = [
  'qr_codes',
  'qr_styles',
  'qr_assets',
  'qr_scan_events',
  'qr_audit_log',
  'bio_link_pages',
  'bio_link_items',
  'bio_blocks',
  'bio_form_submissions',
  'bio_link_audit_log',
];

async function snapshot(outFile: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
  }

  const client = createClient(url, key, {
    auth: { persistSession: false },
  });

  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Failed to count ${table}: ${error.message}`);
      counts[table] = -1;
      continue;
    }
    counts[table] = count ?? 0;
    console.log(`${table}: ${counts[table]}`);
  }

  writeFileSync(
    outFile,
    JSON.stringify({ takenAt: new Date().toISOString(), counts }, null, 2)
  );
  console.log(`Snapshot written: ${outFile}`);
}

const outFile = process.argv[2];
if (!outFile) {
  console.error(
    'Usage: tsx scripts/migration-safety/row-count-snapshot.ts <output.json>'
  );
  process.exit(1);
}

snapshot(outFile).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Write the diff script**

```typescript
// scripts/migration-safety/row-count-diff.ts
import { readFileSync } from 'node:fs';

interface Snapshot {
  takenAt: string;
  counts: Record<string, number>;
}

function load(path: string): Snapshot {
  return JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
}

function diff(beforePath: string, afterPath: string): number {
  const before = load(beforePath);
  const after = load(afterPath);
  const mismatches: string[] = [];

  for (const table of Object.keys(before.counts)) {
    const b = before.counts[table];
    const a = after.counts[table] ?? null;
    if (a === null) {
      mismatches.push(`${table}: missing from after snapshot`);
      continue;
    }
    if (b !== a) {
      mismatches.push(`${table}: before=${b} after=${a} delta=${a - b}`);
    }
  }

  console.log(`Before: ${before.takenAt}`);
  console.log(`After:  ${after.takenAt}`);

  if (mismatches.length > 0) {
    console.error('\nROW COUNT MISMATCH:');
    for (const m of mismatches) console.error(`  - ${m}`);
    return 1;
  }

  console.log('Row counts match. No data loss detected.');
  return 0;
}

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error(
    'Usage: tsx scripts/migration-safety/row-count-diff.ts <before.json> <after.json>'
  );
  process.exit(1);
}
process.exit(diff(beforePath, afterPath));
```

- [ ] **Step 3: Smoke-test**

Run against staging:

Run: `tsx scripts/migration-safety/row-count-snapshot.ts /tmp/rows-before.json`
Expected: a line per table with its count. File written.

Run: `tsx scripts/migration-safety/row-count-snapshot.ts /tmp/rows-after.json`
Run: `tsx scripts/migration-safety/row-count-diff.ts /tmp/rows-before.json /tmp/rows-after.json`
Expected: `Row counts match. No data loss detected.`

- [ ] **Step 4: Commit**

```bash
git add scripts/migration-safety/row-count-snapshot.ts scripts/migration-safety/row-count-diff.ts
git commit -m "feat: add row-count snapshot and diff scripts"
```

---

### Task 5: Migration runbook

**Files:**
- Create: `docs/superpowers/runbooks/phase-0-migration.md`

A step-by-step operator-facing document for running Phase 0 migrations safely. Covers pre-flight checklist, execution steps, rollback steps, and verification. Treated as the source of truth for the on-call engineer during the migration window.

- [ ] **Step 1: Create the runbook**

```markdown
# Phase 0 Migration Runbook

This runbook covers the safe execution of Phase 0 migrations (introducing the
B2B organisation model). It is the operator's source of truth during each
migration window. Read top-to-bottom before starting.

## Who owns this document

- **Primary operator:** person running the migration.
- **Reviewer:** a second engineer who has read the runbook before the window.
- **Escalation:** rollback authority rests with the primary operator; they do
  not need further approval to execute a rollback mid-migration.

## The invariant

Printed production QR codes must keep resolving to their current
`destination_url` at every moment during migration. The `/r/{slug}` handler
bypasses RLS via the admin Supabase client, so RLS changes are safe. Schema
changes are dangerous only if they touch the columns `slug`,
`destination_url`, `is_active`, `analytics_enabled`, `mode` on `qr_codes` —
and the CI schema-lint check blocks PRs that do this.

## Pre-flight checklist (Phase 0.A)

All items must be checked before the migration is applied to production.

- [ ] Supabase PITR is active on the project (Supabase Dashboard →
      Database → Backups). Confirm retention ≥7 days.
- [ ] A full database backup has been taken **today**. Record the
      backup identifier here before proceeding:
      `BACKUP_ID: _______________`
- [ ] The migration has been applied to the staging Supabase project
      end-to-end. `row-count-diff` showed zero deltas on staging.
      `slug-integrity-diff` showed zero deltas on staging.
- [ ] The redirect handler regression tests pass on the current branch:
      `npm run test:run -- src/__tests__/app/r/slug-route.test.ts`
- [ ] The schema-lint check passes on the current branch:
      `npm run migration:schema-lint`
- [ ] A reviewer who is not the primary operator has read this runbook
      and the migration SQL.
- [ ] The migration window is scheduled during the lowest-traffic window
      (default: Sunday 03:00 BST). The operator is rested and focused.
- [ ] Customer-facing communication (if any) has gone out at least
      48 hours in advance.
- [ ] The rollback command below is pasted into a second terminal, ready
      to execute, and has been mentally rehearsed.

## Execution (Phase 0.A)

Phase 0.A is purely additive. The redirect handler is unaffected by
definition. The risk is only to the migration itself succeeding. Steps:

1. Open two terminals. Terminal A: admin console / Supabase SQL editor.
   Terminal B: a shell with production env vars loaded.

2. In Terminal B, capture pre-migration snapshots:

   ```
   npm run migration:snapshot -- /tmp/phase-0a-slug-before.json
   tsx scripts/migration-safety/row-count-snapshot.ts /tmp/phase-0a-rows-before.json
   ```

   Record the row counts in your notes.

3. In Terminal A, open `supabase/migrations/00015_organizations_and_org_id_columns.sql`
   and paste the contents into the Supabase SQL editor. Execute.

4. If the SQL editor reports any error: **STOP. DO NOT CONTINUE. DO NOT
   RETRY.** Jump to the Rollback section below and execute it verbatim.
   Rollback is trivial for Phase 0.A because nothing existing was changed.

5. In Terminal B, capture post-migration snapshots:

   ```
   npm run migration:snapshot -- /tmp/phase-0a-slug-after.json
   tsx scripts/migration-safety/row-count-snapshot.ts /tmp/phase-0a-rows-after.json
   ```

6. Run the diffs. Both must pass cleanly:

   ```
   npm run migration:diff -- /tmp/phase-0a-slug-before.json /tmp/phase-0a-slug-after.json
   tsx scripts/migration-safety/row-count-diff.ts /tmp/phase-0a-rows-before.json /tmp/phase-0a-rows-after.json
   ```

   Expected: both exit 0 with no deltas.

7. Verify new tables exist and are empty:

   ```sql
   SELECT COUNT(*) FROM organizations;           -- expect 0
   SELECT COUNT(*) FROM organization_members;    -- expect 0
   SELECT COUNT(*) FROM organization_invites;    -- expect 0
   SELECT COUNT(*) FROM platform_admins;         -- expect 0
   ```

8. Verify the new `org_id` columns exist and are all NULL (no unintended
   backfill happened):

   ```sql
   SELECT COUNT(*) FILTER (WHERE org_id IS NOT NULL) FROM bio_link_pages;
   -- expect 0
   SELECT COUNT(*) FILTER (WHERE org_id IS NOT NULL) FROM qr_codes;
   -- expect 0
   ```

9. Hit a known-good production QR redirect manually to confirm it still
   resolves to the correct destination. Log the HTTP status and Location
   header.

10. Write a short completion note in this runbook (append below) with:
    timestamp, backup ID, row count deltas, any anomalies observed.

## Rollback (Phase 0.A)

Phase 0.A rollback is clean because everything added is new. Execute the
following SQL in the Supabase SQL editor:

```sql
BEGIN;

ALTER TABLE IF EXISTS qr_codes DROP COLUMN IF EXISTS org_id;
ALTER TABLE IF EXISTS bio_link_pages DROP COLUMN IF EXISTS org_id;

DROP TABLE IF EXISTS platform_admins;
DROP TABLE IF EXISTS organization_invites;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;

DO $$ BEGIN
  DROP TYPE IF EXISTS member_role;
  DROP TYPE IF EXISTS organization_plan;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

COMMIT;
```

After rollback: re-run the slug-integrity and row-count diffs to confirm the
database is back at the before-snapshot state.

## Completion log

<!-- Append an entry per run. -->

### Staging rehearsal, YYYY-MM-DD HH:MM TZ
- Backup ID:
- Row count deltas:
- Slug integrity diff:
- Anomalies:
- Signed off by:

### Production, YYYY-MM-DD HH:MM TZ
- Backup ID:
- Row count deltas:
- Slug integrity diff:
- Anomalies:
- Signed off by:
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: add Phase 0 migration runbook"
```

---

## Part 2 — Schema expansion

The additive migration. No RLS, no backfill, no constraint drops. Creates four new tables, two enums, and adds nullable `org_id` columns to the two tables that currently carry `owner_id`.

---

### Task 6: Write migration 00015

**Files:**
- Create: `supabase/migrations/00015_organizations_and_org_id_columns.sql`

The new migration follows the existing house style from [supabase/migrations/00014_bio_editor_expansion.sql](supabase/migrations/00014_bio_editor_expansion.sql): banner comments per section, `DO $$ BEGIN ... EXCEPTION` pattern for idempotent enum creation, `IF NOT EXISTS` on tables and indexes, and `uuid_generate_v4()` for default IDs.

- [ ] **Step 1: Create the migration file**

```sql
-- Migration: Organizations and org_id columns
--
-- Phase 0.A of the B2B organisation model rollout. Purely additive: creates
-- four new tables (organizations, organization_members, organization_invites,
-- platform_admins), two enums (member_role, organization_plan), and adds a
-- nullable org_id column to the two tables that currently carry owner_id
-- (bio_link_pages, qr_codes).
--
-- This migration does NOT:
--   - backfill org_id on existing rows (Phase 0.B)
--   - change any RLS policy (Phase 0.C)
--   - drop the UNIQUE(owner_id) constraint on bio_link_pages (Phase 0.C)
--
-- The redirect handler at /r/[slug] is unaffected because it uses the admin
-- Supabase client and relies only on the columns slug, destination_url,
-- is_active, analytics_enabled, mode on qr_codes — none of which are touched.

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE organization_plan AS ENUM ('free', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TABLE: organizations
-- =============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL,

  -- Commercial tier (free/pro). Detailed limit enforcement happens in app
  -- code, not at the DB level.
  plan organization_plan NOT NULL DEFAULT 'free',

  -- Business profile fields. Populated during onboarding. Used by the H1
  -- business-profile feature and the H2 email signature generator.
  phone TEXT,
  address TEXT,
  hours JSONB,
  website TEXT,
  logo_url TEXT,
  default_timezone TEXT,

  -- Billing. Populated lazily when the org first hits Stripe (either
  -- shopfront purchase or plan upgrade).
  stripe_customer_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug_unique
  ON organizations(slug) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
  ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- =============================================================================
-- TABLE: organization_members
-- =============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user
  ON organization_members(user_id);

-- =============================================================================
-- TABLE: organization_invites
-- =============================================================================

CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role member_role NOT NULL,
  token TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_invites_token_unique
  ON organization_invites(token);

CREATE INDEX IF NOT EXISTS idx_organization_invites_email
  ON organization_invites(lower(email));

CREATE INDEX IF NOT EXISTS idx_organization_invites_org
  ON organization_invites(org_id);

-- =============================================================================
-- TABLE: platform_admins
--
-- Platform-level super-admin flag, deliberately stored in its own table so
-- that platform access can never be granted or escalated through any
-- organization_members action. Rows in this table bypass org-scoped RLS in
-- specific admin endpoints (enforced in application code, not RLS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- =============================================================================
-- NULLABLE org_id ON EXISTING TABLES
--
-- Added as NULLABLE so this migration applies cleanly without backfill.
-- Backfill happens in Phase 0.B; NOT NULL + defaults happen in Phase 0.C.
-- =============================================================================

ALTER TABLE bio_link_pages
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bio_link_pages_org
  ON bio_link_pages(org_id);

CREATE INDEX IF NOT EXISTS idx_qr_codes_org
  ON qr_codes(org_id);

-- =============================================================================
-- updated_at TRIGGER for organizations
-- =============================================================================

CREATE OR REPLACE FUNCTION touch_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION touch_organizations_updated_at();

-- =============================================================================
-- NO RLS POLICIES (deliberate)
--
-- New tables have RLS disabled by default (Supabase's default is ENABLE). We
-- explicitly leave organizations, organization_members, organization_invites,
-- and platform_admins without RLS enabled in this phase — they are only
-- accessed by the admin client in Phase 0.B backfill, and RLS is added in
-- Phase 0.C alongside the active-org session work.
--
-- ENABLE ROW LEVEL SECURITY is applied to these tables in Phase 0.C.
-- =============================================================================
```

- [ ] **Step 2: Re-run the schema-lint check against the new migration file**

Run: `npm run migration:schema-lint`
Expected: `Migration schema-lint passed.` (exit 0). If it fails, the migration has accidentally touched a protected column — stop and investigate.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00015_organizations_and_org_id_columns.sql
git commit -m "feat: add migration 00015 (organizations tables + org_id columns)"
```

---

### Task 7: Apply migration to staging and verify

This is a hands-on verification task, not a code task. It uses the safety scripts built in Part 1 to prove the migration is safe.

- [ ] **Step 1: Capture pre-migration snapshots against staging**

With staging Supabase credentials in your environment:

Run:
```
npm run migration:snapshot -- /tmp/staging-slug-before.json
tsx scripts/migration-safety/row-count-snapshot.ts /tmp/staging-rows-before.json
```

Expected: both files written; row counts recorded.

- [ ] **Step 2: Apply migration 00015 to staging**

Open the Supabase Dashboard for the staging project → SQL Editor. Paste the
full contents of `supabase/migrations/00015_organizations_and_org_id_columns.sql`.
Execute.

Expected: success with no errors. All CREATE TABLE and ALTER TABLE statements
complete.

- [ ] **Step 3: Capture post-migration snapshots**

Run:
```
npm run migration:snapshot -- /tmp/staging-slug-after.json
tsx scripts/migration-safety/row-count-snapshot.ts /tmp/staging-rows-after.json
```

- [ ] **Step 4: Verify no data was moved or lost**

Run:
```
npm run migration:diff -- /tmp/staging-slug-before.json /tmp/staging-slug-after.json
tsx scripts/migration-safety/row-count-diff.ts /tmp/staging-rows-before.json /tmp/staging-rows-after.json
```

Expected:
- `Slug integrity OK.` (exit 0)
- `Row counts match. No data loss detected.` (exit 0)

If either fails, the migration must not proceed to production. Investigate,
and if the fault is in the migration, fix the migration file, rehearse again.

- [ ] **Step 5: Verify new tables are empty and new columns are NULL**

In the Supabase SQL editor, run:

```sql
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM organization_members;
SELECT COUNT(*) FROM organization_invites;
SELECT COUNT(*) FROM platform_admins;
SELECT COUNT(*) FILTER (WHERE org_id IS NOT NULL) FROM bio_link_pages;
SELECT COUNT(*) FILTER (WHERE org_id IS NOT NULL) FROM qr_codes;
```

Expected: all six queries return 0.

- [ ] **Step 6: Verify redirect handler on staging is still working**

Hit a known-good staging QR URL (e.g., `/r/{slug}` for a test QR code you
created earlier). Confirm the HTTP response is `307 Temporary Redirect` with
the expected `Location` header.

- [ ] **Step 7: Log the rehearsal in the runbook**

Append a "Staging rehearsal" entry to `docs/superpowers/runbooks/phase-0-migration.md` with the timestamp, row counts, and sign-off.

- [ ] **Step 8: Commit the runbook update**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: log Phase 0.A staging rehearsal result"
```

---

## Part 3 — Types and Zod schemas

Application-level types for the new tables. These do not affect runtime behaviour yet (no route reads or writes them in Phase 0.A), but they unblock Phase 0.B (backfill), Phase 0.C (RLS + session), and the invite plan.

---

### Task 8: Add TypeScript types

**Files:**
- Create: `src/types/organization.ts`

Follows the existing pattern in `src/types/bio.ts` and `src/types/qr.ts`: one interface per DB record shape, plus any helper unions.

- [ ] **Step 1: Create the types file**

```typescript
// src/types/organization.ts

export type MemberRole = 'owner' | 'admin' | 'member';
export type OrganizationPlan = 'free' | 'pro';

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  phone: string | null;
  address: string | null;
  hours: Record<string, unknown> | null;
  website: string | null;
  logo_url: string | null;
  default_timezone: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrganizationMemberRecord {
  org_id: string;
  user_id: string;
  role: MemberRole;
  invited_by: string | null;
  joined_at: string;
}

export interface OrganizationInviteRecord {
  id: string;
  org_id: string;
  email: string;
  role: MemberRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface PlatformAdminRecord {
  user_id: string;
  granted_at: string;
  granted_by: string | null;
  notes: string | null;
}

/**
 * The minimal shape needed when listing an org in a "switcher" UI: just what
 * the user needs to pick between orgs. Returned by /api/org endpoints in
 * Phase 0.C.
 */
export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: MemberRole;
  plan: OrganizationPlan;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run type-check`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/organization.ts
git commit -m "feat: add organization TypeScript types"
```

---

### Task 9: Add Zod schemas and unit tests (TDD)

**Files:**
- Create: `src/validations/organization.ts`
- Create: `src/__tests__/validations/organization.test.ts`

The schemas validate inputs for the Phase 0.B backfill helpers and the Phase 0.C + invite-plan API routes. Written now because they are pure functions with no runtime dependencies — we can land them and test them in isolation.

- [ ] **Step 1: Write the failing test file**

```typescript
// src/__tests__/validations/organization.test.ts
import { describe, it, expect } from 'vitest';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  acceptInviteSchema,
  memberRoleSchema,
  organizationPlanSchema,
} from '@/validations/organization';

describe('memberRoleSchema', () => {
  it('accepts owner, admin, member', () => {
    for (const role of ['owner', 'admin', 'member']) {
      expect(memberRoleSchema.safeParse(role).success).toBe(true);
    }
  });

  it('rejects unknown roles', () => {
    expect(memberRoleSchema.safeParse('super_admin').success).toBe(false);
    expect(memberRoleSchema.safeParse('').success).toBe(false);
  });
});

describe('organizationPlanSchema', () => {
  it('accepts free and pro', () => {
    expect(organizationPlanSchema.safeParse('free').success).toBe(true);
    expect(organizationPlanSchema.safeParse('pro').success).toBe(true);
  });

  it('rejects unknown plans', () => {
    expect(organizationPlanSchema.safeParse('enterprise').success).toBe(false);
  });
});

describe('createOrganizationSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Johns Cafe',
      slug: 'johns-cafe',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = createOrganizationSchema.safeParse({
      name: '',
      slug: 'johns-cafe',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name over 100 characters', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'a'.repeat(101),
      slug: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a slug with uppercase or spaces', () => {
    expect(
      createOrganizationSchema.safeParse({ name: 'x', slug: 'Johns Cafe' })
        .success
    ).toBe(false);
    expect(
      createOrganizationSchema.safeParse({ name: 'x', slug: 'Johns-Cafe' })
        .success
    ).toBe(false);
  });

  it('accepts an optional website and phone', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'x',
      slug: 'x',
      website: 'https://example.com',
      phone: '+44 20 1234 5678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid website URL', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'x',
      slug: 'x',
      website: 'not a url',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateOrganizationSchema', () => {
  it('accepts partial updates', () => {
    expect(updateOrganizationSchema.safeParse({ name: 'New Name' }).success).toBe(
      true
    );
    expect(updateOrganizationSchema.safeParse({}).success).toBe(true);
  });

  it('rejects updates to slug (slug is create-time only)', () => {
    const result = updateOrganizationSchema.safeParse({ slug: 'new-slug' });
    // slug is not in the update schema; extra keys are stripped or rejected
    // depending on the schema. We assert that if present it must be ignored.
    // Here we assert the schema does not carry slug through.
    if (result.success) {
      expect('slug' in result.data).toBe(false);
    }
  });
});

describe('inviteMemberSchema', () => {
  it('accepts a valid invite', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'sarah@example.com',
      role: 'admin',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(
      inviteMemberSchema.safeParse({ email: 'not-an-email', role: 'admin' })
        .success
    ).toBe(false);
  });

  it('rejects role "owner" — owner is created by org creation, not invite', () => {
    expect(
      inviteMemberSchema.safeParse({ email: 'x@x.com', role: 'owner' }).success
    ).toBe(false);
  });
});

describe('acceptInviteSchema', () => {
  it('accepts a valid token string', () => {
    expect(acceptInviteSchema.safeParse({ token: 'abc123' }).success).toBe(true);
  });

  it('rejects an empty token', () => {
    expect(acceptInviteSchema.safeParse({ token: '' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- src/__tests__/validations/organization.test.ts`
Expected: FAIL — module `@/validations/organization` not found.

- [ ] **Step 3: Write the Zod schema module**

```typescript
// src/validations/organization.ts
import { z } from 'zod';

export const memberRoleSchema = z.enum(['owner', 'admin', 'member']);
export type MemberRoleInput = z.infer<typeof memberRoleSchema>;

export const organizationPlanSchema = z.enum(['free', 'pro']);

/**
 * Slug rules: lowercase letters, digits, hyphens; 1–50 chars; may not start
 * or end with a hyphen. Used in URLs (super-admin org lookup), so strict.
 */
const slugSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, digits, and hyphens only',
  });

const optionalUrl = z
  .string()
  .url({ message: 'Website must be a valid URL' })
  .max(500)
  .optional();

const optionalPhone = z.string().min(3).max(50).optional();
const optionalAddress = z.string().min(1).max(500).optional();
const optionalLogoUrl = z.string().url().max(500).optional();
const optionalTimezone = z.string().min(1).max(64).optional();

/**
 * Input shape for creating a new organization. Used by:
 *   - Phase 0.B: backfill script (personal-org auto-creation).
 *   - Phase 0.C / onward: signup flow, "create new org" UI.
 */
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugSchema,
  phone: optionalPhone,
  address: optionalAddress,
  website: optionalUrl,
  logo_url: optionalLogoUrl,
  default_timezone: optionalTimezone,
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

/**
 * Updatable fields on an existing organization. Slug is intentionally
 * excluded — slug changes are a separate, gated admin operation handled
 * outside this schema.
 */
export const updateOrganizationSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    phone: optionalPhone,
    address: optionalAddress,
    hours: z.record(z.string(), z.unknown()).optional(),
    website: optionalUrl,
    logo_url: optionalLogoUrl,
    default_timezone: optionalTimezone,
  })
  .strict();
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

/**
 * Invite an existing or new email address to an existing org. Role is
 * restricted to admin | member — owner is assigned only at org creation.
 */
export const inviteMemberSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(['admin', 'member']),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1).max(128),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- src/__tests__/validations/organization.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Run the whole test suite to confirm nothing else broke**

Run: `npm run test:run`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/validations/organization.ts src/__tests__/validations/organization.test.ts
git commit -m "feat: add organization Zod schemas and unit tests"
```

---

## Part 4 — CI integration and deploy

---

### Task 10: Wire schema-lint into CI

**Files:**
- Modify: `package.json` (add a `pretest` hook, if project convention allows) OR document the CI step in the runbook.

Since there's no visible GitHub Actions config in this repo, the lint is wired via npm script + runbook. If/when CI is added later, the same `npm run migration:schema-lint` command runs in that pipeline.

- [ ] **Step 1: Document the CI contract in the runbook**

Edit `docs/superpowers/runbooks/phase-0-migration.md`. Add a new section at the top of the "Pre-flight checklist" section:

```markdown
### CI gates (must be green on the branch being deployed)

1. `npm run test:run` — all unit tests pass.
2. `npm run type-check` — TypeScript compiles without errors.
3. `npm run migration:schema-lint` — migration directory passes schema-lint.
4. `npm run lint` — linter passes.
```

- [ ] **Step 2: Commit the runbook update**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: document CI gates required before Phase 0 migrations"
```

---

### Task 11: Apply migration 00015 to production

This task is executed **by the primary operator during the scheduled migration window**, following the runbook. It is listed as a task so the plan is not "complete" until production has been successfully migrated and verified.

**Do not execute this task until all previous tasks are merged to main, the staging rehearsal (Task 7) was clean, and the pre-flight checklist in the runbook is fully checked.**

- [ ] **Step 1: Work through the Phase 0.A Execution checklist in the runbook**

Open `docs/superpowers/runbooks/phase-0-migration.md` → "Execution (Phase 0.A)". Work through steps 1–10 on the production Supabase project.

- [ ] **Step 2: Log the production run in the runbook's completion log**

Append a "Production" entry with timestamp, backup ID, row count deltas, slug-integrity result, anomalies (if any), and sign-off.

- [ ] **Step 3: Commit the runbook update**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: log Phase 0.A production migration result"
```

---

## Completion criteria

Phase 0.A is complete when **all** of the following are true:

1. Migration 00015 has been applied to production.
2. `slug-integrity-diff` showed zero deltas in production.
3. `row-count-diff` showed zero deltas in production.
4. Known-good production QR codes still redirect correctly (manual spot-check of at least 3 distinct customers' QRs).
5. `platform_admins`, `organization_invites`, `organization_members`, `organizations` tables exist in production with row counts of 0.
6. The `org_id` column exists on `bio_link_pages` and `qr_codes` in production, with zero non-NULL rows.
7. The runbook has a completed "Production" entry in its completion log.

**At this point, Phase 0.B (backfill) is unblocked and gets its own plan.** The explicit out-of-scope items listed at the top of this plan remain untouched.
