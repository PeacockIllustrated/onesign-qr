import { ReactNode } from 'react';

interface EyebrowProps {
  children: ReactNode;
  /**
   * 'dark' = lynx-400 on dark background (default).
   * 'light' = lynx-600 on light background (passes contrast for small text).
   */
  tone?: 'dark' | 'light';
  className?: string;
}

/**
 * Small above-headline label with a decorative leading dash.
 */
export function Eyebrow({
  children,
  tone = 'dark',
  className = '',
}: EyebrowProps) {
  const colorClass = tone === 'light' ? 'text-lynx-600' : 'text-lynx-400';
  const dashClass = tone === 'light' ? 'bg-lynx-600' : 'bg-lynx-400';
  return (
    <p
      className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold ${colorClass} ${className}`}
    >
      <span aria-hidden="true" className={`inline-block w-6 h-px ${dashClass}`} />
      <span>{children}</span>
    </p>
  );
}
