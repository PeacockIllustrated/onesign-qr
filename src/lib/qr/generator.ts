/**
 * Core QR code generation using the 'qrcode' npm package
 *
 * Library choice rationale:
 * - Best SSR/Node.js compatibility (no browser dependencies)
 * - Mature and well-maintained
 * - Good TypeScript support via @types/qrcode
 * - Multiple output formats (SVG, PNG, terminal)
 */

import QRCode from 'qrcode';
import { QR_DEFAULTS } from '../constants';
import type { ErrorCorrectionLevel, QRMatrix } from '@/types/qr';

/**
 * Generate QR code matrix data
 */
export async function generateQRMatrix(
  data: string,
  errorCorrection: ErrorCorrectionLevel = 'M'
): Promise<QRMatrix> {
  // QRCode.create returns internal structure, cast to any to access
  const qrData = await (QRCode as any).create(data, {
    errorCorrectionLevel: errorCorrection,
  });

  return {
    modules: {
      size: qrData.modules.size,
      get: (row: number, col: number) => qrData.modules.get(row, col) === 1,
    },
    size: qrData.modules.size,
    version: qrData.version,
  };
}

/**
 * Generate basic SVG QR code (without custom styling)
 */
export async function generateBasicSVG(
  data: string,
  options: {
    errorCorrection?: ErrorCorrectionLevel;
    size?: number;
    margin?: number;
    foreground?: string;
    background?: string;
  } = {}
): Promise<string> {
  const {
    errorCorrection = QR_DEFAULTS.ERROR_CORRECTION,
    margin = QR_DEFAULTS.QUIET_ZONE,
    foreground = '#000000',
    background = '#FFFFFF',
  } = options;

  const svg = await QRCode.toString(data, {
    type: 'svg',
    errorCorrectionLevel: errorCorrection,
    margin,
    color: {
      dark: foreground,
      light: background,
    },
  });

  return svg;
}

/**
 * Generate basic PNG QR code as data URL
 */
export async function generateBasicPNGDataURL(
  data: string,
  options: {
    errorCorrection?: ErrorCorrectionLevel;
    size?: number;
    margin?: number;
    foreground?: string;
    background?: string;
  } = {}
): Promise<string> {
  const {
    errorCorrection = QR_DEFAULTS.ERROR_CORRECTION,
    size = QR_DEFAULTS.DEFAULT_SIZE,
    margin = QR_DEFAULTS.QUIET_ZONE,
    foreground = '#000000',
    background = '#FFFFFF',
  } = options;

  const dataUrl = await QRCode.toDataURL(data, {
    errorCorrectionLevel: errorCorrection,
    width: size,
    margin,
    color: {
      dark: foreground,
      light: background,
    },
  });

  return dataUrl;
}

/**
 * Generate PNG QR code as Buffer
 */
export async function generateBasicPNGBuffer(
  data: string,
  options: {
    errorCorrection?: ErrorCorrectionLevel;
    size?: number;
    margin?: number;
    foreground?: string;
    background?: string;
  } = {}
): Promise<Buffer> {
  const {
    errorCorrection = QR_DEFAULTS.ERROR_CORRECTION,
    size = QR_DEFAULTS.DEFAULT_SIZE,
    margin = QR_DEFAULTS.QUIET_ZONE,
    foreground = '#000000',
    background = '#FFFFFF',
  } = options;

  const buffer = await QRCode.toBuffer(data, {
    errorCorrectionLevel: errorCorrection,
    width: size,
    margin,
    color: {
      dark: foreground,
      light: background,
    },
  });

  return buffer;
}

/**
 * Get the content to encode in the QR code
 * For managed mode, this is the redirect URL
 * For direct mode, this is the destination URL
 */
export function getQRContent(
  mode: 'managed' | 'direct',
  destinationUrl: string,
  slug?: string
): string {
  if (mode === 'managed' && slug) {
    const baseUrl = process.env.QR_REDIRECT_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    return `${baseUrl}/r/${slug}`;
  }
  return destinationUrl;
}

/**
 * Determine recommended error correction level
 * Higher levels (Q, H) are recommended when using logos
 */
export function getRecommendedErrorCorrection(hasLogo: boolean): ErrorCorrectionLevel {
  return hasLogo ? QR_DEFAULTS.ERROR_CORRECTION_WITH_LOGO : QR_DEFAULTS.ERROR_CORRECTION;
}
