'use client';

import { useState, useRef } from 'react';
import { Globe, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BioFaviconUploadProps {
  pageId: string;
  currentFaviconUrl: string | null;
  onFaviconChange: (url: string | null) => void;
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon',
];
const MAX_FILE_SIZE = 512 * 1024; // 512 KB

export function BioFaviconUpload({
  pageId,
  currentFaviconUrl,
  onFaviconChange,
}: BioFaviconUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Use PNG, ICO, SVG, JPEG, WebP, or GIF.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 512 KB.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/bio/${pageId}/favicon`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { favicon_url } = await res.json();
      onFaviconChange(`${favicon_url}?t=${Date.now()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/bio/${pageId}/favicon`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove favicon');
      }

      onFaviconChange(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove favicon');
    } finally {
      setIsRemoving(false);
    }
  };

  const busy = isUploading || isRemoving;

  return (
    <div className="flex items-center gap-4">
      {/* Favicon preview */}
      <button
        type="button"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border transition-colors',
          !busy && 'cursor-pointer hover:border-primary/50',
          busy && 'opacity-60'
        )}
      >
        {currentFaviconUrl ? (
          <img
            src={currentFaviconUrl}
            alt="Page favicon"
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <Globe className="h-5 w-5 text-muted-foreground" />
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          </div>
        )}
      </button>

      {/* Controls */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {currentFaviconUrl ? 'Change' : 'Upload'}
          </Button>

          {currentFaviconUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              {isRemoving ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3.5 w-3.5" />
              )}
              Remove
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Browser tab icon. PNG, ICO, or SVG. Max 512 KB.
        </p>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/jpeg,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
