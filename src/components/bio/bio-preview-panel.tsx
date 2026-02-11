'use client';

import { ExternalLink } from 'lucide-react';
import { resolveThemeVars, getButtonStyleCSS } from '@/lib/bio/themes';
import type { BioLinkTheme, BioLinkButtonStyle } from '@/types/bio';

interface PreviewLink {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  is_enabled: boolean;
}

interface BioPreviewPanelProps {
  title: string;
  bio: string | null;
  theme: BioLinkTheme;
  buttonStyle: BioLinkButtonStyle;
  customBgColor: string | null;
  customTextColor: string | null;
  customAccentColor: string | null;
  avatarUrl: string | null;
  links: PreviewLink[];
}

export function BioPreviewPanel({
  title,
  bio,
  theme,
  buttonStyle,
  customBgColor,
  customTextColor,
  customAccentColor,
  avatarUrl,
  links,
}: BioPreviewPanelProps) {
  const themeVars = resolveThemeVars(theme, {
    custom_bg_color: customBgColor,
    custom_text_color: customTextColor,
    custom_accent_color: customAccentColor,
  });

  const btnStyle = getButtonStyleCSS(buttonStyle);
  const enabledLinks = links.filter((l) => l.is_enabled);

  // Build the background style
  const bgStyle: React.CSSProperties = {};
  if (themeVars['--bio-bg-gradient']) {
    bgStyle.background = themeVars['--bio-bg-gradient'];
  } else {
    bgStyle.backgroundColor = themeVars['--bio-bg'];
  }

  // Extract initial from title
  const initial = title ? title.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>

      {/* Phone frame */}
      <div
        className="relative aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-border shadow-lg"
        style={{
          ...bgStyle,
          ...Object.fromEntries(
            Object.entries(themeVars).map(([k, v]) => [k, v])
          ),
        }}
      >
        <div className="flex h-full flex-col items-center overflow-y-auto px-4 py-8">
          {/* Avatar */}
          <div
            className="mb-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2"
            style={{
              borderColor: themeVars['--bio-avatar-ring'],
              backgroundColor: themeVars['--bio-button-bg'],
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
                style={{ color: themeVars['--bio-button-text'] }}
              >
                {initial}
              </span>
            )}
          </div>

          {/* Title */}
          <h2
            className="mb-1 text-center text-sm font-bold leading-tight"
            style={{ color: themeVars['--bio-text'] }}
          >
            {title || 'Your Name'}
          </h2>

          {/* Bio */}
          {bio && (
            <p
              className="mb-4 max-w-full text-center text-[10px] leading-snug"
              style={{ color: themeVars['--bio-text-secondary'] }}
            >
              {bio}
            </p>
          )}

          {/* Links */}
          <div className="mt-2 flex w-full flex-col gap-2">
            {enabledLinks.length === 0 && (
              <p
                className="text-center text-[10px]"
                style={{ color: themeVars['--bio-text-secondary'] }}
              >
                No links yet
              </p>
            )}
            {enabledLinks.map((link) => (
              <div
                key={link.id}
                className="flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-center text-[10px] font-medium transition-opacity"
                style={btnStyle}
              >
                {link.icon && <span className="text-xs">{link.icon}</span>}
                <span className="truncate">{link.title}</span>
                <ExternalLink className="h-2 w-2 shrink-0 opacity-50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
