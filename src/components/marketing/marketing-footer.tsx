// MarketingFooter — server component. Assumes zinc-950 background.
// Top rule: thin zinc-800 border-top.
// Layout: wordmark + tagline left, three link columns right (Product, Company, Legal).
// Bottom row: copyright + "Made in the UK" small-print.

import Link from 'next/link';
import { OneSignWordmark } from '@/components/ui';

const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Shop', href: '/app/shop' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer
      className="bg-zinc-950 border-t border-zinc-800"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">

        {/* ── Main row ────────────────────────────────────────── */}
        <div className="py-14 md:py-16 grid grid-cols-1 gap-10 md:grid-cols-[1fr_auto] md:gap-20 lg:gap-32">

          {/* Left — Wordmark + tagline */}
          <div className="flex flex-col gap-4 max-w-xs">
            <Link
              href="/"
              aria-label="OneSign – Lynx home"
              className="self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-sm"
            >
              <OneSignWordmark height={28} />
            </Link>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Business presence for UK&nbsp;SMBs.
            </p>
          </div>

          {/* Right — Link columns */}
          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-3 gap-8 sm:gap-12"
          >
            {FOOTER_COLUMNS.map(({ heading, links }) => (
              <div key={heading}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-4">
                  {heading}
                </h2>
                <ul className="flex flex-col gap-2.5 list-none m-0 p-0">
                  {links.map(({ label, href }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-sm"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* ── Bottom row: small-print ─────────────────────────── */}
        <div className="py-6 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-zinc-600">
            &copy; 2026 OneSign &amp; Digital. All rights reserved.
          </p>
          <p className="text-xs text-zinc-600 flex items-center gap-1.5">
            {/* Union Jack micro-motif — inline SVG, no dependencies */}
            <svg
              width="14"
              height="10"
              viewBox="0 0 14 10"
              fill="none"
              aria-hidden="true"
              className="opacity-50"
            >
              <rect width="14" height="10" rx="1" fill="#012169" />
              <path d="M0 0l14 10M14 0L0 10" stroke="white" strokeWidth="2" />
              <path d="M7 0v10M0 5h14" stroke="white" strokeWidth="3.5" />
              <path d="M7 0v10M0 5h14" stroke="#C8102E" strokeWidth="2" />
              <path d="M0 0l14 10M14 0L0 10" stroke="#C8102E" strokeWidth="1" />
            </svg>
            Made in the UK
          </p>
        </div>

      </div>
    </footer>
  );
}
