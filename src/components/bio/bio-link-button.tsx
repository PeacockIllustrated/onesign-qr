'use client';

import { ExternalLink } from 'lucide-react';
import type { BioThemeConfig, BioLinkIconType } from '@/types/bio';

interface BioLinkButtonProps {
  itemId: string;
  pageId: string;
  title: string;
  url: string;
  icon?: string | null;
  iconType?: BioLinkIconType | null;
  iconUrl?: string | null;
  showIcon?: boolean;
  themeConfig: BioThemeConfig;
  staggerIndex?: number;
  staggerDelay?: number;
}

/**
 * Renders the appropriate icon based on icon_type.
 * - emoji: renders the emoji text
 * - image: renders an <img> with icon_url
 * - favicon: renders an <img> with icon_url (Google favicon service)
 * - null/undefined + icon string: legacy emoji fallback
 */
function LinkIcon({
  icon,
  iconType,
  iconUrl,
  showIcon,
}: {
  icon?: string | null;
  iconType?: BioLinkIconType | null;
  iconUrl?: string | null;
  showIcon?: boolean;
}) {
  if (showIcon === false) return null;

  // Favicon or image — render <img>
  if ((iconType === 'favicon' || iconType === 'image') && iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className="h-5 w-5 shrink-0 rounded object-cover"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  // Emoji (explicit or legacy fallback)
  if (iconType === 'emoji' || (!iconType && icon)) {
    return icon ? <span className="text-lg shrink-0">{icon}</span> : null;
  }

  return null;
}

export function BioLinkButton({
  itemId,
  pageId,
  title,
  url,
  icon,
  iconType,
  iconUrl,
  showIcon = true,
  themeConfig,
  staggerIndex,
  staggerDelay = 80,
}: BioLinkButtonProps) {
  const handleClick = () => {
    // Fire-and-forget click tracking via beacon (survives page navigation)
    try {
      navigator.sendBeacon(
        '/api/bio/track',
        JSON.stringify({ item_id: itemId, page_id: pageId })
      );
    } catch {
      // Tracking is non-critical
    }
  };

  const { buttonStyle, colors, fonts, animations } = themeConfig;

  // Build button styles from theme config
  const btnStyle: React.CSSProperties = {
    borderRadius: buttonStyle.borderRadius,
    borderWidth: buttonStyle.borderWidth,
    borderStyle: 'solid',
    fontFamily: `'${fonts.body.family}', sans-serif`,
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
    Object.assign(btnStyle, {
      backgroundColor: colors.buttonBg,
      color: colors.buttonText,
      borderColor: colors.buttonBorder,
    });
  }

  // Stagger animation delay
  if (staggerIndex !== undefined) {
    btnStyle.animationDelay = `${staggerIndex * staggerDelay}ms`;
  }

  // Combine animation classes
  const animClasses = [
    staggerIndex !== undefined ? 'bio-link-stagger' : '',
    animations.buttonHover,
    animations.buttonClick,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`block w-full px-6 py-4 text-center font-medium ${animClasses}`}
      style={btnStyle}
    >
      <span className="flex items-center justify-center gap-2">
        <LinkIcon
          icon={icon}
          iconType={iconType}
          iconUrl={iconUrl}
          showIcon={showIcon}
        />
        <span>{title}</span>
        <ExternalLink className="h-3.5 w-3.5 opacity-50" />
      </span>
    </a>
  );
}
