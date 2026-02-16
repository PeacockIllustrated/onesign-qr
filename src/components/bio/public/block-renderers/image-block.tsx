'use client';

import type { BioBlockContentImage, BioThemeConfig } from '@/types/bio';

interface PublicImageBlockProps {
  content: BioBlockContentImage;
  blockId: string;
  pageId: string;
  themeConfig: BioThemeConfig;
}

/**
 * Public-facing image block renderer.
 * Wraps the image in a link if link_url is set, with click tracking.
 * Falls back to nothing if src is empty.
 */
export function PublicImageBlock({
  content,
  blockId,
  pageId,
  themeConfig,
}: PublicImageBlockProps) {
  if (!content.src) return null;

  const handleClick = () => {
    if (!content.link_url) return;
    try {
      navigator.sendBeacon(
        '/api/bio/track',
        JSON.stringify({ block_id: blockId, page_id: pageId }),
      );
    } catch {
      // Tracking is non-critical
    }
  };

  const imgElement = (
    <img
      src={content.src}
      alt={content.alt ?? ''}
      className="h-full w-full"
      loading="lazy"
      style={{
        objectFit: content.object_fit ?? 'cover',
        filter: content.invert ? 'invert(1)' : undefined,
        borderRadius: themeConfig.borderRadius,
      }}
    />
  );

  if (content.link_url) {
    return (
      <a
        href={content.link_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block h-full w-full"
      >
        {imgElement}
      </a>
    );
  }

  return imgElement;
}
