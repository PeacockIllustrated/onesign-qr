'use client';

import { useState, useEffect } from 'react';
import type { BioBlockContentCountdown, BioThemeConfig } from '@/types/bio';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeRemaining(target: string): TimeRemaining | null {
  const now = Date.now();
  const targetMs = new Date(target).getTime();
  const diff = targetMs - now;

  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

interface PublicCountdownBlockProps {
  content: BioBlockContentCountdown;
  themeConfig: BioThemeConfig;
  colSpan: number;
}

/**
 * Public-facing countdown timer block renderer.
 * Shows a live countdown to target_datetime using client-side intervals.
 * Automatically uses compact style when colSpan <= 1.
 */
export function PublicCountdownBlock({
  content,
  themeConfig,
  colSpan,
}: PublicCountdownBlockProps) {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(() =>
    content.target_datetime ? getTimeRemaining(content.target_datetime) : null
  );

  useEffect(() => {
    if (!content.target_datetime) return;

    const tick = () => {
      setTimeLeft(getTimeRemaining(content.target_datetime));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [content.target_datetime]);

  const { colors, borderRadius } = themeConfig;

  // Auto-compact when narrow
  const useCompact = colSpan <= 1 || content.style === 'compact';

  // Expired state
  if (!content.target_datetime || timeLeft === null) {
    const expiredMessage = content.expired_message || "We're live!";
    return (
      <div
        style={{
          padding: '1rem',
          textAlign: 'center',
          transition: 'opacity 0.4s ease',
        }}
      >
        {content.label && (
          <p
            style={{
              color: colors.textSecondary,
              fontSize: '0.75rem',
              marginBottom: '0.5rem',
              fontFamily: themeConfig.fonts.body.family,
            }}
          >
            {content.label}
          </p>
        )}
        <span
          style={{
            color: colors.accent,
            fontSize: '1.125rem',
            fontWeight: 700,
            fontFamily: themeConfig.fonts.title.family,
          }}
        >
          {expiredMessage}
        </span>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = timeLeft;

  return (
    <div style={{ padding: '0.75rem', textAlign: 'center' }}>
      {/* Optional label */}
      {content.label && (
        <p
          style={{
            color: colors.textSecondary,
            fontSize: '0.75rem',
            marginBottom: '0.5rem',
            fontFamily: themeConfig.fonts.body.family,
          }}
        >
          {content.label}
        </p>
      )}

      {useCompact ? (
        // ── Compact: single line ─────────────────────────────────────
        <p
          style={{
            color: colors.text,
            fontVariantNumeric: 'tabular-nums',
            fontSize: '0.9375rem',
            fontWeight: 600,
            fontFamily: themeConfig.fonts.body.family,
            letterSpacing: '0.02em',
          }}
        >
          {days > 0 && <span>{days}d </span>}
          <span>{pad(hours)}h </span>
          <span>{pad(minutes)}m </span>
          <span>{pad(seconds)}s</span>
        </p>
      ) : (
        // ── Large: individual boxes ──────────────────────────────────
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          {[
            { value: days, label: 'Days' },
            { value: hours, label: 'Hours' },
            { value: minutes, label: 'Min' },
            { value: seconds, label: 'Sec' },
          ].map(({ value, label }) => (
            <div
              key={label}
              style={{
                backgroundColor: colors.accent + '15',
                borderRadius,
                padding: '0.5rem 0.625rem',
                minWidth: '3rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span
                style={{
                  color: colors.text,
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                  fontFamily: themeConfig.fonts.body.family,
                }}
              >
                {pad(value)}
              </span>
              <span
                style={{
                  color: colors.textSecondary,
                  fontSize: '0.625rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: themeConfig.fonts.body.family,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
