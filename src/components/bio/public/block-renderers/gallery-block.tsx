'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BioBlockContentGallery, BioThemeConfig } from '@/types/bio';

interface PublicGalleryBlockProps {
  content: BioBlockContentGallery;
  themeConfig: BioThemeConfig;
}

function buildImageUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-gallery/${storagePath}`;
}

/**
 * Public-facing image gallery block renderer.
 * Supports grid and carousel display modes with lightbox.
 */
export function PublicGalleryBlock({
  content,
  themeConfig,
}: PublicGalleryBlockProps) {
  const { colors, borderRadius } = themeConfig;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!content.images || content.images.length === 0) return null;

  const handleImageClick = (index: number) => {
    const image = content.images[index];
    if (image.link_url) {
      window.open(image.link_url, '_blank', 'noopener,noreferrer');
    } else {
      setLightboxIndex(index);
    }
  };

  return (
    <>
      {content.display_mode === 'carousel' ? (
        <CarouselView
          images={content.images}
          colors={colors}
          borderRadius={borderRadius}
          onImageClick={handleImageClick}
          fontFamily={themeConfig.fonts.body.family}
        />
      ) : (
        <GridView
          images={content.images}
          columns={content.columns ?? 2}
          colors={colors}
          borderRadius={borderRadius}
          onImageClick={handleImageClick}
          fontFamily={themeConfig.fonts.body.family}
        />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={content.images}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={setLightboxIndex}
        />
      )}
    </>
  );
}

// ── Grid View ───────────────────────────────────────────────────────────

interface GridViewProps {
  images: BioBlockContentGallery['images'];
  columns: number;
  colors: BioThemeConfig['colors'];
  borderRadius: string;
  onImageClick: (index: number) => void;
  fontFamily: string;
}

function GridView({ images, columns, colors, borderRadius, onImageClick, fontFamily }: GridViewProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '8px',
      }}
    >
      {images.map((img, idx) => (
        <div key={img.storage_path} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            type="button"
            onClick={() => onImageClick(idx)}
            style={{
              display: 'block',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              background: 'none',
              width: '100%',
            }}
          >
            <img
              src={buildImageUrl(img.storage_path)}
              alt={img.caption ?? ''}
              loading="lazy"
              style={{
                width: '100%',
                aspectRatio: '1',
                objectFit: 'cover',
                borderRadius,
                display: 'block',
              }}
            />
          </button>
          {img.caption && (
            <p
              style={{
                color: colors.textSecondary,
                fontSize: '0.75rem',
                textAlign: 'center',
                margin: 0,
                fontFamily,
              }}
            >
              {img.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Carousel View ───────────────────────────────────────────────────────

interface CarouselViewProps {
  images: BioBlockContentGallery['images'];
  colors: BioThemeConfig['colors'];
  borderRadius: string;
  onImageClick: (index: number) => void;
  fontFamily: string;
}

function CarouselView({ images, colors, borderRadius, onImageClick, fontFamily }: CarouselViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement | undefined;
    if (child) {
      container.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    const childWidth = (container.children[0] as HTMLElement)?.offsetWidth ?? 1;
    const newIndex = Math.round(scrollLeft / childWidth);
    setActiveIndex(Math.min(newIndex, images.length - 1));
  };

  const goPrev = () => {
    const newIndex = Math.max(0, activeIndex - 1);
    setActiveIndex(newIndex);
    scrollToIndex(newIndex);
  };

  const goNext = () => {
    const newIndex = Math.min(images.length - 1, activeIndex + 1);
    setActiveIndex(newIndex);
    scrollToIndex(newIndex);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          gap: '8px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {images.map((img, idx) => (
          <div
            key={img.storage_path}
            style={{
              scrollSnapAlign: 'start',
              flexShrink: 0,
              width: '80%',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => onImageClick(idx)}
              style={{
                display: 'block',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: 'none',
                width: '100%',
              }}
            >
              <img
                src={buildImageUrl(img.storage_path)}
                alt={img.caption ?? ''}
                loading="lazy"
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  objectFit: 'cover',
                  borderRadius,
                  display: 'block',
                }}
              />
            </button>
            {img.caption && (
              <p
                style={{
                  color: colors.textSecondary,
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  margin: 0,
                  fontFamily,
                }}
              >
                {img.caption}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Prev/Next arrows */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous image"
            style={{
              position: 'absolute',
              left: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: activeIndex === 0 ? 0.3 : 1,
            }}
            disabled={activeIndex === 0}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next image"
            style={{
              position: 'absolute',
              right: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: activeIndex === images.length - 1 ? 0.3 : 1,
            }}
            disabled={activeIndex === images.length - 1}
          >
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '8px',
          }}
        >
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setActiveIndex(idx);
                scrollToIndex(idx);
              }}
              aria-label={`Go to image ${idx + 1}`}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: idx === activeIndex ? colors.accent : colors.textSecondary + '40',
                transition: 'background 0.2s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lightbox ────────────────────────────────────────────────────────────

interface LightboxProps {
  images: BioBlockContentGallery['images'];
  activeIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}

function Lightbox({ images, activeIndex, onClose, onChangeIndex }: LightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        onChangeIndex(Math.max(0, activeIndex - 1));
      } else if (e.key === 'ArrowRight') {
        onChangeIndex(Math.min(images.length - 1, activeIndex + 1));
      }
    },
    [activeIndex, images.length, onClose, onChangeIndex]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [handleKeyDown]);

  const image = images[activeIndex];
  if (!image) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close lightbox"
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 51,
        }}
      >
        <X style={{ width: 20, height: 20 }} />
      </button>

      {/* Image */}
      <img
        src={buildImageUrl(image.storage_path)}
        alt={image.caption ?? ''}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          borderRadius: '4px',
        }}
      />

      {/* Nav arrows */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex(Math.max(0, activeIndex - 1));
            }}
            aria-label="Previous image"
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: activeIndex === 0 ? 0.3 : 1,
            }}
            disabled={activeIndex === 0}
          >
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex(Math.min(images.length - 1, activeIndex + 1));
            }}
            aria-label="Next image"
            style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: activeIndex === images.length - 1 ? 0.3 : 1,
            }}
            disabled={activeIndex === images.length - 1}
          >
            <ChevronRight style={{ width: 20, height: 20 }} />
          </button>
        </>
      )}

      {/* Caption */}
      {image.caption && (
        <p
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.875rem',
            textAlign: 'center',
            maxWidth: '80vw',
          }}
        >
          {image.caption}
        </p>
      )}
    </div>
  );
}
