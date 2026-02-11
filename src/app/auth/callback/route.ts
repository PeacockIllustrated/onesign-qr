import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Validate the 'next' redirect parameter to prevent open redirect attacks.
 * Only allows relative paths under /app to prevent redirection to external sites.
 */
function getSafeRedirectPath(next: string | null): string {
  const DEFAULT = '/app';

  if (!next) return DEFAULT;

  // Must start with / (relative path only)
  if (!next.startsWith('/')) return DEFAULT;

  // Must not start with // (protocol-relative URL — browsers treat //evil.com as https://evil.com)
  if (next.startsWith('//')) return DEFAULT;

  // Only allow known safe path prefixes
  const ALLOWED_PREFIXES = ['/app', '/auth/reset-password'];
  if (!ALLOWED_PREFIXES.some((prefix) => next.startsWith(prefix))) return DEFAULT;

  // Strip control characters that could be used for header injection
  if (/[\r\n\t]/.test(next)) return DEFAULT;

  return next;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = getSafeRedirectPath(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // If there's an error, redirect to login with error message
  return NextResponse.redirect(new URL('/auth/login?error=auth', request.url));
}
