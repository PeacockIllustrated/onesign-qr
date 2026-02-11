'use client';

import { useState, useCallback } from 'react';
import { Globe, Smile, ImageIcon, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BioLinkItem, BioLinkIconType } from '@/types/bio';

/** Data shape returned by the form on save */
export interface LinkIconFormData {
  title: string;
  url: string;
  icon: string | null;
  icon_type: BioLinkIconType | null;
  icon_url: string | null;
  show_icon: boolean;
}

interface BioLinkItemFormProps {
  link: BioLinkItem;
  onSave: (data: LinkIconFormData) => void;
  onCancel: () => void;
}

type IconMode = 'none' | 'emoji' | 'image' | 'favicon';

function iconModeFromLink(link: BioLinkItem): IconMode {
  if (!link.show_icon) return 'none';
  if (link.icon_type === 'favicon') return 'favicon';
  if (link.icon_type === 'image') return 'image';
  if (link.icon_type === 'emoji' || (link.icon && !link.icon_type)) return 'emoji';
  return 'none';
}

export function BioLinkItemForm({ link, onSave, onCancel }: BioLinkItemFormProps) {
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);

  // Icon state
  const [iconMode, setIconMode] = useState<IconMode>(iconModeFromLink(link));
  const [emoji, setEmoji] = useState(link.icon ?? '');
  const [imageUrl, setImageUrl] = useState(
    link.icon_type === 'image' ? (link.icon_url ?? '') : ''
  );
  const [faviconUrl, setFaviconUrl] = useState(
    link.icon_type === 'favicon' ? (link.icon_url ?? '') : ''
  );
  const [isFetchingFavicon, setIsFetchingFavicon] = useState(false);

  const titleTrimmed = title.trim();
  const urlTrimmed = url.trim();
  const isValid = titleTrimmed.length > 0 && urlTrimmed.length > 0;

  // Fetch favicon from URL
  const fetchFavicon = useCallback(async () => {
    const target = urlTrimmed || url.trim();
    if (!target) return;

    setIsFetchingFavicon(true);
    try {
      const res = await fetch(
        `/api/bio/favicon?url=${encodeURIComponent(target)}`
      );
      if (!res.ok) throw new Error('Failed to fetch favicon');
      const data = await res.json();
      setFaviconUrl(data.favicon_url);
    } catch {
      setFaviconUrl('');
    } finally {
      setIsFetchingFavicon(false);
    }
  }, [urlTrimmed, url]);

  // When user switches to favicon mode, auto-fetch
  const handleModeChange = (mode: IconMode) => {
    setIconMode(mode);
    if (mode === 'favicon' && !faviconUrl && urlTrimmed) {
      fetchFavicon();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    let iconData: LinkIconFormData;

    switch (iconMode) {
      case 'emoji':
        iconData = {
          title: titleTrimmed,
          url: urlTrimmed,
          icon: emoji.trim() || null,
          icon_type: emoji.trim() ? 'emoji' : null,
          icon_url: null,
          show_icon: true,
        };
        break;
      case 'image':
        iconData = {
          title: titleTrimmed,
          url: urlTrimmed,
          icon: null,
          icon_type: imageUrl.trim() ? 'image' : null,
          icon_url: imageUrl.trim() || null,
          show_icon: true,
        };
        break;
      case 'favicon':
        iconData = {
          title: titleTrimmed,
          url: urlTrimmed,
          icon: null,
          icon_type: faviconUrl ? 'favicon' : null,
          icon_url: faviconUrl || null,
          show_icon: true,
        };
        break;
      default:
        iconData = {
          title: titleTrimmed,
          url: urlTrimmed,
          icon: null,
          icon_type: null,
          icon_url: null,
          show_icon: false,
        };
    }

    onSave(iconData);
  };

  const iconModes: { id: IconMode; label: string; icon: React.ReactNode }[] = [
    { id: 'none', label: 'None', icon: null },
    { id: 'emoji', label: 'Emoji', icon: <Smile className="h-3.5 w-3.5" /> },
    { id: 'favicon', label: 'Favicon', icon: <Globe className="h-3.5 w-3.5" /> },
    { id: 'image', label: 'Image URL', icon: <ImageIcon className="h-3.5 w-3.5" /> },
  ];

  // Current icon preview
  const renderIconPreview = () => {
    switch (iconMode) {
      case 'emoji':
        return emoji ? (
          <span className="text-2xl">{emoji}</span>
        ) : (
          <span className="text-xs text-muted-foreground">No emoji</span>
        );
      case 'image':
        return imageUrl ? (
          <img
            src={imageUrl}
            alt="Icon"
            className="h-8 w-8 rounded object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="text-xs text-muted-foreground">No image</span>
        );
      case 'favicon':
        if (isFetchingFavicon) {
          return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
        }
        return faviconUrl ? (
          <img
            src={faviconUrl}
            alt="Favicon"
            className="h-8 w-8 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="text-xs text-muted-foreground">No favicon</span>
        );
      default:
        return <span className="text-xs text-muted-foreground">Hidden</span>;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4"
    >
      {/* Title & URL */}
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

      {/* Icon section */}
      <div className="flex flex-col gap-2">
        <Label>Icon</Label>

        {/* Mode selector */}
        <div className="flex flex-wrap gap-1.5">
          {iconModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleModeChange(mode.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                iconMode === mode.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground'
              )}
            >
              {mode.icon}
              {mode.label}
            </button>
          ))}
        </div>

        {/* Mode-specific input + preview */}
        <div className="flex items-center gap-3">
          {/* Preview */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
            {renderIconPreview()}
          </div>

          {/* Input */}
          <div className="flex-1">
            {iconMode === 'emoji' && (
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="e.g. 🔗"
                className="max-w-[140px]"
                maxLength={4}
              />
            )}
            {iconMode === 'image' && (
              <Input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/icon.png"
              />
            )}
            {iconMode === 'favicon' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {faviconUrl
                    ? 'Favicon fetched from link URL'
                    : urlTrimmed
                      ? 'Click refresh to fetch'
                      : 'Enter a URL above first'}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchFavicon}
                  disabled={!urlTrimmed || isFetchingFavicon}
                  className="shrink-0"
                >
                  {isFetchingFavicon ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Globe className="mr-1 h-3 w-3" />
                  )}
                  Fetch
                </Button>
              </div>
            )}
            {iconMode === 'none' && (
              <span className="text-xs text-muted-foreground">
                Icon will be hidden for this link
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
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
