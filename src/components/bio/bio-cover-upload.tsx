'use client';

import { useState, useRef, useCallback } from 'react';
import { ImagePlus, X, Loader2, GripVertical } from 'lucide-react';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/utils';

// ─── Constants ──────────────────────────────────────────────────────

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ASPECT_RATIOS = [
  { id: '3:1', label: 'Panoramic', css: '3/1' },
  { id: '16:9', label: 'Cinematic', css: '16/9' },
  { id: '2:1', label: 'Wide', css: '2/1' },
  { id: '4:3', label: 'Standard', css: '4/3' },
] as const;

/** Map AR string to CSS aspect-ratio value */
export const COVER_AR_CSS: Record<string, string> = {
  '3:1': '3/1',
  '16:9': '16/9',
  '2:1': '2/1',
  '4:3': '4/3',
};

// ─── Props ──────────────────────────────────────────────────────────

interface BioCoverUploadProps {
  pageId: string;
  currentCoverUrl: string | null;
  onCoverChange: (url: string | null) => void;
  aspectRatio: string | null;
  onAspectRatioChange: (ar: string) => void;
  positionY: number | null;
  onPositionYChange: (y: number) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function BioCoverUpload({
  pageId,
  currentCoverUrl,
  onCoverChange,
  aspectRatio,
  onAspectRatioChange,
  positionY,
  onPositionYChange,
}: BioCoverUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startY: number; startPosition: number } | null>(null);
  const { addToast } = useToast();

  const effectiveAR = aspectRatio ?? '3:1';
  const effectivePositionY = positionY ?? 50;
  const arCSS = COVER_AR_CSS[effectiveAR] ?? '3/1';

  // ── Upload handler ──────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      addToast({
        title: 'Invalid file type',
        description: 'Use JPEG, PNG, WebP, or GIF.',
        variant: 'error',
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      addToast({
        title: 'File too large',
        description: 'Maximum size is 5 MB.',
        variant: 'error',
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/bio/${pageId}/cover`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { cover_url } = await res.json();
      onCoverChange(`${cover_url}?t=${Date.now()}`);
    } catch (err: unknown) {
      addToast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'error',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Remove handler ──────────────────────────────────────────────

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const res = await fetch(`/api/bio/${pageId}/cover`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove cover');
      }

      onCoverChange(null);
    } catch (err: unknown) {
      addToast({
        title: 'Remove failed',
        description: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'error',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  // ── Drag-to-reposition ──────────────────────────────────────────

  const handleDragStart = useCallback(
    (clientY: number) => {
      setIsDragging(true);
      dragStartRef.current = {
        startY: clientY,
        startPosition: effectivePositionY,
      };
    },
    [effectivePositionY]
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!dragStartRef.current || !containerRef.current) return;

      const containerHeight = containerRef.current.getBoundingClientRect().height;
      const deltaY = clientY - dragStartRef.current.startY;
      // Moving mouse down = image shifts up = positionY increases
      const deltaPct = (deltaY / containerHeight) * 100;
      const newPosition = Math.round(
        Math.min(100, Math.max(0, dragStartRef.current.startPosition + deltaPct))
      );

      onPositionYChange(newPosition);
    },
    [onPositionYChange]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientY);

      const onMouseMove = (ev: MouseEvent) => handleDragMove(ev.clientY);
      const onMouseUp = () => {
        handleDragEnd();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [handleDragStart, handleDragMove, handleDragEnd]
  );

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleDragStart(touch.clientY);

      const onTouchMove = (ev: TouchEvent) => {
        ev.preventDefault();
        handleDragMove(ev.touches[0].clientY);
      };
      const onTouchEnd = () => {
        handleDragEnd();
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
      };

      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
    },
    [handleDragStart, handleDragMove, handleDragEnd]
  );

  const busy = isUploading || isRemoving;

  return (
    <div className="space-y-3">
      {/* Cover preview / upload area */}
      {currentCoverUrl ? (
        <div className="relative w-full" ref={containerRef}>
          {/* Image with repositioning */}
          <div
            className={cn(
              'relative w-full overflow-hidden rounded-lg border border-border',
              isDragging ? 'cursor-grabbing' : 'cursor-grab',
              busy && 'opacity-60 pointer-events-none'
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <img
              src={currentCoverUrl}
              alt="Cover image"
              className="w-full object-cover select-none pointer-events-none"
              draggable={false}
              style={{
                aspectRatio: arCSS,
                objectPosition: `center ${effectivePositionY}%`,
              }}
            />

            {/* Drag hint overlay */}
            {!isDragging && !busy && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
                  <GripVertical className="h-3.5 w-3.5" />
                  Drag to reposition
                </div>
              </div>
            )}

            {/* Loading overlays */}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            {isRemoving && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Action buttons */}
          {!busy && (
            <div className="absolute right-2 top-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                title="Replace image"
              >
                <ImagePlus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border transition-colors',
            !busy && 'cursor-pointer hover:border-primary/50',
            busy && 'opacity-60'
          )}
          style={{ aspectRatio: arCSS }}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Add cover image
              </span>
            </>
          )}
        </button>
      )}

      {/* Aspect Ratio Picker */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Aspect Ratio</p>
        <div className="flex gap-1.5">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.id}
              type="button"
              onClick={() => onAspectRatioChange(ar.id)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors',
                effectiveAR === ar.id
                  ? 'border-primary bg-primary/5 text-foreground font-medium'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              {/* Mini AR preview rectangle */}
              <div
                className={cn(
                  'rounded-[2px] border',
                  effectiveAR === ar.id ? 'border-primary' : 'border-muted-foreground/40'
                )}
                style={{
                  width: 28,
                  aspectRatio: ar.css,
                }}
              />
              <span>{ar.label}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Max 5 MB. Drag image to adjust focal point.
      </p>

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
