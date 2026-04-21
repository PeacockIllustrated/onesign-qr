// FeatureCard — premium feature grid card for use on zinc-950 marketing sections.
// Assumes a dark background. Hover state: subtle -translate-y lift + lynx-400
// top-edge accent that glows inward, giving a lit-from-within effect.
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
  className = '',
}: FeatureCardProps) {
  return (
    <div
      className={[
        // Base card — zinc-900 with faint inner border
        'group relative flex flex-col bg-zinc-900 rounded-2xl p-6',
        'border border-zinc-800',
        // Top-edge lynx-400 accent line — 0-width at rest, appears on hover
        'before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-2xl',
        'before:bg-lynx-400 before:opacity-0 before:transition-opacity before:duration-300',
        'hover:before:opacity-100',
        // Lift + inset shadow that deepens on hover
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1',
        'hover:shadow-[0_8px_40px_-8px_rgba(88,163,134,0.18),0_4px_16px_-4px_rgba(0,0,0,0.5)]',
        // Focus-visible ring for keyboard nav (when used inside a Link wrapper)
        'focus-visible:outline-none',
        className,
      ].join(' ')}
    >
      {/* Icon ─────────────────────────────────────────────────── */}
      <div
        className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lynx-400 ring-1 ring-inset ring-zinc-700/60 transition-colors duration-300 group-hover:bg-zinc-800/80 group-hover:ring-lynx-400/30"
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Content ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        <h3 className="text-base font-semibold text-zinc-50 tracking-tight leading-snug">
          {title}
        </h3>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed flex-1">
          {body}
        </p>

        {/* Optional CTA link ────────────────────────────────────── */}
        {href && (
          <div className="mt-5 pt-4 border-t border-zinc-800">
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-xs font-semibold text-lynx-400 hover:text-lynx-300 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              aria-label={`${linkLabel}: ${title}`}
            >
              {linkLabel}
              {/* Arrow — shifts right on hover via group, but card group overrides are scoped here */}
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
