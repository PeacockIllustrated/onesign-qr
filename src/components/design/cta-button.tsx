import Link from 'next/link';
import { ReactNode } from 'react';

interface CtaButtonProps {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  className?: string;
}

export function CtaButton({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}: CtaButtonProps) {
  const sizeClasses =
    size === 'lg'
      ? 'px-6 py-3.5 text-base'
      : 'px-5 py-2.5 text-sm';

  const variantClasses =
    variant === 'primary'
      ? 'bg-lynx-500 text-zinc-950 hover:bg-lynx-400 font-semibold shadow-sm'
      : 'border border-zinc-700 text-zinc-50 hover:border-lynx-400 hover:text-lynx-400';

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </Link>
  );
}
