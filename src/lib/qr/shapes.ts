/**
 * SVG path generators for different QR code module shapes
 */

export type ModuleShape = 'square' | 'rounded' | 'dots' | 'diamond';
export type EyeShape = 'square' | 'rounded' | 'circle';

/**
 * Generate SVG path for a module (data dot)
 */
export function getModulePath(
  shape: ModuleShape,
  x: number,
  y: number,
  size: number
): string {
  switch (shape) {
    case 'square':
      return `M${x},${y}h${size}v${size}h-${size}Z`;

    case 'rounded': {
      const r = size * 0.3;
      return `M${x + r},${y}h${size - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${size - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${size - 2 * r}a${r},${r} 0 0 1 -${r},-${r}v-${size - 2 * r}a${r},${r} 0 0 1 ${r},-${r}Z`;
    }

    case 'dots': {
      const radius = size / 2;
      const cx = x + radius;
      const cy = y + radius;
      return `M${cx},${cy}m-${radius},0a${radius},${radius} 0 1,0 ${size},0a${radius},${radius} 0 1,0 -${size},0`;
    }

    case 'diamond': {
      const half = size / 2;
      return `M${x + half},${y}L${x + size},${y + half}L${x + half},${y + size}L${x},${y + half}Z`;
    }

    default:
      return `M${x},${y}h${size}v${size}h-${size}Z`;
  }
}

/**
 * Generate SVG paths for finder pattern (eye)
 * The finder pattern consists of:
 * - Outer ring (7x7)
 * - Inner ring (5x5, white/background)
 * - Center dot (3x3)
 */
export function getFinderPatternPaths(
  shape: EyeShape,
  x: number,
  y: number,
  moduleSize: number,
  foregroundColor: string,
  backgroundColor: string
): string[] {
  const paths: string[] = [];

  switch (shape) {
    case 'square': {
      // Outer ring (7 modules)
      const outer = moduleSize * 7;
      paths.push(`<rect x="${x}" y="${y}" width="${outer}" height="${outer}" fill="${foregroundColor}"/>`);

      // Inner ring (5 modules, offset by 1)
      const innerOffset = moduleSize;
      const inner = moduleSize * 5;
      paths.push(`<rect x="${x + innerOffset}" y="${y + innerOffset}" width="${inner}" height="${inner}" fill="${backgroundColor}"/>`);

      // Center dot (3 modules, offset by 2)
      const centerOffset = moduleSize * 2;
      const center = moduleSize * 3;
      paths.push(`<rect x="${x + centerOffset}" y="${y + centerOffset}" width="${center}" height="${center}" fill="${foregroundColor}"/>`);
      break;
    }

    case 'rounded': {
      const outer = moduleSize * 7;
      const outerR = moduleSize * 1.5;
      paths.push(`<rect x="${x}" y="${y}" width="${outer}" height="${outer}" rx="${outerR}" fill="${foregroundColor}"/>`);

      const innerOffset = moduleSize;
      const inner = moduleSize * 5;
      const innerR = moduleSize;
      paths.push(`<rect x="${x + innerOffset}" y="${y + innerOffset}" width="${inner}" height="${inner}" rx="${innerR}" fill="${backgroundColor}"/>`);

      const centerOffset = moduleSize * 2;
      const center = moduleSize * 3;
      const centerR = moduleSize * 0.5;
      paths.push(`<rect x="${x + centerOffset}" y="${y + centerOffset}" width="${center}" height="${center}" rx="${centerR}" fill="${foregroundColor}"/>`);
      break;
    }

    case 'circle': {
      const outerR = moduleSize * 3.5;
      const cx = x + outerR;
      const cy = y + outerR;
      paths.push(`<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="${foregroundColor}"/>`);

      const innerR = moduleSize * 2.5;
      paths.push(`<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${backgroundColor}"/>`);

      const centerR = moduleSize * 1.5;
      paths.push(`<circle cx="${cx}" cy="${cy}" r="${centerR}" fill="${foregroundColor}"/>`);
      break;
    }
  }

  return paths;
}

/**
 * Check if a position is part of a finder pattern
 */
export function isFinderPattern(
  row: number,
  col: number,
  size: number
): boolean {
  // Top-left finder pattern (0-6, 0-6)
  if (row <= 6 && col <= 6) return true;

  // Top-right finder pattern (0-6, size-7 to size-1)
  if (row <= 6 && col >= size - 7) return true;

  // Bottom-left finder pattern (size-7 to size-1, 0-6)
  if (row >= size - 7 && col <= 6) return true;

  return false;
}

/**
 * Check if a position is part of a finder pattern separator
 * (the white border around finder patterns)
 */
export function isFinderSeparator(
  row: number,
  col: number,
  size: number
): boolean {
  // Top-left separator
  if ((row === 7 && col <= 7) || (col === 7 && row <= 7)) return true;

  // Top-right separator
  if ((row === 7 && col >= size - 8) || (col === size - 8 && row <= 7)) return true;

  // Bottom-left separator
  if ((row === size - 8 && col <= 7) || (col === 7 && row >= size - 8)) return true;

  return false;
}
