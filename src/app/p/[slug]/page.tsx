import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  resolveFullThemeConfig,
  buildGoogleFontsUrl,
  SPACING_MAP,
} from '@/lib/bio/theme-definitions';
import { BioLinkButton } from '@/components/bio/bio-link-button';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { BioLinkTheme, BioBorderRadius, BioSpacing } from '@/types/bio';
import './bio-animations.css';

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

  // Resolve full theme config with all overrides
  const themeConfig = resolveFullThemeConfig(page.theme as BioLinkTheme, {
    custom_bg_color: page.custom_bg_color,
    custom_text_color: page.custom_text_color,
    custom_accent_color: page.custom_accent_color,
    font_title: page.font_title,
    font_body: page.font_body,
    border_radius: page.border_radius as BioBorderRadius | null,
    spacing: page.spacing as BioSpacing | null,
    background_variant: page.background_variant,
  });

  const googleFontsUrl = buildGoogleFontsUrl(themeConfig);
  const spacingConfig = SPACING_MAP[themeConfig.spacing];

  const avatarUrl = page.avatar_storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-avatars/${page.avatar_storage_path}`
    : null;

  const faviconUrl = page.favicon_storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-avatars/${page.favicon_storage_path}`
    : null;

  // Build background CSS
  const bgCSS =
    themeConfig.background.type === 'gradient' || themeConfig.background.type === 'animated'
      ? themeConfig.background.css
      : undefined;
  const bgColor =
    themeConfig.background.type === 'solid' || themeConfig.background.type === 'pattern'
      ? themeConfig.background.css
      : undefined;

  return (
    <>
      {/* Custom favicon */}
      {faviconUrl && (
        <link rel="icon" href={faviconUrl} />
      )}

      {/* Google Fonts — zero JS, SSR-friendly */}
      {googleFontsUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={googleFontsUrl} />
        </>
      )}

      <div
        className={`min-h-screen flex flex-col items-center ${themeConfig.animations.pageEnter}`}
        style={{
          background: bgCSS,
          backgroundColor: bgColor,
          color: themeConfig.colors.text,
          fontFamily: `'${themeConfig.fonts.body.family}', sans-serif`,
        }}
      >
        {/* Background overlay (pattern/grain/stars) */}
        {themeConfig.background.overlayCSS && (
          <div
            className={`pointer-events-none fixed inset-0 ${
              themeConfig.background.type === 'animated' ? 'bio-bg-cosmic-shimmer' : ''
            }`}
            style={{ backgroundImage: themeConfig.background.overlayCSS }}
          />
        )}

        <div
          className="relative w-full max-w-md mx-auto px-6 py-12 flex flex-col items-center"
          style={{ gap: spacingConfig.gap }}
        >
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={page.title}
              className={`w-24 h-24 rounded-full object-cover ${themeConfig.animations.avatarEnter}`}
              style={{ border: `3px solid ${themeConfig.colors.avatarRing}` }}
            />
          ) : (
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${themeConfig.animations.avatarEnter}`}
              style={{
                backgroundColor: themeConfig.colors.accent,
                color: themeConfig.colors.bg,
                border: `3px solid ${themeConfig.colors.avatarRing}`,
                fontFamily: `'${themeConfig.fonts.title.family}', sans-serif`,
              }}
            >
              {page.title.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Title & Bio */}
          <div className="text-center space-y-2">
            <h1
              className="text-xl font-bold"
              style={{
                color: themeConfig.colors.text,
                fontFamily: `'${themeConfig.fonts.title.family}', sans-serif`,
                fontWeight: themeConfig.fonts.title.weight,
              }}
            >
              {page.title}
            </h1>
            {page.bio && (
              <p
                className="text-sm leading-relaxed max-w-xs"
                style={{ color: themeConfig.colors.textSecondary }}
              >
                {page.bio}
              </p>
            )}
          </div>

          {/* Links */}
          {links.length > 0 ? (
            <div className="w-full flex flex-col" style={{ gap: spacingConfig.gap }}>
              {links.map((link: { id: string; title: string; url: string; icon: string | null; icon_type: string | null; icon_url: string | null; icon_bg_color: string | null; show_icon: boolean }, index: number) => (
                <BioLinkButton
                  key={link.id}
                  itemId={link.id}
                  pageId={page.id}
                  title={link.title}
                  url={link.url}
                  icon={link.icon}
                  iconType={link.icon_type as 'emoji' | 'image' | 'favicon' | null}
                  iconUrl={link.icon_url}
                  iconBgColor={link.icon_bg_color}
                  showIcon={link.show_icon}
                  themeConfig={themeConfig}
                  staggerIndex={themeConfig.animations.linkStagger ? index : undefined}
                  staggerDelay={themeConfig.animations.staggerDelay}
                />
              ))}
            </div>
          ) : (
            <p
              className="text-sm"
              style={{ color: themeConfig.colors.textSecondary }}
            >
              No links yet
            </p>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4">
            <a
              href="/"
              className="text-xs opacity-40 hover:opacity-60 transition-opacity"
              style={{ color: themeConfig.colors.textSecondary }}
            >
              Powered by OneSign
            </a>
          </div>
        </div>
      </div>
    </>
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
