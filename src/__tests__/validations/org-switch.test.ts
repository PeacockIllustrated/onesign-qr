import { describe, it, expect } from 'vitest';
import { orgSwitchSchema } from '@/validations/org-switch';

describe('orgSwitchSchema', () => {
  it('accepts a valid UUID orgId', () => {
    const result = orgSwitchSchema.safeParse({
      orgId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing orgId', () => {
    expect(orgSwitchSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a non-UUID orgId', () => {
    expect(orgSwitchSchema.safeParse({ orgId: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects an empty orgId', () => {
    expect(orgSwitchSchema.safeParse({ orgId: '' }).success).toBe(false);
  });
});
