'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { BioBlockContentSocialIcons } from '@/types/bio';
import { SOCIAL_PLATFORMS } from '@/lib/constants';

interface SocialIconsFormProps {
  content: BioBlockContentSocialIcons;
  onChange: (content: BioBlockContentSocialIcons) => void;
}

const MAX_ICONS = 20;

export function SocialIconsForm({ content, onChange }: SocialIconsFormProps) {
  const icons = content.icons ?? [];

  function addIcon() {
    if (icons.length >= MAX_ICONS) return;
    onChange({
      ...content,
      icons: [...icons, { platform: 'website', url: '' }],
    });
  }

  function removeIcon(index: number) {
    onChange({
      ...content,
      icons: icons.filter((_, i) => i !== index),
    });
  }

  function updateIcon(
    index: number,
    field: 'platform' | 'url',
    value: string,
  ) {
    const updated = icons.map((icon, i) =>
      i === index ? { ...icon, [field]: value } : icon,
    );
    onChange({ ...content, icons: updated });
  }

  return (
    <div className="space-y-3">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        Social links
      </label>

      {icons.length === 0 && (
        <p className="text-xs text-muted-foreground">No social links added yet.</p>
      )}

      {icons.map((icon, index) => (
        <div key={index} className="flex items-start gap-2">
          <div className="flex flex-1 flex-col gap-2">
            {/* Platform select */}
            <select
              value={icon.platform}
              onChange={(e) => updateIcon(index, 'platform', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            {/* URL input */}
            <input
              type="url"
              value={icon.url}
              onChange={(e) => updateIcon(index, 'url', e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={() => removeIcon(index)}
            className="mt-2 flex-shrink-0 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Add button */}
      {icons.length < MAX_ICONS && (
        <button
          type="button"
          onClick={addIcon}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Add social link
        </button>
      )}

      {icons.length >= MAX_ICONS && (
        <p className="text-xs text-muted-foreground">
          Maximum of {MAX_ICONS} social links reached.
        </p>
      )}
    </div>
  );
}
