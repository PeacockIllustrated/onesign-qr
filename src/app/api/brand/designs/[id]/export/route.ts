import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';
import { hydrateBrandDesign } from '@/lib/brand/hydrate';
import { launchChromium } from '@/lib/brand/chromium';
import { buildCardPrintHtml } from '@/lib/brand/build-print-html';
import { renderTemplate } from '@/components/brand/templates';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';

// PDF generation needs the Node.js runtime; Chromium can't run on the edge.
export const runtime = 'nodejs';
// 60s is the Vercel Pro maximum. Chromium download + launch on cold start
// can take 15-25s, plus render time. Give it the full window.
export const maxDuration = 60;
// Chromium can OOM at the default 1024 MB when rendering pages with several
// web fonts. Bump to 1769 MB which is the next standard tier on Vercel Pro.
export const memory = 1769;

/**
 * POST /api/brand/designs/[id]/export
 *
 * Body: { format: 'pdf' | 'html' }
 *
 * - business_card + pdf  → print-ready PDF (bleed + crop marks)
 * - email_signature + html → HTML string ready to paste into Gmail/Outlook
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid design ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rateLimit) });
  }

  const body = await request.json().catch(() => ({}));
  const format: 'pdf' | 'html' = body.format === 'html' ? 'html' : 'pdf';

  const { data: design, error } = await supabase
    .from('brand_designs')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  const hydrated = await hydrateBrandDesign(supabase, design);

  // ─── Email signature → HTML ─────────────────────────────────────
  if (hydrated.kind === 'email_signature') {
    if (format === 'pdf') {
      return NextResponse.json({ error: 'Email signatures export as HTML only' }, { status: 400 });
    }
    const { renderToStaticMarkup } = await import('react-dom/server');
    const sigHtml = renderToStaticMarkup(renderTemplate(hydrated) as React.ReactElement);
    const fullDoc = `<!doctype html><html><head><meta charset="utf-8"></head><body>${sigHtml}</body></html>`;
    return new NextResponse(fullDoc, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slugify(hydrated.name)}-signature.html"`,
        ...getRateLimitHeaders(rateLimit),
      },
    });
  }

  // ─── Business card → PDF via Puppeteer ──────────────────────────
  if (hydrated.kind === 'business_card') {
    if (format === 'html') {
      const html = await buildCardPrintHtml(hydrated);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...getRateLimitHeaders(rateLimit),
        },
      });
    }

    // Each step is logged with a marker so Vercel Function logs let us see
    // exactly which phase is failing on cold start.
    const t0 = Date.now();
    let browser;
    let phase = 'init';
    try {
      phase = 'launch-chromium';
      console.log('[brand-export] launching chromium…');
      browser = await launchChromium();
      console.log(`[brand-export] chromium launched in ${Date.now() - t0}ms`);

      phase = 'new-page';
      const page = await browser.newPage();

      phase = 'build-html';
      const html = await buildCardPrintHtml(hydrated);

      phase = 'set-content';
      // 'networkidle0' can hang for font CDNs that hold connections open;
      // switch to 'load' and wait for fonts explicitly below.
      await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });

      phase = 'wait-fonts';
      // Race fonts.ready against a 5s ceiling so a Google Fonts hiccup
      // doesn't block the whole export.
      await Promise.race([
        page.evaluateHandle('document.fonts.ready'),
        new Promise((resolve) => setTimeout(resolve, 5_000)),
      ]);

      phase = 'page-pdf';
      const pdf = await page.pdf({
        width: `${CARD_DIMENSIONS.bleed_width_mm}mm`,
        height: `${CARD_DIMENSIONS.bleed_height_mm}mm`,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      console.log(`[brand-export] pdf done in ${Date.now() - t0}ms, ${pdf.byteLength} bytes`);

      return new NextResponse(Buffer.from(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${slugify(hydrated.name)}.pdf"`,
          ...getRateLimitHeaders(rateLimit),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error(`[brand-export] FAILED at phase=${phase} after ${Date.now() - t0}ms:`, msg, stack);
      return NextResponse.json(
        { error: 'PDF generation failed', phase, details: msg },
        { status: 500 }
      );
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
  }

  return NextResponse.json({ error: 'Unsupported design kind' }, { status: 400 });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'design';
}
