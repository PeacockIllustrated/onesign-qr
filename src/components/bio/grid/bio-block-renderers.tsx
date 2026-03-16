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
  ExternalLink,
  Globe,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Github,
  Mail,
  Twitch,
  Timer,
  DollarSign,
} from 'lucide-react';
import type {
  BioBlock,
  BioBlockContentLink,
  BioBlockContentHeading,
  BioBlockContentText,
  BioBlockContentImage,
  BioBlockContentSocialIcons,
  BioBlockContentDivider,
  BioBlockContentSpacer,
  BioBlockContentSpotifyEmbed,
  BioBlockContentYouTubeEmbed,
  BioBlockContentMap,
  BioBlockContentCountdown,
  BioBlockContentPaymentLink,
  BioBlockContentGallery,
  BioBlockContentContactForm,
} from '@/types/bio';
import { SOCIAL_PLATFORMS } from '@/lib/constants';

// ─── Main Renderer ──────────────────────────────────────────────────

interface BlockRendererProps {
  block: BioBlock;
  compact?: boolean;
}

export function BlockRenderer({ block, compact }: BlockRendererProps) {
  switch (block.block_type) {
    case 'link':
      return (
        <LinkBlockRenderer
          content={block.content as BioBlockContentLink}
          compact={compact}
        />
      );
    case 'heading':
      return (
        <HeadingBlockRenderer
          content={block.content as BioBlockContentHeading}
          compact={compact}
        />
      );
    case 'text':
      return (
        <TextBlockRenderer
          content={block.content as BioBlockContentText}
          compact={compact}
        />
      );
    case 'image':
      return (
        <ImageBlockRenderer
          content={block.content as BioBlockContentImage}
          compact={compact}
        />
      );
    case 'social_icons':
      return (
        <SocialIconsBlockRenderer
          content={block.content as BioBlockContentSocialIcons}
          compact={compact}
        />
      );
    case 'divider':
      return (
        <DividerBlockRenderer
          content={block.content as BioBlockContentDivider}
          compact={compact}
        />
      );
    case 'spacer':
      return (
        <SpacerBlockRenderer
          content={block.content as BioBlockContentSpacer}
          compact={compact}
        />
      );
    case 'spotify_embed':
      return (
        <SpotifyEmbedBlockRenderer
          content={block.content as BioBlockContentSpotifyEmbed}
          compact={compact}
        />
      );
    case 'youtube_embed':
      return (
        <YouTubeEmbedBlockRenderer
          content={block.content as BioBlockContentYouTubeEmbed}
          compact={compact}
        />
      );
    case 'map':
      return (
        <MapBlockRenderer
          content={block.content as BioBlockContentMap}
          compact={compact}
        />
      );
    case 'countdown':
      return (
        <CountdownBlockRenderer
          content={block.content as BioBlockContentCountdown}
          compact={compact}
        />
      );
    case 'payment_link':
      return (
        <PaymentLinkBlockRenderer
          content={block.content as BioBlockContentPaymentLink}
          compact={compact}
        />
      );
    case 'gallery':
    case 'contact_form':
      return (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          {block.block_type.replace('_', ' ')} — coming soon
        </div>
      );
    default:
      return (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Unknown block type
        </div>
      );
  }
}

// ─── Link ───────────────────────────────────────────────────────────

function LinkBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentLink;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex w-full items-center gap-3 rounded-sm bg-secondary ${
        compact ? 'px-2 py-1.5' : 'px-4 py-3'
      }`}
    >
      {content.show_icon && content.icon && (
        <span className={`shrink-0 ${compact ? 'text-sm' : 'text-base'}`}>
          {content.icon_type === 'image' && content.icon_url ? (
            <img
              src={content.icon_url}
              alt=""
              className={`rounded-sm ${compact ? 'h-4 w-4' : 'h-5 w-5'} object-cover`}
            />
          ) : (
            content.icon
          )}
        </span>
      )}
      <span
        className={`flex-1 truncate text-foreground ${
          compact ? 'text-xs' : 'text-sm font-medium'
        }`}
      >
        {content.title || 'Untitled link'}
      </span>
      <ExternalLink
        className={`shrink-0 text-muted-foreground ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}
      />
    </div>
  );
}

// ─── Heading ────────────────────────────────────────────────────────

function HeadingBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentHeading;
  compact?: boolean;
}) {
  const text = content.text || 'Heading';

  if (compact) {
    const sizeMap: Record<number, string> = {
      1: 'text-sm font-bold',
      2: 'text-xs font-semibold',
      3: 'text-xs font-medium',
    };
    return (
      <div className={`w-full text-center text-foreground ${sizeMap[content.level] ?? sizeMap[2]}`}>
        {text}
      </div>
    );
  }

  const sizeMap: Record<number, string> = {
    1: 'text-xl font-bold tracking-tight',
    2: 'text-lg font-semibold',
    3: 'text-base font-medium',
  };

  return (
    <div className={`w-full text-center text-foreground ${sizeMap[content.level] ?? sizeMap[2]}`}>
      {text}
    </div>
  );
}

// ─── Text ───────────────────────────────────────────────────────────

function TextBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentText;
  compact?: boolean;
}) {
  const alignClass = content.align === 'center' ? 'text-center' : content.align === 'right' ? 'text-right' : 'text-left';

  return (
    <p
      className={`w-full text-muted-foreground leading-relaxed ${
        compact ? 'text-xs' : 'text-sm'
      } ${alignClass}`}
      style={{
        fontWeight: content.bold ? 700 : undefined,
        fontStyle: content.italic ? 'italic' : undefined,
      }}
    >
      {content.text || 'Add some text...'}
    </p>
  );
}

// ─── Image ──────────────────────────────────────────────────────────

function ImageBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentImage;
  compact?: boolean;
}) {
  if (!content.src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border">
        <Image className={`text-muted-foreground ${compact ? 'h-4 w-4' : 'h-6 w-6'}`} />
        <span className="text-[10px] text-muted-foreground">Add image</span>
      </div>
    );
  }

  return (
    <img
      src={content.src}
      alt={content.alt ?? ''}
      className="h-full w-full rounded-sm"
      style={{
        objectFit: content.object_fit ?? 'cover',
        filter: content.invert ? 'invert(1)' : undefined,
      }}
    />
  );
}

// ─── Social Icons ───────────────────────────────────────────────────

/** TikTok icon — Lucide doesn't include branded TikTok, so we use a custom SVG */
function TikTokIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

/** Map platform IDs to Lucide icons where available */
const PLATFORM_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  tiktok: TikTokIcon,
  youtube: Youtube,
  linkedin: Linkedin,
  github: Github,
  twitch: Twitch,
  email: Mail,
  website: Globe,
  spotify: Music,
};

function SocialIconsBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentSocialIcons;
  compact?: boolean;
}) {
  if (!content.icons || content.icons.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-border">
        <Users className={`text-muted-foreground ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
        <span className="text-[10px] text-muted-foreground">Add social links</span>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2">
      {content.icons.map((item, idx) => {
        const platform = SOCIAL_PLATFORMS.find((p) => p.id === item.platform);
        return (
          <div
            key={idx}
            className={`flex items-center justify-center rounded-full bg-secondary transition-colors hover:bg-border ${
              compact ? 'h-6 w-6' : 'h-8 w-8'
            }`}
            title={platform?.label ?? item.platform}
          >
            <PlatformIcon
              platformId={item.platform}
              size={compact ? 12 : 14}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Renders a specific icon for a social platform, with Lucide fallbacks */
function PlatformIcon({
  platformId,
  size = 14,
}: {
  platformId: string;
  size?: number;
}) {
  const IconComponent = PLATFORM_ICON_MAP[platformId];
  if (IconComponent) {
    return (
      <IconComponent
        className="text-foreground"
        style={{ width: size, height: size }}
      />
    );
  }
  // Fallback: Globe icon for unknown platforms
  return <Globe className="text-muted-foreground" style={{ width: size, height: size }} />;
}

// ─── Divider ────────────────────────────────────────────────────────

function DividerBlockRenderer({
  content,
}: {
  content: BioBlockContentDivider;
  compact?: boolean;
}) {
  if (content.style === 'gradient') {
    return (
      <div className="flex h-full w-full items-center px-2">
        <div
          className="h-px w-full"
          style={{
            background:
              'linear-gradient(to right, transparent, hsl(var(--border)), transparent)',
          }}
        />
      </div>
    );
  }

  const borderStyleMap: Record<string, string> = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
  };

  return (
    <div className="flex h-full w-full items-center px-2">
      <hr
        className={`w-full border-t border-border ${
          borderStyleMap[content.style] ?? 'border-solid'
        }`}
      />
    </div>
  );
}

// ─── Spacer ─────────────────────────────────────────────────────────

function SpacerBlockRenderer({
  compact,
}: {
  content: BioBlockContentSpacer;
  compact?: boolean;
}) {
  if (compact) {
    return <div className="h-full w-full" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-border">
        <Square className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
    </div>
  );
}

// ─── Spotify Embed ──────────────────────────────────────────────────

function SpotifyEmbedBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentSpotifyEmbed;
  compact?: boolean;
}) {
  if (!content.spotify_url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border">
        <Music className={`text-muted-foreground ${compact ? 'h-4 w-4' : 'h-6 w-6'}`} />
        <span className="text-[10px] text-muted-foreground">Add Spotify link</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center gap-2.5 rounded-sm bg-secondary px-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1db954]/10">
        <Music
          className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          style={{ color: '#1db954' }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <span className={`block truncate font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
          Spotify
        </span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {content.embed_type ?? 'track'}
        </span>
      </div>
    </div>
  );
}

// ─── YouTube Embed ──────────────────────────────────────────────────

function YouTubeEmbedBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentYouTubeEmbed;
  compact?: boolean;
}) {
  if (!content.video_url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border">
        <Youtube className={`text-muted-foreground ${compact ? 'h-4 w-4' : 'h-6 w-6'}`} />
        <span className="text-[10px] text-muted-foreground">Add YouTube video</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center gap-2.5 rounded-sm bg-secondary px-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/10">
        <Youtube
          className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          style={{ color: '#ef4444' }}
        />
      </div>
      <span className={`truncate font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
        YouTube Video
      </span>
    </div>
  );
}

// ─── Map ────────────────────────────────────────────────────────────

function MapBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentMap;
  compact?: boolean;
}) {
  if (!content.query) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border">
        <MapPin className={`text-muted-foreground ${compact ? 'h-4 w-4' : 'h-6 w-6'}`} />
        <span className="text-[10px] text-muted-foreground">Add location</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center gap-2.5 rounded-sm bg-secondary px-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/5">
        <MapPin
          className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          style={{ color: '#000000' }}
        />
      </div>
      <span
        className={`truncate font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`}
      >
        {content.query}
      </span>
    </div>
  );
}

// ─── Countdown ──────────────────────────────────────────────────────

function CountdownBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentCountdown;
  compact?: boolean;
}) {
  if (!content.target_datetime) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border">
        <Timer className={`text-muted-foreground ${compact ? 'h-4 w-4' : 'h-6 w-6'}`} />
        <span className="text-[10px] text-muted-foreground">Set target date</span>
      </div>
    );
  }

  const styleLabel = content.style === 'compact' ? 'Compact' : 'Large (boxes)';

  return (
    <div className="flex h-full w-full items-center justify-center gap-2.5 rounded-sm bg-secondary px-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/5">
        <Timer
          className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          style={{ color: '#6366f1' }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <span className={`block truncate font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
          {content.label || 'Countdown'}
        </span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {styleLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Payment Link ────────────────────────────────────────────────────

const PAYMENT_PLATFORM_COLORS: Record<BioBlockContentPaymentLink['platform'], string> = {
  paypal: '#003087',
  venmo: '#008CFF',
  cashapp: '#00D632',
  stripe: '#635BFF',
  buymeacoffee: '#FFDD00',
  'ko-fi': '#FF5E5B',
  custom: 'currentColor',
};

const PAYMENT_PLATFORM_LABELS: Record<BioBlockContentPaymentLink['platform'], string> = {
  paypal: 'PayPal',
  venmo: 'Venmo',
  cashapp: 'Cash App',
  stripe: 'Stripe',
  buymeacoffee: 'Buy Me a Coffee',
  'ko-fi': 'Ko-fi',
  custom: 'Support',
};

function PaymentLinkBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentPaymentLink;
  compact?: boolean;
}) {
  if (!content.url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border">
        <DollarSign className={`text-muted-foreground ${compact ? 'h-4 w-4' : 'h-6 w-6'}`} />
        <span className="text-[10px] text-muted-foreground">Add payment link</span>
      </div>
    );
  }

  const platformColor = PAYMENT_PLATFORM_COLORS[content.platform];
  const platformLabel = PAYMENT_PLATFORM_LABELS[content.platform];

  return (
    <div className="flex h-full w-full items-center justify-center gap-2.5 rounded-sm bg-secondary px-3">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor:
            platformColor === 'currentColor' ? 'hsl(var(--foreground)/0.05)' : `${platformColor}20`,
        }}
      >
        <DollarSign
          className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          style={{ color: platformColor === 'currentColor' ? undefined : platformColor }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <span
          className={`block truncate font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`}
        >
          {content.display_text || platformLabel}
        </span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {platformLabel}
        </span>
      </div>
    </div>
  );
}
