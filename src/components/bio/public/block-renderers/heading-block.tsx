import type { BioBlockContentHeading, BioThemeConfig } from '@/types/bio';

interface PublicHeadingBlockProps {
  content: BioBlockContentHeading;
  themeConfig: BioThemeConfig;
}

/**
 * Public-facing heading block renderer.
 * Offsets heading levels by 1 (since the page title uses h1).
 * Level 1 -> h2, Level 2 -> h3, Level 3 -> h4.
 */
export function PublicHeadingBlock({ content, themeConfig }: PublicHeadingBlockProps) {
  const text = content.text || 'Heading';

  const style: React.CSSProperties = {
    color: themeConfig.colors.text,
    fontFamily: `'${themeConfig.fonts.title.family}', sans-serif`,
    fontWeight: themeConfig.fonts.title.weight,
  };

  const sizeClasses: Record<number, string> = {
    1: 'text-xl sm:text-2xl font-bold',
    2: 'text-lg sm:text-xl font-semibold',
    3: 'text-lg font-medium',
  };

  const className = `flex h-full w-full items-center justify-center text-center overflow-hidden break-words ${sizeClasses[content.level] ?? sizeClasses[2]}`;

  switch (content.level) {
    case 1:
      return <h2 className={className} style={style}>{text}</h2>;
    case 3:
      return <h4 className={className} style={style}>{text}</h4>;
    case 2:
    default:
      return <h3 className={className} style={style}>{text}</h3>;
  }
}
