'use client';

import { Check } from 'lucide-react';
import { BIO_THEME_DEFINITIONS } from '@/lib/bio/themes';
import { cn } from '@/lib/utils';
import type { BioLinkTheme } from '@/types/bio';

interface BioThemePickerProps {
  value: BioLinkTheme;
  onChange: (theme: BioLinkTheme) => void;
}

const THEME_IDS = Object.keys(BIO_THEME_DEFINITIONS) as BioLinkTheme[];

export function BioThemePicker({ value, onChange }: BioThemePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {THEME_IDS.map((themeId) => {
        const theme = BIO_THEME_DEFINITIONS[themeId];
        const isSelected = value === themeId;

        return (
          <button
            key={themeId}
            type="button"
            onClick={() => onChange(themeId)}
            className={cn(
              'relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors duration-150',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            {/* Selected check overlay */}
            {isSelected && (
              <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}

            {/* Color preview dots */}
            <div className="flex items-center gap-1.5">
              {theme.previewColors.map((color, i) => (
                <span
                  key={i}
                  className="h-5 w-5 rounded-full border border-border/50"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Theme name */}
            <span className="text-xs font-medium">{theme.name}</span>
          </button>
        );
      })}
    </div>
  );
}
