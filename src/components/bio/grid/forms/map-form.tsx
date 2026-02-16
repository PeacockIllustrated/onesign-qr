'use client';

import type { BioBlockContentMap } from '@/types/bio';

interface MapFormProps {
  content: BioBlockContentMap;
  onChange: (content: BioBlockContentMap) => void;
}

export function MapForm({ content, onChange }: MapFormProps) {
  return (
    <div className="space-y-3">
      {/* Location Query */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Location
        </label>
        <input
          type="text"
          value={content.query}
          onChange={(e) => onChange({ ...content, query: e.target.value })}
          placeholder="e.g. Tokyo Tower, Japan"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Zoom Level */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Zoom level
        </label>
        <input
          type="number"
          value={content.zoom ?? 14}
          onChange={(e) => {
            const val = Math.min(20, Math.max(1, Number(e.target.value) || 14));
            onChange({ ...content, zoom: val });
          }}
          min={1}
          max={20}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          1 (world) to 20 (building level)
        </p>
      </div>
    </div>
  );
}
