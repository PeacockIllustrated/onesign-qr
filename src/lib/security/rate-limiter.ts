import { RATE_LIMITS } from '../constants';

/**
 * Simple in-memory rate limiter
 * For production with multiple instances, use Redis (Upstash) instead
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store - will be cleared on server restart
// For production, use Redis
const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(store.entries());
  for (const [key, entry] of entries) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number = 60000 // 1 minute default
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  let entry = store.get(key);

  // If no entry or window has passed, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  // Increment count
  entry.count++;
  store.set(key, entry);

  const remaining = Math.max(0, limit - entry.count);
  const success = entry.count <= limit;

  return {
    success,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit for QR creation
 */
export function checkQrCreateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(`qr-create:${identifier}`, RATE_LIMITS.QR_CREATE);
}

/**
 * Rate limit for QR export
 */
export function checkExportLimit(identifier: string): RateLimitResult {
  return checkRateLimit(`export:${identifier}`, RATE_LIMITS.QR_EXPORT);
}

/**
 * Rate limit for general API requests
 */
export function checkApiLimit(identifier: string): RateLimitResult {
  return checkRateLimit(`api:${identifier}`, RATE_LIMITS.API_GENERAL);
}

/**
 * Rate limit for redirect handler
 */
export function checkRedirectLimit(identifier: string): RateLimitResult {
  return checkRateLimit(`redirect:${identifier}`, RATE_LIMITS.REDIRECT);
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.success ? {} : {
      'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
    }),
  };
}
