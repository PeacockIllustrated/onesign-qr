import { describe, it, expect } from 'vitest';
import {
  createInviteSchema,
  acceptInviteTokenSchema,
} from '@/validations/invite';

describe('createInviteSchema', () => {
  it('accepts valid email + admin role', () => {
    const r = createInviteSchema.safeParse({
      email: 'sarah@example.com',
      role: 'admin',
    });
    expect(r.success).toBe(true);
  });

  it('accepts valid email + member role', () => {
    const r = createInviteSchema.safeParse({
      email: 'bob@example.com',
      role: 'member',
    });
    expect(r.success).toBe(true);
  });

  it('rejects owner role (owner comes from org creation, not invite)', () => {
    const r = createInviteSchema.safeParse({
      email: 'x@x.com',
      role: 'owner',
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const r = createInviteSchema.safeParse({
      email: 'not-an-email',
      role: 'member',
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty email', () => {
    const r = createInviteSchema.safeParse({ email: '', role: 'member' });
    expect(r.success).toBe(false);
  });

  it('rejects unknown role', () => {
    const r = createInviteSchema.safeParse({
      email: 'x@x.com',
      role: 'super',
    });
    expect(r.success).toBe(false);
  });
});

describe('acceptInviteTokenSchema', () => {
  it('accepts a valid token string', () => {
    const r = acceptInviteTokenSchema.safeParse({
      token: 'abc123XYZ_-def456' + 'a'.repeat(10),
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty token', () => {
    const r = acceptInviteTokenSchema.safeParse({ token: '' });
    expect(r.success).toBe(false);
  });

  it('rejects tokens with unsupported characters', () => {
    const r = acceptInviteTokenSchema.safeParse({
      token: 'has spaces and #symbols',
    });
    expect(r.success).toBe(false);
  });
});
