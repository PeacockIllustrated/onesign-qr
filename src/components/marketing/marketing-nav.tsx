'use client';

// MarketingNav — sticky top navigation for marketing pages.
// Assumes zinc-950 background. Uses backdrop-blur when scrolled.
// Mobile: burger icon opens a slide-down drawer with focus trap + Escape close.
//
// Imports:
//   OneSignWordmark from @/components/ui (default 'white' variant — light-on-dark)
//   CtaButton from @/components/design

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { OneSignWordmark } from '@/components/ui';
import { CtaButton } from '@/components/design';

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Shop', href: '/shop' },
] as const;

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Scroll detection — apply blur/bg when past 8px
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        burgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus trap — cycle focus within the drawer when it's open
  const handleDrawerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    []
  );

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      <header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800'
            : 'bg-zinc-950 border-b border-zinc-800',
        ].join(' ')}
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <nav
            className="flex items-center justify-between h-16"
            aria-label="Main navigation"
          >
            {/* ── Left: Wordmark ───────────────────────────── */}
            <Link
              href="/"
              aria-label="OneSign – Lynx home"
              className="flex-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-sm"
            >
              <OneSignWordmark height={26} />
            </Link>

            {/* ── Centre: Desktop nav links ─────────────────── */}
            <ul
              className="hidden md:flex items-center gap-1 list-none m-0 p-0"
              role="list"
            >
              {NAV_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* ── Right: CTAs ───────────────────────────────── */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-sm px-1"
              >
                Sign in
              </Link>
              <CtaButton href="/auth/signup" variant="primary" size="md">
                Sign up
              </CtaButton>
            </div>

            {/* ── Mobile: Burger button ─────────────────────── */}
            <button
              ref={burgerRef}
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              aria-label="Open menu"
              aria-expanded={isOpen}
              aria-controls="mobile-nav-drawer"
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-md text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              {isOpen ? (
                /* X close icon */
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 2l14 14M16 2L2 16"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                /* Hamburger icon */
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 4.5h14M2 9h14M2 13.5h14"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* ── Mobile drawer ─────────────────────────────────────────── */}
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onKeyDown={handleDrawerKeyDown}
        className={[
          'fixed inset-x-0 top-16 z-50 md:hidden',
          'bg-zinc-950 border-b border-zinc-800',
          'transition-all duration-300 ease-out origin-top',
          isOpen
            ? 'opacity-100 scale-y-100 pointer-events-auto'
            : 'opacity-0 scale-y-95 pointer-events-none',
        ].join(' ')}
      >
        <nav
          className="max-w-7xl mx-auto px-5 py-6 flex flex-col gap-1"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className="px-3 py-3 text-base font-medium text-zinc-300 hover:text-zinc-50 hover:bg-zinc-900 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              {label}
            </Link>
          ))}

          {/* Divider */}
          <div className="my-3 border-t border-zinc-800" aria-hidden="true" />

          {/* Mobile CTAs */}
          <Link
            href="/auth/login"
            onClick={() => setIsOpen(false)}
            className="px-3 py-3 text-base font-medium text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Sign in
          </Link>
          <div className="mt-1 px-3">
            <CtaButton
              href="/auth/signup"
              variant="primary"
              size="md"
              className="w-full justify-center"
            >
              Sign up
            </CtaButton>
          </div>
        </nav>
      </div>
    </>
  );
}
