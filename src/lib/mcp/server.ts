import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateUrlStrict } from '@/lib/security/url-validator-strict';
import { validateUrl } from '@/lib/security/url-validator';
import { checkQrCreateLimit, checkApiLimit } from '@/lib/security/rate-limiter';
import { writeAuditLog, determineUpdateAction } from '@/lib/audit';
import { isValidUUID } from '@/validations/qr';
import {
  MODULE_SHAPES,
  EYE_SHAPES,
  ERROR_CORRECTION_LEVELS,
  QR_DEFAULTS,
  SLUG_CONFIG,
} from '@/lib/constants';
import type { ApiKeyContext } from '@/lib/api-keys';
import { renderPng, encodedContent, styleOf, type QrRow } from './render';
import { createDownloadToken, DOWNLOAD_TTL_SECONDS } from './download-token';

const MAX_SLUG_RETRIES = 3;
const PREVIEW_SIZE = 512;
const PDF_PRESETS = ['sticker-50mm', 'sticker-75mm', 'sticker-100mm', 'a4'] as const;

const SERVER_INSTRUCTIONS = `Lynx is OneSign & Digital's QR code platform. Use these tools whenever the user asks to make, find, change or export a QR code.

- Prefer mode "managed" (the default): the code points at a short Lynx link (/r/slug), so the destination can be changed later without reprinting, and scans are counted. Use "direct" only when the user explicitly wants the URL baked into the code (no tracking, cannot be changed).
- Give every code a short, human name the user will recognise in their dashboard (e.g. "Café menu - table talker").
- After creating or exporting, show the user the preview and give them the download links and dashboard link exactly as returned. Download links expire after 24 hours.
- Colours are hex (#RRGGBB). Keep strong contrast: dark foreground on a light background. A light foreground on a dark background often fails to scan.
- To change where a printed managed code goes, use update_qr_code with a new destination_url; never create a new code for that.
- Deleting codes is not available here; send the user to the dashboard.`;

const styleShape = {
  foreground_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
    .describe('Module colour as #RRGGBB. Default #000000.'),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
    .describe('Background colour as #RRGGBB. Default #FFFFFF.'),
  module_shape: z.enum(MODULE_SHAPES).optional().describe('Shape of the data dots. Default square.'),
  eye_shape: z.enum(EYE_SHAPES).optional().describe('Shape of the three corner finder "eyes". Default square.'),
  error_correction: z.enum(ERROR_CORRECTION_LEVELS).optional()
    .describe('L/M/Q/H. Higher survives more damage but makes a denser code. Default M.'),
  quiet_zone: z.number().int().min(QR_DEFAULTS.MIN_QUIET_ZONE).max(QR_DEFAULTS.MAX_QUIET_ZONE).optional()
    .describe('Blank border in modules. Default 4.'),
};

type StyleInput = {
  foreground_color?: string;
  background_color?: string;
  module_shape?: (typeof MODULE_SHAPES)[number];
  eye_shape?: (typeof EYE_SHAPES)[number];
  error_correction?: (typeof ERROR_CORRECTION_LEVELS)[number];
  quiet_zone?: number;
};

function pickStyle(input: StyleInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ['foreground_color', 'background_color', 'module_shape', 'eye_shape', 'error_correction', 'quiet_zone'] as const) {
    if (input[k] !== undefined) out[k] = input[k];
  }
  return out;
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

