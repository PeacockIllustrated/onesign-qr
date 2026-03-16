'use client';

import { useState, useRef } from 'react';
import { Loader2, X, Upload } from 'lucide-react';
import type { BioBlockContentGallery } from '@/types/bio';

interface GalleryFormProps {
  content: BioBlockContentGallery;
  onChange: (content: BioBlockContentGallery) => void;
  pageId: string;
}

export function GalleryForm({ content, onChange, pageId }: GalleryFormProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';
  const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await fetch(`/api/bio/${pageId}/gallery`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Upload failed');
      }

      const { data } = await res.json();
      const newImages = (data.paths as string[]).map((storage_path: string) => ({
        storage_path,
        caption: null,
        link_url: null,
      }));

      onChange({
        ...content,
        images: [...content.images, ...newImages],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset the file input so the same files can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    onChange({
      ...content,
      images: content.images.filter((_, i) => i !== index),
    });
  };

  const updateImageCaption = (index: number, caption: string) => {
    const updated = [...content.images];
    updated[index] = { ...updated[index], caption: caption || null };
    onChange({ ...content, images: updated });
  };

  const updateImageLink = (index: number, link_url: string) => {
    const updated = [...content.images];
    updated[index] = { ...updated[index], link_url: link_url || null };
    onChange({ ...content, images: updated });
  };

  return (
    <div className="space-y-3">
      {/* Display mode */}
      <div>
        <label className={labelClass}>Display mode</label>
        <select
          value={content.display_mode}
          onChange={(e) =>
            onChange({
              ...content,
              display_mode: e.target.value as 'grid' | 'carousel',
            })
          }
          className={inputClass}
        >
          <option value="grid">Grid</option>
          <option value="carousel">Carousel</option>
        </select>
      </div>

      {/* Columns (grid only) */}
      {content.display_mode === 'grid' && (
        <div>
          <label className={labelClass}>Columns</label>
          <select
            value={content.columns ?? 2}
            onChange={(e) =>
              onChange({
                ...content,
                columns: Number(e.target.value) as 2 | 3,
              })
            }
            className={inputClass}
          >
            <option value={2}>2 columns</option>
            <option value={3}>3 columns</option>
          </select>
        </div>
      )}

      {/* Upload images */}
      <div>
        <label className={labelClass}>Upload images</label>
        <div
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input px-3 py-3 text-sm text-muted-foreground transition hover:border-ring hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Choose images</span>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>

      {/* Image list */}
      {content.images.length > 0 && (
        <div className="space-y-2">
          <label className={labelClass}>
            Images ({content.images.length})
          </label>
          {content.images.map((img, idx) => (
            <div
              key={img.storage_path}
              className="rounded-md border border-border p-2 space-y-2"
            >
              <div className="flex items-start gap-2">
                {/* Thumbnail */}
                <img
                  src={`${supabaseUrl}/storage/v1/object/public/bio-gallery/${img.storage_path}`}
                  alt={img.caption ?? ''}
                  className="h-12 w-12 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Caption */}
                  <input
                    type="text"
                    value={img.caption ?? ''}
                    onChange={(e) => updateImageCaption(idx, e.target.value)}
                    placeholder="Caption"
                    className={inputClass}
                  />
                  {/* Link URL */}
                  <input
                    type="url"
                    value={img.link_url ?? ''}
                    onChange={(e) => updateImageLink(idx, e.target.value)}
                    placeholder="Link URL (optional)"
                    className={inputClass}
                  />
                </div>
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="shrink-0 rounded-sm p-1 text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
