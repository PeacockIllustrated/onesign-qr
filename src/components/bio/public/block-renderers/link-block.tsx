'use client';

import { ExternalLink } from 'lucide-react';
import type { BioBlockContentLink, BioThemeConfig, BioLinkIconType } from '@/types/bio';

interface PublicLinkBlockProps {
  content: BioBlockContentLink;
  blockId: string;
  pageId: string;
  themeConfig: BioThemeConfig;
  staggerIndex: number;
}

/**
 * Renders the appropriate icon based on icon_type.
 * - emoji: renders the emoji text
 * - image/favicon: renders an <img> with icon_url
 * - null/undefined + icon string: legacy emoji fallback
 */
function LinkIcon({
  icon,
  iconType,
  iconUrl,
  iconBgColor,
  showIcon,
}: {
  icon?: string | null;
  iconType?: BioLinkIconType | null;
  iconUrl?: string | null;
  iconBgColor?: string | null;
  showIcon?: boolean;
}) {
  if (showIcon === false) return null;

  let iconElement: React.ReactNode = null;

  if ((iconType === 'favicon' || iconType === 'image') && iconUrl) {
    iconElement = (
      <img
        src={iconUrl}
        alt=""
        className="h-5 w-5 shrink-0 rounded object-cover"
        loading="lazy"
      />
    );
  } else if (iconType === 'emoji' || (!iconType && icon)) {
    iconElement = icon ? <span className="shrink-0 text-lg">{icon}</span> : null;
  }

  if (!iconElement) return null;

  if (iconBgColor) {
    return (
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBgColor }}
      >
        {iconElement}
      </span>
    );
  }

  return <>{iconElement}</>;
}

/**
 * Public-facing link block renderer.
 * Renders as an <a> tag styled as a themed button with click tracking.
 * Uses h-full w-full to fill its grid cell completely.
 */
export function PublicLinkBlock({
  content,
  blockId,
  pageId,
  themeConfig,
  staggerIndex,
}: PublicLinkBlockProps) {
  const { buttonStyle, colors, fonts, animations } = themeConfig;

  const handleClick = () => {
    try {
      navigator.sendBeacon(
        '/api/bio/track',
        JSON.stringify({ block_id: blockId, page_id: pageId }),
      );
    } catch {
      // Tracking is non-critical
    }
  };

  // Build button styles from theme config
  const btnStyle: React.CSSProperties = {
    borderRadius: buttonStyle.borderRadius,
    borderWidth: buttonStyle.borderWidth,
    borderStyle: 'solid',
    fontFamily: `'${fonts.body.family}', sans-serif`,
    transition: 'all 0.2s ease',
    ...(buttonStyle.extraCSS || {}),
  };

  if (buttonStyle.variant === 'outline') {
    Object.assign(btnStyle, {
      backgroundColor: 'transparent',
      color: colors.accent,
      borderColor: colors.accent,
    });
  } else if (buttonStyle.variant === 'glass') {
    Object.assign(btnStyle, {
      backgroundColor: colors.buttonBg,
      color: colors.buttonText,
      borderColor: colors.buttonBorder,
    });
  } else {
    // filled
    Object.assign(btnStyle, {
      backgroundColor: colors.buttonBg,
      color: colors.buttonText,
      borderColor: colors.buttonBorder,
    });
  }

  // Stagger animation delay
  if (animations.linkStagger) {
    btnStyle.animationDelay = `${staggerIndex * animations.staggerDelay}ms`;
  }

  // Combine animation classes
  const animClasses = [
    animations.linkStagger ? 'bio-link-stagger' : '',
    animations.buttonHover,
    animations.buttonClick,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a
      href={content.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`flex h-full w-full items-center justify-center px-5 text-center text-sm font-medium tracking-wide ${animClasses}`}
      style={btnStyle}
    >
      <span className="flex w-full items-center justify-center gap-2.5">
        <LinkIcon
          icon={content.icon}
          iconType={content.icon_type}
          iconUrl={content.icon_url}
          iconBgColor={content.icon_bg_color}
          showIcon={content.show_icon}
        />
        <span className="truncate">{content.title || 'Untitled link'}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden="true" />
      </span>
    </a>
  );
}
