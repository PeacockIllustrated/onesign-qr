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
 * Rectangle subpath, optionally with rounded corners
 */
function rectSubpath(x: number, y: number, size: number, r = 0): string {
  if (r <= 0) return `M${x},${y}h${size}v${size}h-${size}Z`;
  const s = size - 2 * r;
  return `M${x + r},${y}h${s}a${r},${r} 0 0 1 ${r},${r}v${s}a${r},${r} 0 0 1 -${r},${r}h-${s}a${r},${r} 0 0 1 -${r},-${r}v-${s}a${r},${r} 0 0 1 ${r},-${r}Z`;
}

/**
 * Circle subpath
 */
function circleSubpath(cx: number, cy: number, r: number): string {
  return `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 -${r * 2},0Z`;
}

/**
 * Generate SVG for a finder pattern (eye)
 * The finder pattern consists of:
 * - Outer ring (7x7)
 * - Gap (5x5, cut out)
 * - Center dot (3x3)
 *
 * Emitted as a single compound path (evenodd) so the ring is a real hole
 * rather than a background-coloured shape stacked on top.
 */
export function getFinderPatternPaths(
  shape: EyeShape,
  x: number,
  y: number,
  moduleSize: number,
  foregroundColor: string
): string[] {
  const outer = moduleSize * 7;
  const inner = moduleSize * 5;
  const center = moduleSize * 3;
  let d: string;

  switch (shape) {
    case 'rounded':
      d =
        rectSubpath(x, y, outer, moduleSize * 1.5) +
        rectSubpath(x + moduleSize, y + moduleSize, inner, moduleSize) +
        rectSubpath(x + moduleSize * 2, y + moduleSize * 2, center, moduleSize * 0.5);
      break;

    case 'circle': {
      const cx = x + moduleSize * 3.5;
      const cy = y + moduleSize * 3.5;
      d =
        circleSubpath(cx, cy, moduleSize * 3.5) +
        circleSubpath(cx, cy, moduleSize * 2.5) +
        circleSubpath(cx, cy, moduleSize * 1.5);
      break;
    }

    case 'square':
    default:
      d =
        rectSubpath(x, y, outer) +
        rectSubpath(x + moduleSize, y + moduleSize, inner) +
        rectSubpath(x + moduleSize * 2, y + moduleSize * 2, center);
      break;
  }

  return [`<path fill="${foregroundColor}" fill-rule="evenodd" d="${d}"/>`];
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
