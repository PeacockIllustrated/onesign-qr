import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateUrl } from '@/lib/security/url-validator';
import { checkBioCreateLimit, checkApiLimit, checkQrCreateLimit } from '@/lib/security/rate-limiter';
import { writeBioAuditLog } from '@/lib/audit';
import { isValidUUID } from '@/validations/qr';
import { BIO_DEFAULTS, BIO_THEMES, BIO_BUTTON_STYLES, SOCIAL_PLATFORMS } from '@/lib/constants';
import type { ApiKeyContext } from '@/lib/api-keys';
import type { QrRow } from './render';
import { uiToolMeta } from './ui';
import { resolveFullThemeConfig } from '@/lib/bio/theme-definitions';
import type { BioLinkTheme } from '@/types/bio';

/**
 * Link page (bio page) tools for the Lynx MCP server.
 *
 * Pages use the grid block layout the dashboard editor uses: an optional
 * social-icons row followed by one full-width link button per row.
 */

const MAX_SLUG_RETRIES = 3;
const MAX_LINKS = 20;
const CARD_LAYOUTS = ['centered', 'left-aligned', 'split', 'minimal', 'cover'] as const;
const SOCIAL_IDS = SOCIAL_PLATFORMS.map((p) => p.id) as unknown as [string, ...string[]];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const linkInput = z.object({
  title: z.string().min(1).max(100).describe('Button label, e.g. "Book a table".'),
  url: z.string().min(1).max(2048).describe('http(s) link.'),
  icon: z.string().max(50).optional().describe('Optional emoji shown on the button, e.g. "📅".'),
});

const socialInput = z.object({
  platform: z.enum(SOCIAL_IDS).describe('Social platform id.'),
  url: z.string().min(1).max(2048).describe('Profile URL (or an email address for platform "email").'),
});

const pageDesignShape = {
  bio: z.string().max(BIO_DEFAULTS.MAX_BIO_LENGTH).optional().describe('Short intro under the title (max 300 chars).'),
  theme: z.enum(BIO_THEMES).optional().describe('Visual theme. Default minimal.'),
  button_style: z.enum(BIO_BUTTON_STYLES).optional().describe('Link button style. Default filled.'),
  accent_color: hex.optional().describe('Brand accent colour (#RRGGBB) for buttons.'),
  background_color: hex.optional().describe('Page background colour (#RRGGBB).'),
  text_color: hex.optional().describe('Text colour (#RRGGBB).'),
  card_layout: z.enum(CARD_LAYOUTS).optional().describe('Profile header layout.'),
  subtitle: z.string().max(150).optional(),
  company: z.string().max(100).optional(),
  job_title: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  contact_email: z.string().email().max(200).optional(),
  contact_phone: z.string().max(50).optional(),
  contact_website: z.string().max(2048).optional(),
};

type DesignInput = {
  bio?: string;
  theme?: (typeof BIO_THEMES)[number];
  button_style?: (typeof BIO_BUTTON_STYLES)[number];
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  card_layout?: (typeof CARD_LAYOUTS)[number];
  subtitle?: string;
  company?: string;
  job_title?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_website?: string;
};

type LinkInput = z.infer<typeof linkInput>;
type SocialInput = z.infer<typeof socialInput>;

