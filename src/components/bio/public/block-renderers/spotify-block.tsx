import type { BioBlockContentSpotifyEmbed, BioThemeConfig } from '@/types/bio';

interface PublicSpotifyBlockProps {
  content: BioBlockContentSpotifyEmbed;
  themeConfig: BioThemeConfig;
}

/**
 * Extracts the Spotify resource type and ID from a Spotify URL.
 * Handles URLs like:
 *   https://open.spotify.com/track/abc123
 *   https://open.spotify.com/album/abc123?si=xyz
 *   https://open.spotify.com/playlist/abc123
 *   https://open.spotify.com/artist/abc123
 */
function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('spotify.com')) return null;

    // Path format: /track/ID, /album/ID, /playlist/ID, /artist/ID
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const type = segments[0];
      const id = segments[1];
      if (type && id) {
        return { type, id };
      }
    }
  } catch {
    // Invalid URL
  }

  return null;
}

/**
 * Public-facing Spotify embed block renderer.
 * Converts a Spotify URL into an embed iframe.
 */
export function PublicSpotifyBlock({ content, themeConfig }: PublicSpotifyBlockProps) {
  const parsed = parseSpotifyUrl(content.spotify_url);
  if (!parsed) return null;

  const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`;

  return (
    <iframe
      src={embedUrl}
      title="Spotify embed"
      className="w-full h-full border-0"
      loading="lazy"
      sandbox="allow-scripts allow-same-origin"
      allow="encrypted-media"
      style={{ borderRadius: themeConfig.borderRadius }}
    />
  );
}
