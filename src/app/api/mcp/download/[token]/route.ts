import { createAdminClient } from '@/lib/supabase/admin';
import { verifyDownloadToken } from '@/lib/mcp/download-token';
import { renderSvg, renderPng, renderPdf, type QrRow } from '@/lib/mcp/render';
import { checkExportLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';

/**
 * GET /api/mcp/download/<signed token>
 *
 * Serves a QR file for a link handed out by the MCP tools. The token is an
 * HMAC-signed, 24h payload (qr id, user, org, format). Ownership is re-checked
 * so a revoked or deleted code stops downloading.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'qr-code';
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const payload = verifyDownloadToken((await params).token);
  if (!payload) {
    return new Response('This download link is invalid or has expired. Ask Claude for a fresh one.', { status: 410 });
  }

  const limit = checkExportLimit(payload.userId);
  if (!limit.success) {
    return new Response('Too many downloads, try again shortly.', { status: 429, headers: getRateLimitHeaders(limit) });
  }

  const { data } = await createAdminClient()
    .from('qr_codes')
    .select('id, name, mode, slug, destination_url, is_active, analytics_enabled, qr_styles(foreground_color, background_color, error_correction, quiet_zone, module_shape, eye_shape)')
    .eq('id', payload.qrId)
    .eq('owner_id', payload.userId)
    .eq('org_id', payload.orgId)
    .is('deleted_at', null)
    .maybeSingle();

  const qr = data as QrRow | null;
  if (!qr) return new Response('QR code not found.', { status: 404 });

  const base = `${slugify(qr.name)}-qr`;
  const headers: Record<string, string> = { 'cache-control': 'private, no-store' };

  if (payload.format === 'svg') {
    const svg = await renderSvg(qr);
    return new Response(svg, {
      headers: { ...headers, 'content-type': 'image/svg+xml', 'content-disposition': `attachment; filename="${base}.svg"` },
    });
  }

  if (payload.format === 'pdf') {
    const pdf = await renderPdf(qr, payload.preset ?? 'sticker-75mm');
    return new Response(Buffer.from(pdf), {
      headers: { ...headers, 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="${base}.pdf"` },
    });
  }

  const size = Math.min(Math.max(payload.size ?? 1024, 64), 4096);
  const png = await renderPng(qr, size);
  return new Response(new Uint8Array(png), {
    headers: { ...headers, 'content-type': 'image/png', 'content-disposition': `attachment; filename="${base}-${size}px.png"` },
  });
}
