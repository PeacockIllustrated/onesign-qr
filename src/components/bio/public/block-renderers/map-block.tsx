import type { BioBlockContentMap, BioThemeConfig } from '@/types/bio';

interface PublicMapBlockProps {
  content: BioBlockContentMap;
  themeConfig: BioThemeConfig;
}

/**
 * Public-facing Google Maps embed block renderer.
 * Renders a Google Maps iframe with the specified query and zoom level.
 */
export function PublicMapBlock({ content, themeConfig }: PublicMapBlockProps) {
  if (!content.query) return null;

  const zoom = content.zoom ?? 14;
  const encodedQuery = encodeURIComponent(content.query);
  const mapUrl = `https://maps.google.com/maps?q=${encodedQuery}&z=${zoom}&output=embed`;

  return (
    <iframe
      src={mapUrl}
      title={`Map: ${content.query}`}
      className="w-full h-full border-0"
      loading="lazy"
      sandbox="allow-scripts allow-same-origin"
      style={{ borderRadius: themeConfig.borderRadius }}
    />
  );
}
