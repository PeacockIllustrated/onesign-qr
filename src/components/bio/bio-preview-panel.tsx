'use client';

import { ExternalLink } from 'lucide-react';
import {
  resolveFullThemeConfig,
  SPACING_MAP,
} from '@/lib/bio/theme-definitions';
import type {
  BioLinkTheme,
  BioLinkIconType,
  BioSpacing,
  BioBorderRadius,
} from '@/types/bio';

interface PreviewLink {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  icon_type?: BioLinkIconType | null;
  icon_url?: string | null;
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
}

/** Renders an icon in the preview at mini scale */
function PreviewLinkIcon({ link }: { link: PreviewLink }) {
  if (link.show_icon === false) return null;

  // Favicon or image
  if ((link.icon_type === 'favicon' || link.icon_type === 'image') && link.icon_url) {
    return (
      <img
        src={link.icon_url}
        alt=""
        className="h-3 w-3 shrink-0 rounded-sm object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  // Emoji (explicit or legacy)
  if (link.icon_type === 'emoji' || (!link.icon_type && link.icon)) {
    return link.icon ? <span className="text-xs shrink-0">{link.icon}</span> : null;
  }

  return null;
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
          {/* Avatar */}
          <div
            className="mb-1 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2"
            style={{
              borderColor: config.colors.avatarRing,
              backgroundColor: config.colors.accent,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={title}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span
                className="text-xl font-bold"
                style={{
                  color: config.colors.bg,
                  fontFamily: `'${config.fonts.title.family}', sans-serif`,
                }}
              >
                {initial}
              </span>
            )}
          </div>

          {/* Title */}
          <h2
            className="mb-0 text-center text-sm font-bold leading-tight"
            style={{
              color: config.colors.text,
              fontFamily: `'${config.fonts.title.family}', sans-serif`,
              fontWeight: config.fonts.title.weight,
            }}
          >
            {title || 'Your Name'}
          </h2>

          {/* Bio */}
          {bio && (
            <p
              className="mb-2 max-w-full text-center text-[10px] leading-snug"
              style={{
                color: config.colors.textSecondary,
                fontFamily: `'${config.fonts.body.family}', sans-serif`,
              }}
            >
              {bio}
            </p>
          )}

          {/* Links */}
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
        </div>
      </div>

      {/* Theme name label */}
      <p className="mt-2 text-[10px] text-muted-foreground">
        {config.name} theme
      </p>
    </div>
  );
}
