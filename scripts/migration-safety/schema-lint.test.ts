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
