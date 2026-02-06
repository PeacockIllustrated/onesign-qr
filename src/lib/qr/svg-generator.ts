/**
 * Custom SVG generator for styled QR codes
 * Supports different module shapes, eye shapes, and logo placement
 */

import QRCode from 'qrcode';
import { getModulePath, getFinderPatternPaths, isFinderPattern, isFinderSeparator } from './shapes';
import type { ModuleShape, EyeShape } from './shapes';
import type { ErrorCorrectionLevel, LogoMode } from '@/types/qr';

export interface StyledSVGOptions {
  errorCorrection: ErrorCorrectionLevel;
  foregroundColor: string;
  backgroundColor: string;
  moduleShape: ModuleShape;
  eyeShape: EyeShape;
  quietZone: number;
  size?: number;
  logoMode?: LogoMode;
  logoDataUrl?: string;
  logoSizeRatio?: number;
}

/**
 * Generate a styled SVG QR code with custom shapes
 */
/**
 * Check if a module is in the center logo area
 */
function isInLogoArea(
  row: number,
  col: number,
  matrixSize: number,
  logoSizeRatio: number
): boolean {
  const center = matrixSize / 2;
  const logoModules = Math.ceil(matrixSize * logoSizeRatio);
  const halfLogo = logoModules / 2;

  return (
    row >= center - halfLogo &&
    row < center + halfLogo &&
    col >= center - halfLogo &&
    col < center + halfLogo
  );
}

export async function generateStyledSVG(
  data: string,
  options: StyledSVGOptions
): Promise<string> {
  const {
    errorCorrection,
    foregroundColor,
    backgroundColor,
    moduleShape,
    eyeShape,
    quietZone,
    size,
    logoMode = 'none',
    logoDataUrl,
    logoSizeRatio = 0.2,
  } = options;

  // Generate QR matrix
  const qrData = await (QRCode as any).create(data, {
    errorCorrectionLevel: errorCorrection,
  });

  const modules = qrData.modules;
  const matrixSize = modules.size;
  const moduleSize = 10; // Base module size in SVG units
  const margin = quietZone * moduleSize;
  const svgSize = matrixSize * moduleSize + margin * 2;

  // Calculate logo area
  const hasLogo = logoMode !== 'none';
  const logoPixelSize = matrixSize * moduleSize * logoSizeRatio;
  const logoOffset = (svgSize - logoPixelSize) / 2;

  // Build SVG paths
  const modulePaths: string[] = [];

  // Generate data modules (skip finder patterns and logo area)
  for (let row = 0; row < matrixSize; row++) {
    for (let col = 0; col < matrixSize; col++) {
      // Skip finder patterns - we'll draw them separately with eye shape
      if (isFinderPattern(row, col, matrixSize)) continue;
      // Skip finder separators
      if (isFinderSeparator(row, col, matrixSize)) continue;
      // Skip logo area if logo is enabled
      if (hasLogo && isInLogoArea(row, col, matrixSize, logoSizeRatio + 0.05)) continue;

      // Only draw dark modules
      if (modules.get(row, col)) {
        const x = margin + col * moduleSize;
        const y = margin + row * moduleSize;
        modulePaths.push(getModulePath(moduleShape, x, y, moduleSize));
      }
    }
  }

  // Generate finder patterns (eyes)
  const finderPatterns: string[] = [];

  // Top-left eye
  finderPatterns.push(
    ...getFinderPatternPaths(eyeShape, margin, margin, moduleSize, foregroundColor, backgroundColor)
  );

  // Top-right eye
  finderPatterns.push(
    ...getFinderPatternPaths(
      eyeShape,
      margin + (matrixSize - 7) * moduleSize,
      margin,
      moduleSize,
      foregroundColor,
      backgroundColor
    )
  );

  // Bottom-left eye
  finderPatterns.push(
    ...getFinderPatternPaths(
      eyeShape,
      margin,
      margin + (matrixSize - 7) * moduleSize,
      moduleSize,
      foregroundColor,
      backgroundColor
    )
  );

  // Generate logo element
  let logoElement = '';
  if (logoMode === 'placeholder') {
    // Draw a blank square (just background color, no stroke)
    logoElement = `
  <rect x="${logoOffset}" y="${logoOffset}" width="${logoPixelSize}" height="${logoPixelSize}" fill="${backgroundColor}" />`;
  } else if (logoMode === 'upload' && logoDataUrl) {
    // Embed the uploaded logo image
    logoElement = `
  <rect x="${logoOffset}" y="${logoOffset}" width="${logoPixelSize}" height="${logoPixelSize}" fill="${backgroundColor}" />
  <image x="${logoOffset}" y="${logoOffset}" width="${logoPixelSize}" height="${logoPixelSize}" href="${logoDataUrl}" preserveAspectRatio="xMidYMid meet" />`;
  }

  // Build final SVG
  const viewBox = `0 0 ${svgSize} ${svgSize}`;
  const widthHeight = size ? `width="${size}" height="${size}"` : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}" ${widthHeight} shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="${backgroundColor}"/>
  ${finderPatterns.join('\n  ')}
  <path d="${modulePaths.join(' ')}" fill="${foregroundColor}"/>${logoElement}
</svg>`;

  return svg;
}

/**
 * Generate styled QR as data URL for client-side preview
 */
export async function generateStyledSVGDataURL(
  data: string,
  options: StyledSVGOptions
): Promise<string> {
  const svg = await generateStyledSVG(data, options);
  const base64 = typeof window !== 'undefined'
    ? btoa(svg)
    : Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
