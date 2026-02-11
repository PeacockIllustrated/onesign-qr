'use client';

import { Check } from 'lucide-react';
import { THEME_CONFIGS } from '@/lib/bio/theme-definitions';
import { cn } from '@/lib/utils';
import type { BioLinkTheme } from '@/types/bio';

interface BioThemeGalleryProps {
  value: BioLinkTheme;
  onChange: (theme: BioLinkTheme) => void;
}

const THEME_IDS = Object.keys(THEME_CONFIGS) as BioLinkTheme[];

export function BioThemeGallery({ value, onChange }: BioThemeGalleryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {THEME_IDS.map((themeId) => {
        const theme = THEME_CONFIGS[themeId];
        const isSelected = value === themeId;

        // Mini preview background
        const previewBg = theme.colors.bgGradient || theme.colors.bg;

        return (
          <button
            key={themeId}
            type="button"
            onClick={() => onChange(themeId)}
            className={cn(
              'group relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all duration-150',
              isSelected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            )}
          >
            {/* Selected check */}
            {isSelected && (
              <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}

            {/* Mini phone frame preview */}
            <div
              className="w-full aspect-[9/14] rounded-md overflow-hidden border border-border/30"
              style={{ background: previewBg }}
            >
              <div className="flex flex-col items-center justify-center h-full gap-1 px-2 py-3">
                {/* Avatar circle */}
                <div
                  className="w-5 h-5 rounded-full shrink-0"
                  style={{
                    backgroundColor: theme.colors.accent,
                    border: `1.5px solid ${theme.colors.avatarRing}`,
                  }}
                />
                {/* Title bar */}
                <div
                  className="w-3/4 h-1 rounded-full"
                  style={{ backgroundColor: theme.colors.text, opacity: 0.7 }}
                />
                {/* Link buttons */}
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-full h-2.5 rounded-sm"
                    style={{
                      backgroundColor: theme.colors.buttonBg,
                      border: `1px solid ${theme.colors.buttonBorder}`,
                      borderRadius: theme.buttonStyle.borderRadius === '9999px' ? '9999px' : '2px',
                      opacity: 1 - i * 0.15,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Theme name & label */}
            <div className="text-center">
              <span className="block text-xs font-medium leading-tight">{theme.name}</span>
              <span className="block text-[10px] text-muted-foreground leading-tight">{theme.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
