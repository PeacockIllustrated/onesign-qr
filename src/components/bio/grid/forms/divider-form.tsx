'use client';

import type { BioBlockContentDivider } from '@/types/bio';

interface DividerFormProps {
  content: BioBlockContentDivider;
  onChange: (content: BioBlockContentDivider) => void;
}

export function DividerForm({ content, onChange }: DividerFormProps) {
  return (
    <div className="space-y-3">
      {/* Style */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Style
        </label>
        <select
          value={content.style}
          onChange={(e) =>
            onChange({
              ...content,
              style: e.target.value as BioBlockContentDivider['style'],
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
          <option value="gradient">Gradient</option>
        </select>
      </div>
    </div>
  );
}
