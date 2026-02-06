'use client';

import { useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { Label, Select, Input, Button } from '@/components/ui';
import { MODULE_SHAPES, EYE_SHAPES, QR_DEFAULTS } from '@/lib/constants';
import type { QRStyleConfig, ErrorCorrectionLevel, LogoMode } from '@/types/qr';
import type { ModuleShape, EyeShape } from '@/lib/qr/shapes';

interface StylePanelProps {
  style: QRStyleConfig;
  onChange: (style: QRStyleConfig) => void;
}

const LOGO_MODES: { value: LogoMode; label: string; description: string }[] = [
  { value: 'none', label: 'No logo', description: 'Standard QR code without logo' },
  { value: 'upload', label: 'Upload logo', description: 'Add your own logo image' },
  { value: 'placeholder', label: 'Placeholder', description: 'Leave blank space for manual logo' },
];

export function StylePanel({ style, onChange }: StylePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateStyle = (updates: Partial<QRStyleConfig>) => {
    onChange({ ...style, ...updates });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      alert('Image must be less than 500KB');
      return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateStyle({
        logoDataUrl: dataUrl,
        logoMode: 'upload',
        // Auto-set high error correction when using logo
        errorCorrection: 'H',
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeLogo = () => {
    updateStyle({
      logoDataUrl: undefined,
      logoMode: 'none',
    });
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

      {/* Logo Section */}
      <div className="space-y-3 pt-4 border-t">
        <Label>center logo</Label>

        {/* Logo Mode Selection */}
        <div className="grid grid-cols-3 gap-2">
          {LOGO_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => {
                if (mode.value === 'upload' && !style.logoDataUrl) {
                  fileInputRef.current?.click();
                } else {
                  updateStyle({
                    logoMode: mode.value,
                    errorCorrection: mode.value !== 'none' ? 'H' : style.errorCorrection,
                  });
                }
              }}
              className={`p-2 text-xs border rounded-sm transition-colors ${
                style.logoMode === mode.value
                  ? 'border-foreground bg-foreground/5'
                  : 'border-input hover:border-foreground/50'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden"
        />

        {/* Logo Preview & Controls */}
        {style.logoMode === 'upload' && (
          <div className="space-y-3">
            {style.logoDataUrl ? (
              <div className="flex items-center gap-3 p-3 border rounded-sm">
                <img
                  src={style.logoDataUrl}
                  alt="Logo preview"
                  className="w-12 h-12 object-contain rounded-sm border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Logo uploaded</p>
                  <p className="text-xs text-muted-foreground">Click to change</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={removeLogo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-6 border-2 border-dashed rounded-sm hover:border-foreground/50 transition-colors"
              >
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <span className="text-sm">Click to upload logo</span>
                  <span className="text-xs">PNG, JPG, SVG (max 500KB)</span>
                </div>
              </button>
            )}
          </div>
        )}

        {style.logoMode === 'placeholder' && (
          <div className="flex items-center gap-3 p-3 border rounded-sm bg-muted/50">
            <div className="w-12 h-12 border-2 border-dashed rounded-sm flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Placeholder enabled</p>
              <p className="text-xs text-muted-foreground">
                A blank square will be left in the center for you to add a logo manually
              </p>
            </div>
          </div>
        )}

        {/* Logo Size */}
        {style.logoMode !== 'none' && (
          <div className="space-y-2">
            <Label htmlFor="logo-size">
              logo size: {Math.round((style.logoSizeRatio || 0.2) * 100)}%
            </Label>
            <input
              type="range"
              id="logo-size"
              min={15}
              max={30}
              value={(style.logoSizeRatio || 0.2) * 100}
              onChange={(e) => updateStyle({ logoSizeRatio: parseInt(e.target.value) / 100 })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Larger logos may affect scanning reliability. Using high error correction is recommended.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
