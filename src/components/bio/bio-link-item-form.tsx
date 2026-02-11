'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { BioLinkItem } from '@/types/bio';

interface BioLinkItemFormProps {
  link: BioLinkItem;
  onSave: (data: { title: string; url: string; icon: string | null }) => void;
  onCancel: () => void;
}

export function BioLinkItemForm({ link, onSave, onCancel }: BioLinkItemFormProps) {
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [icon, setIcon] = useState(link.icon ?? '');

  const titleTrimmed = title.trim();
  const urlTrimmed = url.trim();
  const isValid = titleTrimmed.length > 0 && urlTrimmed.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSave({
      title: titleTrimmed,
      url: urlTrimmed,
      icon: icon.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`edit-title-${link.id}`}>Title</Label>
          <Input
            id={`edit-title-${link.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Link title"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`edit-url-${link.id}`}>URL</Label>
          <Input
            id={`edit-url-${link.id}`}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`edit-icon-${link.id}`}>Icon (emoji, optional)</Label>
        <Input
          id={`edit-icon-${link.id}`}
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="e.g. \uD83D\uDD17"
          className="max-w-[120px]"
          maxLength={4}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!isValid}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
