import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { checkRedirectLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';

export async function middleware(request: NextRequest) {
  // -----------------------------------------------------------------------
  // Request ID — attach a unique ID to every request for tracing / logging
  // Uses Web Crypto API (available in Edge Runtime, unlike Node's crypto module)
  // -----------------------------------------------------------------------
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Attach request ID to every response
  response.headers.set('x-request-id', requestId);

  const pathname = request.nextUrl.pathname;

  // -----------------------------------------------------------------------
  // CSRF protection for mutating API requests
  //
  // Validates that the Origin header matches the app's own origin for
  // POST, PATCH, PUT, DELETE requests to /api/*. This is a lightweight,
  // stateless CSRF check appropriate for a same-origin SPA.
  // -----------------------------------------------------------------------
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/health') &&
    ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)
  ) {
    const origin = request.headers.get('origin');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (origin && appUrl) {
      try {
        const allowedOrigin = new URL(appUrl).origin;
        // In development, also allow local origins so the CSRF check
        // doesn't reject requests when NEXT_PUBLIC_APP_URL points to a
        // production domain.
        const originHostname = new URL(origin).hostname;
        const isLocalOrigin =
          process.env.NODE_ENV === 'development' &&
          (originHostname === 'localhost' || originHostname === '127.0.0.1' || originHostname.startsWith('192.168.'));

        if (origin !== allowedOrigin && !isLocalOrigin) {
          return NextResponse.json(
            { error: 'CSRF validation failed' },
            { status: 403, headers: { 'x-request-id': requestId } }
          );
        }
      } catch {
        // If NEXT_PUBLIC_APP_URL is invalid, reject the request
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500, headers: { 'x-request-id': requestId } }
        );
      }
    }
  }

  // -----------------------------------------------------------------------
  // Rate limit redirect handler (/r/ for QR redirects)
  // -----------------------------------------------------------------------
  if (pathname.startsWith('/r/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const rateLimit = checkRedirectLimit(ip);

    if (!rateLimit.success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          ...getRateLimitHeaders(rateLimit),
          'x-request-id': requestId,
        },
      });
    }

    // Don't require auth for redirects
    response.headers.set('x-request-id', requestId);
    return response;
  }

  // -----------------------------------------------------------------------
  // Rate limit bio-link pages (/p/ for public bio pages)
  // -----------------------------------------------------------------------
  if (pathname.startsWith('/p/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const rateLimit = checkRedirectLimit(ip);

    if (!rateLimit.success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          ...getRateLimitHeaders(rateLimit),
          'x-request-id': requestId,
        },
      });
    }

    // Don't require auth for public bio pages
    response.headers.set('x-request-id', requestId);
    return response;
  }

  // -----------------------------------------------------------------------
  // Supabase session management
  // -----------------------------------------------------------------------
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          // Re-attach request ID after response recreation
          response.headers.set('x-request-id', requestId);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if it exists
  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes
  if (pathname.startsWith('/app')) {
    if (!user) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Auth routes - redirect to app if already logged in
  if (pathname.startsWith('/auth') && !pathname.startsWith('/auth/reset-password') && user) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
