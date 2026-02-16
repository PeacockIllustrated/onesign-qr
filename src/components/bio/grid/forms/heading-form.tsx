'use client';

import type { BioBlockContentHeading } from '@/types/bio';

interface HeadingFormProps {
  content: BioBlockContentHeading;
  onChange: (content: BioBlockContentHeading) => void;
}

export function HeadingForm({ content, onChange }: HeadingFormProps) {
  return (
    <div className="space-y-3">
      {/* Text */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Text
        </label>
        <input
          type="text"
          value={content.text}
          onChange={(e) => onChange({ ...content, text: e.target.value })}
          placeholder="Heading text"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Level */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Size
        </label>
        <select
          value={content.level}
          onChange={(e) =>
            onChange({
              ...content,
              level: Number(e.target.value) as 1 | 2 | 3,
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value={1}>Large Heading</option>
          <option value={2}>Medium Heading</option>
          <option value={3}>Small Heading</option>
        </select>
      </div>
    </div>
  );
}
