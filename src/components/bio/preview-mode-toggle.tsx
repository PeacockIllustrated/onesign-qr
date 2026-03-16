'use client';

import { Monitor, Tablet, Smartphone } from 'lucide-react';

export type PreviewMode = 'desktop' | 'tablet' | 'mobile';

interface PreviewModeToggleProps {
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}

const MODES: { id: PreviewMode; icon: typeof Monitor; label: string }[] = [
  { id: 'desktop', icon: Monitor, label: 'Desktop' },
  { id: 'tablet', icon: Tablet, label: 'Tablet' },
  { id: 'mobile', icon: Smartphone, label: 'Mobile' },
];

export const PREVIEW_WIDTHS: Record<PreviewMode, string | undefined> = {
  desktop: undefined,
  tablet: '768px',
  mobile: '375px',
};

export function PreviewModeToggle({ mode, onChange }: PreviewModeToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
      {MODES.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          title={label}
          className={`rounded-sm p-1.5 transition-colors ${
            mode === id
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
