import { describe, it, expect } from 'vitest';
import { BIO_TEMPLATES_LIST } from '@/lib/bio/templates';
import { blockContentSchemas } from '@/validations/bio';

describe('Bio templates', () => {
  it('defines exactly 4 templates', () => {
    expect(BIO_TEMPLATES_LIST).toHaveLength(4);
  });

  it('each template has required fields', () => {
    for (const t of BIO_TEMPLATES_LIST) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.theme).toBeTruthy();
      expect(t.blocks.length).toBeGreaterThan(0);
    }
  });

  it('all template blocks have valid content for their type', () => {
    for (const t of BIO_TEMPLATES_LIST) {
      for (const b of t.blocks) {
        const schema = blockContentSchemas[b.block_type];
        expect(schema, `Missing schema for ${b.block_type}`).toBeDefined();
        const result = schema.safeParse(b.content);
        expect(
          result.success,
          `Invalid content for ${b.block_type} in template ${t.id}: ${JSON.stringify(result)}`
        ).toBe(true);
      }
    }
  });

  it('each template has unique id', () => {
    const ids = BIO_TEMPLATES_LIST.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no block exceeds grid width', () => {
    for (const t of BIO_TEMPLATES_LIST) {
      for (const b of t.blocks) {
        expect(b.grid_col + b.grid_col_span).toBeLessThanOrEqual(4);
      }
    }
  });
});
