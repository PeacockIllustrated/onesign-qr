'use client';

import { X, Trash2, Eye, EyeOff } from 'lucide-react';
import type {
  BioBlock,
  BioBlockContent,
  BioBlockType,
  BioBlockContentLink,
  BioBlockContentHeading,
  BioBlockContentText,
  BioBlockContentImage,
  BioBlockContentSocialIcons,
  BioBlockContentDivider,
  BioBlockContentSpotifyEmbed,
  BioBlockContentYouTubeEmbed,
  BioBlockContentMap,
  BioBlockContentCountdown,
  BioBlockContentPaymentLink,
  BioBlockContentGallery,
  BioBlockContentContactForm,
} from '@/types/bio';
import { LinkForm } from './forms/link-form';
import { HeadingForm } from './forms/heading-form';
import { TextForm } from './forms/text-form';
import { ImageForm } from './forms/image-form';
import { SocialIconsForm } from './forms/social-icons-form';
import { DividerForm } from './forms/divider-form';
import { SpotifyForm } from './forms/spotify-form';
import { YouTubeForm } from './forms/youtube-form';
import { MapForm } from './forms/map-form';

interface BioBlockEditPanelProps {
  block: BioBlock;
  onUpdate: (content: BioBlockContent) => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
  onClose: () => void;
}

const BLOCK_TYPE_LABELS: Record<BioBlockType, string> = {
  link: 'Link',
  heading: 'Heading',
  text: 'Text',
  image: 'Image',
  social_icons: 'Social Icons',
  divider: 'Divider',
  spacer: 'Spacer',
  spotify_embed: 'Spotify Embed',
  youtube_embed: 'YouTube Embed',
  map: 'Map',
  countdown: 'Countdown Timer',
  payment_link: 'Payment Link',
  gallery: 'Image Gallery',
  contact_form: 'Contact Form',
};

export function BioBlockEditPanel({
  block,
  onUpdate,
  onDelete,
  onToggleEnabled,
  onClose,
}: BioBlockEditPanelProps) {
  return (
    <div className="flex w-80 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          {BLOCK_TYPE_LABELS[block.block_type] ?? 'Block'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Visibility toggle */}
        <div className="flex items-center justify-between rounded-sm border border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            {block.is_enabled ? (
              <Eye className="h-3.5 w-3.5 text-foreground" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-sm text-foreground">
              {block.is_enabled ? 'Visible' : 'Hidden'}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleEnabled}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              block.is_enabled ? 'bg-foreground' : 'bg-border'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full shadow-sm transition-transform ${
                block.is_enabled
                  ? 'translate-x-[18px] bg-background'
                  : 'translate-x-[3px] bg-muted-foreground'
              }`}
            />
          </button>
        </div>

        {/* Block-type-specific form */}
        <BlockFormSwitch block={block} onUpdate={onUpdate} />

        {/* Grid position info */}
        <div className="rounded-sm border border-border px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            Position: col {block.grid_col + 1}, row {block.grid_row + 1}
            &nbsp;&middot;&nbsp;
            Size: {block.grid_col_span}&times;{block.grid_row_span}
          </p>
        </div>
      </div>

      {/* Delete */}
      <div className="border-t border-border p-4">
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-destructive/20 px-3 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/5 active:scale-[0.98]"
        >
          <Trash2 className="h-4 w-4" />
          delete block
        </button>
      </div>
    </div>
  );
}

// ─── Form Switch ───────────────────────────────────────────────────────

function BlockFormSwitch({
  block,
  onUpdate,
}: {
  block: BioBlock;
  onUpdate: (content: BioBlockContent) => void;
}) {
  switch (block.block_type) {
    case 'link':
      return <LinkForm content={block.content as BioBlockContentLink} onChange={onUpdate} />;
    case 'heading':
      return <HeadingForm content={block.content as BioBlockContentHeading} onChange={onUpdate} />;
    case 'text':
      return <TextForm content={block.content as BioBlockContentText} onChange={onUpdate} />;
    case 'image':
      return <ImageForm content={block.content as BioBlockContentImage} onChange={onUpdate} />;
    case 'social_icons':
      return <SocialIconsForm content={block.content as BioBlockContentSocialIcons} onChange={onUpdate} />;
    case 'divider':
      return <DividerForm content={block.content as BioBlockContentDivider} onChange={onUpdate} />;
    case 'spacer':
      return (
        <p className="text-xs text-muted-foreground">
          This block acts as empty space. Drag the corner handle to resize it.
        </p>
      );
    case 'spotify_embed':
      return <SpotifyForm content={block.content as BioBlockContentSpotifyEmbed} onChange={onUpdate} />;
    case 'youtube_embed':
      return <YouTubeForm content={block.content as BioBlockContentYouTubeEmbed} onChange={onUpdate} />;
    case 'map':
      return <MapForm content={block.content as BioBlockContentMap} onChange={onUpdate} />;
    case 'countdown':
    case 'payment_link':
    case 'gallery':
    case 'contact_form':
      return <p className="text-xs text-muted-foreground">Editor coming soon for this block type.</p>;
    default:
      return <p className="text-xs text-muted-foreground">No editor available for this block type.</p>;
  }
}
