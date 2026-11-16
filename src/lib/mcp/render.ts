import { generateStyledSVG } from '@/lib/qr/svg-generator';
import { getQRContent } from '@/lib/qr/generator';
import { svgToPng } from '@/lib/qr/exporters/png';
import { createPresetPdf } from '@/lib/qr/exporters/pdf';
import type { ErrorCorrectionLevel } from '@/types/qr';
import type { ModuleShape, EyeShape } from '@/lib/qr/shapes';

export interface QrRow {
  id: string;
  name: string;
  mode: 'managed' | 'direct';
  slug: string | null;
  destination_url: string;
  is_active: boolean;
  analytics_enabled: boolean;
  carrier?: string | null;
  total_scans?: number | null;
  last_scanned_at?: string | null;
  created_at?: string;
  updated_at?: string;
  qr_styles?: StyleRow | StyleRow[] | null;
}

export interface StyleRow {
  foreground_color: string;
  background_color: string;
  error_correction: ErrorCorrectionLevel;
  quiet_zone: number;
  module_shape: ModuleShape;
  eye_shape: EyeShape;
}

const DEFAULT_STYLE: StyleRow = {
  foreground_color: '#000000',
  background_color: '#FFFFFF',
  error_correction: 'M',
  quiet_zone: 4,
  module_shape: 'square',
  eye_shape: 'square',
};

export function styleOf(qr: QrRow): StyleRow {
  const s = Array.isArray(qr.qr_styles) ? qr.qr_styles[0] : qr.qr_styles;
  return { ...DEFAULT_STYLE, ...(s ?? {}) };
}

/** What the printed code actually encodes. */
export function encodedContent(qr: QrRow): string {
  return getQRContent(qr.mode, qr.destination_url, qr.slug ?? undefined);
}

export async function renderSvg(qr: QrRow): Promise<string> {
  const s = styleOf(qr);
  return generateStyledSVG(encodedContent(qr), {
    errorCorrection: s.error_correction,
    foregroundColor: s.foreground_color,
    backgroundColor: s.background_color,
    moduleShape: s.module_shape,
    eyeShape: s.eye_shape,
    quietZone: s.quiet_zone,
  });
}

export async function renderPng(qr: QrRow, size: number): Promise<Buffer> {
  return svgToPng(await renderSvg(qr), size);
}

export async function renderPdf(
  qr: QrRow,
  preset: 'sticker-50mm' | 'sticker-75mm' | 'sticker-100mm' | 'a4'
): Promise<Uint8Array> {
  return createPresetPdf(await renderSvg(qr), preset);
}
