'use client';

import { ExternalLink } from 'lucide-react';
import { getButtonStyleCSS } from '@/lib/bio/themes';
import type { BioLinkButtonStyle } from '@/types/bio';

interface BioLinkButtonProps {
  itemId: string;
  pageId: string;
  title: string;
  url: string;
  icon?: string | null;
  buttonStyle: BioLinkButtonStyle;
}

export function BioLinkButton({
  itemId,
  pageId,
  title,
  url,
  icon,
  buttonStyle,
}: BioLinkButtonProps) {
  const handleClick = () => {
    // Fire-and-forget click tracking via beacon (survives page navigation)
    try {
      navigator.sendBeacon(
        '/api/bio/track',
        JSON.stringify({ item_id: itemId, page_id: pageId })
      );
    } catch {
      // Tracking is non-critical
    }
  };

  const btnStyle = getButtonStyleCSS(buttonStyle);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block w-full rounded-lg px-6 py-4 text-center font-medium transition-opacity hover:opacity-80 active:scale-[0.98]"
      style={btnStyle}
    >
      <span className="flex items-center justify-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span>{title}</span>
        <ExternalLink className="h-3.5 w-3.5 opacity-50" />
      </span>
    </a>
  );
}
