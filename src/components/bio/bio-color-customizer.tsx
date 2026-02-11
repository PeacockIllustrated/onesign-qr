'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BioColorCustomizerProps {
  bgColor: string | null;
  textColor: string | null;
  accentColor: string | null;
  onBgChange: (color: string | null) => void;
  onTextChange: (color: string | null) => void;
  onAccentChange: (color: string | null) => void;
}

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  onChange: (color: string | null) => void;
}) {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim();
      if (raw === '') {
        onChange(null);
        return;
      }
      // Ensure leading hash
      const hex = raw.startsWith('#') ? raw : `#${raw}`;
      onChange(hex);
    },
    [onChange]
  );

  const handlePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const displayValue = value ?? '';
  const isValid = !value || HEX_PATTERN.test(value);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        {/* Native color picker swatch */}
        <label
          className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-sm border border-input"
          style={{ backgroundColor: isValid && value ? value : '#ffffff' }}
        >
          <input
            type="color"
            value={isValid && value ? value : '#ffffff'}
            onChange={handlePickerChange}
            className="absolute inset-0 cursor-pointer opacity-0"
            tabIndex={-1}
          />
        </label>

        {/* Hex text input */}
        <Input
          id={id}
          type="text"
          placeholder="#000000"
          value={displayValue}
          onChange={handleInputChange}
          error={!!value && !isValid}
          className="font-mono text-sm"
          maxLength={7}
        />
      </div>
      {value && !isValid && (
        <p className="text-xs text-destructive">Enter a valid hex color (e.g. #FF5733)</p>
      )}
    </div>
  );
}

export function BioColorCustomizer({
  bgColor,
  textColor,
  accentColor,
  onBgChange,
  onTextChange,
  onAccentChange,
}: BioColorCustomizerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ColorField
        id="custom-bg-color"
        label="Background color"
        value={bgColor}
        onChange={onBgChange}
      />
      <ColorField
        id="custom-text-color"
        label="Text color"
        value={textColor}
        onChange={onTextChange}
      />
      <ColorField
        id="custom-accent-color"
        label="Accent color"
        value={accentColor}
        onChange={onAccentChange}
      />
    </div>
  );
}
