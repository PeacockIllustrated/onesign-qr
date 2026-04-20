import Image from 'next/image';

// OneSign – Lynx brand assets live at /public:
//   onesign-lynx-icon-light.svg   — icon for light backgrounds (dark content)
//   onesign-lynx-icon-dark.svg    — icon for dark backgrounds (light content)
//   onesign-lynx-light.svg        — full wordmark for light backgrounds
//   onesign-lynx-dark.svg         — full wordmark for dark backgrounds
//
// Component names keep the historical `OneSign*` prefix so existing imports
// don't need to be rewritten. The rendered asset is Lynx-branded.

const ICON_ASPECT = 468.2 / 422.16; // ~1.109
const WORDMARK_ASPECT = 2335.32 / 606.17; // ~3.853

interface OneSignIconProps {
  size?: number;
  variant?: 'light' | 'dark';
  className?: string;
}

export function OneSignIcon({
  size = 24,
  variant = 'light',
  className,
}: OneSignIconProps) {
  const src =
    variant === 'dark'
      ? '/onesign-lynx-icon-dark.svg'
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
   * 'black' = dark wordmark for light backgrounds (default).
   * 'white' = light wordmark for dark backgrounds.
   */
  variant?: 'black' | 'white';
  height?: number;
  className?: string;
}

export function OneSignWordmark({
  variant = 'black',
  height = 28,
  className,
}: OneSignWordmarkProps) {
  const src =
    variant === 'white' ? '/onesign-lynx-dark.svg' : '/onesign-lynx-dark.svg';
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
