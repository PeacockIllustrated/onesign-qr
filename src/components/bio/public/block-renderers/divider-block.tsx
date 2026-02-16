import type { BioBlockContentDivider, BioThemeConfig } from '@/types/bio';

interface PublicDividerBlockProps {
  content: BioBlockContentDivider;
  themeConfig: BioThemeConfig;
}

/**
 * Public-facing divider block renderer.
 * Supports solid, dashed, dotted, and gradient styles.
 */
export function PublicDividerBlock({ content, themeConfig }: PublicDividerBlockProps) {
  const accentColor = themeConfig.colors.accent;

  if (content.style === 'gradient') {
    return (
      <div className="flex h-full w-full items-center px-2" role="separator">
        <div
          className="h-px w-full"
          style={{
            background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
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
        className={`w-full border-t ${borderStyleMap[content.style] ?? 'border-solid'}`}
        style={{ borderColor: accentColor, opacity: 0.4 }}
      />
    </div>
  );
}
