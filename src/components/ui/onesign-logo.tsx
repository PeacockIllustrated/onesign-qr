import Image from 'next/image';

// OneSign – Lynx brand assets live at /public.
// File names follow the INK COLOUR of the artwork itself, not the background:
//   onesign-lynx-dark.svg        — dark ink (#393839 + lynx) → use on LIGHT backgrounds
//   onesign-lynx-light.svg       — white ink + lynx           → use on DARK backgrounds
//   onesign-lynx-icon-dark.svg   — dark-ink icon              → use on LIGHT backgrounds
//   onesign-lynx-icon-light.svg  — white-ink icon             → use on DARK backgrounds
//
// Callers specify the BACKGROUND the logo sits on via the `variant` prop:
//   variant="on-dark"  → renders the light-ink file  (default; marketing-first)
//   variant="on-light" → renders the dark-ink file

const ICON_ASPECT = 468.2 / 422.16; // ~1.109
const WORDMARK_ASPECT = 2335.32 / 606.17; // ~3.853

type LogoVariant = 'on-dark' | 'on-light';

interface OneSignIconProps {
  /** The background the icon sits on. Default: 'on-dark'. */
  variant?: LogoVariant;
  size?: number;
  className?: string;
}

export function OneSignIcon({
  size = 29,
  variant = 'on-dark',
  className,
}: OneSignIconProps) {
  const src =
    variant === 'on-light'
      ? '/onesign-lynx-icon-dark.svg' // dark ink, for light bg
      : '/onesign-lynx-icon-light.svg'; // white ink, for dark bg
  return (
    <Image
      src={src}
      alt="OneSign – Lynx"
      width={Math.round(size * ICON_ASPECT)}
      height={size}
      className={className}
    />
  );
}

interface OneSignWordmarkProps {
  /** The background the wordmark sits on. Default: 'on-dark'. */
  variant?: LogoVariant;
  height?: number;
  className?: string;
}

export function OneSignWordmark({
  variant = 'on-dark',
  height = 34,
  className,
}: OneSignWordmarkProps) {
  const src =
    variant === 'on-light'
      ? '/onesign-lynx-dark.svg' // dark ink, for light bg
      : '/onesign-lynx-light.svg'; // white ink, for dark bg
  return (
    <Image
      src={src}
      alt="OneSign – Lynx"
      width={Math.round(height * WORDMARK_ASPECT)}
      height={height}
      className={className}
      priority
    />
  );
}
