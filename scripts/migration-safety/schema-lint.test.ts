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

  // Blocker 1: Schema-qualified table names
  it('flags DROP TABLE public.qr_codes (schema-qualified)', () => {
    const sql = `DROP TABLE public.qr_codes;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
  });

  it('flags ALTER TABLE public.qr_codes DROP COLUMN slug (schema-qualified)', () => {
    const sql = `ALTER TABLE public.qr_codes DROP COLUMN slug;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
  });

  it('flags DROP TABLE other_schema.qr_codes (schema-qualified with different schema)', () => {
    const sql = `DROP TABLE other_schema.qr_codes;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
  });

  // Blocker 2: Quoted identifiers
  it('flags DROP TABLE "qr_codes" (double-quoted)', () => {
    const sql = `DROP TABLE "qr_codes";`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
  });

  it('flags ALTER TABLE "qr_codes" DROP COLUMN slug (double-quoted)', () => {
    const sql = `ALTER TABLE "qr_codes" DROP COLUMN slug;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
  });

  it('flags DROP TABLE "public"."qr_codes" (schema and table both quoted)', () => {
    const sql = `DROP TABLE "public"."qr_codes";`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
  });

  // Blocker 3: Whole-table RENAME TO
  it('flags ALTER TABLE qr_codes RENAME TO qr_codes_old (whole-table rename)', () => {
    const sql = `ALTER TABLE qr_codes RENAME TO qr_codes_old;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
    expect(lintMigrationContent(sql).violations[0]).toContain('RENAME');
  });

  it('flags ALTER TABLE "qr_codes" RENAME TO other_name (quoted, whole-table rename)', () => {
    const sql = `ALTER TABLE "qr_codes" RENAME TO other_name;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
    expect(lintMigrationContent(sql).violations[0]).toContain('RENAME');
  });

  it('flags ALTER TABLE public.qr_codes RENAME TO foo (schema-qualified, whole-table rename)', () => {
    const sql = `ALTER TABLE public.qr_codes RENAME TO foo;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
    expect(lintMigrationContent(sql).violations[0]).toContain('RENAME');
  });

  // Important: Ensure IF EXISTS is still caught
  it('flags ALTER TABLE qr_codes DROP COLUMN IF EXISTS slug', () => {
    const sql = `ALTER TABLE qr_codes DROP COLUMN IF EXISTS slug;`;
    expect(lintMigrationContent(sql).violations).toHaveLength(1);
  });

  // Safe ALTER forms should NOT flag
  it('does not flag ALTER TABLE qr_codes ALTER COLUMN slug DROP DEFAULT', () => {
    const sql = `ALTER TABLE qr_codes ALTER COLUMN slug DROP DEFAULT;`;
    expect(lintMigrationContent(sql).violations).toEqual([]);
  });

  it('does not flag ALTER TABLE qr_codes ALTER COLUMN slug SET NOT NULL', () => {
    const sql = `ALTER TABLE qr_codes ALTER COLUMN slug SET NOT NULL;`;
    expect(lintMigrationContent(sql).violations).toEqual([]);
  });

  it('does not flag ALTER TABLE qr_codes ADD COLUMN new_col TEXT', () => {
    const sql = `ALTER TABLE qr_codes ADD COLUMN new_col TEXT;`;
    expect(lintMigrationContent(sql).violations).toEqual([]);
  });

  it('does not flag ALTER TABLE qr_codes ALTER COLUMN slug DROP DEFAULT (case-insensitive)', () => {
    const sql = `alter table qr_codes alter column slug drop default;`;
    expect(lintMigrationContent(sql).violations).toEqual([]);
  });

  it('does not flag ALTER TABLE "qr_codes" ADD COLUMN safe_new_col TEXT (quoted, safe ADD)', () => {
    const sql = `ALTER TABLE "qr_codes" ADD COLUMN safe_new_col TEXT;`;
    expect(lintMigrationContent(sql).violations).toEqual([]);
  });
});
