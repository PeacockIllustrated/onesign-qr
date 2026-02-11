'use client';

import { Check } from 'lucide-react';
import { BORDER_RADIUS_MAP } from '@/lib/bio/theme-definitions';
import { cn } from '@/lib/utils';
import type { BioBorderRadius } from '@/types/bio';

interface BioBorderRadiusPickerProps {
  value: BioBorderRadius | null;
  onChange: (radius: BioBorderRadius | null) => void;
}

const OPTIONS: { id: BioBorderRadius | null; label: string }[] = [
  { id: null, label: 'Theme Default' },
  { id: 'sharp', label: 'Sharp' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'pill', label: 'Pill' },
  { id: 'soft', label: 'Soft' },
  { id: 'chunky', label: 'Chunky' },
  { id: 'organic', label: 'Organic' },
];

export function BioBorderRadiusPicker({ value, onChange }: BioBorderRadiusPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => {
        const isSelected = value === option.id;
        const radiusValue = option.id ? BORDER_RADIUS_MAP[option.id] : '8px';

        return (
          <button
            key={option.id ?? 'default'}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'relative flex items-center gap-2 rounded-md border-2 px-3 py-2 text-xs font-medium transition-colors',
              isSelected
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'
            )}
          >
            {/* Visual preview square */}
            <div
              className="h-4 w-6 border-2 border-current"
              style={{ borderRadius: radiusValue }}
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
