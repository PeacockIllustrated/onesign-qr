'use client';

import { useState } from 'react';
import { X, Trash2, Eye, EyeOff, Paintbrush } from 'lucide-react';
import type {
  BioBlock,
  BioBlockContent,
  BioBlockType,
  BioStyleOverrides,
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
import { CountdownForm } from './forms/countdown-form';
import { PaymentLinkForm } from './forms/payment-link-form';

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
  const [activeTab, setActiveTab] = useState<'content' | 'style'>('content');

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

        {/* Tab bar */}
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-secondary/50 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`flex-1 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'content'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Content
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('style')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'style'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Paintbrush className="h-3 w-3" />
            Style
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'content' ? (
          <BlockFormSwitch block={block} onUpdate={onUpdate} />
        ) : (
          <StyleOverridesForm block={block} onUpdate={onUpdate} />
        )}

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
      return <CountdownForm content={block.content as BioBlockContentCountdown} onChange={onUpdate} />;
    case 'payment_link':
      return <PaymentLinkForm content={block.content as BioBlockContentPaymentLink} onChange={onUpdate} />;
    case 'gallery':
    case 'contact_form':
      return <p className="text-xs text-muted-foreground">Editor coming soon for this block type.</p>;
    default:
      return <p className="text-xs text-muted-foreground">No editor available for this block type.</p>;
  }
}

// ─── Style Overrides Form ─────────────────────────────────────────────

const BORDER_RADIUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Inherit' },
  { value: 'sharp', label: 'Sharp' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
  { value: 'soft', label: 'Soft' },
  { value: 'chunky', label: 'Chunky' },
  { value: 'organic', label: 'Organic' },
];

const PADDING_OPTIONS: { value: string; label: string }[] = [
  { value: 'sm', label: 'SM' },
  { value: 'md', label: 'MD' },
  { value: 'lg', label: 'LG' },
];

const SHADOW_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'SM' },
  { value: 'md', label: 'MD' },
  { value: 'lg', label: 'LG' },
];

function StyleOverridesForm({
  block,
  onUpdate,
}: {
  block: BioBlock;
  onUpdate: (content: BioBlockContent) => void;
}) {
  const content = block.content as Record<string, unknown>;
  const overrides = (content.style_overrides ?? {}) as BioStyleOverrides;

  const updateOverride = (field: keyof BioStyleOverrides, value: string | undefined) => {
    const updated = { ...overrides };
    if (value === undefined || value === '') {
      delete updated[field];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updated as any)[field] = value;
    }
    // Remove style_overrides entirely if empty
    const hasAny = Object.keys(updated).length > 0;
    const newContent = { ...content };
    if (hasAny) {
      newContent.style_overrides = updated;
    } else {
      delete newContent.style_overrides;
    }
    onUpdate(newContent as BioBlockContent);
  };

  const resetAll = () => {
    const newContent = { ...content };
    delete newContent.style_overrides;
    onUpdate(newContent as BioBlockContent);
  };

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="space-y-3">
      {/* Background color */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Background color
        </label>
        <input
          type="text"
          value={overrides.bg_color ?? ''}
          onChange={(e) => updateOverride('bg_color', e.target.value || undefined)}
          placeholder="#ffffff"
          className={inputClass}
        />
      </div>

      {/* Border radius */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Border radius
        </label>
        <select
          value={overrides.border_radius ?? ''}
          onChange={(e) => updateOverride('border_radius', e.target.value || undefined)}
          className={inputClass}
        >
          {BORDER_RADIUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Border */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Border
        </label>
        <input
          type="text"
          value={overrides.border ?? ''}
          onChange={(e) => updateOverride('border', e.target.value || undefined)}
          placeholder="1px solid #ccc"
          className={inputClass}
        />
      </div>

      {/* Padding — segmented control */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Padding
        </label>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {PADDING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                updateOverride('padding', overrides.padding === opt.value ? undefined : opt.value as BioStyleOverrides['padding'])
              }
              className={`flex-1 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${
                overrides.padding === opt.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shadow — segmented control */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Shadow
        </label>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {SHADOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                updateOverride('shadow', overrides.shadow === opt.value ? undefined : opt.value as BioStyleOverrides['shadow'])
              }
              className={`flex-1 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${
                overrides.shadow === opt.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reset link */}
      <button
        type="button"
        onClick={resetAll}
        className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
      >
        Reset to defaults
      </button>
    </div>
  );
}