function errorResult(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

const QR_SELECT =
  'id, name, mode, slug, carrier, destination_url, is_active, analytics_enabled, total_scans, last_scanned_at, created_at, updated_at, qr_styles(foreground_color, background_color, error_correction, quiet_zone, module_shape, eye_shape)';

export interface McpRequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Build an MCP server whose tools act as the API key's user, inside the key's
 * organisation. Every query is scoped by owner_id + org_id because the
 * service-role client bypasses RLS.
 */
export function createLynxMcpServer(ctx: ApiKeyContext, meta: McpRequestMeta = {}): McpServer {
  const server = new McpServer(
    { name: 'lynx-qr', title: 'OneSign Lynx QR codes', version: '1.0.0' },
    { instructions: SERVER_INSTRUCTIONS }
  );

  const db = () => createAdminClient();

  async function loadQr(id: string): Promise<QrRow | null> {
    if (!isValidUUID(id)) return null;
    const { data } = await db()
      .from('qr_codes')
      .select(QR_SELECT)
      .eq('id', id)
      .eq('owner_id', ctx.userId)
      .eq('org_id', ctx.orgId)
      .is('deleted_at', null)
      .maybeSingle();
    return (data as QrRow | null) ?? null;
  }

  function downloadLinks(qr: QrRow, opts: { pngSize?: number; preset?: (typeof PDF_PRESETS)[number] } = {}) {
    const base = { qrId: qr.id, userId: ctx.userId, orgId: ctx.orgId };
    const link = (p: Parameters<typeof createDownloadToken>[0]) =>
      `${appUrl()}/api/mcp/download/${createDownloadToken(p)}`;
    return {
      png: link({ ...base, format: 'png', size: opts.pngSize ?? 1024 }),
      svg: link({ ...base, format: 'svg' }),
      pdf: link({ ...base, format: 'pdf', preset: opts.preset ?? 'sticker-75mm' }),
    };
  }

  function summary(qr: QrRow) {
    const s = styleOf(qr);
    return {
      id: qr.id,
      name: qr.name,
      mode: qr.mode,
      encodes: encodedContent(qr),
      destination_url: qr.destination_url,
      short_link: qr.mode === 'managed' && qr.slug ? `${appUrl()}/r/${qr.slug}` : null,
      is_active: qr.is_active,
      analytics_enabled: qr.analytics_enabled,
      total_scans: qr.total_scans ?? 0,
      last_scanned_at: qr.last_scanned_at ?? null,
      created_at: qr.created_at,
      style: s,
      dashboard_url: `${appUrl()}/app/qr/${qr.id}`,
    };
  }

  async function withPreview(
    qr: QrRow,
    extra: Record<string, unknown>,
    linkOpts?: Parameters<typeof downloadLinks>[1],
    previewSize = PREVIEW_SIZE
  ): Promise<CallToolResult> {
    const png = await renderPng(qr, previewSize);
    const body = {
      ...extra,
      qr_code: summary(qr),
      downloads: downloadLinks(qr, linkOpts),
      downloads_expire_in_hours: DOWNLOAD_TTL_SECONDS / 3600,
    };
    return {
      content: [
        { type: 'image', data: png.toString('base64'), mimeType: 'image/png' },
        { type: 'text', text: JSON.stringify(body, null, 2) },
      ],
      structuredContent: body,
    };
  }

  // ── create_qr_code ────────────────────────────────────────────────────
  server.registerTool(
    'create_qr_code',
    {
      title: 'Create QR code',
      description:
        'Create a new QR code in the user\'s Lynx account and return a preview image plus PNG/SVG/PDF download links. ' +
        'Managed codes (default) redirect through a Lynx short link so the destination can be edited later and scans are tracked.',
      inputSchema: {
        name: z.string().min(1).max(100).describe('Friendly name shown in the Lynx dashboard.'),
        destination_url: z.string().min(1).max(2048).describe('Where the code should send people (http/https).'),
        mode: z.enum(['managed', 'direct']).optional()
          .describe('managed (default): editable short link with analytics. direct: URL baked into the code.'),
        slug: z.string().min(SLUG_CONFIG.MIN_LENGTH).max(SLUG_CONFIG.MAX_LENGTH).regex(SLUG_CONFIG.PATTERN).optional()
          .describe('Optional custom short-link slug for managed codes (lowercase letters, numbers, hyphens).'),
        analytics_enabled: z.boolean().optional().describe('Track scans (managed only). Default true.'),
        ...styleShape,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (args) => {
      const limit = checkQrCreateLimit(ctx.userId);
      if (!limit.success) return errorResult('Rate limit reached: too many QR codes created in the last minute. Try again shortly.');

      const mode = args.mode ?? 'managed';
      const urlCheck = await validateUrlStrict(args.destination_url);
      if (!urlCheck.isValid) return errorResult(`Destination URL rejected: ${urlCheck.error}`);

      const admin = db();
      let slug = mode === 'managed' ? args.slug : undefined;
      let createdId: string | null = null;

      for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
        if (mode === 'managed' && !slug) {
          const { data, error } = await admin.rpc('generate_qr_unique_slug');
          if (error || !data) return errorResult('Could not generate a short link. Please try again.');
          slug = data as string;
        }

        const { data, error } = await admin
          .from('qr_codes')
          .insert({
            owner_id: ctx.userId,
            org_id: ctx.orgId,
            name: args.name.trim(),
            mode,
            slug: mode === 'managed' ? slug : null,
            carrier: 'qr',
            destination_url: urlCheck.normalizedUrl,
            analytics_enabled: mode === 'managed' ? (args.analytics_enabled ?? true) : false,
          })
          .select('id')
          .single();

        if (error) {
          if (error.code === '23505' && mode === 'managed') {
            if (args.slug) return errorResult(`The short link "${args.slug}" is already taken. Pick another slug or leave it out.`);
            slug = undefined;
            continue;
          }
          console.error('[mcp] create_qr_code insert failed:', error.message);
          return errorResult('Failed to create the QR code.');
        }
        createdId = data.id as string;
        break;
      }

      if (!createdId) return errorResult('Failed to create the QR code after several attempts.');

      const styleUpdate = pickStyle(args);
      if (Object.keys(styleUpdate).length > 0) {
        await admin.from('qr_styles').update(styleUpdate).eq('qr_id', createdId);
      }

      void writeAuditLog({
        qrId: createdId,
        actorId: ctx.userId,
        action: 'created',
        newValue: { name: args.name, mode, destination_url: urlCheck.normalizedUrl, slug, via: 'mcp' },
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      });

      const qr = await loadQr(createdId);
      if (!qr) return errorResult('QR code was created but could not be loaded.');
      return withPreview(qr, { created: true });
    }
  );

  // ── list_qr_codes ─────────────────────────────────────────────────────
  server.registerTool(
    'list_qr_codes',
    {
      title: 'List QR codes',
      description: 'List the user\'s QR codes in Lynx, newest first. Optionally filter by a search term matched against the name or destination.',
      inputSchema: {
        search: z.string().max(100).optional().describe('Text to match in the name or destination URL.'),
        limit: z.number().int().min(1).max(100).optional().describe('Max results (default 20).'),
        offset: z.number().int().min(0).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const limit = checkApiLimit(ctx.userId);
      if (!limit.success) return errorResult('Rate limit reached. Try again in a minute.');

      const take = args.limit ?? 20;
      const skip = args.offset ?? 0;
      let query = db()
        .from('qr_codes')
        .select(QR_SELECT, { count: 'exact' })
        .eq('owner_id', ctx.userId)
        .eq('org_id', ctx.orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(skip, skip + take - 1);

      if (args.search) {
        // Strip characters that have meaning in PostgREST filter syntax.
        const term = args.search.replace(/[%,()*\\]/g, ' ').trim();
        if (term) query = query.or(`name.ilike.%${term}%,destination_url.ilike.%${term}%`);
      }

      const { data, error, count } = await query;
      if (error) {
        console.error('[mcp] list_qr_codes failed:', error.message);
        return errorResult('Failed to list QR codes.');
      }

      const body = {
        total: count ?? 0,
        offset: skip,
        qr_codes: ((data ?? []) as QrRow[]).map((qr) => {
          const s = summary(qr);
          return {
            id: s.id,
            name: s.name,
            mode: s.mode,
            destination_url: s.destination_url,
            short_link: s.short_link,
            is_active: s.is_active,
            total_scans: s.total_scans,
            created_at: s.created_at,
            dashboard_url: s.dashboard_url,
          };
        }),
      };
      return { content: [{ type: 'text', text: JSON.stringify(body, null, 2) }], structuredContent: body };
    }
  );

  // ── get_qr_code ───────────────────────────────────────────────────────
  server.registerTool(
    'get_qr_code',
    {
      title: 'Get QR code',
      description: 'Fetch one QR code by id, with a preview image and fresh download links.',
      inputSchema: { id: z.string().describe('QR code id (UUID) from create_qr_code or list_qr_codes.') },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const limit = checkApiLimit(ctx.userId);
      if (!limit.success) return errorResult('Rate limit reached. Try again in a minute.');
      const qr = await loadQr(id);
      if (!qr) return errorResult('QR code not found.');
      return withPreview(qr, {});
    }
  );

  // ── update_qr_code ────────────────────────────────────────────────────
  server.registerTool(
    'update_qr_code',
    {
      title: 'Update QR code',
      description:
        'Change a QR code: rename it, point a managed code at a new destination (no reprint needed), pause/resume it, or restyle it. ' +
        'Changing the destination of a direct code changes the printed pattern, so it must be reprinted.',
      inputSchema: {
        id: z.string().describe('QR code id (UUID).'),
        name: z.string().min(1).max(100).optional(),
        destination_url: z.string().min(1).max(2048).optional(),
        is_active: z.boolean().optional().describe('false pauses a managed code (scans show an inactive page).'),
        analytics_enabled: z.boolean().optional(),
        ...styleShape,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      const limit = checkApiLimit(ctx.userId);
      if (!limit.success) return errorResult('Rate limit reached. Try again in a minute.');

      const existing = await loadQr(args.id);
      if (!existing) return errorResult('QR code not found.');

      const qrUpdate: Record<string, unknown> = {};
      if (args.name !== undefined) qrUpdate.name = args.name.trim();
      if (args.is_active !== undefined) qrUpdate.is_active = args.is_active;
      if (args.analytics_enabled !== undefined) qrUpdate.analytics_enabled = args.analytics_enabled;
      if (args.destination_url !== undefined) {
        const check = validateUrl(args.destination_url);
        if (!check.isValid) return errorResult(`Destination URL rejected: ${check.error}`);
        qrUpdate.destination_url = check.normalizedUrl;
      }
      const styleUpdate = pickStyle(args);

      if (Object.keys(qrUpdate).length === 0 && Object.keys(styleUpdate).length === 0) {
        return errorResult('Nothing to update: pass at least one field to change.');
      }

      const admin = db();
      if (Object.keys(qrUpdate).length > 0) {
        const { error } = await admin
          .from('qr_codes')
          .update(qrUpdate)
          .eq('id', existing.id)
          .eq('owner_id', ctx.userId)
          .eq('org_id', ctx.orgId);
        if (error) {
          console.error('[mcp] update_qr_code failed:', error.message);
          return errorResult('Failed to update the QR code.');
        }
      }
      if (Object.keys(styleUpdate).length > 0) {
        const { error } = await admin.from('qr_styles').update(styleUpdate).eq('qr_id', existing.id);
        if (error) {
          console.error('[mcp] update_qr_code style failed:', error.message);
          return errorResult('Failed to update the QR code style.');
        }
      }

      void writeAuditLog({
        qrId: existing.id,
        actorId: ctx.userId,
        action: determineUpdateAction(qrUpdate, styleUpdate),
        previousValue: { destination_url: existing.destination_url, name: existing.name, is_active: existing.is_active },
        newValue: { ...qrUpdate, ...styleUpdate, via: 'mcp' },
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      });

      const qr = await loadQr(existing.id);
      if (!qr) return errorResult('QR code was updated but could not be reloaded.');

      const notes: string[] = [];
      if (qrUpdate.destination_url && qr.mode === 'direct') {
        notes.push('This is a direct code: the pattern changed, so any printed copies still go to the old URL and must be reprinted.');
      }
      if (qrUpdate.destination_url && qr.mode === 'managed') {
        notes.push('Printed copies keep working and now send people to the new destination.');
      }
      return withPreview(qr, { updated: true, notes });
    }
  );

  // ── export_qr_code ────────────────────────────────────────────────────
  server.registerTool(
    'export_qr_code',
    {
      title: 'Export QR code',
      description:
        'Get print/web files for an existing QR code: a PNG at a chosen pixel size, an SVG (vector, best for print/sign-making) and a PDF at a sticker/A4 preset.',
      inputSchema: {
        id: z.string().describe('QR code id (UUID).'),
        png_size: z.number().int().min(64).max(4096).optional().describe('PNG width/height in px. Default 1024.'),
        pdf_preset: z.enum(PDF_PRESETS).optional().describe('PDF page preset. Default sticker-75mm.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const limit = checkApiLimit(ctx.userId);
      if (!limit.success) return errorResult('Rate limit reached. Try again in a minute.');
      const qr = await loadQr(args.id);
      if (!qr) return errorResult('QR code not found.');
      return withPreview(qr, {}, { pngSize: args.png_size, preset: args.pdf_preset });
    }
  );

  // ── get_qr_analytics ──────────────────────────────────────────────────
  server.registerTool(
    'get_qr_analytics',
    {
      title: 'QR scan analytics',
      description: 'Scan counts and breakdowns (by day, country, device) for a managed QR code with analytics enabled.',
      inputSchema: {
        id: z.string().describe('QR code id (UUID).'),
        period: z.enum(['7d', '30d', '90d']).optional().describe('Default 30d.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id, period = '30d' }) => {
      const limit = checkApiLimit(ctx.userId);
      if (!limit.success) return errorResult('Rate limit reached. Try again in a minute.');
      const qr = await loadQr(id);
      if (!qr) return errorResult('QR code not found.');
      if (!qr.analytics_enabled) return errorResult('Analytics are not enabled for this QR code.');

      const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await db()
        .from('qr_scan_events')
        .select('scanned_at, country_code, device_type')
        .eq('qr_id', qr.id)
        .gte('scanned_at', since)
        .order('scanned_at', { ascending: false })
        .limit(10000);
      if (error) return errorResult('Failed to load analytics.');

      const events = data ?? [];
      const count = (key: 'country_code' | 'device_type') => {
        const m = new Map<string, number>();
        for (const e of events) {
          const k = e[key] as string | null;
          if (k) m.set(k, (m.get(k) ?? 0) + 1);
        }
        return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => ({ [key]: k, count: n }));
      };
      const byDay = new Map<string, number>();
      for (const e of events) {
        const d = (e.scanned_at as string).slice(0, 10);
        byDay.set(d, (byDay.get(d) ?? 0) + 1);
      }
      const scansByDay: Array<{ date: string; count: number }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
        scansByDay.push({ date: d, count: byDay.get(d) ?? 0 });
      }

      const body = {
        id: qr.id,
        name: qr.name,
        period,
        total_scans_all_time: qr.total_scans ?? 0,
        scans_in_period: events.length,
        last_scanned_at: qr.last_scanned_at ?? null,
        top_countries: count('country_code'),
        devices: count('device_type'),
        scans_by_day: scansByDay,
        dashboard_url: `${appUrl()}/app/qr/${qr.id}`,
      };
      return { content: [{ type: 'text', text: JSON.stringify(body, null, 2) }], structuredContent: body };
    }
  );

  return server;
}
