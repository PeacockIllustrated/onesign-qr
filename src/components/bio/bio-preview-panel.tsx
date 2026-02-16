'use client';

import { ExternalLink, Mail, Phone, Globe } from 'lucide-react';
import {
  resolveFullThemeConfig,
  SPACING_MAP,
} from '@/lib/bio/theme-definitions';
import type {
  BioLinkTheme,
  BioLinkIconType,
  BioBlock,
  BioLayoutMode,
  BioSpacing,
  BioBorderRadius,
  BioCardLayout,
  BioBlockContentLink,
  BioBlockContentHeading,
  BioBlockContentText,
  BioBlockContentImage,
  BioBlockContentSocialIcons,
  BioBlockContentDivider,
  BioBlockContentSpotifyEmbed,
  BioBlockContentYouTubeEmbed,
  BioBlockContentMap,
  BioThemeConfig,
} from '@/types/bio';
import { SOCIAL_PLATFORMS } from '@/lib/constants';

/** Block types that handle their own padding (buttons, edge-to-edge images) */
const PREVIEW_SELF_PADDED = new Set(['link', 'image', 'divider', 'spacer']);

/** Miniature-scale gap between grid items, keyed by spacing setting */
const PREVIEW_GAP_MAP: Record<string, string> = {
  compact: '1px',
  normal: '2px',
  spacious: '3px',
};

/** Miniature-scale inner padding for content blocks, keyed by spacing setting */
const PREVIEW_PADDING_MAP: Record<string, string> = {
  compact: '0px 1px',
  normal: '1px 2px',
  spacious: '1px 3px',
};

interface PreviewLink {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  icon_type?: BioLinkIconType | null;
  icon_url?: string | null;
  icon_bg_color?: string | null;
  show_icon?: boolean;
  is_enabled: boolean;
}

interface BioPreviewPanelProps {
  title: string;
  bio: string | null;
  theme: BioLinkTheme;
  customBgColor: string | null;
  customTextColor: string | null;
  customAccentColor: string | null;
  fontTitle: string | null;
  fontBody: string | null;
  borderRadius: BioBorderRadius | null;
  spacing: BioSpacing | null;
  backgroundVariant: string | null;
  avatarUrl: string | null;
  links: PreviewLink[];
  layoutMode?: BioLayoutMode;
  blocks?: BioBlock[];
  // Contact card
  cardLayout?: BioCardLayout | null;
  coverUrl?: string | null;
  coverAspectRatio?: string | null;
  coverPositionY?: number | null;
  subtitle?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWebsite?: string;
}

/** Renders an icon in the preview at mini scale */
function PreviewLinkIcon({ link }: { link: PreviewLink }) {
  if (link.show_icon === false) return null;

  let iconElement: React.ReactNode = null;

  // Favicon or image
  if ((link.icon_type === 'favicon' || link.icon_type === 'image') && link.icon_url) {
    iconElement = (
      <img
        src={link.icon_url}
        alt=""
        className="h-3 w-3 shrink-0 rounded-sm object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  } else if (link.icon_type === 'emoji' || (!link.icon_type && link.icon)) {
    // Emoji (explicit or legacy)
    iconElement = link.icon ? <span className="text-xs shrink-0">{link.icon}</span> : null;
  }

  if (!iconElement) return null;

  // Wrap in background circle if icon_bg_color is set
  if (link.icon_bg_color) {
    return (
      <span
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: link.icon_bg_color }}
      >
        {iconElement}
      </span>
    );
  }

  return <>{iconElement}</>;
}

