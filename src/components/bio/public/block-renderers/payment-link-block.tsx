import { DollarSign, ChevronRight } from 'lucide-react';
import type { BioBlockContentPaymentLink, BioThemeConfig } from '@/types/bio';

interface PublicPaymentLinkBlockProps {
  content: BioBlockContentPaymentLink;
  themeConfig: BioThemeConfig;
  blockId: string;
  pageId: string;
}

const PLATFORM_COLORS: Record<BioBlockContentPaymentLink['platform'], string> = {
  paypal: '#003087',
  venmo: '#008CFF',
  cashapp: '#00D632',
  stripe: '#635BFF',
  buymeacoffee: '#FFDD00',
  'ko-fi': '#FF5E5B',
  custom: 'currentColor',
};

const PLATFORM_LABELS: Record<BioBlockContentPaymentLink['platform'], string> = {
  paypal: 'PayPal',
  venmo: 'Venmo',
  cashapp: 'Cash App',
  stripe: 'Stripe',
  buymeacoffee: 'Buy Me a Coffee',
  'ko-fi': 'Ko-fi',
  custom: 'Support',
};

/**
 * Public-facing payment link block renderer.
 * Renders as an <a> tag styled as a card-button hybrid.
 */
export function PublicPaymentLinkBlock({
  content,
  themeConfig,
  blockId: _blockId,
  pageId: _pageId,
}: PublicPaymentLinkBlockProps) {
  if (!content.url) return null;

  const platformColor = PLATFORM_COLORS[content.platform];
  const platformLabel = PLATFORM_LABELS[content.platform];
  const displayText = content.display_text || platformLabel;
  const { colors, borderRadius } = themeConfig;

  const cardStyle: React.CSSProperties = {
    backgroundColor: platformColor === 'currentColor' ? `${colors.accent}15` : `${platformColor}15`,
    borderRadius: borderRadius,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  };

  const amounts = content.suggested_amounts?.filter(Boolean) ?? [];

  return (
    <a
      href={content.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full w-full flex-col gap-2 px-4 py-3 hover:-translate-y-0.5 hover:shadow-md"
      style={cardStyle}
    >
      {/* Main row */}
      <span className="flex w-full items-center gap-3">
        {/* Icon circle */}
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              platformColor === 'currentColor' ? `${colors.accent}20` : `${platformColor}20`,
          }}
        >
          <DollarSign
            className="h-4 w-4"
            style={{ color: platformColor === 'currentColor' ? colors.accent : platformColor }}
          />
        </span>

        {/* Display text */}
        <span
          className="flex-1 truncate text-sm font-medium"
          style={{ color: colors.text }}
        >
          {displayText}
        </span>

        {/* Arrow */}
        <ChevronRight
          className="h-4 w-4 shrink-0 opacity-40"
          style={{ color: colors.text }}
        />
      </span>

      {/* Suggested amounts */}
      {amounts.length > 0 && (
        <span className="flex flex-wrap gap-1.5 pl-11">
          {amounts.map((amount, i) => (
            <span
              key={i}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${colors.accent}10`,
                color: colors.textSecondary,
              }}
            >
              {amount}
            </span>
          ))}
        </span>
      )}
    </a>
  );
}
