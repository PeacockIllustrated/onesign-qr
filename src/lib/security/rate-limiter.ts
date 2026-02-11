import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RATE_LIMITS } from '../constants';

/**
 * Production-ready rate limiter with Upstash Redis backend.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured (required for
 * production / serverless environments like Vercel where in-memory state is
 * lost between invocations). Falls back to an in-memory Map for local
 * development only.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = isUpstashConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

// ---------------------------------------------------------------------------
// In-memory fallback (local dev only)
// ---------------------------------------------------------------------------

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

// Periodic cleanup to prevent memory leaks during long dev sessions
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetAt < now) {
        memoryStore.delete(key);
      }
    }
  }, 60_000);
}

function checkMemoryRateLimit(
  identifier: string,
  limit: number,
  windowMs: number = 60_000,
): RateLimitResult {
  const now = Date.now();
  let entry = memoryStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
  }

  entry.count++;
  memoryStore.set(identifier, entry);

  return {
    success: entry.count <= limit,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

// ---------------------------------------------------------------------------
// Upstash-backed limiters (one per category to allow different windows)
// ---------------------------------------------------------------------------

function createUpstashLimiter(limit: number, windowMs: number = 60_000) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    analytics: true,
    prefix: 'onesign-qr',
  });
}

const upstashLimiters = {
  qrCreate: createUpstashLimiter(RATE_LIMITS.QR_CREATE),
  export: createUpstashLimiter(RATE_LIMITS.QR_EXPORT),
  api: createUpstashLimiter(RATE_LIMITS.API_GENERAL),
  redirect: createUpstashLimiter(RATE_LIMITS.REDIRECT),
  urlValidate: createUpstashLimiter(RATE_LIMITS.URL_VALIDATE),
  bioCreate: createUpstashLimiter(RATE_LIMITS.BIO_CREATE),
  bioTrack: createUpstashLimiter(RATE_LIMITS.BIO_TRACK),
};

// ---------------------------------------------------------------------------
// Unified async check function
// ---------------------------------------------------------------------------

async function checkLimit(
  category: keyof typeof upstashLimiters,
  identifier: string,
  limit: number,
): Promise<RateLimitResult> {
  const limiter = upstashLimiters[category];

  if (limiter) {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  }

  // Fallback for local development
  return checkMemoryRateLimit(`${category}:${identifier}`, limit);
}

// ---------------------------------------------------------------------------
// Synchronous API (used by middleware where async adds latency)
// ---------------------------------------------------------------------------

/**
 * Synchronous rate limit check — uses in-memory store only.
 * Safe to call from Next.js middleware. For route handlers, prefer the
 * async variants which use Upstash Redis in production.
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number = 60_000,
): RateLimitResult {
  return checkMemoryRateLimit(identifier, limit, windowMs);
}

/** Rate limit for QR creation (10/min) — sync/in-memory */
export function checkQrCreateLimit(identifier: string): RateLimitResult {
  return checkMemoryRateLimit(`qr-create:${identifier}`, RATE_LIMITS.QR_CREATE);
}

/** Rate limit for QR export (30/min) — sync/in-memory */
export function checkExportLimit(identifier: string): RateLimitResult {
  return checkMemoryRateLimit(`export:${identifier}`, RATE_LIMITS.QR_EXPORT);
}

/** Rate limit for general API requests (60/min) — sync/in-memory */
export function checkApiLimit(identifier: string): RateLimitResult {
  return checkMemoryRateLimit(`api:${identifier}`, RATE_LIMITS.API_GENERAL);
}

/** Rate limit for redirect handler (1000/min) — sync/in-memory */
export function checkRedirectLimit(identifier: string): RateLimitResult {
  return checkMemoryRateLimit(`redirect:${identifier}`, RATE_LIMITS.REDIRECT);
}

// ---------------------------------------------------------------------------
// Async API — uses Upstash Redis when available (preferred for route handlers)
// ---------------------------------------------------------------------------

/** Async rate limit for QR creation — uses Upstash Redis in production */
export function checkQrCreateLimitAsync(identifier: string) {
  return checkLimit('qrCreate', identifier, RATE_LIMITS.QR_CREATE);
}

/** Async rate limit for QR export — uses Upstash Redis in production */
export function checkExportLimitAsync(identifier: string) {
  return checkLimit('export', identifier, RATE_LIMITS.QR_EXPORT);
}

/** Async rate limit for general API — uses Upstash Redis in production */
export function checkApiLimitAsync(identifier: string) {
  return checkLimit('api', identifier, RATE_LIMITS.API_GENERAL);
}

/** Async rate limit for redirect handler — uses Upstash Redis in production */
export function checkRedirectLimitAsync(identifier: string) {
  return checkLimit('redirect', identifier, RATE_LIMITS.REDIRECT);
}

/** Rate limit for bio page creation (10/min) — sync/in-memory */
export function checkBioCreateLimit(identifier: string): RateLimitResult {
  return checkMemoryRateLimit(`bio-create:${identifier}`, RATE_LIMITS.BIO_CREATE);
}

/** Rate limit for bio click tracking (1000/min) — sync/in-memory */
export function checkBioTrackLimit(identifier: string): RateLimitResult {
  return checkMemoryRateLimit(`bio-track:${identifier}`, RATE_LIMITS.BIO_TRACK);
}

/** Async rate limit for bio page creation — uses Upstash Redis in production */
export function checkBioCreateLimitAsync(identifier: string) {
  return checkLimit('bioCreate', identifier, RATE_LIMITS.BIO_CREATE);
}

/** Async rate limit for bio click tracking — uses Upstash Redis in production */
export function checkBioTrackLimitAsync(identifier: string) {
  return checkLimit('bioTrack', identifier, RATE_LIMITS.BIO_TRACK);
}

// ---------------------------------------------------------------------------
// Response headers
// ---------------------------------------------------------------------------

/** Build standard rate limit response headers */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.success
      ? {}
      : {
          'Retry-After': String(
            Math.ceil((result.resetAt - Date.now()) / 1000),
          ),
        }),
  };
}
