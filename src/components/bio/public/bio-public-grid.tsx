import type { BioBlock, BioThemeConfig } from '@/types/bio';
import { SPACING_MAP } from '@/lib/bio/theme-definitions';
import { BioPublicBlock } from './bio-public-block';

interface BioPublicGridProps {
  blocks: BioBlock[];
  themeConfig: BioThemeConfig;
  pageId: string;
}

/**
 * Block types that manage their own internal padding (buttons, edge-to-edge images).
 * These should NOT receive extra wrapper padding from the spacing config.
 */
const SELF_PADDED_BLOCKS = new Set(['link', 'image', 'divider', 'spacer']);

/**
 * Per-spacing inner padding for content blocks (heading, text, social, embeds).
 * These values give text/content blocks breathing room inside their grid cells
 * without affecting link buttons or images which handle their own padding.
 */
const BLOCK_PADDING_MAP: Record<string, string> = {
  compact: '0.25rem 0.5rem',
  normal: '0.375rem 0.75rem',
  spacious: '0.5rem 1rem',
};

/**
 * Server component that renders the CSS Grid container for a bio page's blocks.
 *
 * Layout:
 * - 4-column grid with `minmax(60px, auto)` row sizing
 * - Each block is placed using gridColumn/gridRow inline styles
 * - Spacing config drives both grid gap and per-block content padding
 * - Responsive: collapses to 2 columns on screens <= 480px
 *   - Blocks wider than 2 columns become full-width on mobile
 */
export function BioPublicGrid({ blocks, themeConfig, pageId }: BioPublicGridProps) {
  const spacingConfig = SPACING_MAP[themeConfig.spacing];
  const gap = spacingConfig.gap;
  const blockPadding = BLOCK_PADDING_MAP[themeConfig.spacing] ?? BLOCK_PADDING_MAP.normal;

  // Filter to only enabled blocks and sort by sort_order
  const visibleBlocks = blocks
    .filter((b) => b.is_enabled)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (visibleBlocks.length === 0) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 480px) {
              .bio-public-grid {
                grid-template-columns: repeat(2, 1fr) !important;
              }
              .bio-public-grid > .bio-grid-block-wide {
                grid-column: 1 / -1 !important;
              }
            }
          `,
        }}
      />
      <div
        className="bio-public-grid w-full"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: 'minmax(60px, auto)',
          gap,
        }}
        role="list"
      >
        {visibleBlocks.map((block, index) => {
          // CSS grid uses 1-based line numbers
          const colStart = block.grid_col + 1;
          const colEnd = colStart + block.grid_col_span;
          const rowStart = block.grid_row + 1;
          const rowEnd = rowStart + block.grid_row_span;

          // Blocks spanning more than 2 columns get the wide class for mobile
          const isWide = block.grid_col_span > 2;

          // Content blocks get spacing-aware padding; self-padded blocks don't
          const needsPadding = !SELF_PADDED_BLOCKS.has(block.block_type);

          return (
            <div
              key={block.id}
              className={isWide ? 'bio-grid-block-wide' : undefined}
              style={{
                gridColumn: `${colStart} / ${colEnd}`,
                gridRow: `${rowStart} / ${rowEnd}`,
                padding: needsPadding ? blockPadding : undefined,
              }}
              role="listitem"
            >
              <BioPublicBlock
                block={block}
                themeConfig={themeConfig}
                staggerIndex={index}
                pageId={pageId}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
