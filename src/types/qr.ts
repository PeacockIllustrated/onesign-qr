/**
 * QR code related type definitions
 */

import type { ModuleShape, EyeShape } from '@/lib/qr/shapes';

// Error correction levels
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

// QR mode
export type QRMode = 'managed' | 'direct';

// Asset format
export type AssetFormat = 'svg' | 'png' | 'pdf';

// Device type for analytics
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

/**
 * QR matrix data from qrcode library
 */
export interface QRMatrix {
  modules: {
    size: number;
    get(row: number, col: number): boolean;
  };
  size: number;
  version: number;
}

/**
 * QR style configuration
 */
export interface QRStyleConfig {
  foregroundColor: string;
  backgroundColor: string;
  errorCorrection: ErrorCorrectionLevel;
  quietZone: number;
  moduleShape: ModuleShape;
  eyeShape: EyeShape;
  logoSizeRatio?: number;
}

/**
 * QR code database record
 */
export interface QRCode {
  id: string;
  owner_id: string;
  name: string;
  mode: QRMode;
  slug: string | null;
  destination_url: string;
  is_active: boolean;
  analytics_enabled: boolean;
  total_scans: number;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * QR style database record
 */
export interface QRStyle {
  id: string;
  qr_id: string;
  foreground_color: string;
  background_color: string;
  error_correction: ErrorCorrectionLevel;
  quiet_zone: number;
  module_shape: ModuleShape;
  eye_shape: EyeShape;
  logo_storage_path: string | null;
  logo_size_ratio: number;
  created_at: string;
  updated_at: string;
}

/**
 * QR asset database record
 */
export interface QRAsset {
  id: string;
  qr_id: string;
  format: AssetFormat;
  storage_path: string;
  size_bytes: number | null;
  width: number | null;
  style_hash: string;
  created_at: string;
}

/**
 * QR scan event database record
 */
export interface QRScanEvent {
  id: string;
  qr_id: string;
  scanned_at: string;
  country_code: string | null;
  region: string | null;
  device_type: DeviceType;
  os_family: string | null;
  browser_family: string | null;
  referrer_domain: string | null;
  ip_hash: string | null;
}

/**
 * QR audit log database record
 */
export interface QRAuditLog {
  id: string;
  qr_id: string;
  actor_id: string | null;
  action: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * QR code with style (joined)
 */
export interface QRCodeWithStyle extends QRCode {
  style: QRStyle;
}

/**
 * Create QR request
 */
export interface CreateQRRequest {
  name: string;
  mode: QRMode;
  destination_url: string;
  slug?: string;
  analytics_enabled?: boolean;
  style?: Partial<QRStyleConfig>;
}

/**
 * Update QR request
 */
export interface UpdateQRRequest {
  name?: string;
  destination_url?: string;
  is_active?: boolean;
  analytics_enabled?: boolean;
}

/**
 * Update style request
 */
export interface UpdateStyleRequest {
  foreground_color?: string;
  background_color?: string;
  error_correction?: ErrorCorrectionLevel;
  quiet_zone?: number;
  module_shape?: ModuleShape;
  eye_shape?: EyeShape;
  logo_size_ratio?: number;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: AssetFormat;
  size?: number;
  preset?: 'sticker-50mm' | 'sticker-75mm' | 'sticker-100mm' | 'a4';
}

/**
 * Analytics summary
 */
export interface AnalyticsSummary {
  total_scans: number;
  scans_today: number;
  scans_this_week: number;
  scans_this_month: number;
  top_countries: Array<{ country: string; count: number }>;
  top_devices: Array<{ device: DeviceType; count: number }>;
  scans_by_day: Array<{ date: string; count: number }>;
}
