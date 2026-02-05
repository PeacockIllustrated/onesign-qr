'use client';

import { Label, Select, Input } from '@/components/ui';
import { MODULE_SHAPES, EYE_SHAPES, ERROR_CORRECTION_LEVELS, QR_DEFAULTS } from '@/lib/constants';
import type { QRStyleConfig, ErrorCorrectionLevel } from '@/types/qr';
import type { ModuleShape, EyeShape } from '@/lib/qr/shapes';

interface StylePanelProps {
  style: QRStyleConfig;
  onChange: (style: QRStyleConfig) => void;
}

export function StylePanel({ style, onChange }: StylePanelProps) {
  const updateStyle = (updates: Partial<QRStyleConfig>) => {
    onChange({ ...style, ...updates });
  };

  return (
    <div className="space-y-4">
      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fg-color">foreground</Label>
          <div className="flex gap-2">
            <input
              type="color"
              id="fg-color"
              value={style.foregroundColor}
              onChange={(e) => updateStyle({ foregroundColor: e.target.value })}
              className="h-10 w-10 rounded-sm border border-input cursor-pointer"
            />
            <Input
              value={style.foregroundColor}
              onChange={(e) => updateStyle({ foregroundColor: e.target.value })}
              placeholder="#000000"
              className="flex-1 font-mono text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bg-color">background</Label>
          <div className="flex gap-2">
            <input
              type="color"
              id="bg-color"
              value={style.backgroundColor}
              onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
              className="h-10 w-10 rounded-sm border border-input cursor-pointer"
            />
            <Input
              value={style.backgroundColor}
              onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
              placeholder="#FFFFFF"
              className="flex-1 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Shapes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="module-shape">module shape</Label>
          <Select
            id="module-shape"
            value={style.moduleShape}
            onChange={(e) => updateStyle({ moduleShape: e.target.value as ModuleShape })}
          >
            {MODULE_SHAPES.map((shape) => (
              <option key={shape} value={shape}>
                {shape}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="eye-shape">eye shape</Label>
          <Select
            id="eye-shape"
            value={style.eyeShape}
            onChange={(e) => updateStyle({ eyeShape: e.target.value as EyeShape })}
          >
            {EYE_SHAPES.map((shape) => (
              <option key={shape} value={shape}>
                {shape}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Error Correction */}
      <div className="space-y-2">
        <Label htmlFor="error-correction">error correction</Label>
        <Select
          id="error-correction"
          value={style.errorCorrection}
          onChange={(e) => updateStyle({ errorCorrection: e.target.value as ErrorCorrectionLevel })}
        >
          <option value="L">Low (7% recovery)</option>
          <option value="M">Medium (15% recovery) - recommended</option>
          <option value="Q">Quartile (25% recovery)</option>
          <option value="H">High (30% recovery) - best for logos</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          Higher error correction allows the QR to be read even if partially obscured
        </p>
      </div>

      {/* Quiet Zone */}
      <div className="space-y-2">
        <Label htmlFor="quiet-zone">
          quiet zone: {style.quietZone} modules
        </Label>
        <input
          type="range"
          id="quiet-zone"
          min={QR_DEFAULTS.MIN_QUIET_ZONE}
          max={QR_DEFAULTS.MAX_QUIET_ZONE}
          value={style.quietZone}
          onChange={(e) => updateStyle({ quietZone: parseInt(e.target.value) })}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          The white border around the QR. Minimum 4 modules recommended.
        </p>
      </div>
    </div>
  );
}
