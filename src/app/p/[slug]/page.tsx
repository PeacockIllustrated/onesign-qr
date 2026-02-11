import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveThemeVars } from '@/lib/bio/themes';
import { BioLinkButton } from '@/components/bio/bio-link-button';
import { extractEventContext } from '@/lib/analytics/event-helpers';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { BioLinkTheme, BioLinkButtonStyle } from '@/types/bio';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate SEO metadata for the bio page.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: page } = await supabase
    .from('bio_link_pages')
    .select('title, bio')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!page) {
    return { title: 'Page Not Found' };
  }

  return {
    title: page.title,
    description: page.bio || `${page.title} — links and more`,
    openGraph: {
      title: page.title,
      description: page.bio || `${page.title} — links and more`,
      type: 'profile',
    },
  };
}

/**
 * /p/[slug] - Public bio-link page
 *
 * Server-rendered page using admin client (bypasses RLS for public access).
 * Records view analytics asynchronously.
 */
export default async function BioPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // Fetch page with enabled links
  const { data: page, error } = await supabase
    .from('bio_link_pages')
    .select('*, bio_link_items(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (error || !page) {
    notFound();
  }

  // Filter to enabled links and sort
  const links = (page.bio_link_items || [])
    .filter((item: { is_enabled: boolean }) => item.is_enabled)
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);

  // Record view event async (non-blocking)
  if (page.analytics_enabled) {
    recordViewEvent(supabase, page.id).catch(() => {});
  }

  // Resolve theme
  const themeVars = resolveThemeVars(page.theme as BioLinkTheme, {
    custom_bg_color: page.custom_bg_color,
    custom_text_color: page.custom_text_color,
    custom_accent_color: page.custom_accent_color,
  });

  const avatarUrl = page.avatar_storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-avatars/${page.avatar_storage_path}`
    : null;

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{
        ...themeVars as React.CSSProperties,
        background: themeVars['--bio-bg-gradient'] || themeVars['--bio-bg'],
      }}
    >
      <div className="w-full max-w-md mx-auto px-6 py-12 flex flex-col items-center gap-6">
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={page.title}
            className="w-24 h-24 rounded-full object-cover"
            style={{ border: '3px solid var(--bio-avatar-ring)' }}
          />
        ) : (
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
            style={{
              backgroundColor: 'var(--bio-avatar-ring)',
              color: 'var(--bio-bg)',
              border: '3px solid var(--bio-avatar-ring)',
            }}
          >
            {page.title.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Title & Bio */}
        <div className="text-center space-y-2">
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--bio-text)' }}
          >
            {page.title}
          </h1>
          {page.bio && (
            <p
              className="text-sm leading-relaxed max-w-xs"
              style={{ color: 'var(--bio-text-secondary)' }}
            >
              {page.bio}
            </p>
          )}
        </div>

        {/* Links */}
        {links.length > 0 ? (
          <div className="w-full flex flex-col gap-3">
            {links.map((link: { id: string; title: string; url: string; icon: string | null }) => (
              <BioLinkButton
                key={link.id}
                itemId={link.id}
                pageId={page.id}
                title={link.title}
                url={link.url}
                icon={link.icon}
                buttonStyle={page.button_style as BioLinkButtonStyle}
              />
            ))}
          </div>
        ) : (
          <p
            className="text-sm"
            style={{ color: 'var(--bio-text-secondary)' }}
          >
            No links yet
          </p>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4">
          <a
            href="/"
            className="text-xs opacity-40 hover:opacity-60 transition-opacity"
            style={{ color: 'var(--bio-text-secondary)' }}
          >
            Powered by OneSign
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Record a page view event asynchronously.
 */
async function recordViewEvent(
  supabase: ReturnType<typeof createAdminClient>,
  pageId: string,
) {
  try {
    // We need request headers for geo/device info, but in a server component
    // we can access them via next/headers
    const headersList = await headers();
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0] ||
      headersList.get('x-real-ip') ||
      'unknown';

    const ipSalt = process.env.IP_HASH_SALT;
    let ipHash: string | null = null;
    if (ipSalt) {
      const { createHash } = await import('crypto');
      ipHash = createHash('sha256')
        .update(ip + ipSalt)
        .digest('hex')
        .substring(0, 16);
    }

    const userAgent = headersList.get('user-agent') || '';
    const { parseUserAgent } = await import('@/lib/analytics/event-helpers');
    const deviceInfo = parseUserAgent(userAgent);

    const countryCode = headersList.get('x-vercel-ip-country') || null;
    const region = headersList.get('x-vercel-ip-country-region') || null;

    const referrer = headersList.get('referer');
    let referrerDomain: string | null = null;
    if (referrer) {
      try {
        referrerDomain = new URL(referrer).hostname;
      } catch {
        // Invalid referrer
      }
    }

    await supabase.from('bio_link_view_events').insert({
      page_id: pageId,
      ip_hash: ipHash,
      country_code: countryCode,
      region,
      device_type: deviceInfo.deviceType,
      os_family: deviceInfo.osFamily,
      browser_family: deviceInfo.browserFamily,
      referrer_domain: referrerDomain,
    });
  } catch (error) {
    console.error('Failed to record bio view event:', error);
  }
}
