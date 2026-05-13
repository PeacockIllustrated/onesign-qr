import type { BrandDesignHydrated, AvatarShape } from '@/types/brand';

/**
 * Avatar block for email signatures.
 *
 * Outlook (Windows desktop) ignores `border-radius` since 2016+ has variable
 * support, so we render a regular img with a border-radius — modern clients
 * (Gmail web, Apple Mail, Outlook 365 web, mobile clients) render it
 * rounded; older Outlook falls back to a square. That's an acceptable
 * graceful degradation.
 */
export function SigAvatar({
  photoUrl,
  initials,
  shape,
  border,
  borderColor,
  sizePx,
  fallbackBg,
}: {
  photoUrl: string | null;
  initials: string;
  shape: 'circle' | 'square';
  border: boolean;
  borderColor: string;
  sizePx: number;
  fallbackBg: string;
}) {
  const radius = shape === 'circle' ? '50%' : '8px';
  const borderStyle = border ? `2px solid ${borderColor}` : 'none';
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        width={sizePx}
        height={sizePx}
        style={{
          display: 'block',
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          objectFit: 'cover',
          borderRadius: radius,
          border: borderStyle,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        borderRadius: radius,
        border: borderStyle,
        backgroundColor: fallbackBg,
        color: borderColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(sizePx * 0.4)}px`,
        fontWeight: 600,
      }}
    >
      {initials}
    </div>
  );
}

/** Resolve avatar settings from design config with sensible defaults. */
export function resolveAvatarSettings(
  design: BrandDesignHydrated,
  defaultShape: AvatarShape = 'circle',
): {
  shape: AvatarShape;
  showImage: boolean;
  border: boolean;
  borderColor: string;
} {
  const shape = design.config.avatar_shape ?? defaultShape;
  const border = design.config.avatar_border ?? false;
  const borderColor =
    design.config.avatar_border_color ??
    design.config.accent_color ??
    design.profile.accent_color ??
    design.profile.primary_color;
  return {
    shape,
    showImage: shape !== 'none',
    border,
    borderColor,
  };
}

export function sigInitials(name: string | undefined): string {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Compact logo treatment used when the avatar already occupies the
 * signature's primary visual slot. Sits inline with the company line or
 * underneath the contact stack — small enough to stay supportive, not
 * compete for attention.
 *
 * Returns `null` if there is no logo to render or `show_logo === false`.
 */
export function SecondaryLogo({
  url,
  alt,
  maxHeightPx,
  align = 'left',
}: {
  url: string | null | undefined;
  alt: string;
  maxHeightPx: number;
  align?: 'left' | 'right';
}) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        maxHeight: `${maxHeightPx}px`,
        maxWidth: `${maxHeightPx * 3}px`,
        objectFit: 'contain',
        objectPosition: align === 'right' ? 'right center' : 'left center',
      }}
    />
  );
}
