// FeatureCard — premium feature grid card for marketing sections.
// Supports dark (zinc-950 bg) and light (zinc-50/white bg) tones.
// Hover: subtle lift + lynx-400 top-edge accent.
// If `href` is supplied, a "learn more →" link renders at the card bottom.

import Link from 'next/link';
import { type ReactNode } from 'react';

export interface FeatureCardProps {
  /** Icon slot — pass an inline SVG or lucide-react icon (aria-hidden). */
  icon: ReactNode;
  title: string;
  body: string;
  /** Optional link target. When supplied, renders a subtle "learn more →" CTA. */
  href?: string;
  /** Override the link label. Defaults to "Learn more". */
  linkLabel?: string;
  /**
   * 'dark' = for zinc-950 sections (default).
   * 'light' = for zinc-50 / white sections.
   */
  tone?: 'dark' | 'light';
  className?: string;
}

/**
 * Card for 3- or 4-column feature grids on marketing pages.
 * 1 column on mobile, N columns decided by the parent grid.
 */
export function FeatureCard({
  icon,
  title,
  body,
  href,
  linkLabel = 'Learn more',
  tone = 'dark',
  className = '',
}: FeatureCardProps) {
  const isLight = tone === 'light';

  const baseCard = isLight
    ? 'bg-white border-zinc-200/80'
    : 'bg-zinc-900 border-zinc-800';

  const hoverShadow = isLight
    ? 'hover:shadow-[0_8px_32px_-8px_rgba(88,163,134,0.20),0_4px_16px_-4px_rgba(0,0,0,0.08)]'
    : 'hover:shadow-[0_8px_40px_-8px_rgba(88,163,134,0.18),0_4px_16px_-4px_rgba(0,0,0,0.5)]';

  const iconWrap = isLight
    ? 'bg-zinc-100 text-lynx-600 ring-1 ring-inset ring-zinc-200 group-hover:ring-lynx-400/40'
    : 'bg-zinc-800 text-lynx-400 ring-1 ring-inset ring-zinc-700/60 group-hover:bg-zinc-800/80 group-hover:ring-lynx-400/30';

  const titleClass = isLight
    ? 'text-zinc-900'
    : 'text-zinc-50';

  const bodyClass = isLight
    ? 'text-zinc-600'
    : 'text-zinc-400';

  const footerBorder = isLight
    ? 'border-zinc-200'
    : 'border-zinc-800';

  const linkClass = isLight
    ? 'text-lynx-600 hover:text-lynx-700 focus-visible:ring-offset-white'
    : 'text-lynx-400 hover:text-lynx-300 focus-visible:ring-offset-zinc-900';

  return (
    <div
      className={[
        'group relative flex flex-col rounded-2xl p-6 border',
        baseCard,
        // Top-edge lynx accent that appears on hover
        'before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-2xl',
        'before:bg-lynx-400 before:opacity-0 before:transition-opacity before:duration-300',
        'hover:before:opacity-100',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1',
        hoverShadow,
        'focus-visible:outline-none',
        className,
      ].join(' ')}
    >
      {/* Icon */}
      <div
        className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300 ${iconWrap}`}
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col">
        <h3 className={`text-base font-semibold tracking-tight leading-snug ${titleClass}`}>
          {title}
        </h3>
        <p className={`mt-2 text-sm leading-relaxed flex-1 ${bodyClass}`}>
          {body}
        </p>

        {href && (
          <div className={`mt-5 pt-4 border-t ${footerBorder}`}>
            <Link
              href={href}
              className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 ${linkClass}`}
              aria-label={`${linkLabel}: ${title}`}
            >
              {linkLabel}
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
