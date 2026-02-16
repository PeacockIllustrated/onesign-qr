import type { BioBlockContentText, BioThemeConfig } from '@/types/bio';

interface PublicTextBlockProps {
  content: BioBlockContentText;
  themeConfig: BioThemeConfig;
}

/**
 * Public-facing text block renderer.
 * Renders body text with secondary color and body font.
 */
export function PublicTextBlock({ content, themeConfig }: PublicTextBlockProps) {
  if (!content.text) return null;

  const alignClass = content.align === 'center' ? 'text-center' : content.align === 'right' ? 'text-right' : 'text-left';

  return (
    <div className="flex h-full w-full items-center">
      <p
        className={`w-full text-sm leading-relaxed ${alignClass}`}
        style={{
          color: themeConfig.colors.textSecondary,
          fontFamily: `'${themeConfig.fonts.body.family}', sans-serif`,
          fontWeight: content.bold ? 700 : themeConfig.fonts.body.weight,
          fontStyle: content.italic ? 'italic' : undefined,
        }}
      >
        {content.text}
      </p>
    </div>
  );
}
