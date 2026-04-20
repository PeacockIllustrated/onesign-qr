import { describe, it, expect } from 'vitest';
import {
  generateInviteToken,
  INVITE_EXPIRY_SECONDS,
} from '@/lib/org/invite-tokens';

describe('generateInviteToken', () => {
  it('returns a string at least 40 chars long', () => {
    const token = generateInviteToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('contains only URL-safe characters (base64url alphabet)', () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('returns distinct tokens on successive calls', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 20; i++) tokens.add(generateInviteToken());
    expect(tokens.size).toBe(20);
  });
});

describe('INVITE_EXPIRY_SECONDS', () => {
  it('is 7 days in seconds', () => {
    expect(INVITE_EXPIRY_SECONDS).toBe(60 * 60 * 24 * 7);
  });
});
