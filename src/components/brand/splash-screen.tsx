'use client';

// OneSign – Lynx splash screen.
//
// A short, on-brand "QR-scanner" intro that plays once per browser session
// when someone first lands on a OneSign-owned surface. Designed to be cool
// but unobtrusive:
//   • Shows ONCE per session (sessionStorage) — never on every navigation.
//   • Skippable — tap anywhere, press any key, or hit the Skip button.
//   • Auto-dismisses after a beat and fades out.
//   • Never covers customer-facing public bio pages (/p/*).
//   • Honours prefers-reduced-motion (shorter, calmer).
//
// Mounted once in the root layout. Because the root layout persists across
// client-side navigations, this component mounts only on a fresh page load,
// so it won't replay as the user moves around the app.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { OneSignIcon, OneSignWordmark } from '@/components/ui';
import './splash-screen.css';

const SESSION_KEY = 'onesign-lynx-splash-v1';
const DISPLAY_MS = 2200; // time the splash holds before auto-dismissing
const REDUCED_DISPLAY_MS = 900; // calmer hold when reduced motion is on
const EXIT_MS = 520; // must match the CSS fade-out transition

export function SplashScreen() {
  const pathname = usePathname();
  // Public bio pages are the customer's own brand — never overlay them.
  const isPublicSurface = pathname?.startsWith('/p/') ?? false;

  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [displayMs, setDisplayMs] = useState(DISPLAY_MS);

  const autoTimer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const exitingRef = useRef(false);

  const beginExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    setExiting(true);
    exitTimer.current = window.setTimeout(() => setVisible(false), EXIT_MS);
  }, []);

  // Decide whether to play, then schedule the auto-dismiss.
  useEffect(() => {
    if (isPublicSurface) {
      setVisible(false);
      return;
    }

    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      // sessionStorage unavailable (private mode / SSR) — just play once.
    }
    if (seen) {
      setVisible(false);
      return;
    }
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }

    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const hold = reduced ? REDUCED_DISPLAY_MS : DISPLAY_MS;
    setDisplayMs(hold);

    autoTimer.current = window.setTimeout(beginExit, hold);

    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [isPublicSurface, beginExit]);

  // Skip on any keypress while the splash is up.
  useEffect(() => {
    if (!visible) return;
    const onKey = () => beginExit();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, beginExit]);

  // Lock background scroll while the overlay is up; restore on dismiss.
  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  if (isPublicSurface || !visible) return null;

  return (
    <div
      role="status"
      aria-label="OneSign Lynx is loading"
      onClick={beginExit}
      className={`lynx-splash${exiting ? ' lynx-splash--exit' : ''}`}
    >
      <div className="lynx-splash__grid" aria-hidden="true" />
      <div className="lynx-splash__glow lynx-splash__glow--a" aria-hidden="true" />
      <div className="lynx-splash__glow lynx-splash__glow--b" aria-hidden="true" />

      <div className="lynx-splash__stage">
        <div className="lynx-splash__viewfinder" aria-hidden="true">
          <span className="lynx-splash__corner lynx-splash__corner--tl" />
          <span className="lynx-splash__corner lynx-splash__corner--tr" />
          <span className="lynx-splash__corner lynx-splash__corner--bl" />
          <span className="lynx-splash__corner lynx-splash__corner--br" />
          <span className="lynx-splash__scan" />
          <div className="lynx-splash__mark">
            <OneSignIcon variant="on-dark" size={62} />
          </div>
        </div>

        <div className="lynx-splash__wordmark">
          <OneSignWordmark variant="on-dark" height={24} />
        </div>

        <div className="lynx-splash__bar" aria-hidden="true">
          <span
            className="lynx-splash__bar-fill"
            style={{ animationDuration: `${displayMs}ms` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          beginExit();
        }}
        className="lynx-splash__skip"
      >
        Skip
        <span className="lynx-splash__skip-arrow" aria-hidden="true">
          →
        </span>
      </button>
    </div>
  );
}
