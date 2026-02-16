import {
  Globe,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Github,
  Music,
  Twitch,
  Mail,
  MessageCircle,
} from 'lucide-react';
import type { BioBlockContentSocialIcons, BioThemeConfig } from '@/types/bio';
import { SOCIAL_PLATFORMS } from '@/lib/constants';

interface PublicSocialIconsBlockProps {
  content: BioBlockContentSocialIcons;
  themeConfig: BioThemeConfig;
}

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

/** Map of platform ID to icon component */
const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  tiktok: TikTokIcon,
  youtube: Youtube,
  linkedin: Linkedin,
  github: Github,
  spotify: Music,
  twitch: Twitch,
  email: Mail,
  discord: MessageCircle,
};

/**
 * Public-facing social icons block renderer.
 * Renders a horizontal row of circular icon links.
 */
export function PublicSocialIconsBlock({
  content,
  themeConfig,
}: PublicSocialIconsBlockProps) {
  if (!content.icons || content.icons.length === 0) return null;

  const accentBg = themeConfig.colors.accent + '20'; // 20% opacity

  return (
    <nav
      className="flex h-full w-full flex-wrap items-center justify-center gap-2 sm:gap-3"
      aria-label="Social media links"
    >
      {content.icons.map((item, idx) => {
        const platform = SOCIAL_PLATFORMS.find((p) => p.id === item.platform);
        const IconComponent = PLATFORM_ICONS[item.platform] ?? Globe;
        const label = platform?.label ?? item.platform;

        return (
          <a
            key={`${item.platform}-${idx}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-80"
            style={{ background: accentBg }}
            aria-label={label}
            title={label}
          >
            <IconComponent
              className="h-5 w-5"
              style={{ color: themeConfig.colors.accent }}
            />
          </a>
        );
      })}
    </nav>
  );
}
