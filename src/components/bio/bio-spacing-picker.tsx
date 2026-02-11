'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BioSpacing } from '@/types/bio';

interface BioSpacingPickerProps {
  value: BioSpacing | null;
  onChange: (spacing: BioSpacing | null) => void;
}

const OPTIONS: { id: BioSpacing | null; label: string; description: string; preview: string }[] = [
  { id: null, label: 'Theme Default', description: 'Use theme setting', preview: 'gap-1.5' },
  { id: 'compact', label: 'Compact', description: 'Tight spacing', preview: 'gap-0.5' },
  { id: 'normal', label: 'Normal', description: 'Standard spacing', preview: 'gap-1.5' },
  { id: 'spacious', label: 'Spacious', description: 'Relaxed spacing', preview: 'gap-2.5' },
];

export function BioSpacingPicker({ value, onChange }: BioSpacingPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => {
        const isSelected = value === option.id;

        return (
          <button
            key={option.id ?? 'default'}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-md border-2 px-4 py-3 transition-colors',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            {/* Visual spacing preview */}
            <div className={cn('flex flex-col items-center w-8', option.preview)}>
              <div className="h-1 w-full rounded-full bg-current opacity-60" />
              <div className="h-1 w-full rounded-full bg-current opacity-40" />
              <div className="h-1 w-full rounded-full bg-current opacity-20" />
            </div>
            <span className="text-xs font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
