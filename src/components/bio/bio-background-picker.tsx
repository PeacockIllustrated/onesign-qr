'use client';

import { Check } from 'lucide-react';
import { BACKGROUND_VARIANTS } from '@/lib/bio/theme-definitions';
import { cn } from '@/lib/utils';
import type { BioLinkTheme } from '@/types/bio';

interface BioBackgroundPickerProps {
  theme: BioLinkTheme;
  value: string | null;
  onChange: (variant: string | null) => void;
}

export function BioBackgroundPicker({ theme, value, onChange }: BioBackgroundPickerProps) {
  const variants = BACKGROUND_VARIANTS[theme];

  if (!variants || variants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No background variants available for this theme.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {/* Default option */}
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-colors',
          value === null
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        )}
      >
        {value === null && (
          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
            <Check className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
        <div className="h-12 w-16 rounded-md border border-border/30 bg-muted" />
        <span className="text-[10px] font-medium">Default</span>
      </button>

      {/* Variant options */}
      {variants.map((variant) => {
        const isSelected = value === variant.id;
        return (
          <button
            key={variant.id}
            type="button"
            onClick={() => onChange(variant.id)}
            className={cn(
              'relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-colors',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            {isSelected && (
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                <Check className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
            <div
              className="h-12 w-16 rounded-md border border-border/30"
              style={{ background: variant.background.css }}
            />
            <span className="text-[10px] font-medium">{variant.name}</span>
          </button>
        );
      })}
    </div>
  );
}
