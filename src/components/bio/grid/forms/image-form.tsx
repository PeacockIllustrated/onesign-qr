'use client';

import type { BioBlockContentImage } from '@/types/bio';

interface ImageFormProps {
  content: BioBlockContentImage;
  onChange: (content: BioBlockContentImage) => void;
}

export function ImageForm({ content, onChange }: ImageFormProps) {
  return (
    <div className="space-y-3">
      {/* Image URL */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Image URL
        </label>
        <input
          type="url"
          value={content.src}
          onChange={(e) => onChange({ ...content, src: e.target.value })}
          placeholder="https://example.com/image.jpg"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Alt Text */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Alt text
        </label>
        <input
          type="text"
          value={content.alt ?? ''}
          onChange={(e) =>
            onChange({ ...content, alt: e.target.value || undefined })
          }
          placeholder="Describe the image"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Object Fit */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Fit mode
        </label>
        <select
          value={content.object_fit ?? 'cover'}
          onChange={(e) =>
            onChange({
              ...content,
              object_fit: e.target.value as 'cover' | 'contain',
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="cover">Cover (crop to fill)</option>
          <option value="contain">Contain (fit inside)</option>
        </select>
      </div>

      {/* Invert */}
      <label className="flex cursor-pointer items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Invert colours
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={!!content.invert}
          onClick={() => onChange({ ...content, invert: !content.invert })}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            content.invert ? 'bg-foreground' : 'bg-border'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              content.invert ? 'translate-x-[18px]' : 'translate-x-[3px]'
            }`}
          />
        </button>
      </label>

      {/* Link URL */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Link URL (optional)
        </label>
        <input
          type="url"
          value={content.link_url ?? ''}
          onChange={(e) =>
            onChange({ ...content, link_url: e.target.value || undefined })
          }
          placeholder="https://example.com"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}
