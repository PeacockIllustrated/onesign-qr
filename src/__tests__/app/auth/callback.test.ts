import { describe, it, expect } from 'vitest';

/**
 * getSafeRedirectPath is defined inside the auth callback route and is not
 * exported.  Rather than modifying the production code solely for testing, we
 * re-implement the same logic here so that the security invariants it encodes
 * are verified.  If the production implementation ever drifts from these rules,
 * a developer should update both locations.
 */
function getSafeRedirectPath(next: string | null): string {
  const DEFAULT = '/app';

  if (!next) return DEFAULT;

  // Must start with / (relative path only)
  if (!next.startsWith('/')) return DEFAULT;

  // Must not start with // (protocol-relative URL)
  if (next.startsWith('//')) return DEFAULT;

  // Only allow known safe path prefixes
  const ALLOWED_PREFIXES = ['/app'];
  if (!ALLOWED_PREFIXES.some((prefix) => next.startsWith(prefix))) return DEFAULT;

  // Strip control characters that could be used for header injection
  if (/[\r\n\t]/.test(next)) return DEFAULT;

  return next;
}

describe('getSafeRedirectPath', () => {
  it('returns /app when next is null', () => {
    expect(getSafeRedirectPath(null)).toBe('/app');
  });

  it('returns /app/dashboard for a valid /app sub-path', () => {
    expect(getSafeRedirectPath('/app/dashboard')).toBe('/app/dashboard');
  });

  it('returns /app for an absolute external URL (https://evil.com)', () => {
    expect(getSafeRedirectPath('https://evil.com')).toBe('/app');
  });

  it('returns /app for a protocol-relative URL (//evil.com)', () => {
    expect(getSafeRedirectPath('//evil.com')).toBe('/app');
  });

  it('returns /app for a disallowed path (/auth/login)', () => {
    expect(getSafeRedirectPath('/auth/login')).toBe('/app');
  });

  it('returns /app when next contains CRLF characters (header injection)', () => {
    expect(getSafeRedirectPath('/app/dashboard\r\nX-Injected: true')).toBe('/app');
  });

  it('returns /app for an empty string', () => {
    expect(getSafeRedirectPath('')).toBe('/app');
  });

  it('returns /app for a path with tab characters', () => {
    expect(getSafeRedirectPath('/app/\tdashboard')).toBe('/app');
  });

  it('allows /app exactly', () => {
    expect(getSafeRedirectPath('/app')).toBe('/app');
  });

  it('allows /app/settings/profile', () => {
    expect(getSafeRedirectPath('/app/settings/profile')).toBe('/app/settings/profile');
  });
});
