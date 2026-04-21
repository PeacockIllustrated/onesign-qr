import { ReactNode } from 'react';

interface EyebrowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Small above-headline label. The dash is decorative; colour is lynx-400 so
 * it reads as brand accent on zinc-950.
 */
export function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <p
      className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-lynx-400 ${className}`}
    >
      <span aria-hidden="true" className="inline-block w-6 h-px bg-lynx-400" />
      <span>{children}</span>
    </p>
  );
}
