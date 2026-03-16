import type { BioBlock, BioGridPosition, BioBlockType } from '@/types/bio';

/** Number of columns in the grid layout */
export const GRID_COLUMNS = 4;

/**
 * Convert pixel coordinates to a grid cell position, clamped within bounds.
 * Columns are clamped to [0, 3]; rows are clamped to 0+.
 */
export function snapToGrid(
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number
): { col: number; row: number } {
  const col = Math.max(0, Math.min(GRID_COLUMNS - 1, Math.round(x / cellWidth)));
  const row = Math.max(0, Math.round(y / cellHeight));
  return { col, row };
}

/**
 * Check whether a block position overlaps with any other position in the list.
 * Optionally excludes one position by index (useful when moving a block).
 */
export function checkOverlap(
  block: BioGridPosition,
  others: BioGridPosition[],
  excludeIndex?: number
): boolean {
  for (let i = 0; i < others.length; i++) {
    if (i === excludeIndex) continue;

    const other = others[i];

    // Two axis-aligned rectangles overlap iff they overlap on both axes.
    const overlapX =
      block.col < other.col + other.colSpan &&
      block.col + block.colSpan > other.col;

    const overlapY =
      block.row < other.row + other.rowSpan &&
      block.row + block.rowSpan > other.row;

    if (overlapX && overlapY) return true;
  }

  return false;
}

/**
 * Find the first empty position where a block of the given size can fit,
 * scanning left-to-right, top-to-bottom.
 */
export function findNextEmptyPosition(
  blocks: BioBlock[],
  colSpan: number,
  rowSpan: number,
  gridColumns: number = GRID_COLUMNS
): { col: number; row: number } {
  const positions: BioGridPosition[] = blocks.map((b) => ({
    col: b.grid_col,
    row: b.grid_row,
    colSpan: b.grid_col_span,
    rowSpan: b.grid_row_span,
  }));

  const maxRow = getMaxRow(blocks);
  // Search up to a few rows past the current max to guarantee a hit
  const searchLimit = maxRow + rowSpan + 1;

  for (let row = 0; row < searchLimit; row++) {
    for (let col = 0; col <= gridColumns - colSpan; col++) {
      const candidate: BioGridPosition = { col, row, colSpan, rowSpan };
      if (!checkOverlap(candidate, positions)) {
        return { col, row };
      }
    }
  }

  // Fallback: place below everything
  return { col: 0, row: maxRow };
}

/**
 * Returns the total grid height: the highest (row + rowSpan) across all blocks.
 * Returns 0 if there are no blocks.
 */
export function getMaxRow(blocks: BioBlock[]): number {
  if (blocks.length === 0) return 0;

  let max = 0;
  for (const block of blocks) {
    const bottom = block.grid_row + block.grid_row_span;
    if (bottom > max) max = bottom;
  }
  return max;
}

/**
 * Check whether a placement is fully within the grid column bounds.
 */
export function isValidPlacement(
  col: number,
  row: number,
  colSpan: number,
  rowSpan: number,
  gridColumns: number = GRID_COLUMNS
): boolean {
  if (col < 0 || row < 0) return false;
  if (colSpan < 1 || rowSpan < 1) return false;
  if (col + colSpan > gridColumns) return false;
  return true;
}

/**
 * Returns all blocks that overlap with the specified rectangular area.
 */
export function getBlocksInArea(
  blocks: BioBlock[],
  col: number,
  row: number,
  colSpan: number,
  rowSpan: number
): BioBlock[] {
  return blocks.filter((block) => {
    const overlapX =
      col < block.grid_col + block.grid_col_span &&
      col + colSpan > block.grid_col;

    const overlapY =
      row < block.grid_row + block.grid_row_span &&
      row + rowSpan > block.grid_row;

    return overlapX && overlapY;
  });
}

/**
 * Returns default content for a given block type.
 */
export function getDefaultContent(blockType: BioBlockType): Record<string, unknown> {
  switch (blockType) {
    case 'link':
      return { title: 'New Link', url: 'https://', show_icon: true };
    case 'heading':
      return { text: 'Heading', level: 2 };
    case 'text':
      return { text: 'Your text here' };
    case 'image':
      return { src: '', alt: '', object_fit: 'cover' };
    case 'social_icons':
      return { icons: [] };
    case 'divider':
      return { style: 'solid' };
    case 'spacer':
      return {};
    case 'spotify_embed':
      return { spotify_url: '', embed_type: 'track' };
    case 'youtube_embed':
      return { video_url: '' };
    case 'map':
      return { query: '', zoom: 14 };
    case 'countdown':
      return { target_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), label: 'Countdown', style: 'large' };
    case 'payment_link':
      return { platform: 'paypal', url: 'https://', display_text: 'Support Me' };
    case 'gallery':
      return { display_mode: 'grid', columns: 3, images: [] };
    case 'contact_form':
      return { fields: ['name', 'email', 'message'], form_title: 'Get in Touch' };
    default:
      return {};
  }
}

/**
 * Returns the default grid size (colSpan x rowSpan) for a given block type.
 */
export function getDefaultSize(blockType: BioBlockType): { colSpan: number; rowSpan: number } {
  switch (blockType) {
    case 'link':
      return { colSpan: 4, rowSpan: 1 };
    case 'heading':
      return { colSpan: 4, rowSpan: 1 };
    case 'text':
      return { colSpan: 4, rowSpan: 1 };
    case 'image':
      return { colSpan: 2, rowSpan: 2 };
    case 'social_icons':
      return { colSpan: 4, rowSpan: 1 };
    case 'divider':
      return { colSpan: 4, rowSpan: 1 };
    case 'spacer':
      return { colSpan: 1, rowSpan: 1 };
    case 'spotify_embed':
      return { colSpan: 4, rowSpan: 2 };
    case 'youtube_embed':
      return { colSpan: 4, rowSpan: 2 };
    case 'map':
      return { colSpan: 4, rowSpan: 2 };
    case 'countdown':
      return { colSpan: 4, rowSpan: 1 };
    case 'payment_link':
      return { colSpan: 4, rowSpan: 1 };
    case 'gallery':
      return { colSpan: 4, rowSpan: 2 };
    case 'contact_form':
      return { colSpan: 4, rowSpan: 2 };
    default:
      return { colSpan: 4, rowSpan: 1 };
  }
}
