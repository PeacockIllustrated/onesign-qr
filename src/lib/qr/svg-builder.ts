/**
 * SVG builder for custom-styled QR codes
 */

import type { QRMatrix, QRStyleConfig } from '@/types/qr';
import { getModulePath, getFinderPatternPaths, isFinderPattern, isFinderSeparator } from './shapes';
import { traceMergedModulePath } from './merge-paths';

export interface SVGOptions {
  size?: number;
  includeXmlDeclaration?: boolean;
}

/**
 * Build a custom-styled SVG QR code
 */
export function buildStyledSVG(
  matrix: QRMatrix,
  style: QRStyleConfig,
  logoDataUri?: string,
  options: SVGOptions = {}
): string {
  const { includeXmlDeclaration = true } = options;

  const moduleCount = matrix.size;
  const quietZone = style.quietZone;
  const moduleSize = 1; // Base unit, viewBox scales

  const viewBoxSize = moduleCount + (quietZone * 2);

  const isDataModule = (row: number, col: number): boolean =>
    !isFinderPattern(row, col, moduleCount) &&
    !isFinderSeparator(row, col, moduleCount) &&
    Boolean(matrix.modules.get(row, col));

  let modulePathData: string;
  if (style.moduleShape === 'square') {
    // Merge touching squares into single outlines
    modulePathData = traceMergedModulePath(moduleCount, isDataModule, quietZone, quietZone, moduleSize);
  } else {
    const modulePaths: string[] = [];
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!isDataModule(row, col)) continue;
        const x = quietZone + col * moduleSize;
        const y = quietZone + row * moduleSize;
        modulePaths.push(getModulePath(style.moduleShape, x, y, moduleSize));
      }
    }
    modulePathData = modulePaths.join('');
  }

  // Build finder patterns
  const finderPatterns: string[] = [];

  // Top-left finder pattern
  finderPatterns.push(
    ...getFinderPatternPaths(
      style.eyeShape,
      quietZone,
      quietZone,
      moduleSize,
      style.foregroundColor
    )
  );

  // Top-right finder pattern
  finderPatterns.push(
    ...getFinderPatternPaths(
      style.eyeShape,
      quietZone + (moduleCount - 7) * moduleSize,
      quietZone,
      moduleSize,
      style.foregroundColor
    )
  );

  // Bottom-left finder pattern
  finderPatterns.push(
    ...getFinderPatternPaths(
      style.eyeShape,
      quietZone,
      quietZone + (moduleCount - 7) * moduleSize,
      moduleSize,
      style.foregroundColor
    )
  );

  // Build logo element if provided
  let logoElement = '';
  if (logoDataUri && style.logoSizeRatio) {
    const logoSize = viewBoxSize * style.logoSizeRatio;
    const logoX = (viewBoxSize - logoSize) / 2;
    const logoY = (viewBoxSize - logoSize) / 2;

    // White background behind logo
    const padding = logoSize * 0.15;
    logoElement = `
    <rect
      x="${logoX - padding}"
      y="${logoY - padding}"
      width="${logoSize + padding * 2}"
      height="${logoSize + padding * 2}"
      fill="${style.backgroundColor}"
    />
    <image
      href="${logoDataUri}"
      x="${logoX}"
      y="${logoY}"
      width="${logoSize}"
      height="${logoSize}"
      preserveAspectRatio="xMidYMid meet"
    />`;
  }

  // Assemble SVG
  const xmlDecl = includeXmlDeclaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '';

  return `${xmlDecl}<svg
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  viewBox="0 0 ${viewBoxSize} ${viewBoxSize}"
  shape-rendering="crispEdges"
>
  <rect width="100%" height="100%" fill="${style.backgroundColor}"/>
  <path fill="${style.foregroundColor}" d="${modulePathData}"/>
  ${finderPatterns.join('\n  ')}
  ${logoElement}
</svg>`;
}

/**
 * Build a simple SVG QR code (no custom shapes, just squares)
 */
export function buildSimpleSVG(
  matrix: QRMatrix,
  style: Pick<QRStyleConfig, 'foregroundColor' | 'backgroundColor' | 'quietZone'>,
  options: SVGOptions = {}
): string {
  const { includeXmlDeclaration = true } = options;

  const moduleCount = matrix.size;
  const quietZone = style.quietZone;
  const moduleSize = 1;

  const viewBoxSize = moduleCount + (quietZone * 2);

  // Merge all dark modules into single outlines
  const pathData = traceMergedModulePath(
    moduleCount,
    (row, col) => Boolean(matrix.modules.get(row, col)),
    quietZone,
    quietZone,
    moduleSize
  );

  const xmlDecl = includeXmlDeclaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '';

  return `${xmlDecl}<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${viewBoxSize} ${viewBoxSize}"
  shape-rendering="crispEdges"
>
  <rect width="100%" height="100%" fill="${style.backgroundColor}"/>
  <path fill="${style.foregroundColor}" d="${pathData}"/>
</svg>`;
}