export function BioPreviewPanel({
  title,
  bio,
  theme,
  customBgColor,
  customTextColor,
  customAccentColor,
  fontTitle,
  fontBody,
  borderRadius,
  spacing,
  backgroundVariant,
  avatarUrl,
  links,
  layoutMode = 'grid',
  blocks = [],
  cardLayout,
  coverUrl,
  coverAspectRatio,
  coverPositionY,
  subtitle,
  company,
  jobTitle,
  location,
  contactEmail,
  contactPhone,
  contactWebsite,
}: BioPreviewPanelProps) {
  // Resolve full theme config with overrides
  const config = resolveFullThemeConfig(theme, {
    custom_bg_color: customBgColor,
    custom_text_color: customTextColor,
    custom_accent_color: customAccentColor,
    font_title: fontTitle,
    font_body: fontBody,
    border_radius: borderRadius,
    spacing,
    background_variant: backgroundVariant,
  });

  const enabledLinks = links.filter((l) => l.is_enabled);
  const spacingConfig = SPACING_MAP[config.spacing];

  // Build background styles
  const bgStyle: React.CSSProperties = {};
  if (config.background.type === 'gradient' || config.background.type === 'animated') {
    bgStyle.background = config.background.css;
  } else {
    bgStyle.backgroundColor = config.background.css;
  }

  // Build button style
  const btnBaseStyle: React.CSSProperties = {
    borderRadius: config.buttonStyle.borderRadius,
    borderWidth: config.buttonStyle.borderWidth,
    borderStyle: 'solid',
    padding: '0.5rem 0.75rem',
  };

  if (config.buttonStyle.variant === 'outline') {
    Object.assign(btnBaseStyle, {
      backgroundColor: 'transparent',
      color: config.colors.accent,
      borderColor: config.colors.accent,
    });
  } else if (config.buttonStyle.variant === 'glass') {
    Object.assign(btnBaseStyle, {
      backgroundColor: config.colors.buttonBg,
      color: config.colors.buttonText,
      borderColor: config.colors.buttonBorder,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    });
  } else {
    Object.assign(btnBaseStyle, {
      backgroundColor: config.colors.buttonBg,
      color: config.colors.buttonText,
      borderColor: config.colors.buttonBorder,
    });
  }

  // Extract initial from title
  const initial = title ? title.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>

      {/* Phone frame */}
      <div
        className="relative aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-border shadow-lg"
        style={bgStyle}
      >
        {/* Background overlay (pattern/grain) */}
        {config.background.overlayCSS && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: config.background.overlayCSS }}
          />
        )}

        <div
          className="relative flex h-full flex-col items-center overflow-y-auto px-4 py-8"
          style={{ gap: spacingConfig.gap }}
        >
          {/* Contact Card */}
          <PreviewContactCard
            title={title}
            bio={bio}
            subtitle={subtitle}
            company={company}
            jobTitle={jobTitle}
            location={location}
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            contactWebsite={contactWebsite}
            cardLayout={cardLayout ?? 'centered'}
            avatarUrl={avatarUrl}
            coverUrl={coverUrl ?? null}
            coverAspectRatio={coverAspectRatio ?? null}
            coverPositionY={coverPositionY ?? null}
            config={config}
            initial={initial}
          />

          {/* Content: Grid blocks or legacy links */}
          {layoutMode === 'grid' && blocks.length > 0 ? (
            <div
              className="mt-1 w-full"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridAutoRows: '18px',
                gap: PREVIEW_GAP_MAP[config.spacing] ?? '2px',
              }}
            >
              {blocks
                .filter((b) => b.is_enabled)
                .map((block) => {
                  const needsPadding = !PREVIEW_SELF_PADDED.has(block.block_type);
                  return (
                    <div
                      key={block.id}
                      style={{
                        gridColumn: `${block.grid_col + 1} / span ${block.grid_col_span}`,
                        gridRow: `${block.grid_row + 1} / span ${block.grid_row_span}`,
                        minHeight: 0,
                        overflow: 'hidden',
                        padding: needsPadding
                          ? (PREVIEW_PADDING_MAP[config.spacing] ?? '1px 2px')
                          : undefined,
                      }}
                    >
                      <PreviewBlockRenderer block={block} config={config} />
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="mt-1 flex w-full flex-col" style={{ gap: spacingConfig.gap }}>
              {enabledLinks.length === 0 && (
                <p
                  className="text-center text-[10px]"
                  style={{ color: config.colors.textSecondary }}
                >
                  No links yet
                </p>
              )}
              {enabledLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex w-full items-center justify-center gap-1 text-center text-[10px] font-medium transition-opacity"
                  style={btnBaseStyle}
                >
                  <PreviewLinkIcon link={link} />
                  <span
                    className="truncate"
                    style={{ fontFamily: `'${config.fonts.body.family}', sans-serif` }}
                  >
                    {link.title}
                  </span>
                  <ExternalLink className="h-2 w-2 shrink-0 opacity-50" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Theme name label */}
      <p className="mt-2 text-[10px] text-muted-foreground">
        {config.name} theme
      </p>
    </div>
  );
}

// ─── Preview Contact Card (miniature scale) ────────────────────────

function PreviewAvatar({
  avatarUrl,
  initial,
  config,
  size = 'md',
}: {
  avatarUrl: string | null;
  initial: string;
  config: BioThemeConfig;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'h-10 w-10' : 'h-16 w-16';
  const textSize = size === 'sm' ? 'text-sm' : 'text-xl';

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full border-2`}
      style={{
        borderColor: config.colors.avatarRing,
        backgroundColor: config.colors.accent,
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          className={`${textSize} font-bold`}
          style={{
            color: config.colors.bg,
            fontFamily: `'${config.fonts.title.family}', sans-serif`,
          }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}

function PreviewInfoLine({
  jobTitle,
  company,
  config,
}: {
  jobTitle?: string;
  company?: string;
  config: BioThemeConfig;
}) {
  const parts = [jobTitle, company].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p
      className="text-[7px] leading-tight"
      style={{
        color: config.colors.textSecondary,
        fontFamily: `'${config.fonts.body.family}', sans-serif`,
      }}
    >
      {parts.join(' at ')}
    </p>
  );
}

function PreviewContactButtons({
  contactEmail,
  contactPhone,
  contactWebsite,
  config,
}: {
  contactEmail?: string;
  contactPhone?: string;
  contactWebsite?: string;
  config: BioThemeConfig;
}) {
  const hasAny = contactEmail || contactPhone || contactWebsite;
  if (!hasAny) return null;

  return (
    <div className="flex gap-1">
      {contactEmail && (
        <div
          className="flex h-4 w-4 items-center justify-center rounded-full"
          style={{ backgroundColor: `${config.colors.accent}20` }}
        >
          <Mail className="h-2 w-2" style={{ color: config.colors.accent }} />
        </div>
      )}
      {contactPhone && (
        <div
          className="flex h-4 w-4 items-center justify-center rounded-full"
          style={{ backgroundColor: `${config.colors.accent}20` }}
        >
          <Phone className="h-2 w-2" style={{ color: config.colors.accent }} />
        </div>
      )}
      {contactWebsite && (
        <div
          className="flex h-4 w-4 items-center justify-center rounded-full"
          style={{ backgroundColor: `${config.colors.accent}20` }}
        >
          <Globe className="h-2 w-2" style={{ color: config.colors.accent }} />
        </div>
      )}
    </div>
  );
}

function PreviewContactCard({
  title,
  bio,
  subtitle,
  company,
  jobTitle,
  location,
  contactEmail,
  contactPhone,
  contactWebsite,
  cardLayout,
  avatarUrl,
  coverUrl,
  coverAspectRatio,
  coverPositionY,
  config,
  initial,
}: {
  title: string;
  bio: string | null;
  subtitle?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWebsite?: string;
  cardLayout: BioCardLayout;
  avatarUrl: string | null;
  coverUrl: string | null;
  coverAspectRatio: string | null;
  coverPositionY: number | null;
  config: BioThemeConfig;
  initial: string;
}) {
  const posY = coverPositionY ?? 50;

  const titleStyle: React.CSSProperties = {
    color: config.colors.text,
    fontFamily: `'${config.fonts.title.family}', sans-serif`,
    fontWeight: config.fonts.title.weight,
  };
  const bodyStyle: React.CSSProperties = {
    color: config.colors.textSecondary,
    fontFamily: `'${config.fonts.body.family}', sans-serif`,
  };

  switch (cardLayout) {
    case 'left-aligned':
      return (
        <div className="w-full space-y-1">
          <div className="flex items-center gap-2">
            <PreviewAvatar avatarUrl={avatarUrl} initial={initial} config={config} size="sm" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <h2 className="text-xs font-bold leading-tight truncate" style={titleStyle}>
                {title || 'Your Name'}
              </h2>
              {subtitle && (
                <p className="text-[7px] leading-tight truncate" style={bodyStyle}>{subtitle}</p>
              )}
              <PreviewInfoLine jobTitle={jobTitle} company={company} config={config} />
            </div>
          </div>
          {location && (
            <p className="text-[7px] leading-tight" style={bodyStyle}>{location}</p>
          )}
          {bio && (
            <p className="text-[8px] leading-snug" style={bodyStyle}>{bio}</p>
          )}
          <PreviewContactButtons
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            contactWebsite={contactWebsite}
            config={config}
          />
        </div>
      );

    case 'split':
      return (
        <div className="w-full space-y-1">
          {/* Banner */}
          <div
            className="w-full rounded-md overflow-hidden"
            style={{
              height: 24,
              backgroundColor: coverUrl ? undefined : config.colors.accent,
              backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: `center ${posY}%`,
            }}
          />
          {/* Overlapping avatar */}
          <div className="-mt-3 flex flex-col items-center space-y-0.5">
            <PreviewAvatar avatarUrl={avatarUrl} initial={initial} config={config} size="sm" />
            <h2 className="text-xs font-bold leading-tight text-center" style={titleStyle}>
              {title || 'Your Name'}
            </h2>
            {subtitle && (
              <p className="text-[7px] leading-tight text-center" style={bodyStyle}>{subtitle}</p>
            )}
            <PreviewInfoLine jobTitle={jobTitle} company={company} config={config} />
            {location && (
              <p className="text-[7px] leading-tight text-center" style={bodyStyle}>{location}</p>
            )}
            {bio && (
              <p className="text-[8px] leading-snug text-center" style={bodyStyle}>{bio}</p>
            )}
            <PreviewContactButtons
              contactEmail={contactEmail}
              contactPhone={contactPhone}
              contactWebsite={contactWebsite}
              config={config}
            />
          </div>
        </div>
      );

    case 'minimal':
      return (
        <div className="w-full space-y-1 text-center">
          <h2 className="text-sm font-bold leading-tight" style={titleStyle}>
            {title || 'Your Name'}
          </h2>
          {subtitle && (
            <p className="text-[8px] leading-tight" style={bodyStyle}>{subtitle}</p>
          )}
          <PreviewInfoLine jobTitle={jobTitle} company={company} config={config} />
          {location && (
            <p className="text-[7px] leading-tight" style={bodyStyle}>{location}</p>
          )}
          {bio && (
            <p className="text-[8px] leading-snug" style={bodyStyle}>{bio}</p>
          )}
          <div className="flex justify-center">
            <PreviewContactButtons
              contactEmail={contactEmail}
              contactPhone={contactPhone}
              contactWebsite={contactWebsite}
              config={config}
            />
          </div>
        </div>
      );

    case 'cover':
      return (
        <div className="w-full space-y-1">
          {/* Full-width hero */}
          <div
            className="relative w-full rounded-md overflow-hidden"
            style={{
              height: 32,
              backgroundColor: coverUrl ? undefined : config.colors.accent,
              backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: `center ${posY}%`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
              }}
            />
          </div>
          {/* Avatar + info below */}
          <div className="-mt-3 flex flex-col items-center space-y-0.5">
            <PreviewAvatar avatarUrl={avatarUrl} initial={initial} config={config} size="sm" />
            <h2 className="text-xs font-bold leading-tight text-center" style={titleStyle}>
              {title || 'Your Name'}
            </h2>
            {subtitle && (
              <p className="text-[7px] leading-tight text-center" style={bodyStyle}>{subtitle}</p>
            )}
            <PreviewInfoLine jobTitle={jobTitle} company={company} config={config} />
            {location && (
              <p className="text-[7px] leading-tight text-center" style={bodyStyle}>{location}</p>
            )}
            {bio && (
              <p className="text-[8px] leading-snug text-center" style={bodyStyle}>{bio}</p>
            )}
            <PreviewContactButtons
              contactEmail={contactEmail}
              contactPhone={contactPhone}
              contactWebsite={contactWebsite}
              config={config}
            />
          </div>
        </div>
      );

    // 'centered' — default (same as before)
    default:
      return (
        <div className="flex w-full flex-col items-center space-y-1">
          <PreviewAvatar avatarUrl={avatarUrl} initial={initial} config={config} size="md" />
          <h2 className="text-center text-sm font-bold leading-tight" style={titleStyle}>
            {title || 'Your Name'}
          </h2>
          {subtitle && (
            <p className="text-[8px] leading-tight text-center" style={bodyStyle}>{subtitle}</p>
          )}
          <PreviewInfoLine jobTitle={jobTitle} company={company} config={config} />
          {location && (
            <p className="text-[7px] leading-tight text-center" style={bodyStyle}>{location}</p>
          )}
          {bio && (
            <p className="mb-2 max-w-full text-center text-[10px] leading-snug" style={bodyStyle}>
              {bio}
            </p>
          )}
          <PreviewContactButtons
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            contactWebsite={contactWebsite}
            config={config}
          />
        </div>
      );
  }
}

// ─── Themed Preview Block Renderer ──────────────────────────────────

function PreviewBlockRenderer({
  block,
  config,
}: {
  block: BioBlock;
  config: BioThemeConfig;
}) {
  switch (block.block_type) {
    case 'link':
      return <PreviewLinkBlock content={block.content as BioBlockContentLink} config={config} />;
    case 'heading':
      return <PreviewHeadingBlock content={block.content as BioBlockContentHeading} config={config} />;
    case 'text':
      return <PreviewTextBlock content={block.content as BioBlockContentText} config={config} />;
    case 'image':
      return <PreviewImageBlock content={block.content as BioBlockContentImage} config={config} />;
    case 'social_icons':
      return <PreviewSocialBlock content={block.content as BioBlockContentSocialIcons} config={config} />;
    case 'divider':
      return <PreviewDividerBlock content={block.content as BioBlockContentDivider} config={config} />;
    case 'spacer':
      return <div className="h-full w-full" />;
    case 'spotify_embed':
      return <PreviewEmbedBlock label="Spotify" color="#1db954" config={config} />;
    case 'youtube_embed':
      return <PreviewEmbedBlock label="YouTube" color="#ef4444" config={config} />;
    case 'map': {
      const mapContent = block.content as BioBlockContentMap;
      return <PreviewEmbedBlock label={mapContent.query || 'Map'} color={config.colors.accent} config={config} />;
    }
    default:
      return null;
  }
}

// ─── Individual themed preview renderers ────────────────────────────

function PreviewLinkBlock({ content, config }: { content: BioBlockContentLink; config: BioThemeConfig }) {
  const btnStyle: React.CSSProperties = {
    borderRadius: config.buttonStyle.borderRadius,
    borderWidth: config.buttonStyle.borderWidth,
    borderStyle: 'solid',
    fontFamily: `'${config.fonts.body.family}', sans-serif`,
    ...(config.buttonStyle.extraCSS || {}),
  };

  if (config.buttonStyle.variant === 'outline') {
    Object.assign(btnStyle, {
      backgroundColor: 'transparent',
      color: config.colors.accent,
      borderColor: config.colors.accent,
    });
  } else if (config.buttonStyle.variant === 'glass') {
    Object.assign(btnStyle, {
      backgroundColor: config.colors.buttonBg,
      color: config.colors.buttonText,
      borderColor: config.colors.buttonBorder,
    });
  } else {
    Object.assign(btnStyle, {
      backgroundColor: config.colors.buttonBg,
      color: config.colors.buttonText,
      borderColor: config.colors.buttonBorder,
    });
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center gap-1 px-1 text-center"
      style={btnStyle}
    >
      {content.show_icon && content.icon && (
        <span className="shrink-0 text-[6px]">{content.icon}</span>
      )}
      <span className="truncate text-[6px] font-medium leading-tight">
        {content.title || 'Link'}
      </span>
      <ExternalLink className="h-1.5 w-1.5 shrink-0 opacity-40" />
    </div>
  );
}

function PreviewHeadingBlock({ content, config }: { content: BioBlockContentHeading; config: BioThemeConfig }) {
  const sizeMap: Record<number, string> = { 1: 'text-[8px] font-bold', 2: 'text-[7px] font-semibold', 3: 'text-[6px] font-medium' };
  return (
    <div
      className={`flex h-full w-full items-center justify-center text-center leading-none ${sizeMap[content.level] ?? sizeMap[2]}`}
      style={{
        color: config.colors.text,
        fontFamily: `'${config.fonts.title.family}', sans-serif`,
      }}
    >
      {content.text || 'Heading'}
    </div>
  );
}

function PreviewTextBlock({ content, config }: { content: BioBlockContentText; config: BioThemeConfig }) {
  const alignClass = content.align === 'center' ? 'text-center' : content.align === 'right' ? 'text-right' : 'text-left';

  return (
    <div
      className={`flex h-full w-full items-center text-[5px] leading-tight ${alignClass}`}
      style={{
        color: config.colors.textSecondary,
        fontFamily: `'${config.fonts.body.family}', sans-serif`,
        fontWeight: content.bold ? 700 : undefined,
        fontStyle: content.italic ? 'italic' : undefined,
      }}
    >
      <span className="line-clamp-2">{content.text || 'Text'}</span>
    </div>
  );
}

function PreviewImageBlock({ content, config }: { content: BioBlockContentImage; config: BioThemeConfig }) {
  if (!content.src) {
    return (
      <div
        className="flex h-full w-full items-center justify-center text-[5px]"
        style={{
          color: config.colors.textSecondary,
          borderRadius: config.borderRadius,
          backgroundColor: `${config.colors.accent}10`,
        }}
      >
        Image
      </div>
    );
  }
  return (
    <img
      src={content.src}
      alt={content.alt ?? ''}
      className="h-full w-full"
      style={{
        objectFit: content.object_fit ?? 'cover',
        filter: content.invert ? 'invert(1)' : undefined,
        borderRadius: config.borderRadius,
      }}
    />
  );
}

function PreviewSocialBlock({ content, config }: { content: BioBlockContentSocialIcons; config: BioThemeConfig }) {
  if (!content.icons?.length) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[5px]" style={{ color: config.colors.textSecondary }}>
        Social
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center gap-0.5">
      {content.icons.slice(0, 6).map((item, idx) => {
        const p = SOCIAL_PLATFORMS.find((pl) => pl.id === item.platform);
        return (
          <div
            key={idx}
            className="flex h-3 w-3 items-center justify-center rounded-full text-[4px] font-bold"
            style={{ backgroundColor: `${config.colors.accent}20`, color: config.colors.accent }}
            title={p?.label}
          >
            {(p?.label ?? item.platform).charAt(0).toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}

function PreviewDividerBlock({ content, config }: { content: BioBlockContentDivider; config: BioThemeConfig }) {
  if (content.style === 'gradient') {
    return (
      <div className="flex h-full w-full items-center px-1">
        <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${config.colors.accent}40, transparent)` }} />
      </div>
    );
  }
  const styleMap: Record<string, string> = { solid: 'solid', dashed: 'dashed', dotted: 'dotted' };
  return (
    <div className="flex h-full w-full items-center px-1">
      <hr className="w-full" style={{ borderTop: `1px ${styleMap[content.style] ?? 'solid'} ${config.colors.accent}30` }} />
    </div>
  );
}

function PreviewEmbedBlock({ label, color, config }: { label: string; color: string; config: BioThemeConfig }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center gap-0.5 text-[5px] font-medium"
      style={{
        backgroundColor: `${color}12`,
        color: config.colors.text,
        borderRadius: config.borderRadius,
        fontFamily: `'${config.fonts.body.family}', sans-serif`,
      }}
    >
      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{label}</span>
    </div>
  );
}