interface PageRow {
  id: string;
  title: string;
  slug: string;
  bio: string | null;
  theme: string;
  is_active: boolean;
  analytics_enabled: boolean;
  qr_code_id: string | null;
  total_views?: number | null;
  button_style?: string | null;
  custom_bg_color?: string | null;
  custom_text_color?: string | null;
  custom_accent_color?: string | null;
  card_layout?: string | null;
  subtitle?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface BlockRow {
  id: string;
  block_type: string;
  grid_row: number;
  sort_order: number;
  content: Record<string, unknown>;
}

export interface LinkPageHelpers {
  createQr: (args: { name: string; destination_url: string }) => Promise<{ qr: QrRow } | { error: string }>;
  withPreview: (qr: QrRow, extra: Record<string, unknown>) => Promise<CallToolResult>;
  summarizeQr: (qr: QrRow) => Record<string, unknown>;
}

function errorResult(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

function textResult(input: Record<string, unknown>): CallToolResult {
  const body = input.link_page && !input.view ? { view: 'link_page', ...input } : input;
  return { content: [{ type: 'text', text: JSON.stringify(body, null, 2) }], structuredContent: body };
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

function designToColumns(d: DesignInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (d.bio !== undefined) out.bio = d.bio.trim() || null;
  if (d.theme !== undefined) out.theme = d.theme;
  if (d.button_style !== undefined) out.button_style = d.button_style;
  if (d.accent_color !== undefined) out.custom_accent_color = d.accent_color;
  if (d.background_color !== undefined) out.custom_bg_color = d.background_color;
  if (d.text_color !== undefined) out.custom_text_color = d.text_color;
  if (d.card_layout !== undefined) out.card_layout = d.card_layout;
  for (const k of ['subtitle', 'company', 'job_title', 'location', 'contact_email', 'contact_phone'] as const) {
    if (d[k] !== undefined) out[k] = d[k]!.trim() || null;
  }
  return out;
}

/** Validate and normalise links + socials. Returns an error string on the first bad URL. */
function prepareLinks(links: LinkInput[]): { ok: LinkInput[] } | { error: string } {
  const ok: LinkInput[] = [];
  for (const l of links) {
    const check = validateUrl(l.url);
    if (!check.isValid) return { error: `Link "${l.title}" has an invalid URL: ${check.error}` };
    ok.push({ ...l, title: l.title.trim(), url: check.normalizedUrl! });
  }
  return { ok };
}

function prepareSocials(socials: SocialInput[]): { ok: SocialInput[] } | { error: string } {
  const ok: SocialInput[] = [];
  for (const s of socials) {
    if (s.platform === 'email') {
      const addr = s.url.replace(/^mailto:/i, '').trim();
      if (!EMAIL_RE.test(addr)) return { error: `"${s.url}" is not a valid email address.` };
      ok.push({ platform: 'email', url: `mailto:${addr}` });
      continue;
    }
    const check = validateUrl(s.url);
    if (!check.isValid) return { error: `${s.platform} link is invalid: ${check.error}` };
    ok.push({ platform: s.platform, url: check.normalizedUrl! });
  }
  return { ok };
}

function linkBlock(l: LinkInput, row: number, sort: number) {
  return {
    block_type: 'link',
    grid_col: 0,
    grid_row: row,
    grid_col_span: 4,
    grid_row_span: 1,
    sort_order: sort,
    is_enabled: true,
    content: {
      title: l.title,
      url: l.url,
      icon: l.icon ?? null,
      icon_type: l.icon ? 'emoji' : null,
      show_icon: Boolean(l.icon),
    },
  };
}

export function registerLinkPageTools(
  server: McpServer,
  ctx: ApiKeyContext,
  meta: { ipAddress?: string | null; userAgent?: string | null },
  helpers: LinkPageHelpers
): void {
  const db = () => createAdminClient();

  const pageUrl = (slug: string) => `${appUrl()}/p/${slug}`;
  const dashboardUrl = (id: string) => `${appUrl()}/app/bio/${id}`;

  async function loadPage(id: string): Promise<PageRow | null> {
    if (!isValidUUID(id)) return null;
    const { data } = await db()
      .from('bio_link_pages')
      .select('id, title, slug, bio, theme, button_style, custom_bg_color, custom_text_color, custom_accent_color, card_layout, subtitle, is_active, analytics_enabled, qr_code_id, total_views, created_at, updated_at')
      .eq('id', id)
      .eq('owner_id', ctx.userId)
      .eq('org_id', ctx.orgId)
      .is('deleted_at', null)
      .maybeSingle();
    return (data as PageRow | null) ?? null;
  }

  async function loadBlocks(pageId: string): Promise<BlockRow[]> {
    const { data } = await db()
      .from('bio_blocks')
      .select('id, block_type, grid_row, sort_order, content')
      .eq('page_id', pageId)
      .order('grid_row', { ascending: true });
    return ((data ?? []) as BlockRow[]).sort((a, b) => a.grid_row - b.grid_row || a.sort_order - b.sort_order);
  }

  async function activePageId(): Promise<string | null> {
    const { data } = await db()
      .from('bio_link_pages')
      .select('id')
      .eq('owner_id', ctx.userId)
      .eq('is_active', true)
      .is('deleted_at', null);
    return ((data ?? []) as Array<{ id: string }>)[0]?.id ?? null;
  }

  /** Resolved colours (theme + overrides), the same way the public page renders them. */
  function designOf(page: PageRow) {
    let colors: Record<string, string | undefined> = {};
    let background: string | undefined;
    let radius: string | undefined;
    try {
      const t = resolveFullThemeConfig(page.theme as BioLinkTheme, {
        custom_bg_color: page.custom_bg_color ?? null,
        custom_text_color: page.custom_text_color ?? null,
        custom_accent_color: page.custom_accent_color ?? null,
      } as Parameters<typeof resolveFullThemeConfig>[1]);
      colors = t.colors as unknown as Record<string, string>;
      background = t.background?.css;
      radius = t.buttonStyle?.borderRadius;
    } catch {
      // Unknown theme: fall back to plain colours.
    }
    return {
      theme: page.theme,
      button_style: page.button_style ?? 'filled',
      background: background ?? colors.bg ?? '#FFFFFF',
      text: colors.text ?? '#1A1A1A',
      text_secondary: colors.textSecondary ?? '#6B7280',
      button_bg: colors.buttonBg ?? '#1A1A1A',
      button_text: colors.buttonText ?? '#FFFFFF',
      accent: colors.accent ?? '#1A1A1A',
      button_radius: radius ?? '12px',
    };
  }

  function pageSummary(page: PageRow, blocks: BlockRow[]) {
    const links = blocks
      .filter((b) => b.block_type === 'link')
      .map((b) => ({ id: b.id, title: b.content.title, url: b.content.url }));
    const social = blocks
      .filter((b) => b.block_type === 'social_icons')
      .flatMap((b) => (b.content.icons as Array<{ platform: string; url: string }>) ?? []);
    return {
      id: page.id,
      title: page.title,
      bio: page.bio,
      theme: page.theme,
      status: page.is_active ? 'live' : 'draft',
      page_url: pageUrl(page.slug),
      dashboard_url: dashboardUrl(page.id),
      links,
      social,
      other_blocks: blocks.filter((b) => b.block_type !== 'link' && b.block_type !== 'social_icons').length,
      qr_code_id: page.qr_code_id,
      total_views: page.total_views ?? 0,
      subtitle: page.subtitle ?? null,
      design: designOf(page),
    };
  }

  /** Create a managed QR for a page, link it, and return the QR preview result. */
  async function attachQr(page: PageRow, extra: Record<string, unknown>): Promise<CallToolResult> {
    const limit = checkQrCreateLimit(ctx.userId);
    if (!limit.success) {
      return textResult({ ...extra, qr_note: 'Page saved, but the QR rate limit was hit. Ask again in a minute to add a QR code.' });
    }
    const created = await helpers.createQr({ name: `QR for ${page.title}`, destination_url: pageUrl(page.slug) });
    if ('error' in created) return textResult({ ...extra, qr_note: `Page saved, but the QR code failed: ${created.error}` });
    await db().from('bio_link_pages').update({ qr_code_id: created.qr.id }).eq('id', page.id);
    return helpers.withPreview(created.qr, { view: 'link_page', ...extra });
  }

  // ── create_link_page ──────────────────────────────────────────────────
  server.registerTool(
    'create_link_page',
    {
      title: 'Create link page',
      description:
        'Create a Lynx link page (link-in-bio / digital business card) hosted at /p/<slug>, with a profile header, ' +
        'social icons and link buttons. Optionally also create a managed QR code that opens the page.',
      inputSchema: {
        title: z.string().min(1).max(100).describe('Name shown at the top of the page (business or person).'),
        slug: z.string().min(3).max(40).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional()
          .describe('Custom address /p/<slug> (lowercase letters, numbers, hyphens). Random if omitted.'),
        links: z.array(linkInput).max(MAX_LINKS).optional().describe('Link buttons, top to bottom.'),
        social: z.array(socialInput).max(13).optional().describe('Social icons row shown above the links.'),
        create_qr: z.boolean().optional().describe('Also create a managed QR code pointing at the page.'),
        analytics_enabled: z.boolean().optional().describe('Track page views and clicks. Default true.'),
        ...pageDesignShape,
      },
      _meta: uiToolMeta,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (args) => {
      const limit = checkBioCreateLimit(ctx.userId);
      if (!limit.success) return errorResult('Rate limit reached: too many pages created in the last minute.');

      const links = prepareLinks(args.links ?? []);
      if ('error' in links) return errorResult(links.error);
      const socials = prepareSocials(args.social ?? []);
      if ('error' in socials) return errorResult(socials.error);

      let website: string | null = null;
      if (args.contact_website) {
        const check = validateUrl(args.contact_website);
        if (!check.isValid) return errorResult(`Website is invalid: ${check.error}`);
        website = check.normalizedUrl!;
      }

      const admin = db();
      const { count } = await admin
        .from('bio_link_pages')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', ctx.userId)
        .is('deleted_at', null);
      if ((count ?? 0) >= BIO_DEFAULTS.MAX_PAGES_PER_USER) {
        return errorResult(`This account already has the maximum of ${BIO_DEFAULTS.MAX_PAGES_PER_USER} link pages. Delete or reuse one in the dashboard.`);
      }

      const goLive = (await activePageId()) === null;
      let slug = args.slug;
      let page: PageRow | null = null;

      for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
        if (!slug) {
          const { data, error } = await admin.rpc('generate_bio_unique_slug');
          if (error || !data) return errorResult('Could not generate a page address. Please try again.');
          slug = data as string;
        }
        const { data, error } = await admin
          .from('bio_link_pages')
          .insert({
            owner_id: ctx.userId,
            org_id: ctx.orgId,
            title: args.title.trim(),
            slug,
            theme: args.theme ?? 'minimal',
            button_style: args.button_style ?? 'filled',
            analytics_enabled: args.analytics_enabled ?? true,
            is_active: goLive,
            ...designToColumns(args),
            ...(website ? { contact_website: website } : {}),
          })
          .select('id, title, slug, bio, theme, is_active, analytics_enabled, qr_code_id, created_at')
          .single();

        if (error) {
          if (error.code === '23505') {
            if (args.slug) return errorResult(`The address /p/${args.slug} is already taken. Pick another slug or leave it out.`);
            slug = undefined;
            continue;
          }
          console.error('[mcp] create_link_page insert failed:', error.message);
          return errorResult('Failed to create the link page.');
        }
        page = data as PageRow;
        break;
      }
      if (!page) return errorResult('Failed to create the link page after several attempts.');

      const blocks: Record<string, unknown>[] = [];
      let row = 0;
      if (socials.ok.length > 0) {
        blocks.push({
          block_type: 'social_icons', grid_col: 0, grid_row: row, grid_col_span: 4, grid_row_span: 1,
          sort_order: row, is_enabled: true, content: { icons: socials.ok },
        });
        row++;
      }
      for (const l of links.ok) {
        blocks.push(linkBlock(l, row, row));
        row++;
      }
      if (blocks.length > 0) {
        const { error } = await admin.from('bio_blocks').insert(blocks.map((b) => ({ ...b, page_id: page!.id })));
        if (error) console.error('[mcp] create_link_page blocks failed:', error.message);
      }

      void writeBioAuditLog({
        pageId: page.id,
        actorId: ctx.userId,
        action: 'created',
        newValue: { title: page.title, slug: page.slug, links: links.ok.length, via: 'mcp' },
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      });

      const extra = {
        created: true,
        link_page: pageSummary(page, await loadBlocks(page.id)),
        note: goLive
          ? 'The page is live.'
          : 'Saved as a draft because this account already has a live page. Publish it with update_link_page (publish: true) once the user confirms, or from the dashboard.',
      };
      return args.create_qr ? attachQr(page, extra) : textResult(extra);
    }
  );

  // ── list_link_pages ───────────────────────────────────────────────────
  server.registerTool(
    'list_link_pages',
    {
      title: 'List link pages',
      description: 'List the user\'s Lynx link pages, live page first.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const limit = checkApiLimit(ctx.userId);
      if (!limit.success) return errorResult('Rate limit reached. Try again in a minute.');
      const { data, error } = await db()
        .from('bio_link_pages')
        .select('id, title, slug, is_active, total_views, created_at')
        .eq('owner_id', ctx.userId)
        .eq('org_id', ctx.orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) return errorResult('Failed to list link pages.');
      const pages = ((data ?? []) as PageRow[])
        .sort((a, b) => Number(b.is_active) - Number(a.is_active))
        .map((p) => ({
          id: p.id,
          title: p.title,
          status: p.is_active ? 'live' : 'draft',
          page_url: pageUrl(p.slug),
          total_views: p.total_views ?? 0,
          dashboard_url: dashboardUrl(p.id),
        }));
      return textResult({ total: pages.length, max_pages: BIO_DEFAULTS.MAX_PAGES_PER_USER, link_pages: pages });
    }
  );

  // ── get_link_page ─────────────────────────────────────────────────────
  server.registerTool(
    'get_link_page',
    {
      title: 'Get link page',
      description: 'Fetch one link page with its links (and their ids, for removing) and social icons.',
      inputSchema: { id: z.string().describe('Link page id (UUID).') },
      _meta: uiToolMeta,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const limit = checkApiLimit(ctx.userId);
      if (!limit.success) return errorResult('Rate limit reached. Try again in a minute.');
      const page = await loadPage(id);
      if (!page) return errorResult('Link page not found.');
      return textResult({ link_page: pageSummary(page, await loadBlocks(page.id)) });
    }
  );

  // ── update_link_page ──────────────────────────────────────────────────
  server.registerTool(
    'update_link_page',
    {
      title: 'Update link page',
      description:
        'Edit a link page: change its title, intro, theme, colours or contact details; add or remove link buttons; ' +
        'replace the social icons; publish or unpublish it; or add a QR code for it.',
      inputSchema: {
        id: z.string().describe('Link page id (UUID).'),
        title: z.string().min(1).max(100).optional(),
        add_links: z.array(linkInput).max(MAX_LINKS).optional().describe('Link buttons to append at the bottom.'),
        remove_link_ids: z.array(z.string()).max(50).optional().describe('Ids of link buttons to remove (from get_link_page).'),
        social: z.array(socialInput).max(13).optional().describe('Replaces the whole social icons row. Pass [] to remove it.'),
        publish: z.boolean().optional()
          .describe('true makes this the live page (the user\'s current live page becomes a draft; confirm first). false unpublishes it.'),
        create_qr: z.boolean().optional().describe('Create a managed QR code pointing at the page (if it has none).'),
        ...pageDesignShape,
      },
      _meta: uiToolMeta,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (args) => {
      const limit = checkApiLimit(ctx.userId);
      if (!limit.success) return errorResult('Rate limit reached. Try again in a minute.');

      const page = await loadPage(args.id);
      if (!page) return errorResult('Link page not found.');

      const addLinks = prepareLinks(args.add_links ?? []);
      if ('error' in addLinks) return errorResult(addLinks.error);
      const socials = args.social ? prepareSocials(args.social) : null;
      if (socials && 'error' in socials) return errorResult(socials.error);

      const update: Record<string, unknown> = designToColumns(args);
      if (args.title !== undefined) update.title = args.title.trim();
      if (args.contact_website !== undefined) {
        if (args.contact_website.trim() === '') update.contact_website = null;
        else {
          const check = validateUrl(args.contact_website);
          if (!check.isValid) return errorResult(`Website is invalid: ${check.error}`);
          update.contact_website = check.normalizedUrl;
        }
      }

      const admin = db();
      const notes: string[] = [];

      // Publishing: only one live page per user (partial unique index).
      if (args.publish === true && !page.is_active) {
        const currentLive = await activePageId();
        if (currentLive && currentLive !== page.id) {
          await admin.from('bio_link_pages').update({ is_active: false }).eq('id', currentLive).eq('owner_id', ctx.userId);
          notes.push('The previously live page is now a draft.');
        }
        update.is_active = true;
      } else if (args.publish === false) {
        update.is_active = false;
      }

      if (Object.keys(update).length > 0) {
        const { error } = await admin
          .from('bio_link_pages')
          .update(update)
          .eq('id', page.id)
          .eq('owner_id', ctx.userId)
          .eq('org_id', ctx.orgId);
        if (error) {
          console.error('[mcp] update_link_page failed:', error.message);
          return errorResult('Failed to update the link page.');
        }
      }

      let blocks = await loadBlocks(page.id);

      if (args.remove_link_ids?.length) {
        const removable = new Set(blocks.filter((b) => b.block_type === 'link').map((b) => b.id));
        const ids = args.remove_link_ids.filter((id) => removable.has(id));
        for (const id of ids) {
          await admin.from('bio_blocks').delete().eq('id', id).eq('page_id', page.id);
        }
        const missing = args.remove_link_ids.length - ids.length;
        if (missing > 0) notes.push(`${missing} link id(s) were not found on this page and were skipped.`);
      }

      if (socials) {
        const existing = blocks.find((b) => b.block_type === 'social_icons');
        if (existing && socials.ok.length === 0) {
          await admin.from('bio_blocks').delete().eq('id', existing.id).eq('page_id', page.id);
        } else if (existing) {
          await admin.from('bio_blocks').update({ content: { ...existing.content, icons: socials.ok } }).eq('id', existing.id);
        } else if (socials.ok.length > 0) {
          // Put the new row above everything else.
          for (const b of blocks) {
            await admin.from('bio_blocks').update({ grid_row: b.grid_row + 1 }).eq('id', b.id);
          }
          await admin.from('bio_blocks').insert({
            page_id: page.id, block_type: 'social_icons', grid_col: 0, grid_row: 0, grid_col_span: 4,
            grid_row_span: 1, sort_order: 0, is_enabled: true, content: { icons: socials.ok },
          });
        }
      }

      if (addLinks.ok.length > 0) {
        blocks = await loadBlocks(page.id);
        if (blocks.length + addLinks.ok.length > BIO_DEFAULTS.MAX_BLOCKS_PER_PAGE) {
          return errorResult(`A page can hold at most ${BIO_DEFAULTS.MAX_BLOCKS_PER_PAGE} blocks.`);
        }
        let row = blocks.reduce((m, b) => Math.max(m, b.grid_row + 1), 0);
        const sortBase = blocks.reduce((m, b) => Math.max(m, b.sort_order + 1), 0);
        await admin.from('bio_blocks').insert(
          addLinks.ok.map((l, i) => ({ ...linkBlock(l, row++, sortBase + i), page_id: page.id }))
        );
      }

      void writeBioAuditLog({
        pageId: page.id,
        actorId: ctx.userId,
        action: 'updated',
        previousValue: { title: page.title, is_active: page.is_active },
        newValue: {
          ...update,
          added_links: addLinks.ok.length,
          removed_links: args.remove_link_ids?.length ?? 0,
          via: 'mcp',
        },
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      });

      const fresh = (await loadPage(page.id))!;
      const extra = { updated: true, link_page: pageSummary(fresh, await loadBlocks(page.id)), notes };
      if (args.create_qr) {
        if (fresh.qr_code_id) notes.push('This page already has a QR code; use get_qr_code with qr_code_id to fetch it.');
        else return attachQr(fresh, extra);
      }
      return textResult(extra);
    }
  );
}
