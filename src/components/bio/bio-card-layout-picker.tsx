'use client';

import { cn } from '@/lib/utils';
import { CONTACT_CARD_LAYOUTS } from '@/lib/constants';
import type { BioCardLayout } from '@/types/bio';

interface BioCardLayoutPickerProps {
  value: BioCardLayout | null;
  onChange: (layout: BioCardLayout) => void;
}

/** Miniature CSS illustration for each layout variant */
function LayoutMiniature({ layout }: { layout: BioCardLayout }) {
  switch (layout) {
    case 'centered':
      return (
        <div className="flex h-10 w-7 flex-col items-center justify-center gap-0.5">
          <div className="h-2.5 w-2.5 rounded-full bg-current opacity-60" />
          <div className="h-0.5 w-4 rounded-full bg-current opacity-60" />
          <div className="h-0.5 w-3 rounded-full bg-current opacity-60" />
        </div>
      );
    case 'left-aligned':
      return (
        <div className="flex h-10 w-7 items-center gap-1 px-0.5">
          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-current opacity-60" />
          <div className="flex flex-col gap-0.5">
            <div className="h-0.5 w-2.5 rounded-full bg-current opacity-60" />
            <div className="h-0.5 w-2 rounded-full bg-current opacity-60" />
          </div>
        </div>
      );
    case 'split':
      return (
        <div className="relative flex h-10 w-7 flex-col items-center">
          <div className="h-3 w-full rounded-sm bg-current opacity-40" />
          <div className="-mt-1.5 h-2.5 w-2.5 rounded-full border border-current bg-current opacity-60" />
          <div className="mt-0.5 h-0.5 w-4 rounded-full bg-current opacity-60" />
          <div className="mt-0.5 h-0.5 w-3 rounded-full bg-current opacity-60" />
        </div>
      );
    case 'minimal':
      return (
        <div className="flex h-10 w-7 flex-col items-center justify-center gap-1">
          <div className="h-0.5 w-4 rounded-full bg-current opacity-60" />
          <div className="h-0.5 w-3 rounded-full bg-current opacity-60" />
          <div className="h-0.5 w-3.5 rounded-full bg-current opacity-60" />
        </div>
      );
    case 'cover':
      return (
        <div className="relative flex h-10 w-7 flex-col items-center justify-center rounded-sm bg-current opacity-60">
          <div className="h-2.5 w-2.5 rounded-full border border-current bg-current opacity-80" />
          <div className="mt-0.5 h-0.5 w-4 rounded-full bg-current opacity-80" />
        </div>
      );
    default:
      return null;
  }
}

export function BioCardLayoutPicker({ value, onChange }: BioCardLayoutPickerProps) {
  const selected = value ?? 'centered';

  return (
    <div className="flex flex-wrap gap-2">
      {CONTACT_CARD_LAYOUTS.map((option) => {
        const isSelected = selected === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'relative flex items-center gap-2 rounded-md border-2 px-3 py-2 text-xs font-medium transition-colors',
              isSelected
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'
            )}
          >
            <LayoutMiniature layout={option.id} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
