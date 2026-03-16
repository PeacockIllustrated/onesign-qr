import Image from 'next/image';

interface OneSignIconProps {
  size?: number;
  className?: string;
}

export function OneSignIcon({ size = 24, className }: OneSignIconProps) {
  return (
    <Image
      src="/LogoFAVICON.svg"
      alt="OneSign"
      width={size}
      height={size}
      className={className}
    />
  );
}

interface OneSignWordmarkProps {
  variant?: 'black' | 'white';
  height?: number;
  className?: string;
}

export function OneSignWordmark({ variant = 'black', height = 28, className }: OneSignWordmarkProps) {
  const src = variant === 'white' ? '/logo_white.svg' : '/logo_black.svg';
  return (
    <Image
      src={src}
      alt="OneSign"
      width={Math.round(height * (785.08 / 166.13))}
      height={height}
      className={className}
      priority
    />
  );
}
