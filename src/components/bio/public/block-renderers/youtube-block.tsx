import type { BioBlockContentYouTubeEmbed, BioThemeConfig } from '@/types/bio';

interface PublicYouTubeBlockProps {
  content: BioBlockContentYouTubeEmbed;
  themeConfig: BioThemeConfig;
}

/**
 * Extracts a YouTube video ID from various URL formats:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://youtube.com/watch?v=VIDEO_ID&t=123
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // youtube.com/watch?v=ID
    if (
      (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') &&
      parsed.pathname === '/watch'
    ) {
      return parsed.searchParams.get('v');
    }

    // youtu.be/ID
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      return id || null;
    }

    // youtube.com/embed/ID
    if (
      (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') &&
      parsed.pathname.startsWith('/embed/')
    ) {
      const id = parsed.pathname.replace('/embed/', '');
      return id || null;
    }
  } catch {
    // Invalid URL
  }

  return null;
}

/**
 * Public-facing YouTube embed block renderer.
 * Converts a YouTube URL into an embed iframe with 16:9 aspect ratio.
 */
export function PublicYouTubeBlock({ content, themeConfig }: PublicYouTubeBlockProps) {
  const videoId = extractYouTubeId(content.video_url);
  if (!videoId) return null;

  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ borderRadius: themeConfig.borderRadius }}
    >
      <iframe
        src={embedUrl}
        title="YouTube video"
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-presentation"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ borderRadius: themeConfig.borderRadius, touchAction: 'auto' }}
      />
    </div>
  );
}
