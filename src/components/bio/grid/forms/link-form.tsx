'use client';

import type { BioBlockContentLink } from '@/types/bio';

interface LinkFormProps {
  content: BioBlockContentLink;
  onChange: (content: BioBlockContentLink) => void;
}

export function LinkForm({ content, onChange }: LinkFormProps) {
  return (
    <div className="space-y-3">
      {/* Title */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Title
        </label>
        <input
          type="text"
          value={content.title}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          placeholder="Link title"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* URL */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          URL
        </label>
        <input
          type="url"
          value={content.url}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
          placeholder="https://example.com"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Icon */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Icon (emoji)
        </label>
        <input
          type="text"
          value={content.icon ?? ''}
          onChange={(e) =>
            onChange({
              ...content,
              icon: e.target.value.slice(0, 50) || null,
            })
          }
          placeholder="e.g. 🔗"
          maxLength={50}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Show Icon */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="show-icon"
          checked={content.show_icon ?? false}
          onChange={(e) =>
            onChange({ ...content, show_icon: e.target.checked })
          }
          className="rounded border-input bg-background text-foreground focus:ring-ring"
        />
        <label
          htmlFor="show-icon"
          className="text-xs font-medium text-muted-foreground"
        >
          Show icon
        </label>
      </div>
    </div>
  );
}
