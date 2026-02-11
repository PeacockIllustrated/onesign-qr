'use client';

import { useState, useRef } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BioAvatarUploadProps {
  pageId: string;
  currentAvatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export function BioAvatarUpload({
  pageId,
  currentAvatarUrl,
  onAvatarChange,
}: BioAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Use JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 2 MB.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/bio/${pageId}/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { avatar_url } = await res.json();
      // Append cache-buster to force re-render
      onAvatarChange(`${avatar_url}?t=${Date.now()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset the file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/bio/${pageId}/avatar`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove avatar');
      }

      onAvatarChange(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove avatar');
    } finally {
      setIsRemoving(false);
    }
  };

  const busy = isUploading || isRemoving;

  return (
    <div className="flex items-center gap-4">
      {/* Avatar preview */}
      <button
        type="button"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border transition-colors',
          !busy && 'cursor-pointer hover:border-primary/50',
          busy && 'opacity-60'
        )}
      >
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt="Profile avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <Camera className="h-6 w-6 text-muted-foreground" />
        )}

        {/* Upload overlay */}
        {!busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors hover:bg-black/40">
            <Camera className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        )}

        {/* Loading spinner */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
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
            {currentAvatarUrl ? 'Change' : 'Upload'}
          </Button>

          {currentAvatarUrl && (
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
          JPEG, PNG, WebP, or GIF. Max 2 MB.
        </p>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
