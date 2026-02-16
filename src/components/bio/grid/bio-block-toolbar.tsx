'use client';

import {
  Link,
  Type,
  AlignLeft,
  Image,
  Users,
  Minus,
  Square,
  Music,
  Youtube,
  MapPin,
} from 'lucide-react';
import type { BioBlockType } from '@/types/bio';

interface BioBlockToolbarProps {
  onAddBlock: (blockType: BioBlockType) => void;
  blockCount: number;
  maxBlocks: number;
}

const BLOCK_TYPES: {
  type: BioBlockType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}[] = [
  { type: 'link', icon: Link, label: 'Link' },
  { type: 'heading', icon: Type, label: 'Heading' },
  { type: 'text', icon: AlignLeft, label: 'Text' },
  { type: 'image', icon: Image, label: 'Image' },
  { type: 'social_icons', icon: Users, label: 'Social' },
  { type: 'divider', icon: Minus, label: 'Divider' },
  { type: 'spacer', icon: Square, label: 'Spacer' },
  { type: 'spotify_embed', icon: Music, label: 'Spotify' },
  { type: 'youtube_embed', icon: Youtube, label: 'YouTube' },
  { type: 'map', icon: MapPin, label: 'Map' },
];

export function BioBlockToolbar({
  onAddBlock,
  blockCount,
  maxBlocks,
}: BioBlockToolbarProps) {
  const atMax = blockCount >= maxBlocks;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">add block</span>
        <span className="rounded-sm bg-secondary px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {blockCount} / {maxBlocks}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {BLOCK_TYPES.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            disabled={atMax}
            onClick={() => onAddBlock(type)}
            className="group flex flex-col items-center gap-1 rounded-sm border border-border bg-card px-2 py-2 transition-all hover:border-foreground/20 hover:bg-secondary active:scale-95 disabled:pointer-events-none disabled:opacity-30"
          >
            <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
