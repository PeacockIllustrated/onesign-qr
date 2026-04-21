import Image from 'next/image';

// OneSign – Lynx brand assets live at /public:
//   onesign-lynx-icon-dark.svg    — icon for dark backgrounds (light content) — DEFAULT
//   onesign-lynx-icon-light.svg   — icon for light backgrounds (dark content)
//   onesign-lynx-dark.svg         — full wordmark for dark backgrounds — DEFAULT
//   onesign-lynx-light.svg        — full wordmark for light backgrounds
//
// Defaults target the dark aesthetic the app is converging on. Callers on
// legacy light-background surfaces can explicitly opt into the dark-content
// variant via `variant="black"` (wordmark) or `variant="light"` (icon).

const ICON_ASPECT = 468.2 / 422.16; // ~1.109
const WORDMARK_ASPECT = 2335.32 / 606.17; // ~3.853

interface OneSignIconProps {
  /**
   * 'dark' = light-content icon for dark backgrounds (default).
   * 'light' = dark-content icon for light backgrounds.
   */
  size?: number;
  variant?: 'dark' | 'light';
  className?: string;
}

export function OneSignIcon({
  size = 29,
  variant = 'dark',
  className,
}: OneSignIconProps) {
  const src =
    variant === 'light'
      ? '/onesign-lynx-icon-light.svg'
      : '/onesign-lynx-icon-dark.svg';
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
  /**
   * 'white' = light wordmark for dark backgrounds (default).
   * 'black' = dark wordmark for light backgrounds.
   */
  variant?: 'white' | 'black';
  height?: number;
  className?: string;
}

export function OneSignWordmark({
  variant = 'white',
  height = 34,
  className,
}: OneSignWordmarkProps) {
  const src =
    variant === 'black' ? '/onesign-lynx-light.svg' : '/onesign-lynx-dark.svg';
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
