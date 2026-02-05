'use client';

import { useState } from 'react';
import { Download, FileImage, FileCode, FileText } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Select, Label } from '@/components/ui';
import type { QRStyleConfig } from '@/types/qr';
import { QR_DEFAULTS } from '@/lib/constants';

interface ExportPanelProps {
  qrId: string;
  data: string;
  style: QRStyleConfig;
}

export function ExportPanel({ qrId, data, style }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [pngSize, setPngSize] = useState<number>(512);

  const downloadSVG = async () => {
    setIsExporting(true);
    try {
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

      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${qrId}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export SVG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadPNG = async () => {
    setIsExporting(true);
    try {
      const QRCode = (await import('qrcode')).default;

      const dataUrl = await QRCode.toDataURL(data, {
        errorCorrectionLevel: style.errorCorrection,
        margin: style.quietZone,
        width: pngSize,
        color: {
          dark: style.foregroundColor,
          light: style.backgroundColor,
        },
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `qr-${qrId}-${pngSize}px.png`;
      a.click();
    } catch (error) {
      console.error('Failed to export PNG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">download</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SVG */}
        <div className="flex items-center justify-between p-3 border rounded-sm">
          <div className="flex items-center gap-3">
            <FileCode className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">SVG</p>
              <p className="text-xs text-muted-foreground">Vector - best for print</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={downloadSVG} disabled={isExporting}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* PNG */}
        <div className="p-3 border rounded-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileImage className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">PNG</p>
                <p className="text-xs text-muted-foreground">Raster - for web/digital</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={downloadPNG} disabled={isExporting}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="png-size" className="text-xs shrink-0">Size:</Label>
            <Select
              id="png-size"
              value={String(pngSize)}
              onChange={(e) => setPngSize(Number(e.target.value))}
              className="h-8 text-xs"
            >
              {QR_DEFAULTS.SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}x{size}px
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* PDF placeholder */}
        <div className="flex items-center justify-between p-3 border rounded-sm opacity-50">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">PDF</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </div>
          <Button size="sm" variant="outline" disabled>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
