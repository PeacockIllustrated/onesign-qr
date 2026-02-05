'use client';

import { useEffect, useState } from 'react';
import { QrCode, AlertTriangle } from 'lucide-react';
import type { QRStyleConfig } from '@/types/qr';
import { QR_DEFAULTS } from '@/lib/constants';

interface QRPreviewProps {
  data: string;
  style: QRStyleConfig;
  size?: number;
}

/**
 * Client-side QR preview component
 * Uses the basic qrcode library for preview generation
 */
export function QRPreview({ data, style, size = 256 }: QRPreviewProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function generatePreview() {
      try {
        // Dynamically import qrcode to avoid SSR issues
        const QRCode = (await import('qrcode')).default;

        const svg = await QRCode.toString(data, {
          type: 'svg',
          errorCorrectionLevel: style.errorCorrection,
          margin: style.quietZone,
          color: {
            dark: style.foregroundColor,
            light: style.backgroundColor,
          },
        });

        if (!cancelled) {
          setSvgContent(svg);
          setError(null);

          // Check for warnings
          const newWarnings: string[] = [];

          // Contrast warning
          const fgLum = getLuminance(style.foregroundColor);
          const bgLum = getLuminance(style.backgroundColor);
          const contrast = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
          if (contrast < 4) {
            newWarnings.push('Low contrast may affect scanning');
          }

          // Logo size warning
          if (style.logoSizeRatio && style.logoSizeRatio > QR_DEFAULTS.WARN_LOGO_RATIO) {
            newWarnings.push('Large logo may affect scanning');
          }

          // Quiet zone warning
          if (style.quietZone < QR_DEFAULTS.MIN_QUIET_ZONE) {
            newWarnings.push('Small quiet zone may affect scanning');
          }

          setWarnings(newWarnings);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to generate QR preview');
          setSvgContent(null);
        }
      }
    }

    generatePreview();

    return () => {
      cancelled = true;
    };
  }, [data, style]);

  if (error) {
    return (
      <div
        className="aspect-square bg-muted rounded-sm flex flex-col items-center justify-center gap-2 text-muted-foreground"
        style={{ maxWidth: size }}
      >
        <QrCode className="h-12 w-12" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div
        className="aspect-square bg-muted rounded-sm flex items-center justify-center animate-pulse"
        style={{ maxWidth: size }}
      >
        <QrCode className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="aspect-square rounded-sm overflow-hidden border border-border"
        style={{ maxWidth: size }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {warnings.length > 0 && (
        <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            {warnings.map((warning, i) => (
              <p key={i}>{warning}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Calculate relative luminance of a hex color
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
